use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use tokio::sync::mpsc;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalConfig {
    pub id: String,
    pub label: String,
    pub profile_id: Option<String>,
    pub working_directory: String,
    pub claude_args: Vec<String>,
    pub env_vars: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub status: TerminalStatus,
    pub color_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TerminalStatus {
    Running,
    Idle,
    Error,
    Stopped,
}

pub struct Terminal {
    pub config: TerminalConfig,
    #[allow(dead_code)]
    pub pty_pair: PtyPair,
    pub writer: Box<dyn Write + Send>,
}

pub struct TerminalManager {
    pub terminals: HashMap<String, Terminal>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            terminals: HashMap::new(),
        }
    }

    pub fn create_terminal(
        &mut self,
        label: String,
        working_directory: String,
        claude_args: Vec<String>,
        env_vars: HashMap<String, String>,
        color_tag: Option<String>,
        tx: mpsc::Sender<(String, Vec<u8>)>,
    ) -> Result<TerminalConfig, String> {
        let pty_system = native_pty_system();

        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new("claude");

        for arg in &claude_args {
            cmd.arg(arg);
        }

        cmd.cwd(&working_directory);

        for (key, value) in &env_vars {
            cmd.env(key, value);
        }

        let _child = pty_pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        let id = Uuid::new_v4().to_string();
        let config = TerminalConfig {
            id: id.clone(),
            label,
            profile_id: None,
            working_directory,
            claude_args,
            env_vars,
            created_at: Utc::now(),
            status: TerminalStatus::Running,
            color_tag,
        };

        let mut reader = pty_pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;

        let terminal_id = id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buf[..n].to_vec();
                        if tx.blocking_send((terminal_id.clone(), data)).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        self.terminals.insert(
            id.clone(),
            Terminal {
                config: config.clone(),
                pty_pair,
                writer,
            },
        );

        Ok(config)
    }

    pub fn write(&mut self, id: &str, data: &[u8]) -> Result<(), String> {
        if let Some(terminal) = self.terminals.get_mut(id) {
            terminal
                .writer
                .write_all(data)
                .map_err(|e| e.to_string())?;
            terminal.writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }

    pub fn resize(&mut self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        if let Some(terminal) = self.terminals.get_mut(id) {
            terminal
                .pty_pair
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }

    pub fn close(&mut self, id: &str) -> Result<(), String> {
        self.terminals.remove(id);
        Ok(())
    }

    pub fn close_all(&mut self) {
        self.terminals.clear();
    }

    pub fn get_all_configs(&self) -> Vec<TerminalConfig> {
        self.terminals.values().map(|t| t.config.clone()).collect()
    }

    pub fn update_label(&mut self, id: &str, label: String) -> Result<(), String> {
        if let Some(terminal) = self.terminals.get_mut(id) {
            terminal.config.label = label;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }
}
