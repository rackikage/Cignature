use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::engine::{Branch, CancelToken, JobEvent, JobHandle, run_job};
use crate::engine::job::{ActiveJob, StartArgs};
use crate::engine::fetch;

#[derive(Clone)]
pub struct AppState {
    pub active: ActiveJob,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum ProbeResult {
    Ok {
        title: String,
        platform: String,
        #[serde(rename = "durationSec")]
        duration_sec: Option<f64>,
    },
    Unavailable,
}

#[tauri::command]
pub async fn probe_url(url: String) -> ProbeResult {
    match fetch::probe(&url).await {
        Ok(p) => ProbeResult::Ok {
            title: p.title,
            platform: p.platform,
            duration_sec: p.duration_sec,
        },
        Err(_) => ProbeResult::Unavailable,
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

    let id_for_task = id.clone();
    let id_for_result = id.clone();
    let active = Arc::clone(&state.active);
    let emit_app = app.clone();

    tauri::async_runtime::spawn(async move {
        let active_for_clear = Arc::clone(&active);
        run_job(
            id_for_task,
            StartArgs { url, branch },
            cancel,
            move |ev: JobEvent| {
                let _ = emit_app.emit("job://event", &ev);
            },
        )
        .await;
        // clear active slot on any terminal state
        let mut slot = active_for_clear.lock().await;
        *slot = None;
    });

    Ok(StartJobResult { id: id_for_result })
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
    // macOS: `open -R <path>` reveals the file in Finder.
    let _ = tokio::process::Command::new("open")
        .args(["-R", &path])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();
    Ok(())
}
