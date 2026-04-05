use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PalaceRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PalaceImageRow {
    pub id: String,
    pub palace_id: String,
    pub name: String,
    pub file_name: String,
    pub local_file_path: Option<String>,
    pub width: i64,
    pub height: i64,
    pub is_360: bool,
    pub sort_order: i64,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreatePalaceInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePalaceInput {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddImageInput {
    pub palace_id: String,
    pub name: String,
    pub file_name: String,
    pub local_file_path: Option<String>,
    pub width: i64,
    pub height: i64,
    pub is_360: bool,
    pub sort_order: i64,
}

#[tauri::command]
pub async fn get_palaces(state: State<'_, AppState>) -> Result<Vec<PalaceRow>, String> {
    let pool = &state.db;
    sqlx::query_as!(
        PalaceRow,
        "SELECT id, name, description, created_at, updated_at FROM palaces ORDER BY updated_at DESC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_palace(
    state: State<'_, AppState>,
    input: CreatePalaceInput,
) -> Result<PalaceRow, String> {
    let pool = &state.db;
    let id = format!("palace_{}", Uuid::new_v4().to_string().replace('-', ""));
    let now = Utc::now().timestamp();

    sqlx::query!(
        "INSERT INTO palaces (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        id, input.name, input.description, now, now
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PalaceRow {
        id,
        name: input.name,
        description: input.description,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_palace(
    state: State<'_, AppState>,
    id: String,
    input: UpdatePalaceInput,
) -> Result<(), String> {
    let pool = &state.db;
    let now = Utc::now().timestamp();

    if let Some(name) = input.name {
        sqlx::query!("UPDATE palaces SET name = ?, updated_at = ? WHERE id = ?", name, now, id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(desc) = input.description {
        sqlx::query!("UPDATE palaces SET description = ?, updated_at = ? WHERE id = ?", desc, now, id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        sqlx::query!("UPDATE palaces SET updated_at = ? WHERE id = ?", now, id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_palace(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;
    sqlx::query!("DELETE FROM palaces WHERE id = ?", id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_palace_images(
    state: State<'_, AppState>,
    palace_id: String,
) -> Result<Vec<PalaceImageRow>, String> {
    let pool = &state.db;
    sqlx::query_as!(
        PalaceImageRow,
        r#"SELECT id, palace_id, name, file_name, local_file_path,
                  width, height, is_360 as "is_360: bool", sort_order, created_at
           FROM palace_images WHERE palace_id = ? ORDER BY sort_order ASC"#,
        palace_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_palace_image(
    state: State<'_, AppState>,
    input: AddImageInput,
) -> Result<PalaceImageRow, String> {
    let pool = &state.db;
    let id = format!("img_{}", Uuid::new_v4().to_string().replace('-', ""));
    let now = Utc::now().timestamp();

    sqlx::query!(
        "INSERT INTO palace_images (id, palace_id, name, file_name, local_file_path, width, height, is_360, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id, input.palace_id, input.name, input.file_name, input.local_file_path,
        input.width, input.height, input.is_360, input.sort_order, now
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(PalaceImageRow {
        id,
        palace_id: input.palace_id,
        name: input.name,
        file_name: input.file_name,
        local_file_path: input.local_file_path,
        width: input.width,
        height: input.height,
        is_360: input.is_360,
        sort_order: input.sort_order,
        created_at: now,
    })
}

#[tauri::command]
pub async fn delete_palace_image(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;
    sqlx::query!("DELETE FROM palace_images WHERE id = ?", id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
