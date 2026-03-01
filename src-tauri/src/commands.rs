use crate::config::{ConfigProfile, HintCategory};
use crate::database::{SessionHistoryEntry, Snippet};
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{command, AppHandle, Emitter, State};
use tokio::sync::mpsc;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTerminalRequest {
    pub label: String,
    pub working_directory: String,
    pub claude_args: Vec<String>,
    pub env_vars: HashMap<String, String>,
    pub color_tag: Option<String>,
    pub nickname: Option<String>,
}

#[command]
pub async fn create_terminal(
    app: AppHandle,
    state: State<'_, AppState>,
    request: CreateTerminalRequest,
) -> Result<crate::terminal::TerminalConfig, String> {
    let (tx, mut rx) = mpsc::channel::<(String, Vec<u8>)>(100);

    // Compute log file path
    let log_path = {
        let data_dir = directories::ProjectDirs::from("com", "claudeterminal", "ClaudeTerminal")
            .ok_or("Failed to get project directories")?
            .data_dir()
            .to_path_buf();
        let logs_dir = data_dir.join("logs");
        std::fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("{}_{}.log", uuid::Uuid::new_v4(), timestamp);
        logs_dir.join(filename).to_string_lossy().to_string()
    };

    let config = {
        let mut terminals = state.terminals.lock().await;
        terminals.create_terminal(
            request.label.clone(),
            request.working_directory,
            request.claude_args,
            request.env_vars,
            request.color_tag,
            request.nickname,
            tx,
            Some(log_path.clone()),
        )?
    };

    // Insert session history entry
    {
        let db = state.db.lock().await;
        let _ = db.insert_session_history(
            &config.id,
            &config.label,
            &config.created_at.to_rfc3339(),
            Some(&log_path),
        );
    }

    let terminal_id = config.id.clone();
    let db_arc = state.db.clone();

    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some((id, data)) = rx.recv().await {
            if let Err(e) = app_clone.emit("terminal-output", serde_json::json!({
                "id": id,
                "data": data,
            })) {
                eprintln!("Failed to emit terminal-output: {}", e);
                break;
            }
        }

        // Terminal process exited — update session history and notify frontend
        {
            let db = db_arc.lock().await;
            let _ = db.update_session_ended(&terminal_id, &chrono::Utc::now().to_rfc3339());
        }

        if let Err(e) = app_clone.emit("terminal-finished", serde_json::json!({
            "id": terminal_id,
        })) {
            eprintln!("Failed to emit terminal-finished: {}", e);
        }
    });

    Ok(config)
}

/// Maximum size for a single write to terminal (64 KB)
const MAX_TERMINAL_WRITE_SIZE: usize = 65_536;

#[command]
pub async fn write_to_terminal(
    state: State<'_, AppState>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    if data.len() > MAX_TERMINAL_WRITE_SIZE {
        return Err(format!(
            "Write payload too large ({} bytes). Maximum is {} bytes.",
            data.len(),
            MAX_TERMINAL_WRITE_SIZE
        ));
    }
    let mut terminals = state.terminals.lock().await;
    terminals.write(&id, &data)
}

#[command]
pub async fn resize_terminal(
    state: State<'_, AppState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().await;
    terminals.resize(&id, cols, rows)
}

#[command]
pub async fn close_terminal(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut terminals = state.terminals.lock().await;
    terminals.close(&id)
}

#[command]
pub async fn get_terminals(
    state: State<'_, AppState>,
) -> Result<Vec<crate::terminal::TerminalConfig>, String> {
    let terminals = state.terminals.lock().await;
    Ok(terminals.get_all_configs())
}

#[command]
pub async fn update_terminal_label(
    state: State<'_, AppState>,
    id: String,
    label: String,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().await;
    terminals.update_label(&id, label)
}

#[command]
pub async fn update_terminal_nickname(
    state: State<'_, AppState>,
    id: String,
    nickname: String,
) -> Result<(), String> {
    let mut terminals = state.terminals.lock().await;
    terminals.update_nickname(&id, nickname)
}

