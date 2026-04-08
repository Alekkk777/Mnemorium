use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RecallSessionRow {
    pub id: String,
    pub palace_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub total_cards: i64,
    pub remembered: i64,
    pub forgotten: i64,
    pub accuracy: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct SaveRecallSessionInput {
    pub palace_id: String,
    pub started_at: i64,
    pub total_cards: i64,
    pub remembered: i64,
    pub forgotten: i64,
}

#[derive(Debug, Deserialize)]
pub struct SaveRecallResultInput {
    pub session_id: String,
    pub annotation_id: String,
    pub rating: i64,
    pub time_spent_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct PalaceRecallStats {
    pub total_sessions: i64,
    pub average_accuracy: f64,
    pub best_accuracy: f64,
    pub last_session_date: Option<i64>,
    pub total_due: i64,
}

#[derive(FromRow)]
struct SessionStatsRow {
    count: i64,
    avg_acc: Option<f64>,
    best_acc: Option<f64>,
    last_date: Option<i64>,
}

#[tauri::command]
pub async fn save_recall_session(
    state: State<'_, AppState>,
    input: SaveRecallSessionInput,
) -> Result<String, String> {
    let pool = &state.db;
    let id = format!("session_{}", Uuid::new_v4().to_string().replace('-', ""));
    let ended_at = Utc::now().timestamp();
    let accuracy = if input.total_cards > 0 {
        Some(input.remembered as f64 / input.total_cards as f64 * 100.0)
    } else {
        None
    };

    sqlx::query(
        "INSERT INTO recall_sessions (id, palace_id, started_at, ended_at, total_cards, remembered, forgotten, accuracy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.palace_id)
    .bind(input.started_at)
    .bind(ended_at)
    .bind(input.total_cards)
    .bind(input.remembered)
    .bind(input.forgotten)
    .bind(accuracy)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn save_recall_result(
    state: State<'_, AppState>,
    input: SaveRecallResultInput,
) -> Result<(), String> {
    let pool = &state.db;
    let id = format!("result_{}", Uuid::new_v4().to_string().replace('-', ""));

    sqlx::query(
        "INSERT INTO recall_results (id, session_id, annotation_id, rating, time_spent_ms)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.session_id)
    .bind(&input.annotation_id)
    .bind(input.rating)
    .bind(input.time_spent_ms)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_palace_recall_stats(
    state: State<'_, AppState>,
    palace_id: String,
) -> Result<PalaceRecallStats, String> {
    let pool = &state.db;
    let now = Utc::now().timestamp();

    let stats = sqlx::query_as::<_, SessionStatsRow>(
        "SELECT COUNT(*) as count, AVG(accuracy) as avg_acc, MAX(accuracy) as best_acc, MAX(started_at) as last_date
         FROM recall_sessions WHERE palace_id = ?",
    )
    .bind(&palace_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let due_count: i64 = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM annotations a
         JOIN palace_images pi ON a.image_id = pi.id
         WHERE pi.palace_id = ?
           AND (a.fsrs_state = 0 OR a.fsrs_due IS NULL OR a.fsrs_due <= ?)",
    )
    .bind(&palace_id)
    .bind(now)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PalaceRecallStats {
        total_sessions: stats.count,
        average_accuracy: stats.avg_acc.unwrap_or(0.0),
        best_accuracy: stats.best_acc.unwrap_or(0.0),
        last_session_date: stats.last_date,
        total_due: due_count,
    })
}

#[tauri::command]
pub async fn get_recent_sessions(
    state: State<'_, AppState>,
    palace_id: String,
    limit: Option<i64>,
) -> Result<Vec<RecallSessionRow>, String> {
    let pool = &state.db;
    let limit = limit.unwrap_or(10);

    sqlx::query_as::<_, RecallSessionRow>(
        "SELECT id, palace_id, started_at, ended_at, total_cards, remembered, forgotten, accuracy
         FROM recall_sessions WHERE palace_id = ? ORDER BY started_at DESC LIMIT ?",
    )
    .bind(&palace_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}
