# Add a new Tauri IPC command

Add a new Tauri IPC command named `$ARGUMENTS`. If the name is not provided, ask the user.

Follow these steps in order:

## Step 1: Understand the command

Ask the user (if not already clear) what the command should do, what parameters it takes, and what it returns.

## Step 2: Add the Rust handler

Add an async handler function in `src-tauri/src/commands.rs`. Follow existing patterns:
- Use `#[tauri::command]` attribute
- Accept `state: tauri::State<'_, AppState>` if database or terminal access is needed
- Return `Result<T, String>` where T is the appropriate return type
- Map errors with `.map_err(|e| e.to_string())`

## Step 3: Register in main.rs

Add the new command to the `invoke_handler` macro call in `src-tauri/src/main.rs`.

## Step 4: Add the TypeScript invoke call

Add the corresponding `invoke<ReturnType>('command_name', { params })` call in the appropriate frontend file. Import `invoke` from `@tauri-apps/api/core`.

## Step 5: Verify

- Confirm the command name matches exactly between Rust registration and TypeScript invoke
- Confirm parameter names match between Rust and TypeScript
- Confirm the return type is handled properly (try/catch in TypeScript)
