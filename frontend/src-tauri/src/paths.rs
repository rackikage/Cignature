use std::path::PathBuf;

pub fn desktop_dir() -> PathBuf {
    dirs::desktop_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from("/")))
}

/// Tmp working dir for in-progress jobs. Cleaned up on success/cancel.
pub fn work_dir(job_id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("cigs-{}", job_id))
}
