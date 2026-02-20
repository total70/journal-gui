use std::process::Command;
use tauri::command;

#[command]
pub async fn create_entry(content: String) -> Result<String, String> {
    if content.trim().is_empty() {
        return Err("Content cannot be empty".to_string());
    }

    let output = Command::new("journal-ai")
        .arg(&content)
        .output()
        .map_err(|e| format!("Failed to execute journal-ai: {}. Is it installed?", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("journal-ai failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

#[command]
pub async fn check_dependencies() -> Result<DependencyStatus, String> {
    let journal_ai = Command::new("which")
        .arg("journal-ai")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);

    let file_journal = Command::new("which")
        .arg("file-journal")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);

    Ok(DependencyStatus {
        journal_ai,
        file_journal,
    })
}

#[derive(serde::Serialize)]
pub struct DependencyStatus {
    pub journal_ai: bool,
    pub file_journal: bool,
}
