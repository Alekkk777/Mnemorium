use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub struct PythonServer {
    process: Arc<Mutex<Option<Child>>>,
    pub port: Arc<Mutex<Option<u16>>>,
}

impl PythonServer {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            port: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, app: &AppHandle) -> Result<u16, String> {
        // Find a free port
        let port = find_free_port().ok_or("No free port available")?;

        // Locate the python server
        let resource_path = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("python-server");

        let python_bin = find_python_binary(&resource_path);

        let server_script = resource_path.join("main.py");
        if !server_script.exists() {
            return Err(format!("Python server not found at {:?}", server_script));
        }

        let child = Command::new(&python_bin)
            .arg(&server_script)
            .arg("--port")
            .arg(port.to_string())
            .spawn()
            .map_err(|e| format!("Failed to start Python server: {}", e))?;

        *self.process.lock().unwrap() = Some(child);
        *self.port.lock().unwrap() = Some(port);

        // Give server time to start
        std::thread::sleep(std::time::Duration::from_millis(1500));

        Ok(port)
    }

    pub fn stop(&self) {
        if let Ok(mut guard) = self.process.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}

fn find_free_port() -> Option<u16> {
    std::net::TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
}

fn find_python_binary(resource_path: &std::path::Path) -> std::path::PathBuf {
    // 1. Try bundled Python
    let bundled = resource_path.join("python-runtime").join(if cfg!(windows) {
        "python.exe"
    } else {
        "bin/python3"
    });
    if bundled.exists() {
        return bundled;
    }

    // 2. Try system Python 3.11+
    for name in &["python3.11", "python3.12", "python3", "python"] {
        if let Ok(path) = which::which(name) {
            return path;
        }
    }

    // Fallback (will fail gracefully at runtime)
    std::path::PathBuf::from("python3")
}

#[tauri::command]
pub async fn get_python_server_port(
    app: AppHandle,
) -> Result<Option<u16>, String> {
    let server = app.state::<PythonServer>();
    Ok(*server.port.lock().unwrap())
}

#[tauri::command]
pub async fn start_python_server(app: AppHandle) -> Result<u16, String> {
    let server = app.state::<PythonServer>();
    server.start(&app)
}
