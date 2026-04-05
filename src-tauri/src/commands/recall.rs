use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
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

    sqlx::query!(
        "INSERT INTO recall_sessions (id, palace_id, started_at, ended_at, total_cards, remembered, forgotten, accuracy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        id, input.palace_id, input.started_at, ended_at,
        input.total_cards, input.remembered, input.forgotten, accuracy
    )
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

    sqlx::query!(
        "INSERT INTO recall_results (id, session_id, annotation_id, rating, time_spent_ms)
         VALUES (?, ?, ?, ?, ?)",
        id, input.session_id, input.annotation_id, input.rating, input.time_spent_ms
    )
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

    let sessions = sqlx::query!(
        "SELECT COUNT(*) as count, AVG(accuracy) as avg_acc, MAX(accuracy) as best_acc, MAX(started_at) as last_date
         FROM recall_sessions WHERE palace_id = ?",
        palace_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let due_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as "count: i64"
           FROM annotations a
           JOIN palace_images pi ON a.image_id = pi.id
           WHERE pi.palace_id = ?
             AND (a.fsrs_state = 0 OR a.fsrs_due IS NULL OR a.fsrs_due <= ?)"#,
        palace_id,
        now
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?
    .unwrap_or(0);

    Ok(PalaceRecallStats {
        total_sessions: sessions.count.unwrap_or(0),
        average_accuracy: sessions.avg_acc.unwrap_or(0.0),
        best_accuracy: sessions.best_acc.unwrap_or(0.0),
        last_session_date: sessions.last_date,
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

    sqlx::query_as!(
        RecallSessionRow,
        "SELECT id, palace_id, started_at, ended_at, total_cards, remembered, forgotten, accuracy
         FROM recall_sessions WHERE palace_id = ? ORDER BY started_at DESC LIMIT ?",
        palace_id,
        limit
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}
