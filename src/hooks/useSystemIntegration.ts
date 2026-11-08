import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isRegistered, register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { toast } from "sonner";
import { reportError } from "@/lib/errors";
import { TRAY_TOGGLE_EVENT, setTrayTimer } from "@/lib/native";
import { lastUsedProject, useAppStore } from "@/store/appStore";

export const TOGGLE_SHORTCUT = "CommandOrControl+Shift+Space";
export const TOGGLE_SHORTCUT_LABEL = "Ctrl+Shift+Space";

/** Hotkey/tray toggle; only ask "vừa làm gì?" when the window is actually in front. */
async function toggleFromSystem() {
  const state = useAppStore.getState();
  if (!state.running && !lastUsedProject(state)) {
    toast.info("Chưa có timer nào để bắt đầu", { description: "Hãy bấm play ở một project trước." });
    return;
  }
  await state.toggleLastTimer({ askNote: !document.hidden && document.hasFocus() });
}

// Register/unregister calls are chained so StrictMode's mount→unmount→mount
// and page reloads never race each other.
let shortcutChain: Promise<unknown> = Promise.resolve();

export function useSystemIntegration() {
  // Global hotkey.
  useEffect(() => {
    shortcutChain = shortcutChain
      .then(async () => {
        if (await isRegistered(TOGGLE_SHORTCUT)) await unregister(TOGGLE_SHORTCUT);
        await register(TOGGLE_SHORTCUT, (event) => {
          if (event.state === "Pressed") void toggleFromSystem();
        });
      })
      .catch((err: unknown) => reportError(`Không đăng ký được phím tắt ${TOGGLE_SHORTCUT_LABEL}`, err));
    return () => {
      shortcutChain = shortcutChain.then(() => unregister(TOGGLE_SHORTCUT)).catch(() => undefined);
    };
  }, []);

  // Tray menu "Start/Stop".
  useEffect(() => {
    const unlisten = listen(TRAY_TOGGLE_EVENT, () => void toggleFromSystem());
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Keep the tray tooltip and menu label in sync with the running timer.
  const running = useAppStore((s) => s.running);
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  useEffect(() => {
    const runningProject = running ? projects.find((p) => p.id === running.projectId) : undefined;
    const last = lastUsedProject({ projects, spans, running });
    setTrayTimer(
      running && runningProject
        ? { projectName: runningProject.name, startedAtMs: Date.parse(running.startedAt) }
        : null,
      last?.name ?? null,
    ).catch((err: unknown) => console.error("[tray]", err));
  }, [running, projects, spans]);
}
