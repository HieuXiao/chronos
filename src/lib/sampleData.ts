import type { NewProject, SessionSource } from "@/types";

/**
 * Deterministic demo data: five projects that each exercise a different
 * dashboard state (on track, late for its deadline, target reached, too new to
 * forecast, no deadline). Pure function — no DB access — so it is testable.
 */

interface Recipe {
  key: string;
  name: string;
  icon: string;
  targetHours: number;
  startDaysAgo: number;
  /** Deadline relative to today (negative = past); null = none. */
  deadlineInDays: number | null;
  /** Last day with sessions (days ago); 0 = up to today. */
  stopDaysAgo: number;
  meanHoursPerDay: number;
  /** Probability of working on a weekday (weekends are lighter). */
  activeRate: number;
  todos: [text: string, done: boolean][];
  note: string;
}

const RECIPES: Recipe[] = [
  {
    key: "jp",
    name: "Tiếng Nhật N3",
    icon: "🇯🇵",
    targetHours: 300,
    startDaysAgo: 150,
    deadlineInDays: 150,
    stopDaysAgo: 0,
    meanHoursPerDay: 1.3,
    activeRate: 0.8,
    todos: [
      ["Ôn 50 kanji bài 12", true],
      ["Luyện nghe đề N3 2023", true],
      ["Ngữ pháp bài 13–14", false],
      ["Shadowing 20 phút", false],
      ["Làm đề thi thử số 3", false],
    ],
    note: "Mục tiêu: thi JLPT N3 tháng 7.\nYếu nhất: đọc hiểu đoạn dài — mỗi tuần ít nhất 2 bài.",
  },
  {
    key: "thesis",
    name: "Đồ án tốt nghiệp",
    icon: "🎓",
    targetHours: 250,
    startDaysAgo: 100,
    deadlineInDays: 25,
    stopDaysAgo: 0,
    meanHoursPerDay: 1.6,
    activeRate: 0.75,
    todos: [
      ["Chốt đề cương với thầy hướng dẫn", true],
      ["Thiết kế CSDL", true],
      ["Viết chương 2: Cơ sở lý thuyết", true],
      ["Cài đặt module báo cáo", false],
      ["Viết chương 4: Thực nghiệm", false],
      ["Làm slide bảo vệ", false],
    ],
    note: "Hạn nộp quyển: cuối tháng.\nCần gặp thầy trước khi viết chương 4.",
  },
  {
    key: "books",
    name: "Đọc sách",
    icon: "📚",
    targetHours: 40,
    startDaysAgo: 200,
    deadlineInDays: -30,
    stopDaysAgo: 40,
    meanHoursPerDay: 0.65,
    activeRate: 0.6,
    todos: [
      ["Atomic Habits", true],
      ["Deep Work", true],
      ["Thinking, Fast and Slow", true],
    ],
    note: "Đã xong thử thách 40 giờ đọc sách.",
  },
  {
    key: "rust",
    name: "Học Rust",
    icon: "🦀",
    targetHours: 120,
    startDaysAgo: 45,
    deadlineInDays: null,
    stopDaysAgo: 0,
    meanHoursPerDay: 1,
    activeRate: 0.7,
    todos: [
      ["Đọc xong The Book chương 1–10", true],
      ["Ownership & borrowing exercises", true],
      ["Viết CLI todo bằng clap", false],
      ["Tìm hiểu async/tokio", false],
    ],
    note: "Rustlings: còn phần traits và lifetimes.",
  },
  {
    key: "run",
    name: "Chạy bộ 10K",
    icon: "🏃",
    targetHours: 30,
    startDaysAgo: 4,
    deadlineInDays: 60,
    stopDaysAgo: 0,
    meanHoursPerDay: 0.6,
    activeRate: 0.9,
    todos: [
      ["Mua giày chạy", true],
      ["Chạy 3 buổi/tuần", false],
    ],
    note: "Bắt đầu nhẹ, tăng 10% quãng đường mỗi tuần.",
  },
];

