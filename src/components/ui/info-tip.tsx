import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** A circled "i" that shows its text on hover or keyboard focus. */
export function InfoTip({ children, className, side = "bottom" }: { children: React.ReactNode; className?: string; side?: "top" | "bottom" }) {
  return (
    <span className={cn("group/info relative inline-flex align-middle", className)}>
      <span
        tabIndex={0}
        role="button"
        aria-label="Thông tin thêm"
        className="inline-flex rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" />
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute left-1/2 z-50 w-60 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-2 text-xs leading-relaxed font-normal text-popover-foreground opacity-0 shadow-md transition-opacity",
          "group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100",
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
        )}
      >
        {children}
      </span>
    </span>
  );
}
