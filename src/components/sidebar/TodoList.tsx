import { useEffect, useState, type FormEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import * as todosDb from "@/db/queries/todos";
import { attempt } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Id, Todo } from "@/types";

export function TodoList({ projectId }: { projectId: Id }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    void attempt("Không tải được todo", async () => {
      const rows = await todosDb.listTodos(projectId);
      if (!cancelled) {
        setTodos(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reload = async () => {
    const rows = await attempt("Không tải được todo", () => todosDb.listTodos(projectId));
    if (rows) setTodos(rows);
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const todo = await attempt("Không thêm được todo", () => todosDb.createTodo({ projectId, text }));
    if (todo) setTodos((list) => [...list, todo]);
  };

  const toggle = async (todo: Todo, done: boolean) => {
    setTodos((list) => list.map((t) => (t.id === todo.id ? { ...t, done } : t)));
    const updated = await attempt("Không cập nhật được todo", () => todosDb.setTodoDone(todo.id, done));
    if (updated) setTodos((list) => list.map((t) => (t.id === updated.id ? updated : t)));
    else await reload();
  };

  const remove = async (todo: Todo) => {
    setTodos((list) => list.filter((t) => t.id !== todo.id));
    const ok = await attempt("Không xoá được todo", () => todosDb.deleteTodo(todo.id));
    if (ok === undefined) await reload();
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = todos.findIndex((t) => t.id === active.id);
    const to = todos.findIndex((t) => t.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(todos, from, to);
    setTodos(next);
    const ok = await attempt("Không lưu được thứ tự", () =>
      todosDb.reorderTodos(
        projectId,
        next.map((t) => t.id),
      ),
    );
    if (ok === undefined) await reload();
  };

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Việc cần làm</h3>
        {todos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {remaining}/{todos.length} chưa xong
          </span>
        )}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Thêm việc mới…"
          maxLength={300}
          className="h-8"
        />
        <Button type="submit" size="icon-sm" variant="secondary" disabled={!draft.trim()} aria-label="Thêm">
          <Plus />
        </Button>
      </form>


      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-1">
            {todos.map((todo) => (
              <SortableTodo
                key={todo.id}
                todo={todo}
                onToggle={(done) => void toggle(todo, done)}
                onDelete={() => void remove(todo)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableTodoProps {
  todo: Todo;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}

function SortableTodo({ todo, onToggle, onDelete }: SortableTodoProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50",
        isDragging && "relative z-10 bg-accent shadow-lg",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Kéo để sắp xếp"
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={todo.done}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={todo.done ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
      />
      <span
        className={cn("min-w-0 flex-1 text-sm break-words", todo.done && "text-muted-foreground line-through")}
      >
        {todo.text}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDelete}
        aria-label="Xoá"
        className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  );
}
