#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod terminal;
mod config;
mod database;

use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub terminals: Arc<Mutex<terminal::TerminalManager>>,
    pub db: Arc<Mutex<database::Database>>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db = database::Database::new()?;
            let terminal_manager = terminal::TerminalManager::new();

            app.manage(AppState {
                terminals: Arc::new(Mutex::new(terminal_manager)),
                db: Arc::new(Mutex::new(db)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_terminal,
            commands::write_to_terminal,
            commands::resize_terminal,
            commands::close_terminal,
            commands::get_terminals,
            commands::update_terminal_label,
            commands::save_profile,
            commands::get_profiles,
            commands::delete_profile,
            commands::get_claude_version,
            commands::update_claude_code,
            commands::get_hints,
            commands::save_workspace,
            commands::load_workspace,
            commands::check_system_requirements,
            commands::install_claude_code,
            commands::open_external_url,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app_state = window.state::<AppState>();
                let terminals = app_state.terminals.clone();
                tauri::async_runtime::block_on(async {
                    let mut manager = terminals.lock().await;
                    manager.close_all();
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
