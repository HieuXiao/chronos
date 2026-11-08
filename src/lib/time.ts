import type { IsoUtc } from "@/types";

/**
 * Storage is always ISO 8601 UTC (`Date#toISOString`). Everything "per day"
 * (today, heatmap, streak, velocity) uses the user's local calendar days and is
 * computed here, never in SQL.
 */

export const MS_PER_DAY = 86_400_000;

/** Current instant as an ISO 8601 UTC string. Use this for every timestamp written to the DB. */
export function nowUtc(): IsoUtc {
  return new Date().toISOString();
}

/** Normalizes a Date to an ISO 8601 UTC string. */
export function toUtc(date: Date): IsoUtc {
  return date.toISOString();
}

/** Whole seconds between two UTC timestamps (never negative). */
export function diffSec(startedAt: IsoUtc, endedAt: IsoUtc): number {
  return Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
}

/** Seconds elapsed since `startedAt`, computed from the clock (not accumulated). */
export function elapsedSec(startedAt: IsoUtc, nowMs: number = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(startedAt)) / 1000));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** `HH:MM:SS` (hours can exceed 24). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** Compact duration: `2h 05m`, `45m`, `0m`. */
export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(Math.max(0, totalSec) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${pad2(m)}m` : `${m}m`;
}

/** Hours with at most one decimal: `43h`, `1.8h`. */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}

/** Local calendar day key `YYYY-MM-DD`. */
export function dayKey(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local midnight of the day containing `ms`. */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Adds calendar days in local time (DST-safe). */
export function addLocalDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Number of local calendar days from `a` to `b` (b - a). */
export function localDayDiff(a: number, b: number): number {
  return Math.round((startOfLocalDay(b) - startOfLocalDay(a)) / MS_PER_DAY);
}

/** `dd/MM/yyyy` */
export function formatDate(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** `dd/MM/yyyy HH:mm` in local time. */
export function formatDateTime(iso: IsoUtc): string {
  const d = new Date(iso);
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `HH:mm` in local time. */
export function formatTimeOfDay(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

export function weekdayName(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return WEEKDAYS[d.getDay()] ?? "";
}

/** UTC ISO → value for `<input type="datetime-local">` (local time, minute precision). */
export function toDateTimeInput(iso: IsoUtc): string {
  const d = new Date(iso);
  return `${dayKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `<input type="datetime-local">` value (local) → UTC ISO. Returns null when invalid. */
export function fromDateTimeInput(value: string): IsoUtc | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** `<input type="date">` value (local day) → UTC ISO of that local midnight. */
export function fromDateInput(value: string): IsoUtc | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
