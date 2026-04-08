use serde_json::Value;
use tauri::State;

use crate::AppState;

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<Value>, String> {
    let pool = &state.db;
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT value FROM settings WHERE key = ?",
    )
    .bind(&key)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some((val_str,)) = row {
        let val: Value = serde_json::from_str(&val_str).map_err(|e| e.to_string())?;
        Ok(Some(val))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: Value,
) -> Result<(), String> {
    let pool = &state.db;
    let serialized = serde_json::to_string(&value).map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&serialized)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_all_settings(state: State<'_, AppState>) -> Result<Vec<(String, Value)>, String> {
    let pool = &state.db;
    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT key, value FROM settings ORDER BY key",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for (key, val_str) in rows {
        if let Ok(val) = serde_json::from_str::<Value>(&val_str) {
            result.push((key, val));
        }
    }
    Ok(result)
}
