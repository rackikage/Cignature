mod engine;

use engine::{cancel_job, start_job, JobRegistry};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(JobRegistry::default())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_job, cancel_job])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
