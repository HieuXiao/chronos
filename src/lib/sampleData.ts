import { dayStatus } from "@/lib/goals";
import type { NewProject, SessionSource } from "@/types";

/**
 * Deterministic demo data: seven projects that each show a different state
 * (on track, late for its deadline, total reached, too new to forecast, no
 * deadline), with purpose, goals, todos, notes, documents and a reason for
 * most days that fell short or went well over. Pure function — no DB access.
 */

interface Recipe {
  key: string;
  name: string;
  icon: string;
  purpose: string;
  targetHours: number;
  startDaysAgo: number;
  /** Deadline relative to today (negative = past); null = none. */
  deadlineInDays: number | null;
  /** Last day with sessions (days ago); 0 = up to today. */
  stopDaysAgo: number;
  meanHoursPerDay: number;
  /** Minimum per day in minutes (0 = none). */
  dailyMinutes: number;
  /** Probability of working on a weekday (weekends are lighter). */
  activeRate: number;
  todos: [text: string, done: boolean][];
  note: string;
  links: [title: string, target: string][];
  /** Reasons written on days below the minimum. */
  shortReasons: string[];
  /** Reasons written on days well over the minimum. */
  overReasons: string[];
}

const COMMON_SHORT = [
  "Lướt mạng xã hội quá lâu buổi tối",
  "Ngủ dậy muộn, mất cả buổi sáng",
  "Mệt, đầu óc không tập trung",
  "Có việc gia đình đột xuất",
  "Trễ deadline chuyên ngành nên phải dồn thời gian sang",
];
const COMMON_OVER = ["Đang hứng thú, làm một mạch không để ý giờ", "Bù cho hôm trước bị thiếu", "Rảnh hơn dự kiến"];

