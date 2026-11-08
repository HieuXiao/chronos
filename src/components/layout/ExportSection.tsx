import { FileJson, FileSpreadsheet } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import * as goalsDb from "@/db/queries/goals";
import * as linksDb from "@/db/queries/links";
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
    title: format === "json" ? "Sao lưu toàn bộ dữ liệu" : "Xuất bảng session",
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
    const [todos, notes, links, goals, reports] = await Promise.all([
      todosDb.listAllTodos(),
      notesDb.listAllNotes(),
      linksDb.listAllLinks(),
      goalsDb.listGoals(),
      goalsDb.listReports(),
    ]);
    contents = buildJsonExport({ projects, sessions, todos, notes, links, goals, reports });
  } else {
    contents = buildSessionsCsv(sessions, projects);
  }
  await writeTextFile(path, contents);
  toast.success("Đã xuất dữ liệu", { description: path });
}

export function ExportSection() {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium">Xuất dữ liệu</p>
        <InfoTip>JSON chứa mọi thứ: project, session, todo, ghi chú, tài liệu, mục tiêu và báo cáo. CSV mở được bằng Excel.</InfoTip>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void attempt("Không xuất được JSON", () => exportData("json"))}>
          <FileJson /> Sao lưu JSON
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void attempt("Không xuất được CSV", () => exportData("csv"))}>
          <FileSpreadsheet /> Bảng session (CSV)
        </Button>
      </div>
    </div>
  );
}
