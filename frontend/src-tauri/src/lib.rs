use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

mod commands;
mod engine;
mod history;
mod paths;
mod settings;
mod setup;
mod url_canonical;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    augment_path();

    let app_state = AppState {
        active: Arc::new(Mutex::new(None)),
        setup: setup::new_shared(),
        settings: Arc::new(RwLock::new(settings::load())),
        history: Arc::new(RwLock::new(history::load())),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::probe_url,
            commands::start_job,
            commands::cancel_job,
            commands::reveal_in_finder,
            commands::setup_status,
            commands::install_demucs,
            commands::get_settings,
            commands::set_output_folder,
            commands::pick_output_folder,
            commands::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running cigs");
}

/// macOS Finder launches GUI apps with a minimal PATH that doesn't include
/// Homebrew prefixes. We rely on yt-dlp / ffmpeg / whisper-cli / python3
/// being on PATH, so prepend the usual install roots and the user's local
/// pip bin (where `pip install --user demucs` lands).
fn augment_path() {
    let mut paths: Vec<String> = Vec::new();
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin").to_string_lossy().into_owned());
        // pip --user on macOS lands in ~/Library/Python/3.x/bin
        if let Ok(dir) = std::fs::read_dir(home.join("Library/Python")) {
            for entry in dir.flatten() {
                let bin = entry.path().join("bin");
                if bin.is_dir() {
                    paths.push(bin.to_string_lossy().into_owned());
                }
            }
        }
    }
    paths.push("/usr/local/bin".to_string());
    paths.push("/opt/homebrew/bin".to_string());
    if let Ok(existing) = std::env::var("PATH") {
        paths.push(existing);
    }
    let joined = paths.join(":");
    std::env::set_var("PATH", joined);
}
