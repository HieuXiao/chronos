use tauri_plugin_sql::{Migration, MigrationKind};

/// Default database, resolved by tauri-plugin-sql relative to the app config dir,
/// i.e. `%APPDATA%\chronos\data.db` on Windows. A custom folder chosen in
/// Settings replaces it with an absolute path (see `storage.rs`).
pub const DB_URL: &str = "sqlite:data.db";

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../../src/db/migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "single_running_session",
            sql: include_str!("../../src/db/migrations/002_single_running_session.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "chart_palette",
            sql: include_str!("../../src/db/migrations/003_chart_palette.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "project_dates",
            sql: include_str!("../../src/db/migrations/004_project_dates.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "daily_goals",
            sql: include_str!("../../src/db/migrations/005_daily_goals.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "project_groups",
            sql: include_str!("../../src/db/migrations/006_project_groups.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "sample_groups",
            sql: include_str!("../../src/db/migrations/007_sample_groups.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "reports",
            sql: include_str!("../../src/db/migrations/008_reports.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "project_purpose_links",
            sql: include_str!("../../src/db/migrations/009_project_purpose_links.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "unified_palette",
            sql: include_str!("../../src/db/migrations/010_unified_palette.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