#[command]
pub async fn save_profile(
    state: State<'_, AppState>,
    profile: ConfigProfile,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.save_profile(&profile)
}

#[command]
pub async fn get_profiles(state: State<'_, AppState>) -> Result<Vec<ConfigProfile>, String> {
    let db = state.db.lock().await;
    db.get_profiles()
}

#[command]
pub async fn delete_profile(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_profile(&id)
}

#[command]
pub async fn get_claude_version() -> Result<String, String> {
    let output = shell_command("claude", &["--version"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    String::from_utf8(output.stdout)
        .map(|s| s.trim().to_string())
        .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
}

#[command]
pub async fn check_claude_update() -> Result<UpdateCheckResult, String> {
    // Get current version
    let current_output = shell_command("claude", &["--version"])
        .output()
        .map_err(|e| format!("Failed to get current version: {}", e))?;

    let current_version = String::from_utf8_lossy(&current_output.stdout)
        .trim()
        .to_string();

    if current_version.is_empty() {
        return Err("Claude Code is not installed".to_string());
    }

    // Get latest version from npm
    let npm_output = shell_command("npm", &["view", "@anthropic-ai/claude-code", "version"])
        .output()
        .map_err(|e| format!("Failed to check latest version: {}", e))?;

    let latest_version = String::from_utf8_lossy(&npm_output.stdout)
        .trim()
        .to_string();

    if latest_version.is_empty() {
        return Err("Failed to fetch latest version from npm".to_string());
    }

    // Extract version number from current version string (e.g., "1.0.17 (Claude Code)" -> "1.0.17")
    let current_ver_clean = current_version
        .split_whitespace()
        .next()
        .unwrap_or(&current_version)
        .to_string();

    let update_available = current_ver_clean != latest_version;

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        update_available,
    })
}

