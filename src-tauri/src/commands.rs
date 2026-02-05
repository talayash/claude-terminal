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

    let app_clone = app.clone();
    tokio::spawn(async move {
        while let Some((id, data)) = rx.recv().await {
            let _ = app_clone.emit("terminal-output", serde_json::json!({
                "id": id,
                "data": data,
            }));
        }
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
    let output = std::process::Command::new("claude")
        .arg("--version")
        .output()
        .map_err(|e| e.to_string())?;

    String::from_utf8(output.stdout)
        .map(|s| s.trim().to_string())
        .map_err(|e| e.to_string())
}

#[command]
pub async fn update_claude_code() -> Result<String, String> {
    let output = std::process::Command::new("npm")
        .args(["update", "-g", "@anthropic-ai/claude-code"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Claude Code updated successfully".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
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

#[command]
pub async fn check_system_requirements() -> Result<SystemStatus, String> {
    // Check Node.js
    let node_result = std::process::Command::new("node")
        .arg("--version")
        .output();

    let (node_installed, node_version) = match node_result {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check npm
    let npm_result = std::process::Command::new("npm")
        .arg("--version")
        .output();

    let (npm_installed, npm_version) = match npm_result {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check Claude Code
    let claude_result = std::process::Command::new("claude")
        .arg("--version")
        .output();

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
    let output = std::process::Command::new("npm")
        .args(["install", "-g", "@anthropic-ai/claude-code"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Claude Code installed successfully!".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
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
