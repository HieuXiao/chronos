use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

const TRAY_ID: &str = "main";
/// Emitted to the frontend when the user picks Start/Stop in the tray menu.
pub const TOGGLE_EVENT: &str = "tray://toggle-timer";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningTimer {
    project_name: String,
    /// Unix epoch milliseconds (UTC).
    started_at_ms: i64,
}

pub struct TrayState {
    running: Mutex<Option<RunningTimer>>,
    toggle_item: MenuItem<Wry>,
}

pub fn init(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Hiện cửa sổ", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Bắt đầu timer gần nhất", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&show, &toggle, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Chronos")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "toggle" => {
                let _ = app.emit(TOGGLE_EVENT, ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;

    app.manage(TrayState {
        running: Mutex::new(None),
        toggle_item: toggle,
    });

    spawn_tooltip_ticker(app.clone());
    Ok(())
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Called by the frontend whenever the running timer changes.
#[tauri::command]
pub fn set_tray_timer(
    state: State<'_, TrayState>,
    running: Option<RunningTimer>,
    last_project_name: Option<String>,
) -> Result<(), String> {
    let label = match (&running, &last_project_name) {
        (Some(timer), _) => format!("Dừng: {}", timer.project_name),
        (None, Some(name)) => format!("Bắt đầu: {name}"),
        (None, None) => "Bắt đầu timer gần nhất".to_string(),
    };
    state.toggle_item.set_text(label).map_err(|e| e.to_string())?;
    *state.running.lock().map_err(|e| e.to_string())? = running;
    Ok(())
}

fn spawn_tooltip_ticker(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last = String::new();
        loop {
            std::thread::sleep(Duration::from_secs(1));
            let state = app.state::<TrayState>();
            let tooltip = match state.running.lock() {
                Ok(guard) => tooltip_text(guard.as_ref()),
                Err(_) => continue,
            };
            if tooltip == last {
                continue;
            }
            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                if tray.set_tooltip(Some(&tooltip)).is_ok() {
                    last = tooltip;
                }
            }
        }
    });
}

fn tooltip_text(running: Option<&RunningTimer>) -> String {
    match running {
        None => "Chronos — không có timer đang chạy".to_string(),
        Some(timer) => {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .unwrap_or(timer.started_at_ms);
            let secs = ((now_ms - timer.started_at_ms) / 1000).max(0);
            format!(
                "Chronos — {}\n{:02}:{:02}:{:02}",
                timer.project_name,
                secs / 3600,
                (secs % 3600) / 60,
                secs % 60
            )
        }
    }
}
