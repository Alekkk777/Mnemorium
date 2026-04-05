use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnnotationRow {
    pub id: String,
    pub image_id: String,
    pub text: String,
    pub note: Option<String>,
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
    pub rot_x: f64,
    pub rot_y: f64,
    pub rot_z: f64,
    pub is_visible: bool,
    pub is_generated: bool,
    pub image_file_path: Option<String>,
    pub ai_prompt: Option<String>,
    // FSRS fields
    pub fsrs_stability: Option<f64>,
    pub fsrs_difficulty: Option<f64>,
    pub fsrs_due: Option<i64>,
    pub fsrs_state: i64,
    pub fsrs_reps: i64,
    pub fsrs_lapses: i64,
    pub fsrs_last_review: Option<i64>,
    pub created_at: i64,
    pub updated_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnnotationInput {
    pub image_id: String,
    pub text: String,
    pub note: Option<String>,
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
    pub rot_x: Option<f64>,
    pub rot_y: Option<f64>,
    pub rot_z: Option<f64>,
    pub is_generated: Option<bool>,
    pub image_file_path: Option<String>,
    pub ai_prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAnnotationInput {
    pub text: Option<String>,
    pub note: Option<String>,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
    pub pos_z: Option<f64>,
    pub is_visible: Option<bool>,
    pub image_file_path: Option<String>,
    pub ai_prompt: Option<String>,
    // FSRS
    pub fsrs_stability: Option<f64>,
    pub fsrs_difficulty: Option<f64>,
    pub fsrs_due: Option<i64>,
    pub fsrs_state: Option<i64>,
    pub fsrs_reps: Option<i64>,
    pub fsrs_lapses: Option<i64>,
    pub fsrs_last_review: Option<i64>,
}

#[tauri::command]
pub async fn get_annotations(
    state: State<'_, AppState>,
    image_id: String,
) -> Result<Vec<AnnotationRow>, String> {
    let pool = &state.db;
    sqlx::query_as!(
        AnnotationRow,
        r#"SELECT id, image_id, text, note,
                  pos_x, pos_y, pos_z, rot_x, rot_y, rot_z,
                  is_visible as "is_visible: bool",
                  is_generated as "is_generated: bool",
                  image_file_path, ai_prompt,
                  fsrs_stability, fsrs_difficulty, fsrs_due,
                  fsrs_state, fsrs_reps, fsrs_lapses, fsrs_last_review,
                  created_at, updated_at
           FROM annotations WHERE image_id = ? ORDER BY created_at ASC"#,
        image_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_due_annotations(
    state: State<'_, AppState>,
    palace_id: String,
) -> Result<Vec<AnnotationRow>, String> {
    let pool = &state.db;
    let now = Utc::now().timestamp();
    sqlx::query_as!(
        AnnotationRow,
        r#"SELECT a.id, a.image_id, a.text, a.note,
                  a.pos_x, a.pos_y, a.pos_z, a.rot_x, a.rot_y, a.rot_z,
                  a.is_visible as "is_visible: bool",
                  a.is_generated as "is_generated: bool",
                  a.image_file_path, a.ai_prompt,
                  a.fsrs_stability, a.fsrs_difficulty, a.fsrs_due,
                  a.fsrs_state, a.fsrs_reps, a.fsrs_lapses, a.fsrs_last_review,
                  a.created_at, a.updated_at
           FROM annotations a
           JOIN palace_images pi ON a.image_id = pi.id
           WHERE pi.palace_id = ?
             AND (a.fsrs_state = 0 OR a.fsrs_due IS NULL OR a.fsrs_due <= ?)
           ORDER BY COALESCE(a.fsrs_due, 0) ASC"#,
        palace_id,
        now
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_annotation(
    state: State<'_, AppState>,
    input: CreateAnnotationInput,
) -> Result<AnnotationRow, String> {
    let pool = &state.db;
    let id = format!("ann_{}", Uuid::new_v4().to_string().replace('-', ""));
    let now = Utc::now().timestamp();
    let rot_x = input.rot_x.unwrap_or(0.0);
    let rot_y = input.rot_y.unwrap_or(0.0);
    let rot_z = input.rot_z.unwrap_or(0.0);
    let is_generated = input.is_generated.unwrap_or(false);

    sqlx::query!(
        "INSERT INTO annotations
         (id, image_id, text, note, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z,
          is_visible, is_generated, image_file_path, ai_prompt, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
        id, input.image_id, input.text, input.note,
        input.pos_x, input.pos_y, input.pos_z, rot_x, rot_y, rot_z,
        is_generated, input.image_file_path, input.ai_prompt, now
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(AnnotationRow {
        id,
        image_id: input.image_id,
        text: input.text,
        note: input.note,
        pos_x: input.pos_x,
        pos_y: input.pos_y,
        pos_z: input.pos_z,
        rot_x,
        rot_y,
        rot_z,
        is_visible: true,
        is_generated,
        image_file_path: input.image_file_path,
        ai_prompt: input.ai_prompt,
        fsrs_stability: None,
        fsrs_difficulty: None,
        fsrs_due: None,
        fsrs_state: 0,
        fsrs_reps: 0,
        fsrs_lapses: 0,
        fsrs_last_review: None,
        created_at: now,
        updated_at: None,
    })
}

#[tauri::command]
pub async fn update_annotation(
    state: State<'_, AppState>,
    id: String,
    input: UpdateAnnotationInput,
) -> Result<(), String> {
    let pool = &state.db;
    let now = Utc::now().timestamp();

    // Build dynamic update - for simplicity update all fields that are provided
    sqlx::query!(
        "UPDATE annotations SET
            text = COALESCE(?, text),
            note = COALESCE(?, note),
            pos_x = COALESCE(?, pos_x),
            pos_y = COALESCE(?, pos_y),
            pos_z = COALESCE(?, pos_z),
            is_visible = COALESCE(?, is_visible),
            image_file_path = COALESCE(?, image_file_path),
            ai_prompt = COALESCE(?, ai_prompt),
            fsrs_stability = COALESCE(?, fsrs_stability),
            fsrs_difficulty = COALESCE(?, fsrs_difficulty),
            fsrs_due = COALESCE(?, fsrs_due),
            fsrs_state = COALESCE(?, fsrs_state),
            fsrs_reps = COALESCE(?, fsrs_reps),
            fsrs_lapses = COALESCE(?, fsrs_lapses),
            fsrs_last_review = COALESCE(?, fsrs_last_review),
            updated_at = ?
         WHERE id = ?",
        input.text,
        input.note,
        input.pos_x,
        input.pos_y,
        input.pos_z,
        input.is_visible,
        input.image_file_path,
        input.ai_prompt,
        input.fsrs_stability,
        input.fsrs_difficulty,
        input.fsrs_due,
        input.fsrs_state,
        input.fsrs_reps,
        input.fsrs_lapses,
        input.fsrs_last_review,
        now,
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_annotation(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let pool = &state.db;
    sqlx::query!("DELETE FROM annotations WHERE id = ?", id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
