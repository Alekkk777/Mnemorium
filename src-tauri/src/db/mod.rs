use anyhow::Result;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;
use tauri::{AppHandle, Manager};

pub async fn init_db(app: &AppHandle) -> Result<SqlitePool> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    std::fs::create_dir_all(&data_dir)?;

    let db_path = data_dir.join("mnemorium.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // Enable WAL mode for better concurrent performance
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    run_migrations(&pool, &data_dir).await?;

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool, _data_dir: &Path) -> Result<()> {
    // Track applied migrations
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            applied_at INTEGER NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    let migrations = [
        ("001_initial", include_str!("migrations/001_initial.sql")),
        ("002_fsrs", include_str!("migrations/002_fsrs.sql")),
        ("003_recall_sessions", include_str!("migrations/003_recall_sessions.sql")),
        ("004_settings", include_str!("migrations/004_settings.sql")),
    ];

    for (name, sql) in &migrations {
        let applied: Option<i64> = sqlx::query_scalar(
            "SELECT id FROM _migrations WHERE name = ?",
        )
        .bind(name)
        .fetch_optional(pool)
        .await?;

        if applied.is_none() {
            // Run each statement separately (SQLite doesn't support multi-statement in one query)
            for statement in sql.split(';') {
                let trimmed = statement.trim();
                if !trimmed.is_empty() {
                    sqlx::query(trimmed).execute(pool).await?;
                }
            }

            let now = chrono::Utc::now().timestamp();
            sqlx::query("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)")
                .bind(name)
                .bind(now)
                .execute(pool)
                .await?;

            println!("[DB] Migration applied: {}", name);
        }
    }

    Ok(())
}
