use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigProfile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub working_directory: String,
    pub claude_args: Vec<String>,
    pub env_vars: HashMap<String, String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HintCategory {
    pub name: String,
    pub icon: String,
    pub hints: Vec<Hint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hint {
    pub title: String,
    pub command: String,
    pub description: String,
}

pub fn get_default_hints() -> Vec<HintCategory> {
    vec![
        HintCategory {
            name: "Getting Started".to_string(),
            icon: "rocket".to_string(),
            hints: vec![
                Hint {
                    title: "Start Claude Code".to_string(),
                    command: "claude".to_string(),
                    description: "Launch Claude Code in interactive mode".to_string(),
                },
                Hint {
                    title: "With Custom Model".to_string(),
                    command: "claude --model opus".to_string(),
                    description: "Start with a specific model (opus, sonnet, haiku)".to_string(),
                },
                Hint {
                    title: "Skip Permissions".to_string(),
                    command: "claude --dangerously-skip-permissions".to_string(),
                    description: "Skip permission prompts (use with caution)".to_string(),
                },
            ],
        },
        HintCategory {
            name: "File Operations".to_string(),
            icon: "folder".to_string(),
            hints: vec![
                Hint {
                    title: "Read File".to_string(),
                    command: "Read the contents of [filename]".to_string(),
                    description: "Ask Claude to read and analyze a file".to_string(),
                },
                Hint {
                    title: "Create File".to_string(),
                    command: "Create a new file called [name] with [content]".to_string(),
                    description: "Ask Claude to create a new file".to_string(),
                },
                Hint {
                    title: "Edit File".to_string(),
                    command: "Edit [filename] and [describe changes]".to_string(),
                    description: "Ask Claude to modify an existing file".to_string(),
                },
            ],
        },
        HintCategory {
            name: "Git Operations".to_string(),
            icon: "git-branch".to_string(),
            hints: vec![
                Hint {
                    title: "Git Status".to_string(),
                    command: "Show me the git status".to_string(),
                    description: "Check repository status".to_string(),
                },
                Hint {
                    title: "Create Commit".to_string(),
                    command: "Commit these changes with an appropriate message".to_string(),
                    description: "Stage and commit changes".to_string(),
                },
                Hint {
                    title: "Create Branch".to_string(),
                    command: "Create a new branch called [name]".to_string(),
                    description: "Create and switch to a new branch".to_string(),
                },
            ],
        },
        HintCategory {
            name: "Code Generation".to_string(),
            icon: "code".to_string(),
            hints: vec![
                Hint {
                    title: "Generate Function".to_string(),
                    command: "Write a function that [description]".to_string(),
                    description: "Generate code based on description".to_string(),
                },
                Hint {
                    title: "Refactor Code".to_string(),
                    command: "Refactor [filename] to [improvement]".to_string(),
                    description: "Improve existing code".to_string(),
                },
                Hint {
                    title: "Add Tests".to_string(),
                    command: "Write tests for [filename/function]".to_string(),
                    description: "Generate unit tests".to_string(),
                },
            ],
        },
        HintCategory {
            name: "Debugging".to_string(),
            icon: "bug".to_string(),
            hints: vec![
                Hint {
                    title: "Find Bug".to_string(),
                    command: "Find the bug in [filename]".to_string(),
                    description: "Ask Claude to identify issues".to_string(),
                },
                Hint {
                    title: "Explain Error".to_string(),
                    command: "Explain this error: [error message]".to_string(),
                    description: "Get explanation for error messages".to_string(),
                },
                Hint {
                    title: "Fix Issue".to_string(),
                    command: "Fix the [issue description] in [filename]".to_string(),
                    description: "Ask Claude to fix a specific problem".to_string(),
                },
            ],
        },
        HintCategory {
            name: "CLI Flags".to_string(),
            icon: "terminal".to_string(),
            hints: vec![
                Hint {
                    title: "Max Turns".to_string(),
                    command: "--max-turns <number>".to_string(),
                    description: "Limit conversation turns".to_string(),
                },
                Hint {
                    title: "Output Format".to_string(),
                    command: "--output-format json".to_string(),
                    description: "Set output format (text, json, stream-json)".to_string(),
                },
                Hint {
                    title: "Verbose Mode".to_string(),
                    command: "--verbose".to_string(),
                    description: "Enable verbose logging".to_string(),
                },
                Hint {
                    title: "Working Directory".to_string(),
                    command: "--cwd /path/to/dir".to_string(),
                    description: "Set working directory".to_string(),
                },
                Hint {
                    title: "Allowed Tools".to_string(),
                    command: "--allowed-tools Read,Write,Bash".to_string(),
                    description: "Restrict available tools".to_string(),
                },
            ],
        },
    ]
}
