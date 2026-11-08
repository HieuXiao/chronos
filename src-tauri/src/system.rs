/// Seconds since the last keyboard/mouse input anywhere on the system.
#[tauri::command]
pub fn get_idle_seconds() -> u64 {
    idle_seconds()
}

/// Writes an export file to a path the user picked in the save dialog.
#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Không ghi được file: {e}"))
}

#[cfg(windows)]
fn idle_seconds() -> u64 {
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    // SAFETY: `info` is a valid, correctly sized LASTINPUTINFO.
    let ok = unsafe { GetLastInputInfo(&mut info) };
    if ok == 0 {
        return 0;
    }
    // SAFETY: no preconditions.
    let now = unsafe { GetTickCount() };
    // Both values are 32-bit tick counts that wrap every ~49.7 days.
    u64::from(now.wrapping_sub(info.dwTime) / 1000)
}

#[cfg(not(windows))]
fn idle_seconds() -> u64 {
    0
}
