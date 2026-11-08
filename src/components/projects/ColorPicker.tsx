import { Check } from "lucide-react";
import { PROJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  /** Colours held by other unfinished projects → that project's name. */
  taken: Map<string, string>;
}

/** 16 swatches; a colour another unfinished project uses is shown but can't be picked. */
export function ColorPicker({ value, onChange, taken }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Màu" className="grid w-fit grid-cols-8 gap-1.5">
      {PROJECT_COLORS.map((c) => {
        const active = value === c;
        const owner = taken.get(c);
        const disabled = !active && owner !== undefined;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={owner ? `Màu ${c}, đang dùng cho ${owner}` : `Màu ${c}`}
            title={owner && !active ? `Đang dùng cho “${owner}”` : undefined}
            disabled={disabled}
            onClick={() => !active && onChange(c)}
            className={cn(
              "relative flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
              active && "ring-2 ring-foreground",
              !active && !disabled && "hover:scale-110",
              disabled && "cursor-not-allowed opacity-25",
            )}
            style={{ backgroundColor: c }}
          >
            {active && <Check className="size-3.5 text-white" />}
            {disabled && <span className="absolute h-0.5 w-7 rotate-45 rounded-full bg-foreground/70" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
