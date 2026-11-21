mod db;
mod storage;
mod system;

use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch just focuses the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Only kept to remove the "start with Windows" entry older versions
        // could create: Chronos now runs only while its window is open.
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![
            system::get_idle_seconds,
            system::write_text_file,
            system::reset_window_icon,
            storage::get_data_location,
            storage::data_dir_has_db,
            storage::prepare_data_dir,
            storage::set_data_location,
        ])
        .setup(|app| {
            // The database path is user-configurable, so the SQL plugin is
            // registered here, once the location is known.
            let location = storage::resolve(app.handle())?;
            app.handle().plugin(
                tauri_plugin_sql::Builder::default()
                    .add_migrations(&location.db_url, db::migrations())
                    .build(),
            )?;
            app.manage(location);

            let autolaunch = app.autolaunch();
            if autolaunch.is_enabled().unwrap_or(false) {
                let _ = autolaunch.disable();
            }

            show_main_window(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Chronos");
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
