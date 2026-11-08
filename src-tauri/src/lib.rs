mod db;
mod system;
mod tray;

use tauri::WindowEvent;
use tauri_plugin_autostart::MacosLauncher;

/// Passed by the OS autostart entry so the app starts hidden in the tray.
const AUTOSTART_ARG: &str = "--autostart";

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch just focuses the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::DB_URL, db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .invoke_handler(tauri::generate_handler![
            system::get_idle_seconds,
            system::write_text_file,
            tray::set_tray_timer,
        ])
        .setup(|app| {
            tray::init(app.handle())?;
            let autostarted = std::env::args().any(|arg| arg == AUTOSTART_ARG);
            if !autostarted {
                tray::show_main_window(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window minimizes to tray; "Thoát" in the tray menu exits.
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
