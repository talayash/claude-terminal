use crate::config::{ConfigProfile, HintCategory};
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

    let config = {
        let mut terminals = state.terminals.lock().await;
        terminals.create_terminal(
            request.label,
            request.working_directory,
            request.claude_args,
            request.env_vars,
            request.color_tag,
            request.nickname,
            tx,
        )?
    };

    let terminal_id = config.id.clone();
    let terminal_label = config.label.clone();
    let terminal_nickname = config.nickname.clone();

    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some((id, data)) = rx.recv().await {
            let _ = app_clone.emit("terminal-output", serde_json::json!({
                "id": id,
                "data": data,
            }));
        }

        // Terminal process exited — notify the frontend
        let _ = app_clone.emit("terminal-finished", serde_json::json!({
            "id": terminal_id,
            "label": terminal_label,
            "nickname": terminal_nickname,
        }));
    });

    Ok(config)
}

#[command]
pub async fn write_to_terminal(
    state: State<'_, AppState>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
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
        let mut cmd = std::process::Command::new(program);
        for arg in args {
            cmd.arg(arg);
        }
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
pub async fn send_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
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
