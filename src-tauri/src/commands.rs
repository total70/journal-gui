use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};
use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
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

#[command]
pub async fn summarize_entries(week: Option<bool>, #[allow(non_snake_case)] previous_week: Option<bool>) -> Result<String, String> {
    let week = week.unwrap_or(false);
    let previous_week = previous_week.unwrap_or(false);
    let mut cmd = Command::new("journal-ai");
    cmd.arg("summarize");

    if previous_week {
        cmd.arg("--previous-week");
    } else if week {
        cmd.arg("--week");
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute journal-ai summarize: {}. Is it installed?", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("journal-ai summarize failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

fn default_journal_path() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Could not determine home directory")?;
    Ok(home.join("Documents").join("journals"))
}

fn read_file_journal_default_path() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Could not determine home directory")?;
    let cfg_path = home
        .join(".config")
        .join("file-journal")
        .join("config.toml");

    if !cfg_path.exists() {
        return default_journal_path();
    }

    let content = fs::read_to_string(&cfg_path)
        .with_context(|| format!("Failed to read {}", cfg_path.display()))?;

    let value: toml::Value = toml::from_str(&content).context("Failed to parse file-journal config")?;

    if let Some(p) = value.get("default_path").and_then(|v| v.as_str()) {
        Ok(PathBuf::from(p))
    } else {
        default_journal_path()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodoItem {
    pub path: String,
    pub id: String,
    pub text: String,
    pub linked_note: String,
    pub status: String,
    pub priority: Option<String>,
    pub due: Option<String>,
    pub created: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TodoFrontmatter {
    id: String,
    linked_note: String,
    created: Option<String>,
    updated: Option<String>,
    status: String,
    completed: Option<String>,
    due: Option<String>,
    priority: Option<String>,
    tags: Option<Vec<String>>,
}

fn parse_todo_file(path: &Path) -> Result<(TodoFrontmatter, String)> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read todo file {}", path.display()))?;

    // expected: ---\n<yaml>---\n\n<body>
    let mut parts = content.splitn(3, "---");
    let _ = parts.next(); // before first ---
    let yaml_part = parts.next().unwrap_or("");
    let rest = parts.next().unwrap_or("");

    let fm: TodoFrontmatter = serde_yaml::from_str(yaml_part).context("Failed to parse todo frontmatter")?;

    // body begins after optional leading newlines
    let body = rest.trim_start_matches('\n').trim_start_matches('\r').to_string();
    Ok((fm, body.trim().to_string()))
}

fn write_todo_file(path: &Path, fm: &TodoFrontmatter, body: &str) -> Result<()> {
    let yaml = serde_yaml::to_string(fm).context("Failed to serialize todo frontmatter")?;
    let content = format!("---\n{}---\n\n{}\n", yaml, body.trim());

    // atomic write
    let tmp = path.with_extension("md.tmp");
    fs::write(&tmp, content).with_context(|| format!("Failed to write tmp {}", tmp.display()))?;
    fs::rename(&tmp, path).with_context(|| format!("Failed to rename tmp to {}", path.display()))?;
    Ok(())
}

#[command]
pub async fn list_todos() -> Result<Vec<TodoItem>, String> {
    (|| -> Result<Vec<TodoItem>> {
        let root = read_file_journal_default_path()?;
        let dir = root.join("todos");
        if !dir.exists() {
            return Ok(vec![]);
        }

        let mut items = vec![];
        for entry in fs::read_dir(&dir).with_context(|| format!("Failed to read dir {}", dir.display()))? {
            let entry = entry?;
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }
            let (fm, body) = parse_todo_file(&p)?;
            if fm.status != "pending" {
                continue;
            }
            items.push(TodoItem {
                path: p.to_string_lossy().to_string(),
                id: fm.id,
                text: body.lines().next().unwrap_or("").to_string(),
                linked_note: fm.linked_note,
                status: fm.status,
                priority: fm.priority,
                due: fm.due,
                created: fm.created,
            });
        }

        // newest first by filename
        items.sort_by(|a, b| b.path.cmp(&a.path));
        Ok(items)
    })()
    .map_err(|e| e.to_string())
}

#[command]
pub async fn set_todo_status(path: String, status: String) -> Result<(), String> {
    (|| -> Result<()> {
        let p = PathBuf::from(&path);
        let (mut fm, body) = parse_todo_file(&p)?;
        fm.status = status.clone();
        fm.updated = Some(Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true));
        if status == "done" {
            fm.completed = Some(Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true));
        }
        write_todo_file(&p, &fm, &body)?;
        Ok(())
    })()
    .map_err(|e| e.to_string())
}

#[command]
pub async fn open_linked_note(linked_note: String) -> Result<(), String> {
    (|| -> Result<()> {
        let root = read_file_journal_default_path()?;
        let note_path = root.join(linked_note);

        if !note_path.exists() {
            anyhow::bail!("Linked note not found: {}", note_path.display());
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("open").arg(&note_path).spawn().context("Failed to open note")?;
        }

        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open").arg(&note_path).spawn().context("Failed to open note")?;
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("cmd")
                .args(["/C", "start", note_path.to_str().unwrap_or("")])
                .spawn()
                .context("Failed to open note")?;
        }

        Ok(())
    })()
    .map_err(|e| e.to_string())
}
