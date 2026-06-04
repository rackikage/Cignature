use serde::Serialize;
use std::process::Stdio;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Clone)]
pub struct SetupStatus {
    pub demucs: bool,
}

pub fn check() -> SetupStatus {
    SetupStatus {
        demucs: crate::engine::separate::is_demucs_available(),
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum SetupEvent {
    InstallStarted,
    InstallLine { text: String },
    InstallDone,
    InstallFailed { reason: String },
}

#[derive(Default)]
pub struct SetupRunner {
    busy: AtomicBool,
}

pub type SharedSetup = Arc<Mutex<SetupRunner>>;

pub fn new_shared() -> SharedSetup {
    Arc::new(Mutex::new(SetupRunner::default()))
}

pub async fn install_demucs(
    app: AppHandle,
    shared: SharedSetup,
) -> Result<(), String> {
    {
        let runner = shared.lock().await;
        if runner.busy.swap(true, Ordering::SeqCst) {
            return Err("setup already running".into());
        }
    }

    let app_clone = app.clone();
    let shared_clone = Arc::clone(&shared);

    tauri::async_runtime::spawn(async move {
        let _ = app_clone.emit("setup://event", &SetupEvent::InstallStarted);

        let py = match which::which("python3") {
            Ok(p) => p,
            Err(_) => {
                let _ = app_clone.emit(
                    "setup://event",
                    &SetupEvent::InstallFailed {
                        reason: "python3 missing".into(),
                    },
                );
                let runner = shared_clone.lock().await;
                runner.busy.store(false, Ordering::SeqCst);
                return;
            }
        };

        // --user keeps it out of the system Python and avoids sudo.
        // demucs pulls torch via its own deps.
        let mut child = match Command::new(&py)
            .args(["-u", "-m", "pip", "install", "--user", "--upgrade", "demucs"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("PYTHONUNBUFFERED", "1")
            .kill_on_drop(true)
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app_clone.emit(
                    "setup://event",
                    &SetupEvent::InstallFailed {
                        reason: format!("spawn pip: {e}"),
                    },
                );
                let runner = shared_clone.lock().await;
                runner.busy.store(false, Ordering::SeqCst);
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let app_for_stdout = app_clone.clone();
        let stdout_task = tokio::spawn(async move {
            if let Some(stdout) = stdout {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_for_stdout.emit(
                        "setup://event",
                        &SetupEvent::InstallLine { text: line },
                    );
                }
            }
        });

        let app_for_stderr = app_clone.clone();
        let stderr_task = tokio::spawn(async move {
            if let Some(stderr) = stderr {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_for_stderr.emit(
                        "setup://event",
                        &SetupEvent::InstallLine { text: line },
                    );
                }
            }
        });

        let status = child.wait().await;
        let _ = stdout_task.await;
        let _ = stderr_task.await;

        let runner = shared_clone.lock().await;
        runner.busy.store(false, Ordering::SeqCst);
        drop(runner);

        match status {
            Ok(s) if s.success() => {
                // Re-verify import to make sure demucs is actually wired.
                if crate::engine::separate::is_demucs_available() {
                    let _ = app_clone.emit("setup://event", &SetupEvent::InstallDone);
                } else {
                    let _ = app_clone.emit(
                        "setup://event",
                        &SetupEvent::InstallFailed {
                            reason: "demucs installed but not importable".into(),
                        },
                    );
                }
            }
            Ok(s) => {
                let _ = app_clone.emit(
                    "setup://event",
                    &SetupEvent::InstallFailed {
                        reason: format!("pip exit {}", s),
                    },
                );
            }
            Err(e) => {
                let _ = app_clone.emit(
                    "setup://event",
                    &SetupEvent::InstallFailed {
                        reason: format!("wait pip: {e}"),
                    },
                );
            }
        }
    });

    Ok(())
}