const GENERIC_NOTES = ["Ôn lại phần cũ", "Làm bài tập", "Tập trung sâu", "Sửa lỗi", "Ghi chú tổng hợp"];

export interface SampleProject extends NewProject {
  key: string;
}

export interface SampleSession {
  projectKey: string;
  startedAt: string;
  endedAt: string;
  note: string | null;
  source: SessionSource;
}

export interface SampleTodo {
  projectKey: string;
  text: string;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

export interface SampleNote {
  projectKey: string;
  content: string;
}

export interface SampleData {
  projects: SampleProject[];
  sessions: SampleSession[];
  todos: SampleTodo[];
  notes: SampleNote[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function localDay(nowMs: number, daysOffset: number): Date {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** @param colors one palette colour per recipe, in order */
export function buildSampleData(nowMs: number, colors: string[], seed = 20261108): SampleData {
  const rnd = mulberry32(seed);
  const data: SampleData = { projects: [], sessions: [], todos: [], notes: [] };

  RECIPES.forEach((r, idx) => {
    const start = localDay(nowMs, -r.startDaysAgo);
    data.projects.push({
      key: r.key,
      name: r.name,
      icon: r.icon,
      color: colors[idx] ?? null,
      targetHours: r.targetHours,
      startDate: dateKey(start),
      endDate: r.deadlineInDays === null ? null : dateKey(localDay(nowMs, r.deadlineInDays)),
      sample: true,
    });

    for (let ago = r.startDaysAgo; ago >= r.stopDaysAgo; ago--) {
      const day = localDay(nowMs, -ago);
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      if (rnd() > r.activeRate * (weekend ? 0.6 : 1)) continue;

      let remainingMin = Math.round(r.meanHoursPerDay * (0.4 + rnd() * 1.2) * 60);
      const parts = remainingMin > 75 && rnd() < 0.5 ? 2 : 1;
      let cursor = day.getTime() + (7 + Math.floor(rnd() * 12)) * 3_600_000 + Math.floor(rnd() * 4) * 15 * 60_000;

      for (let p = 0; p < parts && remainingMin > 0; p++) {
        const len = p === parts - 1 ? remainingMin : Math.round(remainingMin * (0.4 + rnd() * 0.3));
        remainingMin -= len;
        const endMs = Math.min(cursor + len * 60_000, day.getTime() + 24 * 3_600_000 - 60_000);
        if (endMs >= nowMs - 60_000 || endMs <= cursor) break; // never in the future, never running
        const openTodos = r.todos.filter(([, done]) => !done);
        const noteRoll = rnd();
        data.sessions.push({
          projectKey: r.key,
          startedAt: new Date(cursor).toISOString(),
          endedAt: new Date(endMs).toISOString(),
          note:
            noteRoll < 0.25 && openTodos.length
              ? openTodos[Math.floor(rnd() * openTodos.length)]![0]
              : noteRoll < 0.45
                ? GENERIC_NOTES[Math.floor(rnd() * GENERIC_NOTES.length)]!
                : null,
          source: rnd() < 0.1 ? "manual" : "timer",
        });
        cursor = endMs + (60 + Math.floor(rnd() * 120)) * 60_000;
      }
    }

    r.todos.forEach(([text, done], i) => {
      const created = localDay(nowMs, -r.startDaysAgo + i);
      data.todos.push({
        projectKey: r.key,
        text,
        done,
        createdAt: new Date(created.getTime() + 9 * 3_600_000).toISOString(),
        doneAt: done
          ? new Date(localDay(nowMs, -Math.max(r.stopDaysAgo, Math.floor(r.startDaysAgo / (i + 2)))).getTime() + 20 * 3_600_000).toISOString()
          : null,
      });
    });
    data.notes.push({ projectKey: r.key, content: r.note });
  });

  return data;
}

export const SAMPLE_PROJECT_COUNT = RECIPES.length;
