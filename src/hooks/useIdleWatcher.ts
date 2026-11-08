import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getIdleSeconds } from "@/lib/native";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";

/** Ask about time with no keyboard/mouse input longer than this while a timer runs. */
export const IDLE_THRESHOLD_SEC = 10 * 60;
const POLL_MS = 15_000;
const RETURN_POLL_MS = 2_000;
/** Idle below this means the user is back at the computer. */
const BACK_THRESHOLD_SEC = 5;

async function bringToFront() {
  try {
    const win = getCurrentWindow();
    await win.unminimize();
    await win.show();
    await win.setFocus();
  } catch (err) {
    console.error("[idle] cannot show window", err);
  }
}

export function useIdleWatcher() {
  const running = useAppStore((s) => s.running);
  const idlePrompt = useUiStore((s) => s.idlePrompt);
  const setIdlePrompt = useUiStore((s) => s.setIdlePrompt);

  // Drop a stale prompt if the timer was stopped or switched meanwhile.
  useEffect(() => {
    if (idlePrompt && running?.id !== idlePrompt.sessionId) setIdlePrompt(null);
  }, [running, idlePrompt, setIdlePrompt]);

  // Detect the user going idle.
  useEffect(() => {
    if (!running || idlePrompt) return;
    const sessionId = running.id;
    let stopped = false;
    const check = async () => {
      try {
        const idle = await getIdleSeconds();
        if (stopped || idle < IDLE_THRESHOLD_SEC) return;
        setIdlePrompt({ sessionId, idleFromMs: Date.now() - idle * 1000, returnedAtMs: null });
        void bringToFront();
      } catch (err) {
        console.error("[idle]", err);
      }
    };
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [running, idlePrompt, setIdlePrompt]);

  // While the prompt is open, record the moment input resumes.
  const waitingForReturn = idlePrompt !== null && idlePrompt.returnedAtMs === null;
  useEffect(() => {
    if (!waitingForReturn) return;
    let stopped = false;
    const check = async () => {
      try {
        const idle = await getIdleSeconds();
        const current = useUiStore.getState().idlePrompt;
        if (stopped || !current || current.returnedAtMs !== null || idle >= BACK_THRESHOLD_SEC) return;
        setIdlePrompt({ ...current, returnedAtMs: Math.max(current.idleFromMs, Date.now() - idle * 1000) });
      } catch (err) {
        console.error("[idle]", err);
      }
    };
    const id = window.setInterval(() => void check(), RETURN_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [waitingForReturn, setIdlePrompt]);
}
