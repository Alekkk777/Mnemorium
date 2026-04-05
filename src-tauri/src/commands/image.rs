use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct SaveImageInput {
    /// Base64-encoded image data (with or without data URL prefix)
    pub data_base64: String,
    /// Original filename for extension detection
    pub file_name: String,
    /// Subdirectory within images dir (e.g. "palace_images", "annotation_images")
    pub subdir: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SaveImageResult {
    /// Relative path stored in DB (e.g. "palace_images/abc123.jpg")
    pub relative_path: String,
    /// Full absolute path for immediate use
    pub absolute_path: String,
}

fn images_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("Failed to get app data dir")
        .join("images")
}

#[tauri::command]
pub async fn save_image_file(
    app: AppHandle,
    input: SaveImageInput,
) -> Result<SaveImageResult, String> {
    let subdir = input.subdir.as_deref().unwrap_or("palace_images");
    let dir = images_dir(&app).join(subdir);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Strip data URL prefix if present
    let base64_data = if let Some(idx) = input.data_base64.find(',') {
        &input.data_base64[idx + 1..]
    } else {
        &input.data_base64
    };

    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;

    // Determine extension from filename
    let ext = std::path::Path::new(&input.file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg");

    let file_id = Uuid::new_v4().to_string().replace('-', "");
    let file_name = format!("{}.{}", file_id, ext);
    let abs_path = dir.join(&file_name);

    std::fs::write(&abs_path, &bytes).map_err(|e| e.to_string())?;

    let relative_path = format!("{}/{}", subdir, file_name);
    Ok(SaveImageResult {
        relative_path,
        absolute_path: abs_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn get_image_url(
    app: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    let abs_path = images_dir(&app).join(&relative_path);
    if !abs_path.exists() {
        return Err(format!("Image not found: {}", relative_path));
    }
    // Tauri converts asset:// URLs for local files in WebView
    // Return the path; frontend uses convertFileSrc() from @tauri-apps/api
    Ok(abs_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_image_file(
    app: AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let abs_path = images_dir(&app).join(&relative_path);
    if abs_path.exists() {
        std::fs::remove_file(&abs_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn read_image_as_base64(
    app: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    let abs_path = images_dir(&app).join(&relative_path);
    let bytes = std::fs::read(&abs_path).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}
