use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::engine::job::{ActiveJob, StartArgs};
use crate::engine::{Branch, CancelToken, JobEvent, JobHandle, run_job};
use crate::engine::fetch;
use crate::history::{self, HistoryEntry, SharedHistory};
use crate::settings::{self, Settings, SharedSettings};
use crate::setup::{self, SetupStatus, SharedSetup};
use crate::url_canonical;

#[derive(Clone)]
pub struct AppState {
    pub active: ActiveJob,
    pub setup: SharedSetup,
    pub settings: SharedSettings,
    pub history: SharedHistory,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum ProbeResult {
    Ok {
        title: String,
        platform: String,
        #[serde(rename = "durationSec")]
        duration_sec: Option<f64>,
        #[serde(rename = "duplicateOf")]
        duplicate_of: Option<DuplicateInfo>,
    },
    Unavailable {
        reason: crate::engine::fetch::UnavailableReason,
    },
}

#[derive(Debug, Serialize)]
pub struct DuplicateInfo {
    pub branch: Branch,
    #[serde(rename = "completedAt")]
    pub completed_at: i64,
}

#[tauri::command]
pub async fn probe_url(state: State<'_, AppState>, url: String) -> Result<ProbeResult, String> {
    match fetch::probe(&url).await {
        Ok(p) => {
            let history = state.history.read().await;
            let dup = history::find_match(&history, &url).map(|e| DuplicateInfo {
                branch: e.branch,
                completed_at: e.completed_at,
            });
            Ok(ProbeResult::Ok {
                title: p.title,
                platform: p.platform,
                duration_sec: p.duration_sec,
                duplicate_of: dup,
            })
        }
        Err(reason) => Ok(ProbeResult::Unavailable { reason }),
    }
}

#[derive(Debug, Serialize)]
pub struct StartJobResult {
    pub id: String,
}

#[tauri::command]
pub async fn start_job(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    branch: Branch,
) -> Result<StartJobResult, String> {
    let mut slot = state.active.lock().await;
    if slot.is_some() {
        return Err("busy".into());
    }
    let id = Uuid::new_v4().to_string();
    let cancel = CancelToken::new();
    *slot = Some(JobHandle::new(id.clone(), cancel.clone()));
    drop(slot);

    // Snapshot output folder from settings (the engine works on a stable value
    // for the whole job).
    let output_folder = {
        let s = state.settings.read().await;
        s.output_folder.clone()
    };

    let id_for_task = id.clone();
    let id_for_result = id.clone();
    let active = Arc::clone(&state.active);
    let history = Arc::clone(&state.history);
    let emit_app = app.clone();
    let url_for_history = url.clone();
    let branch_for_history = branch;

    tauri::async_runtime::spawn(async move {
        let active_for_clear = Arc::clone(&active);
        let history_for_save = Arc::clone(&history);
        run_job(
            id_for_task,
            StartArgs { url, branch, output_folder },
            cancel,
            move |ev: JobEvent| {
                // emit
                let _ = emit_app.emit("job://event", &ev);
                // on done, record history (best-effort)
                if let JobEvent::Done { id: _, output_path: _ } = &ev {
                    let h = Arc::clone(&history_for_save);
                    let canonical = url_canonical::canonicalize(&url_for_history);
                    // We can't fish the resolved title out of the closure here
                    // without more plumbing — Probed carries it. Record what we
                    // have; Phase 9 may thread the title through.
                    let entry = HistoryEntry {
                        canonical_url: canonical,
                        source_title: String::new(),
                        branch: branch_for_history,
                        completed_at: unix_now(),
                    };
                    tauri::async_runtime::spawn(async move {
                        let mut hist = h.write().await;
                        history::add_entry(&mut hist, entry);
                        let snapshot = hist.clone();
                        drop(hist);
                        let _ = history::save(&snapshot).await;
                    });
                }
            },
        )
        .await;
        // clear active slot on any terminal state
        let mut slot = active_for_clear.lock().await;
        *slot = None;
    });

    Ok(StartJobResult { id: id_for_result })
}

fn unix_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[tauri::command]
pub async fn cancel_job(state: State<'_, AppState>) -> Result<(), String> {
    let slot = state.active.lock().await;
    if let Some(handle) = slot.as_ref() {
        handle.cancel.cancel();
    }
    Ok(())
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), String> {
    let _ = tokio::process::Command::new("open")
        .args(["-R", &path])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();
    Ok(())
}

#[tauri::command]
pub fn setup_status() -> SetupStatus {
    setup::check()
}

#[tauri::command]
pub async fn install_demucs(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    setup::install_demucs(app, Arc::clone(&state.setup)).await
}

#[derive(Debug, Serialize)]
pub struct SettingsView {
    #[serde(rename = "outputFolder")]
    pub output_folder: String,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsView, String> {
    let s = state.settings.read().await;
    Ok(SettingsView {
        output_folder: s.output_folder.to_string_lossy().into_owned(),
    })
}

#[derive(Debug, Deserialize)]
pub struct OutputFolderArgs {
    pub path: String,
}

#[tauri::command]
pub async fn set_output_folder(
    state: State<'_, AppState>,
    path: String,
) -> Result<SettingsView, String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err("not a directory".into());
    }
    let mut s = state.settings.write().await;
    s.output_folder = p;
    let snapshot = s.clone();
    drop(s);
    settings::save(&snapshot).await?;
    Ok(SettingsView {
        output_folder: snapshot.output_folder.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub async fn pick_output_folder() -> Result<Option<String>, String> {
    // Use AppleScript to pop a folder picker — keeps us off the
    // tauri-plugin-dialog dependency for v1.
    let out = tokio::process::Command::new("osascript")
        .arg("-e")
        .arg("POSIX path of (choose folder with prompt \"Choose where Cigs saves output\")")
        .output()
        .await
        .map_err(|e| format!("osascript: {e}"))?;
    if !out.status.success() {
        return Ok(None); // user cancelled
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() { Ok(None) } else { Ok(Some(s)) }
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    let mut h = state.history.write().await;
    h.entries.clear();
    let snapshot = h.clone();
    drop(h);
    history::save(&snapshot).await
}
