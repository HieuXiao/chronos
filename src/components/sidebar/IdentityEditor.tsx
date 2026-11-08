import { useEffect, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { ColorPicker } from "@/components/projects/ColorPicker";
import { IconPicker } from "@/components/projects/IconPicker";
import { Button } from "@/components/ui/button";
import { useTakenColors } from "@/hooks/useStats";
import { projectColor } from "@/lib/colors";
import { useAppStore } from "@/store/appStore";
import type { Project } from "@/types";

/**
 * Sidebar header: the project's icon, name (edited in place, saved on Enter or
 * when the field loses focus) and colour.
 */
export function IdentityEditor({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateProject = useAppStore((s) => s.updateProject);
  const [name, setName] = useState(project.name);
  const taken = useTakenColors(project.id);

  useEffect(() => setName(project.name), [project.id, project.name]);

  const color = projectColor(project.color);

  const saveName = () => {
    const clean = name.trim();
    if (!clean) return setName(project.name); // a project always has a name
    if (clean !== project.name) void updateProject(project.id, { name: clean });
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      // Undo the edit instead of closing the sidebar.
      e.preventDefault();
      e.stopPropagation();
      setName(project.name);
      e.currentTarget.blur();
    }
  };

  return (
    <header className="grid gap-3 border-b px-4 pt-3 pb-3" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
      <div className="flex items-center gap-2">
        <IconPicker value={project.icon} color={color} onChange={(icon) => void updateProject(project.id, { icon })} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={onKey}
          maxLength={80}
          aria-label="Tên project"
          title="Bấm để đổi tên"
          className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold outline-none transition-colors hover:border-border focus:border-ring focus:bg-background"
        />
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
          <X />
        </Button>
      </div>
      <ColorPicker value={project.color} taken={taken} onChange={(c) => void updateProject(project.id, { color: c })} />
    </header>
  );
}