const RECIPES: Recipe[] = [
  {
    key: "dsa",
    name: "Cấu trúc dữ liệu & giải thuật",
    icon: "lucide:Sigma",
    purpose: "Môn chuyên ngành nặng nhất kỳ này, cần 8 điểm để giữ học bổng.",
    targetHours: 200,
    startDaysAgo: 120,
    deadlineInDays: 40,
    stopDaysAgo: 0,
    meanHoursPerDay: 2.2,
    dailyMinutes: 120,
    activeRate: 0.85,
    todos: [
      ["Cây nhị phân & BST", true],
      ["Quy hoạch động: knapsack", true],
      ["Đồ thị: Dijkstra, Bellman-Ford", false],
      ["Giải 20 bài LeetCode medium", false],
      ["Ôn thi cuối kỳ", false],
    ],
    note: "Thi cuối kỳ cuối tháng 12.\nYếu: quy hoạch động, cần luyện thêm dạng bài trên đồ thị.",
    links: [
      ["Slide bài giảng", "https://example.edu/dsa/slides"],
      ["LeetCode – danh sách luyện", "https://leetcode.com/problemset/"],
    ],
    shortReasons: ["Kẹt một bài quy hoạch động cả buổi", "Phải ưu tiên đồ án vì sắp nộp"],
    overReasons: ["Sắp thi nên tranh thủ ôn thêm", "Giải được chuỗi bài đồ thị, làm tiếp luôn"],
  },
  {
    key: "thesis",
    name: "Đồ án tốt nghiệp",
    icon: "lucide:GraduationCap",
    purpose: "Điều kiện tốt nghiệp. Muốn làm phần mềm dùng thật được sau khi bảo vệ.",
    targetHours: 250,
    startDaysAgo: 100,
    deadlineInDays: 25,
    stopDaysAgo: 0,
    meanHoursPerDay: 1.6,
    dailyMinutes: 90,
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
    links: [
      ["Đề cương (Google Docs)", "https://docs.google.com/document/d/example"],
      ["Repo GitHub", "https://github.com/example/do-an"],
    ],
    shortReasons: ["Chờ thầy phản hồi chương 3", "Bị lỗi môi trường, mất thời gian cài lại"],
    overReasons: ["Sắp đến hạn nộp quyển", "Vào guồng code module báo cáo"],
  },
  {
    key: "ielts",
    name: "IELTS 7.0",
    icon: "lucide:Globe",
    purpose: "Cần 7.0 để nộp hồ sơ học bổng thạc sĩ.",
    targetHours: 250,
    startDaysAgo: 160,
    deadlineInDays: 90,
    stopDaysAgo: 0,
    meanHoursPerDay: 1.4,
    dailyMinutes: 60,
    activeRate: 0.8,
    todos: [
      ["Cambridge 18 – Test 1 Listening", true],
      ["Writing Task 2: 2 bài/tuần", false],
      ["Học 30 từ Academic Word List", false],
      ["Speaking part 2 với bạn học", false],
    ],
    note: "Mục tiêu 7.0, Writing đang 6.0.\nLịch thi dự kiến: tháng 2.",
    links: [["Cambridge IELTS 18", "https://example.com/cambridge-18.pdf"]],
    shortReasons: ["Ngại luyện Writing nên để dồn", "Học chuyên ngành hết giờ"],
    overReasons: ["Làm trọn một đề thi thử", "Có bạn cùng luyện Speaking"],
  },
  {
    key: "jp",
    name: "Tiếng Nhật N3",
    icon: "lucide:Languages",
    purpose: "Thi JLPT N3 tháng 7 để đủ điều kiện thực tập ở công ty Nhật.",
    targetHours: 300,
    startDaysAgo: 150,
    deadlineInDays: 150,
    stopDaysAgo: 0,
    meanHoursPerDay: 1.3,
    dailyMinutes: 60,
    activeRate: 0.8,
    todos: [
      ["Ôn 50 kanji bài 12", true],
      ["Luyện nghe đề N3 2023", true],
      ["Ngữ pháp bài 13–14", false],
      ["Shadowing 20 phút", false],
      ["Làm đề thi thử số 3", false],
    ],
    note: "Yếu nhất: đọc hiểu đoạn dài, mỗi tuần ít nhất 2 bài.",
    links: [["Lịch thi JLPT", "https://www.jlpt.jp/e/"]],
    shortReasons: ["Quên ôn kanji vì đi học về muộn"],
    overReasons: ["Xem anime không phụ đề, luyện nghe luôn"],
  },
  {
    key: "rust",
    name: "Học Rust",
    icon: "lucide:Code",
    purpose: "Tự học cho vui và để viết công cụ nhỏ cho bản thân.",
    targetHours: 120,
    startDaysAgo: 45,
    deadlineInDays: null,
    stopDaysAgo: 0,
    meanHoursPerDay: 1,
    dailyMinutes: 45,
    activeRate: 0.7,
    todos: [
      ["Đọc xong The Book chương 1–10", true],
      ["Ownership & borrowing exercises", true],
      ["Viết CLI todo bằng clap", false],
      ["Tìm hiểu async/tokio", false],
    ],
    note: "Rustlings: còn phần traits và lifetimes.",
    links: [
      ["The Rust Book", "https://doc.rust-lang.org/book/"],
      ["Rustlings", "https://github.com/rust-lang/rustlings"],
    ],
    shortReasons: ["Ưu tiên môn chuyên ngành"],
    overReasons: ["Viết CLI thấy vui, làm quá giờ"],
  },
  {
    key: "books",
    name: "Đọc sách",
    icon: "lucide:BookOpen",
    purpose: "Mỗi năm 40 giờ đọc sách ngoài chuyên ngành.",
    targetHours: 40,
    startDaysAgo: 200,
    deadlineInDays: -30,
    stopDaysAgo: 40,
    meanHoursPerDay: 0.65,
    dailyMinutes: 0,
    activeRate: 0.6,
    todos: [
      ["Atomic Habits", true],
      ["Deep Work", true],
      ["Thinking, Fast and Slow", true],
    ],
    note: "Đã xong thử thách 40 giờ đọc sách.",
    links: [],
    shortReasons: [],
    overReasons: [],
  },
  {
    key: "run",
    name: "Chạy bộ 10K",
    icon: "lucide:Footprints",
    purpose: "Giữ sức khoẻ để học được lâu, mục tiêu chạy 10K không nghỉ.",
    targetHours: 30,
    startDaysAgo: 4,
    deadlineInDays: 60,
    stopDaysAgo: 0,
    meanHoursPerDay: 0.6,
    dailyMinutes: 30,
    activeRate: 0.9,
    todos: [
      ["Mua giày chạy", true],
      ["Chạy 3 buổi/tuần", false],
    ],
    note: "Bắt đầu nhẹ, tăng 10% quãng đường mỗi tuần.",
    links: [],
    shortReasons: ["Trời mưa"],
    overReasons: [],
  },
];

