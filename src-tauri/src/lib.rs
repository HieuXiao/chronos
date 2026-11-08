mod db;
mod storage;
mod system;
mod tray;

use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

/// Passed by the OS autostart entry so the app starts hidden in the tray.
const AUTOSTART_ARG: &str = "--autostart";

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch just focuses the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .invoke_handler(tauri::generate_handler![
            system::get_idle_seconds,
            system::write_text_file,
            tray::set_tray_timer,
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
            tray::init(app.handle())?;
            let autostarted = std::env::args().any(|arg| arg == AUTOSTART_ARG);
            if !autostarted {
                tray::show_main_window(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window minimizes to tray; "ThoÃ¡t" in the tray menu exits.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Chronos");
}
