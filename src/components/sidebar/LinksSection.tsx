import { useEffect, useState, type FormEvent } from "react";
import { open as pickFile } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, FileText, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as linksDb from "@/db/queries/links";
import { attempt } from "@/lib/errors";
import type { Id, ProjectLink } from "@/types";

const isUrl = (t: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(t) || /^www\./i.test(t);

/** Last part of a path or the host of a URL, as a default title. */
function defaultTitle(target: string): string {
  if (isUrl(target)) {
    try {
      return new URL(target.startsWith("www.") ? `https://${target}` : target).hostname;
    } catch {
      return target;
    }
  }
  return target.split(/[\\/]/).filter(Boolean).pop() ?? target;
}

/** "Tài liệu liên quan": links to web pages and local files, opened outside the app. */
export function LinksSection({ projectId }: { projectId: Id }) {
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    let cancelled = false;
    setAdding(false);
    void attempt("Không tải được tài liệu", async () => {
      const rows = await linksDb.listLinks(projectId);
      if (!cancelled) setLinks(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const t = target.trim();
    if (!t) return;
    const link = await attempt("Không thêm được tài liệu", () => linksDb.addLink(projectId, title.trim() || defaultTitle(t), t));
    if (link) setLinks((l) => [...l, link]);
    setTitle("");
    setTarget("");
    setAdding(false);
  };

  const browse = async () => {
    const picked = await attempt("Không mở được hộp chọn file", () => pickFile({ title: "Chọn tài liệu" }));
    if (typeof picked === "string") setTarget(picked);
  };

  const openLink = (l: ProjectLink) =>
    void attempt("Không mở được tài liệu", () =>
      isUrl(l.target) ? openUrl(l.target.startsWith("www.") ? `https://${l.target}` : l.target) : openPath(l.target),
    );

  const remove = async (l: ProjectLink) => {
    const ok = await attempt("Không xoá được tài liệu", () => linksDb.deleteLink(l.id));
    if (ok !== undefined) setLinks((all) => all.filter((x) => x.id !== l.id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tài liệu liên quan</h3>
        {!adding && (
          <Button variant="ghost" size="xs" onClick={() => setAdding(true)}>
            <Plus /> Thêm
          </Button>
        )}
      </div>


      <ul className="grid gap-0.5">
        {links.map((l) => (
          <li key={l.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/60">
            {isUrl(l.target) ? (
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <button
              type="button"
              onClick={() => openLink(l)}
              className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
              title={l.target}
            >
              {l.title}
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Xoá ${l.title}`}
              onClick={() => void remove(l)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      {adding && (
        <form onSubmit={(e) => void add(e)} className="grid gap-2 rounded-md border p-2">
          <div className="flex gap-1.5">
            <Input
              autoFocus
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Dán link hoặc đường dẫn file"
              className="h-8 text-xs md:text-xs"
              spellCheck={false}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void browse()} aria-label="Chọn file trên máy">
              <FolderOpen />
            </Button>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên hiển thị (tuỳ chọn)" className="h-8 text-xs md:text-xs" />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Huỷ
            </Button>
            <Button type="submit" size="sm" disabled={!target.trim()}>
              Thêm
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
