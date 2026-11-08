import { useEffect, useRef, useState } from "react";
import { Ban, ImagePlus } from "lucide-react";
import { iconName, iconValue, PROJECT_ICONS, ProjectIcon } from "@/lib/projectIcons";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string | null;
  color: string;
  onChange: (icon: string | null) => void;
  className?: string;
}

/** A square showing the current icon; clicking it opens a grid of outline icons in the project colour. */
export function IconPicker({ value, color, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = iconName(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const pick = (icon: string | null) => {
    onChange(icon);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Chọn biểu tượng"
        title="Chọn biểu tượng"
        className="flex size-9 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {value ? (
          <ProjectIcon icon={value} color={color} className="size-5 text-lg" />
        ) : (
          <ImagePlus className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Biểu tượng"
          className="absolute top-full left-0 z-50 mt-1 w-[300px] rounded-lg border bg-popover p-2 shadow-lg"
        >
          <div className="grid grid-cols-8 gap-0.5">
            {Object.entries(PROJECT_ICONS).map(([name, { icon: Icon, label }]) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(iconValue(name))}
                title={label}
                aria-label={label}
                aria-pressed={current === name}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
                  current === name && "bg-accent ring-1 ring-foreground/30",
                )}
              >
                <Icon className="size-4" style={{ color }} />
              </button>
            ))}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Ban className="size-3.5" /> Bỏ biểu tượng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