#[command]
pub async fn update_claude_code() -> Result<String, String> {
    let output = shell_command("npm", &["install", "-g", "@anthropic-ai/claude-code@latest"])
        .output()
        .map_err(|e| format!("Failed to run npm: {}", e))?;

    if output.status.success() {
        Ok("Claude Code updated successfully!".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(format!("{}{}", stderr, stdout))
    }
}

#[command]
pub fn get_hints() -> Vec<HintCategory> {
    crate::config::get_default_hints()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub node_installed: bool,
    pub node_version: Option<String>,
    pub npm_installed: bool,
    pub npm_version: Option<String>,
    pub claude_installed: bool,
    pub claude_version: Option<String>,
}

/// Creates a Command that works cross-platform.
/// On Windows, wraps the command with `cmd /C` so that `.cmd`/`.bat` scripts
/// (like `npm.cmd`, `claude.cmd`) are resolved correctly.
fn shell_command(program: &str, args: &[&str]) -> std::process::Command {
    if cfg!(target_os = "windows") {
        let mut cmd = std::process::Command::new("cmd");
        cmd.arg("/C").arg(program);
        for arg in args {
            cmd.arg(arg);
        }
        // Prevent a console window from flashing on Windows
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        let mut full_cmd = program.to_string();
        for arg in args {
            full_cmd.push(' ');
            full_cmd.push_str(arg);
        }
        let mut cmd = std::process::Command::new(shell);
        cmd.arg("-lc").arg(&full_cmd);
        cmd
    }
}

#[command]
pub async fn check_system_requirements() -> Result<SystemStatus, String> {
    // Check Node.js
    let node_result = shell_command("node", &["--version"]).output();

    let (node_installed, node_version) = match node_result {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check npm
    let npm_result = shell_command("npm", &["--version"]).output();

    let (npm_installed, npm_version) = match npm_result {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check Claude Code
    let claude_result = shell_command("claude", &["--version"]).output();

    let (claude_installed, claude_version) = match claude_result {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    Ok(SystemStatus {
        node_installed,
        node_version,
        npm_installed,
        npm_version,
        claude_installed,
        claude_version,
    })
}

#[command]
pub async fn install_claude_code() -> Result<String, String> {
    let output = shell_command("npm", &["install", "-g", "@anthropic-ai/claude-code"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Claude Code installed successfully!".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub async fn send_notification(title: String, body: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        notify_rust::Notification::new()
            .summary(&title)
            .body(&body)
            .show()
            .map(|_| ())
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only HTTP and HTTPS URLs are allowed".to_string());
    }
    open::that(&url).map_err(|e| e.to_string())
}

#[command]
pub async fn get_workspaces(
    state: State<'_, AppState>,
) -> Result<Vec<crate::database::WorkspaceInfo>, String> {
    let db = state.db.lock().await;
    db.get_workspaces()
}

#[command]
pub async fn delete_workspace(
    state: State<'_, AppState>,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_workspace(&name)
}

#[command]
pub async fn save_workspace(
    state: State<'_, AppState>,
    name: String,
    terminals: Vec<crate::terminal::TerminalConfig>,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.save_workspace(&name, &terminals)
}

#[command]
pub async fn load_workspace(
    state: State<'_, AppState>,
    name: String,
) -> Result<Vec<crate::terminal::TerminalConfig>, String> {
    let db = state.db.lock().await;
    db.load_workspace(&name)
}

#[command]
pub async fn save_session_for_restore(state: State<'_, AppState>) -> Result<(), String> {
    let configs = {
        let terminals = state.terminals.lock().await;
        terminals.get_all_configs()
    };
    let db = state.db.lock().await;
    db.save_last_session(&configs)
}

#[command]
pub async fn get_last_session(
    state: State<'_, AppState>,
) -> Result<Option<Vec<crate::terminal::TerminalConfig>>, String> {
    let db = state.db.lock().await;
    db.load_last_session()
}

#[command]
pub async fn clear_last_session(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().await;
    db.clear_last_session()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileChange {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileChangesResult {
    pub terminal_id: String,
    pub working_directory: String,
    pub changes: Vec<FileChange>,
    pub is_git_repo: bool,
    pub branch: Option<String>,
    pub error: Option<String>,
}

#[command]
pub async fn get_terminal_changes(
    state: State<'_, AppState>,
    id: String,
) -> Result<FileChangesResult, String> {
    let working_directory = {
        let terminals = state.terminals.lock().await;
        let configs = terminals.get_all_configs();
        configs
            .into_iter()
            .find(|c| c.id == id)
            .map(|c| c.working_directory.clone())
            .ok_or_else(|| "Terminal not found".to_string())?
    };

    // Check if it's a git repo and get branch name
    let branch_output = shell_command("git", &["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&working_directory)
        .output();

    let (is_git_repo, branch) = match branch_output {
        Ok(output) if output.status.success() => {
            let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(branch))
        }
        _ => (false, None),
    };

    if !is_git_repo {
        return Ok(FileChangesResult {
            terminal_id: id,
            working_directory,
            changes: vec![],
            is_git_repo: false,
            branch: None,
            error: None,
        });
    }

    // Get changed files
    let status_output = shell_command("git", &["status", "--porcelain"])
        .current_dir(&working_directory)
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    if !status_output.status.success() {
        return Ok(FileChangesResult {
            terminal_id: id,
            working_directory,
            changes: vec![],
            is_git_repo: true,
            branch,
            error: Some(String::from_utf8_lossy(&status_output.stderr).trim().to_string()),
        });
    }

    let stdout = String::from_utf8_lossy(&status_output.stdout);
    let changes: Vec<FileChange> = stdout
        .lines()
        .filter(|line| line.len() >= 3)
        .map(|line| {
            let code = &line[..2];
            let path = line[3..].to_string();
            let status = match code.trim() {
                "??" => "untracked",
                "A" | "A " => "new",
                "M" | "M " | " M" | "MM" => "modified",
                "D" | "D " | " D" => "deleted",
                r if r.starts_with('R') => "renamed",
                _ => "modified",
            };
            FileChange {
                path,
                status: status.to_string(),
            }
        })
        .collect();

    Ok(FileChangesResult {
        terminal_id: id,
        working_directory,
        changes,
        is_git_repo: true,
        branch,
        error: None,
    })
}

// Session history commands

#[command]
pub async fn get_session_history(
    state: State<'_, AppState>,
) -> Result<Vec<SessionHistoryEntry>, String> {
    let db = state.db.lock().await;
    db.get_session_history()
}

#[command]
pub async fn read_log_file(path: String) -> Result<String, String> {
    // Validate path is under the logs directory
    let data_dir = directories::ProjectDirs::from("com", "claudeterminal", "ClaudeTerminal")
        .ok_or("Failed to get project directories")?
        .data_dir()
        .to_path_buf();
    let logs_dir = data_dir.join("logs");
    let canonical_path = std::path::Path::new(&path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    let canonical_logs = logs_dir
        .canonicalize()
        .unwrap_or(logs_dir);
    if !canonical_path.starts_with(&canonical_logs) {
        return Err("Access denied: path is not under logs directory".to_string());
    }
    std::fs::read_to_string(&canonical_path).map_err(|e| format!("Failed to read log file: {}", e))
}

#[command]
pub async fn delete_session_history(
    state: State<'_, AppState>,
    id: i64,
    log_path: Option<String>,
) -> Result<(), String> {
    // Delete log file if it exists, but only if it's under the logs directory
    if let Some(ref path) = log_path {
        let data_dir = directories::ProjectDirs::from("com", "claudeterminal", "ClaudeTerminal")
            .ok_or("Failed to get project directories")?
            .data_dir()
            .to_path_buf();
        let logs_dir = data_dir.join("logs");
        if let Ok(canonical_path) = std::path::Path::new(path).canonicalize() {
            let canonical_logs = logs_dir.canonicalize().unwrap_or(logs_dir);
            if canonical_path.starts_with(&canonical_logs) {
                let _ = std::fs::remove_file(&canonical_path);
            }
        }
    }
    let db = state.db.lock().await;
    db.delete_session_history_entry(id)
}

// Snippet commands

#[command]
pub async fn save_snippet(
    state: State<'_, AppState>,
    snippet: Snippet,
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.save_snippet(&snippet)
}

#[command]
pub async fn get_snippets(state: State<'_, AppState>) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().await;
    db.get_snippets()
}

#[command]
pub async fn delete_snippet(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().await;
    db.delete_snippet(&id)
}

// Agent Teams (multi-agent orchestration)

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    pub agent_id: String,
    pub name: String,
    pub agent_type: String,
    pub model: Option<String>,
    pub joined_at: Option<u64>,
    pub cwd: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeamConfig {
    pub name: String,
    pub description: Option<String>,
    pub created_at: Option<u64>,
    pub lead_agent_id: Option<String>,
    pub members: Vec<TeamMember>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeamInfo {
    pub dir_name: String,
    pub config: TeamConfig,
    pub task_count: Option<u32>,
}

#[command]
pub async fn get_active_teams() -> Result<Vec<TeamInfo>, String> {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").map_err(|_| "USERPROFILE not set".to_string())?
    } else {
        std::env::var("HOME").map_err(|_| "HOME not set".to_string())?
    };

    let teams_dir = std::path::Path::new(&home).join(".claude").join("teams");
    if !teams_dir.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&teams_dir).map_err(|e| e.to_string())?;
    let mut teams = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let config_path = path.join("config.json");
        if !config_path.exists() {
            continue;
        }

        let config_str = match std::fs::read_to_string(&config_path) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let config: TeamConfig = match serde_json::from_str(&config_str) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let dir_name = entry.file_name().to_string_lossy().to_string();

        // Read task count from .highwatermark
        let tasks_dir = std::path::Path::new(&home)
            .join(".claude")
            .join("tasks")
            .join(&dir_name);
        let hwm_path = tasks_dir.join(".highwatermark");
        let task_count = std::fs::read_to_string(&hwm_path)
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok());

        teams.push(TeamInfo {
            dir_name,
            config,
            task_count,
        });
    }

    Ok(teams)
}
