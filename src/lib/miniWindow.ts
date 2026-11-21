import { availableMonitors, currentMonitor, getCurrentWindow, LogicalSize, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { useUiStore } from "@/store/uiStore";

/** Mini clock size (logical px). */
export const MINI_WIDTH = 232;
export const MINI_HEIGHT = 272;
/** Full window minimum, as in tauri.conf.json. */
const FULL_MIN = new LogicalSize(720, 520);
const MARGIN = 16;
const POSITION_KEY = "chronos.miniPosition";

interface Saved {
  position: PhysicalPosition;
  size: PhysicalSize;
  maximized: boolean;
}

let saved: Saved | null = null;
let busy = false;

function readMiniPosition(): { x: number; y: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as { x?: unknown; y?: unknown } | null;
    return v && typeof v.x === "number" && typeof v.y === "number" ? { x: v.x, y: v.y } : null;
  } catch {
    return null;
  }
}

/** Remembers where the user dragged the mini clock to (physical px). */
export function saveMiniPosition(x: number, y: number) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y }));
  } catch {
    // Preference only.
  }
}

/** Shrinks the window into the mini clock: small, fixed size, above all other windows. */
export async function enterMini() {
  if (busy || useUiStore.getState().mini) return;
  busy = true;
  const win = getCurrentWindow();
  try {
    const maximized = await win.isMaximized();
    if (maximized) await win.unmaximize();
    saved = { position: await win.outerPosition(), size: await win.outerSize(), maximized };

    useUiStore.getState().setMini(true);
    await win.setMinSize(null);
    await win.setResizable(false);
    await win.setSize(new LogicalSize(MINI_WIDTH, MINI_HEIGHT));

    // Last place the user put it (if that screen is still there), else the
    // top-right corner of this screen.
    const monitors = await availableMonitors().catch(() => []);
    const remembered = [readMiniPosition()].find(
      (p) =>
        p !== null &&
        monitors.some(
          (m) =>
            p.x >= m.workArea.position.x &&
            p.y >= m.workArea.position.y &&
            p.x < m.workArea.position.x + m.workArea.size.width - 40 &&
            p.y < m.workArea.position.y + m.workArea.size.height - 40,
        ),
    );
    const monitor = await currentMonitor();
    if (remembered) {
      await win.setPosition(new PhysicalPosition(remembered.x, remembered.y));
    } else if (monitor) {
      const scale = monitor.scaleFactor;
      const area = monitor.workArea;
      await win.setPosition(
        new PhysicalPosition(
          Math.round(area.position.x + area.size.width - (MINI_WIDTH + MARGIN) * scale),
          Math.round(area.position.y + MARGIN * scale),
        ),
      );
    }
    await win.setAlwaysOnTop(true);
  } catch (err) {
    // Never leave a big window showing only the clock.
    busy = false;
    await exitMini().catch(() => undefined);
    throw err;
  } finally {
    busy = false;
  }
}

/** Back to the full window where it was. */
export async function exitMini() {
  if (busy || !useUiStore.getState().mini) return;
  busy = true;
  const win = getCurrentWindow();
  try {
    const pos = await win.outerPosition();
    saveMiniPosition(pos.x, pos.y);
    await win.setAlwaysOnTop(false);
    await win.setResizable(true);
    await win.setMinSize(FULL_MIN);
    if (saved) {
      await win.setSize(saved.size);
      await win.setPosition(saved.position);
      if (saved.maximized) await win.maximize();
    } else {
      await win.setSize(new LogicalSize(1100, 760));
      await win.center();
    }
    useUiStore.getState().setMini(false);
    await win.setFocus();
  } finally {
    busy = false;
  }
}
