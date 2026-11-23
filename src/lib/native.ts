import { invoke } from "@tauri-apps/api/core";

/** Typed wrappers around the Rust commands in `src-tauri/src`. */

export function getIdleSeconds(): Promise<number> {
  return invoke<number>("get_idle_seconds");
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke("write_text_file", { path, contents });
}

/** Puts the app icon back on the window/taskbar after a timer ring was drawn on it. */
export function resetWindowIcon(): Promise<void> {
  return invoke("reset_window_icon");
}

export interface DataLocation {
  /** Folder that holds `data.db`. */
  dir: string;
  isDefault: boolean;
  /** Connection string for `Database.load`; fixed until the app restarts. */
  dbUrl: string;
}

export function getDataLocation(): Promise<DataLocation> {
  return invoke<DataLocation>("get_data_location");
}

export function dataDirHasDb(dir: string): Promise<boolean> {
  return invoke<boolean>("data_dir_has_db", { dir });
}

/** Creates `dir` (`null` = default folder) and returns the path to write the database copy to. */
export function prepareDataDir(dir: string | null): Promise<string> {
  return invoke<string>("prepare_data_dir", { dir });
}

/**
 * Points Chronos at `dir` (`null` = default folder), which must already hold a
 * data.db, and restarts the app. Close the database connection first.
 */
export function setDataLocation(dir: string | null): Promise<void> {
  return invoke("set_data_location", { dir });
}

