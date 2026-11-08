//! Where `data.db` lives. Defaults to the app config dir; the user can move it to
//! any folder from Settings. The choice is kept in `storage.json` next to the
//! default location and read once at startup, so changing it needs a restart.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, State};

use crate::db;

const SETTINGS_FILE: &str = "storage.json";
const DB_FILE: &str = "data.db";

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageSettings {
    data_dir: Option<PathBuf>,
}

/// Resolved once at startup and handed to the frontend.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataLocation {
    /// Folder that holds `data.db`.
    pub dir: String,
    pub is_default: bool,
    /// Connection string the frontend must pass to `Database.load`.
    pub db_url: String,
}

fn default_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("Không xác định được thư mục cấu hình: {e}"))
}

fn read_settings(config_dir: &Path) -> StorageSettings {
    std::fs::read_to_string(config_dir.join(SETTINGS_FILE))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Reads `storage.json`. A custom folder that no longer exists (unplugged drive,
/// deleted folder) falls back to the default so the app still opens.
pub fn resolve<R: Runtime>(app: &AppHandle<R>) -> Result<DataLocation, String> {
    let default = default_dir(app)?;
    let custom = read_settings(&default).data_dir.filter(|d| d.is_dir());
    Ok(match custom {
        Some(dir) => DataLocation {
            db_url: format!("sqlite:{}", dir.join(DB_FILE).display()),
            dir: dir.display().to_string(),
            is_default: false,
        },
        None => DataLocation {
            dir: default.display().to_string(),
            is_default: true,
            db_url: db::DB_URL.to_string(),
        },
    })
}

#[tauri::command]
pub fn get_data_location(location: State<'_, DataLocation>) -> DataLocation {
    location.inner().clone()
}

/// Whether `dir` already contains a Chronos database.
#[tauri::command]
pub fn data_dir_has_db(dir: String) -> bool {
    Path::new(&dir).join(DB_FILE).is_file()
}

fn target_dir<R: Runtime>(app: &AppHandle<R>, dir: &Option<String>) -> Result<PathBuf, String> {
    match dir {
        Some(d) => {
            let p = PathBuf::from(d.trim());
            if !p.is_absolute() {
                return Err("Đường dẫn phải là đường dẫn đầy đủ (ví dụ D:\\Chronos).".into());
            }
            Ok(p)
        }
        None => default_dir(app),
    }
}

/// Creates `dir` (the default folder when `None`) and returns where the copy of
/// the database must be written. The frontend writes it with SQLite's
/// `VACUUM INTO`, which makes a consistent copy even while the database is open.
#[tauri::command]
pub fn prepare_data_dir<R: Runtime>(
    app: AppHandle<R>,
    location: State<'_, DataLocation>,
    dir: Option<String>,
) -> Result<String, String> {
    let target = target_dir(&app, &dir)?;
    if same_dir(&target, Path::new(&location.dir)) {
        return Err("Dữ liệu đã nằm ở thư mục này.".into());
    }
    std::fs::create_dir_all(&target).map_err(|e| format!("Không tạo được thư mục: {e}"))?;
    let db = target.join(DB_FILE);
    if db.exists() {
        return Err("Thư mục đích đã có data.db.".into());
    }
    Ok(db.display().to_string())
}

/// Points Chronos at `dir` (or back to the default when `None`), which must
/// already hold a data.db, and restarts.
#[tauri::command]
pub fn set_data_location<R: Runtime>(
    app: AppHandle<R>,
    location: State<'_, DataLocation>,
    dir: Option<String>,
) -> Result<(), String> {
    let default = default_dir(&app)?;
    let target = target_dir(&app, &dir)?;
    if same_dir(&target, Path::new(&location.dir)) {
        return Err("Dữ liệu đã nằm ở thư mục này.".into());
    }
    if !target.join(DB_FILE).is_file() {
        return Err("Thư mục đích không có data.db.".into());
    }

    let settings = StorageSettings {
        data_dir: (!same_dir(&target, &default)).then_some(target),
    };
    std::fs::create_dir_all(&default).map_err(|e| format!("Không lưu được cài đặt: {e}"))?;
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(default.join(SETTINGS_FILE), json)
        .map_err(|e| format!("Không lưu được cài đặt: {e}"))?;

    app.request_restart();
    Ok(())
}

fn same_dir(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => a == b,
    }
}
