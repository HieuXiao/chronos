import { invoke } from "@tauri-apps/api/core";

/** Typed wrappers around the Rust commands in `src-tauri/src`. */

export function getIdleSeconds(): Promise<number> {
  return invoke<number>("get_idle_seconds");
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke("write_text_file", { path, contents });
}

export interface TrayTimer {
  projectName: string;
  startedAtMs: number;
}

export function setTrayTimer(running: TrayTimer | null, lastProjectName: string | null): Promise<void> {
  return invoke("set_tray_timer", { running, lastProjectName });
}

/** Event emitted by the tray menu's Start/Stop item. */
export const TRAY_TOGGLE_EVENT = "tray://toggle-timer";