const GENERIC_NOTES = ["Ôn lại phần cũ", "Làm bài tập", "Tập trung sâu", "Sửa lỗi", "Ghi chú tổng hợp"];
/** Reasons are written for the last few months only. */
const REPORT_DAYS = 90;

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

export interface SampleLink {
  projectKey: string;
  title: string;
  target: string;
}

export interface SampleGoal {
  projectKey: string;
  minutes: number;
  effectiveFrom: string;
}

/** Why a project went the way it did on one day. */
export interface SampleReport {
  projectKey: string;
  day: string;
  note: string;
}

export interface SampleData {
  projects: SampleProject[];
  sessions: SampleSession[];
  todos: SampleTodo[];
  notes: SampleNote[];
  links: SampleLink[];
  goals: SampleGoal[];
  reports: SampleReport[];
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

const pick = <T,>(rnd: () => number, list: T[]): T => list[Math.floor(rnd() * list.length)]!;

/** @param colors one palette colour per recipe, in order */
export function buildSampleData(nowMs: number, colors: string[], seed = 20261108): SampleData {
  const rnd = mulberry32(seed);
  const data: SampleData = { projects: [], sessions: [], todos: [], notes: [], links: [], goals: [], reports: [] };

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
      purpose: r.purpose,
      sample: true,
    });
    if (r.dailyMinutes > 0) {
      data.goals.push({ projectKey: r.key, minutes: r.dailyMinutes, effectiveFrom: dateKey(start) });
    }

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
              ? pick(rnd, openTodos)[0]
              : noteRoll < 0.45
                ? pick(rnd, GENERIC_NOTES)
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
    for (const [title, target] of r.links) data.links.push({ projectKey: r.key, title, target });
  });

  data.sessions = serialize(data.sessions, nowMs);
  addReports(data, nowMs, rnd);
  return data;
}

/**
 * A reason for most days below the minimum and some days well over it,
 * judged on the final sessions. Never today: it is not over yet.
 */
function addReports(data: SampleData, nowMs: number, rnd: () => number) {
  const minutes = new Map<string, number>();
  for (const s of data.sessions) {
    const k = `${s.projectKey}|${dateKey(new Date(s.startedAt))}`;
    minutes.set(k, (minutes.get(k) ?? 0) + (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60_000);
  }
  for (const r of RECIPES) {
    if (r.dailyMinutes <= 0) continue;
    const deadlineAgo = r.deadlineInDays === null ? -Infinity : -r.deadlineInDays;
    for (let ago = Math.min(r.startDaysAgo, REPORT_DAYS); ago >= 1; ago--) {
      if (ago < deadlineAgo) break;
      const day = dateKey(localDay(nowMs, -ago));
      const status = dayStatus((minutes.get(`${r.key}|${day}`) ?? 0) * 60, r.dailyMinutes);
      if (status === "short" && rnd() < 0.85) {
        const own = r.shortReasons.length > 0 && rnd() < 0.4;
        data.reports.push({ projectKey: r.key, day, note: own ? pick(rnd, r.shortReasons) : pick(rnd, COMMON_SHORT) });
      } else if (status === "over" && rnd() < 0.5) {
        const own = r.overReasons.length > 0 && rnd() < 0.5;
        data.reports.push({ projectKey: r.key, day, note: own ? pick(rnd, r.overReasons) : pick(rnd, COMMON_OVER) });
      }
    }
  }
}

const MIN_SESSION_MS = 10 * 60_000;
const BREAK_MS = 15 * 60_000;

/**
 * Only one timer runs at a time, so sessions of different projects must not
 * overlap: later ones are pushed back after a short break, trimmed at the end of
 * the day (or now) and dropped when too little is left.
 */
function serialize(sessions: SampleSession[], nowMs: number): SampleSession[] {
  const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const out: SampleSession[] = [];
  let cursor = -Infinity;
  for (const s of sorted) {
    const start = Date.parse(s.startedAt);
    const len = Date.parse(s.endedAt) - start;
    const dayEnd = new Date(start).setHours(23, 59, 0, 0);
    const newStart = Math.max(start, cursor + BREAK_MS);
    const newEnd = Math.min(newStart + len, dayEnd, nowMs - 60_000);
    if (newEnd - newStart < MIN_SESSION_MS) continue;
    out.push({ ...s, startedAt: new Date(newStart).toISOString(), endedAt: new Date(newEnd).toISOString() });
    cursor = newEnd;
  }
  return out;
}

export const SAMPLE_PROJECT_COUNT = RECIPES.length;
