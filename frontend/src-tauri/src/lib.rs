use std::sync::Arc;
use tokio::sync::Mutex;

mod commands;
mod engine;
mod paths;
mod url_canonical;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        active: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::probe_url,
            commands::start_job,
            commands::cancel_job,
            commands::reveal_in_finder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running cigs");
}
