import { useSyncExternalStore } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "chronos.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

let pref: ThemePref = readPref();
let resolved: ResolvedTheme = "dark";
const listeners = new Set<() => void>();

function resolve(): ResolvedTheme {
  if (pref !== "system") return pref;
  return media.matches ? "dark" : "light";
}

function apply() {
  resolved = resolve();
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  listeners.forEach((l) => l());
}

/** Applies the saved preference; call once before the first render. */
export function initTheme() {
  apply();
  // The native title bar follows the window theme; `null` = follow Windows.
  void getCurrentWindow()
    .setTheme(pref === "system" ? null : pref)
    .catch(() => undefined);
  media.addEventListener("change", () => {
    if (pref === "system") apply();
  });
}

export function setThemePref(next: ThemePref) {
  pref = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Preference only; ignore storage failures.
  }
  // Setting the window theme also switches the webview's prefers-color-scheme,
  // so re-resolve once it has taken effect.
  void getCurrentWindow()
    .setTheme(next === "system" ? null : next)
    .catch(() => undefined)
    .finally(apply);
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, () => pref);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, () => resolved);
}
