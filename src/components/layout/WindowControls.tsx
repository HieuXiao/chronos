import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils";

/** Thin Windows-style glyphs (10px), drawn so they stay crisp at any scale. */
function Glyph({ kind }: { kind: "min" | "max" | "restore" | "close" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1">
      {kind === "min" && <path d="M0 5.5h10" />}
      {kind === "max" && <rect x="0.5" y="0.5" width="9" height="9" rx="1" />}
      {kind === "restore" && (
        <>
          <rect x="0.5" y="2.5" width="7" height="7" rx="1" />
          <path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" />
        </>
      )}
      {kind === "close" && <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />}
    </svg>
  );
}

/** Minimize / maximize-restore / close for the frameless window. Close hides to the tray. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    try {
      const win = getCurrentWindow();
      const sync = () => void win.isMaximized().then((m) => !cancelled && setMaximized(m)).catch(() => {});
      sync();
      void win
        .onResized(sync)
        .then((u) => (cancelled ? u() : (unlisten = u)))
        .catch(() => {});
    } catch {
      // Not running inside Tauri (browser preview).
    }
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const run = (fn: (w: ReturnType<typeof getCurrentWindow>) => Promise<void>) => () => {
    try {
      void fn(getCurrentWindow()).catch(() => {});
    } catch {
      /* browser preview */
    }
  };

  const base =
    "flex h-full w-[46px] items-center justify-center text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:bg-accent";

  return (
    <div className="flex h-full shrink-0 self-stretch">
      <button type="button" aria-label="Thu nhỏ" title="Thu nhỏ" className={cn(base, "hover:bg-accent")} onClick={run((w) => w.minimize())}>
        <Glyph kind="min" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Khôi phục kích thước" : "Phóng to"}
        title={maximized ? "Khôi phục kích thước" : "Phóng to"}
        className={cn(base, "hover:bg-accent")}
        onClick={run((w) => w.toggleMaximize())}
      >
        <Glyph kind={maximized ? "restore" : "max"} />
      </button>
      <button
        type="button"
        aria-label="Đóng (ẩn xuống khay)"
        title="Đóng (ẩn xuống khay)"
        className={cn(base, "hover:bg-[#c42b1c] hover:text-white focus-visible:bg-[#c42b1c] focus-visible:text-white")}
        onClick={run((w) => w.close())}
      >
        <Glyph kind="close" />
      </button>
    </div>
  );
}
