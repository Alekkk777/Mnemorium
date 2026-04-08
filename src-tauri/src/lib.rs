use sqlx::SqlitePool;
use tauri::Manager;

pub mod commands;
pub mod db;
pub mod python;

pub struct AppState {
    pub db: SqlitePool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // Init DB synchronously using block_on
            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&handle).await.expect("Failed to initialize database")
            });

            app.manage(AppState { db: pool });

            // Manage Python server (Tauri wraps in Arc internally)
            app.manage(python::manager::PythonServer::new());

            // Start Python AI server in background thread (non-blocking, best-effort)
            let server_handle = handle.clone();
            std::thread::spawn(move || {
                let server = server_handle.state::<python::manager::PythonServer>();
                match server.start(&server_handle) {
                    Ok(port) => println!("[Python] AI server started on port {}", port),
                    Err(e) => println!("[Python] AI server not available: {} (app continues without AI)", e),
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Palace
            commands::palace::get_palaces,
            commands::palace::get_palaces_full,
            commands::palace::create_palace,
            commands::palace::update_palace,
            commands::palace::delete_palace,
            commands::palace::get_palace_images,
            commands::palace::add_palace_image,
            commands::palace::delete_palace_image,
            // Annotations
            commands::annotation::get_annotations,
            commands::annotation::get_due_annotations,
            commands::annotation::add_annotation,
            commands::annotation::update_annotation,
            commands::annotation::delete_annotation,
            // Images
            commands::image::save_image_file,
            commands::image::get_image_url,
            commands::image::delete_image_file,
            commands::image::read_image_as_base64,
            // Recall
            commands::recall::save_recall_session,
            commands::recall::save_recall_result,
            commands::recall::get_palace_recall_stats,
            commands::recall::get_recent_sessions,
            // Settings
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            // Python server
            python::manager::get_python_server_port,
            python::manager::start_python_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
