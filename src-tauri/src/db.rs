use tauri_plugin_sql::{Migration, MigrationKind};

/// Resolved by tauri-plugin-sql relative to the app config dir,
/// i.e. `%APPDATA%\chronos\data.db` on Windows.
/// Must match `DB_URL` in `src/db/client.ts` and `plugins.sql.preload` in `tauri.conf.json`.
pub const DB_URL: &str = "sqlite:data.db";

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../../src/db/migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }]
}
