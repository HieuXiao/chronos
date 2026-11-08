import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as notesDb from "@/db/queries/notes";
import * as projectsDb from "@/db/queries/projects";
import * as sessionsDb from "@/db/queries/sessions";
import * as todosDb from "@/db/queries/todos";
import { attempt } from "@/lib/errors";
import { buildJsonExport, buildSessionsCsv } from "@/lib/export";
import { writeTextFile } from "@/lib/native";
import { dayKey } from "@/lib/time";

type Format = "json" | "csv";

async function exportData(format: Format) {
  const path = await save({
    title: format === "json" ? "Xuất toàn bộ dữ liệu" : "Xuất bảng session",
    defaultPath: `chronos-${format === "json" ? "backup" : "sessions"}-${dayKey(Date.now())}.${format}`,
    filters: [format === "json" ? { name: "JSON", extensions: ["json"] } : { name: "CSV", extensions: ["csv"] }],
  });
  if (!path) return;

  const [projects, sessions] = await Promise.all([
    projectsDb.listProjects({ includeArchived: true }),
    sessionsDb.listSessions(),
  ]);
  let contents: string;
  if (format === "json") {
    const [todos, notes] = await Promise.all([todosDb.listAllTodos(), notesDb.listAllNotes()]);
    contents = buildJsonExport({ projects, sessions, todos, notes });
  } else {
    contents = buildSessionsCsv(sessions, projects);
  }
  await writeTextFile(path, contents);
  toast.success("Đã xuất dữ liệu", { description: path });
}

export function ExportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Download /> Xuất dữ liệu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void attempt("Không xuất được JSON", () => exportData("json"))}>
          <FileJson /> JSON — toàn bộ dữ liệu
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void attempt("Không xuất được CSV", () => exportData("csv"))}>
          <FileSpreadsheet /> CSV — bảng session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
