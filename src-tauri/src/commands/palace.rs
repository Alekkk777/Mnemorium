use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct PalaceRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
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
    sqlx::query_as::<_, PalaceRow>(
        "SELECT id, name, description, created_at, updated_at FROM palaces ORDER BY updated_at DESC",
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

    sqlx::query(
        "INSERT INTO palaces (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(now)
    .bind(now)
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
        sqlx::query("UPDATE palaces SET name = ?, updated_at = ? WHERE id = ?")
            .bind(&name)
            .bind(now)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(desc) = input.description {
        sqlx::query("UPDATE palaces SET description = ?, updated_at = ? WHERE id = ?")
            .bind(&desc)
            .bind(now)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE palaces SET updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_palace(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;
    sqlx::query("DELETE FROM palaces WHERE id = ?")
        .bind(&id)
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
    sqlx::query_as::<_, PalaceImageRow>(
        "SELECT id, palace_id, name, file_name, local_file_path,
                width, height, is_360, sort_order, created_at
         FROM palace_images WHERE palace_id = ? ORDER BY sort_order ASC",
    )
    .bind(&palace_id)
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

    sqlx::query(
        "INSERT INTO palace_images (id, palace_id, name, file_name, local_file_path, width, height, is_360, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.palace_id)
    .bind(&input.name)
    .bind(&input.file_name)
    .bind(&input.local_file_path)
    .bind(input.width)
    .bind(input.height)
    .bind(input.is_360)
    .bind(input.sort_order)
    .bind(now)
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
    sqlx::query("DELETE FROM palace_images WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Full palace load (single JOIN query) ────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct PalaceFullRow {
    // Palace
    pub palace_id: String,
    pub palace_name: String,
    pub palace_description: Option<String>,
    pub palace_created_at: i64,
    pub palace_updated_at: i64,
    // Image (optional — NULL when palace has no images)
    pub image_id: Option<String>,
    pub image_name: Option<String>,
    pub image_file_name: Option<String>,
    pub image_local_file_path: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
    pub image_is_360: Option<bool>,
    pub image_sort_order: Option<i64>,
    pub image_created_at: Option<i64>,
    // Annotation (optional — NULL when image has no annotations)
    pub ann_id: Option<String>,
    pub ann_text: Option<String>,
    pub ann_note: Option<String>,
    pub ann_pos_x: Option<f64>,
    pub ann_pos_y: Option<f64>,
    pub ann_pos_z: Option<f64>,
    pub ann_rot_x: Option<f64>,
    pub ann_rot_y: Option<f64>,
    pub ann_rot_z: Option<f64>,
    pub ann_is_visible: Option<bool>,
    pub ann_is_generated: Option<bool>,
    pub ann_image_file_path: Option<String>,
    pub ann_ai_prompt: Option<String>,
    pub ann_fsrs_stability: Option<f64>,
    pub ann_fsrs_difficulty: Option<f64>,
    pub ann_fsrs_due: Option<i64>,
    pub ann_fsrs_state: Option<i64>,
    pub ann_fsrs_reps: Option<i64>,
    pub ann_fsrs_lapses: Option<i64>,
    pub ann_fsrs_last_review: Option<i64>,
    pub ann_created_at: Option<i64>,
    pub ann_updated_at: Option<i64>,
}

#[tauri::command]
pub async fn get_palaces_full(state: State<'_, AppState>) -> Result<Vec<PalaceFullRow>, String> {
    let pool = &state.db;
    sqlx::query_as::<_, PalaceFullRow>(
        "SELECT
            p.id          AS palace_id,
            p.name        AS palace_name,
            p.description AS palace_description,
            p.created_at  AS palace_created_at,
            p.updated_at  AS palace_updated_at,

            pi.id               AS image_id,
            pi.name             AS image_name,
            pi.file_name        AS image_file_name,
            pi.local_file_path  AS image_local_file_path,
            pi.width            AS image_width,
            pi.height           AS image_height,
            pi.is_360           AS image_is_360,
            pi.sort_order       AS image_sort_order,
            pi.created_at       AS image_created_at,

            a.id               AS ann_id,
            a.text             AS ann_text,
            a.note             AS ann_note,
            a.pos_x            AS ann_pos_x,
            a.pos_y            AS ann_pos_y,
            a.pos_z            AS ann_pos_z,
            a.rot_x            AS ann_rot_x,
            a.rot_y            AS ann_rot_y,
            a.rot_z            AS ann_rot_z,
            a.is_visible       AS ann_is_visible,
            a.is_generated     AS ann_is_generated,
            a.image_file_path  AS ann_image_file_path,
            a.ai_prompt        AS ann_ai_prompt,
            a.fsrs_stability   AS ann_fsrs_stability,
            a.fsrs_difficulty  AS ann_fsrs_difficulty,
            a.fsrs_due         AS ann_fsrs_due,
            a.fsrs_state       AS ann_fsrs_state,
            a.fsrs_reps        AS ann_fsrs_reps,
            a.fsrs_lapses      AS ann_fsrs_lapses,
            a.fsrs_last_review AS ann_fsrs_last_review,
            a.created_at       AS ann_created_at,
            a.updated_at       AS ann_updated_at
         FROM palaces p
         LEFT JOIN palace_images pi ON p.id = pi.palace_id
         LEFT JOIN annotations a ON pi.id = a.image_id
         ORDER BY p.updated_at DESC, pi.sort_order ASC, a.created_at ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}
