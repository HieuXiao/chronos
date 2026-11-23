import { useEffect, useRef } from "react";
import { Image } from "@tauri-apps/api/image";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as sessionsDb from "@/db/queries/sessions";
import { useNow } from "@/hooks/useNow";
import { projectColor } from "@/lib/colors";
import { resetWindowIcon } from "@/lib/native";
import { timerRing } from "@/lib/timerRing";
import { useAppStore } from "@/store/appStore";

/** Last moment the app was known to be open (ms), see `markAlive`. */
export const ALIVE_KEY = "chronos.alive";
/** A running session whose app went quiet longer than this was left by a crash or kill. */
export const ALIVE_STALE_MS = 90_000;

function markAlive() {
  try {
    localStorage.setItem(ALIVE_KEY, String(Date.now()));
  } catch {
    // Without storage a crash just can't be detected.
  }
}

export function readAlive(): number | null {
  try {
    const v = Number(localStorage.getItem(ALIVE_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Chronos only tracks time while it is open:
 * - closing the window stops the running timer, then quits;
 * - a heartbeat lets the next start end a timer left running by a crash;
 * - the taskbar icon shows the running timer as a ring.
 */
export function useTimerLifecycle() {
  // Stop the timer on close. Tauri closes the window once this handler resolves.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    try {
      void getCurrentWindow()
        .onCloseRequested(async () => {
          if (!useAppStore.getState().running) return;
          await Promise.race([
            sessionsDb.stopRunningSession().catch(() => null),
            new Promise((r) => window.setTimeout(r, 2000)),
          ]);
        })
        .then((u) => (cancelled ? u() : (unlisten = u)))
        .catch(() => undefined);
    } catch {
      // Not inside Tauri (browser preview).
    }
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Heartbeat.
  useEffect(() => {
    markAlive();
    const id = window.setInterval(markAlive, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useTaskbarRing();
}

const ICON = 64;

/** Draws the running timer as a ring on the window (taskbar) icon; the app icon otherwise. */
function useTaskbarRing() {
  const running = useAppStore((s) => s.running);
  const projects = useAppStore((s) => s.projects);
  const spans = useAppStore((s) => s.spans);
  const goals = useAppStore((s) => s.goals);
  const nowMs = useNow(15_000, running !== null);
  const lastKey = useRef<string | null>(null);

  const project = running ? projects.find((p) => p.id === running.projectId) : undefined;
  const ring = project ? timerRing(project, running, spans, goals, nowMs) : null;
  const color = projectColor(project?.color);
  const minutes = ring ? Math.floor(ring.sessionSec / 60) : 0;
  const label = minutes < 100 ? String(minutes) : `${Math.floor(minutes / 60)}h`;
  // Redraw only when something visible changes (ring in 1/60 steps).
  const key = ring ? `${color}|${Math.round(ring.fraction * 60)}|${label}` : "idle";

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!ring) {
      resetWindowIcon().catch(() => undefined);
      return;
    }
    void drawRing(ring.fraction, color, label)
      .then(async (img) => {
        try {
          await getCurrentWindow().setIcon(img);
        } finally {
          await img.close();
        }
      })
      .catch(() => undefined);
    // `key` captures everything drawn.
  }, [key]);

  // Put the app icon back when the hook goes away (e.g. reload).
  useEffect(
    () => () => {
      lastKey.current = null;
      resetWindowIcon().catch(() => undefined);
    },
    [],
  );
}

async function drawRing(fraction: number, color: string, label: string): Promise<Image> {
  const canvas = document.createElement("canvas");
  canvas.width = ICON;
  canvas.height = ICON;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const c = ICON / 2;
  const line = 8;
  const r = c - line / 2 - 1;

  // Disc
  ctx.fillStyle = "#1f1f1e";
  ctx.beginPath();
  ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Track
  ctx.lineWidth = line;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  // Progress
  if (fraction > 0) {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(c, c, r, -Math.PI / 2, -Math.PI / 2 + Math.max(0.04, fraction) * Math.PI * 2);
    ctx.stroke();
  }
  // Minutes of the running session
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${label.length > 2 ? 20 : 26}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText(label, c, c + 1);

  const { data } = ctx.getImageData(0, 0, ICON, ICON);
  return Image.new(new Uint8Array(data.buffer), ICON, ICON);
}
