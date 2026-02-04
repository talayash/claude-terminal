use crate::config::ConfigProfile;
use crate::terminal::TerminalConfig;
use rusqlite::{params, Connection};
use directories::ProjectDirs;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let data_dir = ProjectDirs::from("com", "claudeterminal", "ClaudeTerminal")
            .ok_or("Failed to get project directories")?
            .data_dir()
            .to_path_buf();

        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

        let db_path = data_dir.join("claudeterminal.db");
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                working_directory TEXT NOT NULL,
                claude_args TEXT NOT NULL,
                env_vars TEXT NOT NULL,
                is_default INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                terminals TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS session_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                terminal_id TEXT NOT NULL,
                label TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                log_path TEXT
            );
            "
        ).map_err(|e| e.to_string())?;

        Ok(Self { conn })
    }

    pub fn save_profile(&self, profile: &ConfigProfile) -> Result<(), String> {
        self.conn.execute(
            "INSERT OR REPLACE INTO profiles (id, name, description, working_directory, claude_args, env_vars, is_default)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                profile.id,
                profile.name,
                profile.description,
                profile.working_directory,
                serde_json::to_string(&profile.claude_args).unwrap(),
                serde_json::to_string(&profile.env_vars).unwrap(),
                profile.is_default as i32,
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_profiles(&self) -> Result<Vec<ConfigProfile>, String> {
        let mut stmt = self.conn
            .prepare("SELECT id, name, description, working_directory, claude_args, env_vars, is_default FROM profiles")
            .map_err(|e| e.to_string())?;

        let profiles = stmt.query_map([], |row| {
            Ok(ConfigProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                working_directory: row.get(3)?,
                claude_args: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                env_vars: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
                is_default: row.get::<_, i32>(6)? != 0,
            })
        }).map_err(|e| e.to_string())?;

        profiles.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_profile(&self, id: &str) -> Result<(), String> {
        self.conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save_workspace(&self, name: &str, terminals: &[TerminalConfig]) -> Result<(), String> {
        let terminals_json = serde_json::to_string(terminals).map_err(|e| e.to_string())?;
        self.conn.execute(
            "INSERT OR REPLACE INTO workspaces (name, terminals, created_at) VALUES (?1, ?2, ?3)",
            params![name, terminals_json, chrono::Utc::now().to_rfc3339()],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn load_workspace(&self, name: &str) -> Result<Vec<TerminalConfig>, String> {
        let terminals_json: String = self.conn
            .query_row("SELECT terminals FROM workspaces WHERE name = ?1", params![name], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        serde_json::from_str(&terminals_json).map_err(|e| e.to_string())
    }
}
