use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::engine::Branch;
use crate::paths;
use crate::url_canonical;

const HISTORY_CAP: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    #[serde(rename = "canonicalUrl")]
    pub canonical_url: String,
    #[serde(rename = "sourceTitle")]
    pub source_title: String,
    pub branch: Branch,
    #[serde(rename = "completedAt")]
    pub completed_at: i64, // unix seconds
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct History {
    pub entries: Vec<HistoryEntry>,
}

pub type SharedHistory = Arc<RwLock<History>>;

pub fn load() -> History {
    let path = history_path();
    match std::fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => History::default(),
    }
}

pub async fn save(h: &History) -> Result<(), String> {
    let path = history_path();
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    let json = serde_json::to_string_pretty(h).map_err(|e| format!("serialize: {e}"))?;
    tokio::fs::write(&path, json).await.map_err(|e| format!("write: {e}"))
}

pub fn history_path() -> PathBuf {
    paths::app_support_dir().join("history.json")
}

pub fn add_entry(h: &mut History, e: HistoryEntry) {
    h.entries.insert(0, e);
    if h.entries.len() > HISTORY_CAP {
        h.entries.truncate(HISTORY_CAP);
    }
}

/// Find the most recent entry that matches the canonicalized form of `url`.
pub fn find_match<'a>(h: &'a History, url: &str) -> Option<&'a HistoryEntry> {
    let canonical = url_canonical::canonicalize(url);
    h.entries.iter().find(|e| e.canonical_url == canonical)
}
