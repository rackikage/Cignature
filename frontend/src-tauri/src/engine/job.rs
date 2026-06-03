use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};
use tokio::process::Child;
use tokio::sync::Mutex;

use crate::paths;

use super::audio;
use super::fetch;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Branch {
    Audio,
    Transcript,
    Vocals,
    Twin,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceProbe {
    pub title: String,
    pub platform: String,
    #[serde(rename = "durationSec")]
    pub duration_sec: Option<f64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    Fetching,
    Processing,
    Finalizing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum JobEvent {
    Started {
        id: String,
        branch: Branch,
    },
    Probed {
        id: String,
        source: SourceProbe,
    },
    Progress {
        id: String,
        stage: Stage,
        progress: f32,
    },
    Done {
        id: String,
        #[serde(rename = "outputPath")]
        output_path: String,
    },
    Cancelled {
        id: String,
    },
    UrlUnavailable {
        id: String,
    },
}

/// Cooperative cancel: a flag the engine checks at safe points,
/// plus a slot for the currently running child so we can SIGTERM it.
#[derive(Clone, Default)]
pub struct CancelToken {
    flag: Arc<AtomicBool>,
    child_pid: Arc<AtomicI32>,
}

impl CancelToken {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn cancel(&self) {
        self.flag.store(true, Ordering::SeqCst);
        let pid = self.child_pid.load(Ordering::SeqCst);
        if pid > 0 {
            // SIGTERM the running child; ignore errors — best-effort.
            unsafe {
                libc::kill(pid, libc::SIGTERM);
            }
        }
    }

    pub fn is_cancelled(&self) -> bool {
        self.flag.load(Ordering::SeqCst)
    }

    pub fn bind(&self, child: &Child) -> Result<(), ()> {
        if let Some(pid) = child.id() {
            self.child_pid.store(pid as i32, Ordering::SeqCst);
        }
        if self.is_cancelled() {
            return Err(());
        }
        Ok(())
    }
}


pub struct JobHandle {
    pub id: String,
    pub cancel: CancelToken,
}

impl JobHandle {
    pub fn new(id: String, cancel: CancelToken) -> Self {
        Self { id, cancel }
    }
}

/// Active running job singleton — strict serial concurrency per doctrine.
pub type ActiveJob = Arc<Mutex<Option<JobHandle>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartArgs {
    pub url: String,
    pub branch: Branch,
}

/// Stage weights for progress smoothing across the full job.
/// Audio: fetch dominates. Transcript: fetch + transcribe.
/// Vocals/Twin: fetch + separate.
fn stage_share(branch: Branch, stage: Stage) -> (f32, f32) {
    // (start, span) — both in 0..1 across the whole job
    match (branch, stage) {
        (Branch::Audio, Stage::Fetching) => (0.0, 0.7),
        (Branch::Audio, Stage::Processing) => (0.7, 0.25),
        (Branch::Audio, Stage::Finalizing) => (0.95, 0.05),

        (Branch::Transcript, Stage::Fetching) => (0.0, 0.35),
        (Branch::Transcript, Stage::Processing) => (0.35, 0.6),
        (Branch::Transcript, Stage::Finalizing) => (0.95, 0.05),

        (Branch::Vocals | Branch::Twin, Stage::Fetching) => (0.0, 0.25),
        (Branch::Vocals | Branch::Twin, Stage::Processing) => (0.25, 0.7),
        (Branch::Vocals | Branch::Twin, Stage::Finalizing) => (0.95, 0.05),
    }
}

pub async fn run_job<F>(
    id: String,
    args: StartArgs,
    cancel: CancelToken,
    emit: F,
) where
    F: Fn(JobEvent) + Send + Sync + 'static,
{
    let emit = Arc::new(emit);
    emit(JobEvent::Started {
        id: id.clone(),
        branch: args.branch,
    });

    // 1) probe
    let probe = match fetch::probe(&args.url).await {
        Ok(p) => p,
        Err(fetch::ProbeOutcome::Unavailable) => {
            emit(JobEvent::UrlUnavailable { id });
            return;
        }
        Err(fetch::ProbeOutcome::Internal) => {
            // Doctrine: engine bugs are not user-facing. Surface as
            // unavailable so the user sees one consistent failure line.
            // (Diagnostic log lives in stderr.)
            emit(JobEvent::UrlUnavailable { id });
            return;
        }
    };

    emit(JobEvent::Probed {
        id: id.clone(),
        source: probe.clone(),
    });

    if cancel.is_cancelled() {
        emit(JobEvent::Cancelled { id });
        return;
    }

    let work = paths::work_dir(&id);
    let cleanup_work = work.clone();

    // 2) fetch
    let (start, span) = stage_share(args.branch, Stage::Fetching);
    let emit_for_fetch = Arc::clone(&emit);
    let id_for_fetch = id.clone();
    let downloaded = match fetch::download_audio(
        &args.url,
        &work,
        move |p| {
            emit_for_fetch(JobEvent::Progress {
                id: id_for_fetch.clone(),
                stage: Stage::Fetching,
                progress: start + span * p,
            });
        },
        &cancel,
    )
    .await
    {
        Ok(p) => p,
        Err(fetch::FetchError::Cancelled) => {
            let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
            emit(JobEvent::Cancelled { id });
            return;
        }
        Err(fetch::FetchError::Unavailable) => {
            let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
            emit(JobEvent::UrlUnavailable { id });
            return;
        }
        Err(fetch::FetchError::Internal(_)) => {
            let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
            emit(JobEvent::UrlUnavailable { id });
            return;
        }
    };

    if cancel.is_cancelled() {
        let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
        emit(JobEvent::Cancelled { id });
        return;
    }

    // 3) process per branch
    let (proc_start, proc_span) = stage_share(args.branch, Stage::Processing);
    emit(JobEvent::Progress {
        id: id.clone(),
        stage: Stage::Processing,
        progress: proc_start,
    });

    let desktop = paths::desktop_dir();
    let safe_title = sanitize_filename(&probe.title);

    let output_path: PathBuf = match args.branch {
        Branch::Audio => {
            let target = desktop.join(format!("{safe_title}.mp3"));
            match audio::to_mp3(&downloaded, &target, &cancel).await {
                Ok(p) => p,
                Err(audio::AudioError::Cancelled) => {
                    let _ = tokio::fs::remove_file(&target).await;
                    let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                    emit(JobEvent::Cancelled { id });
                    return;
                }
                Err(audio::AudioError::Internal(e)) => {
                    log::error!("audio internal: {e}");
                    let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                    emit(JobEvent::UrlUnavailable { id });
                    return;
                }
            }
        }
        Branch::Transcript => {
            // ffmpeg -> wav, whisper-cli -> txt
            let wav = work.join("source.16k.wav");
            if let Err(e) = audio::to_wav_16k_mono(&downloaded, &wav, &cancel).await {
                match e {
                    audio::AudioError::Cancelled => {
                        let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                        emit(JobEvent::Cancelled { id });
                        return;
                    }
                    audio::AudioError::Internal(e) => {
                        log::error!("wav prep: {e}");
                        let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                        emit(JobEvent::UrlUnavailable { id });
                        return;
                    }
                }
            }
            emit(JobEvent::Progress {
                id: id.clone(),
                stage: Stage::Processing,
                progress: proc_start + proc_span * 0.2,
            });

            let target = desktop.join(format!("{safe_title}.txt"));
            match super::transcribe::run_whisper(&wav, &target, &cancel).await {
                Ok(p) => p,
                Err(super::transcribe::TranscribeError::Cancelled) => {
                    let _ = tokio::fs::remove_file(&target).await;
                    let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                    emit(JobEvent::Cancelled { id });
                    return;
                }
                Err(super::transcribe::TranscribeError::Internal(e)) => {
                    log::error!("transcribe: {e}");
                    let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
                    emit(JobEvent::UrlUnavailable { id });
                    return;
                }
            }
        }
        Branch::Vocals | Branch::Twin => {
            // Demucs path lands in Phase 7. For now we surface as unavailable
            // if demucs is missing so the doctrine holds.
            let _ = tokio::fs::remove_dir_all(&cleanup_work).await;
            emit(JobEvent::UrlUnavailable { id });
            return;
        }
    };

    emit(JobEvent::Progress {
        id: id.clone(),
        stage: Stage::Finalizing,
        progress: 1.0,
    });

    let _ = tokio::fs::remove_dir_all(&cleanup_work).await;

    emit(JobEvent::Done {
        id,
        output_path: output_path.to_string_lossy().into_owned(),
    });
}

fn sanitize_filename(title: &str) -> String {
    let mut s: String = title
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect();
    s = s.trim().to_string();
    if s.is_empty() {
        s = "Untitled".to_string();
    }
    if s.len() > 120 {
        s.truncate(120);
    }
    s
}
