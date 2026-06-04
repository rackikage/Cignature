use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

use super::job::CancelToken;

/// Zip the two stem files into `target_zip`, naming the entries by the
/// provided labels. Uses the system `zip` binary (preinstalled on macOS).
pub async fn zip_two(
    vocals: &Path,
    instrumental: &Path,
    target_zip: &Path,
    vocals_name: &str,
    instrumental_name: &str,
    cancel: &CancelToken,
) -> Result<PathBuf, PackError> {
    if target_zip.exists() {
        let _ = tokio::fs::remove_file(target_zip).await;
    }

    // We stage the files under temp with the desired entry names, then
    // call zip from that staging dir so the zip entries are bare names
    // (no leading path components).
    let stage_dir = target_zip.with_extension("stage");
    let _ = tokio::fs::remove_dir_all(&stage_dir).await;
    tokio::fs::create_dir_all(&stage_dir)
        .await
        .map_err(|e| PackError::Internal(format!("mkdir stage: {e}")))?;

    let staged_vocals = stage_dir.join(vocals_name);
    let staged_instr = stage_dir.join(instrumental_name);
    tokio::fs::copy(vocals, &staged_vocals)
        .await
        .map_err(|e| PackError::Internal(format!("stage vocals: {e}")))?;
    tokio::fs::copy(instrumental, &staged_instr)
        .await
        .map_err(|e| PackError::Internal(format!("stage instrumental: {e}")))?;

    let mut child = Command::new("zip")
        .arg("-j") // junk paths — entries are bare names
        .arg("-q") // quiet
        .arg(target_zip)
        .arg(&staged_vocals)
        .arg(&staged_instr)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| PackError::Internal(format!("spawn zip: {e}")))?;

    cancel.bind(&child).map_err(|_| PackError::Cancelled)?;

    let status = child
        .wait()
        .await
        .map_err(|e| PackError::Internal(format!("wait zip: {e}")))?;

    let _ = tokio::fs::remove_dir_all(&stage_dir).await;

    if cancel.is_cancelled() {
        let _ = tokio::fs::remove_file(target_zip).await;
        return Err(PackError::Cancelled);
    }

    if !status.success() {
        return Err(PackError::Internal(format!("zip exit {}", status)));
    }

    Ok(target_zip.to_path_buf())
}

#[derive(Debug)]
pub enum PackError {
    Internal(String),
    Cancelled,
}
