use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_output_folder")]
    pub output_folder: PathBuf,
}

impl Default for Settings {
    fn default() -> Self {
        Self { output_folder: default_output_folder() }
    }
}

fn default_output_folder() -> PathBuf {
    paths::desktop_dir()
}

pub type SharedSettings = Arc<RwLock<Settings>>;

pub fn load() -> Settings {
    let path = settings_path();
    match std::fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => Settings::default(),
    }
}

pub async fn save(s: &Settings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    let json = serde_json::to_string_pretty(s).map_err(|e| format!("serialize: {e}"))?;
    tokio::fs::write(&path, json).await.map_err(|e| format!("write: {e}"))
}

pub fn settings_path() -> PathBuf {
    paths::app_support_dir().join("settings.json")
}
