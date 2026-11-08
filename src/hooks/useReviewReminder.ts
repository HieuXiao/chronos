import { useEffect } from "react";
import { toast } from "sonner";
import { DEFAULT_REMINDER, REMINDER_KEY } from "@/components/goals/DailyGoalsSection";
import { addLocalDays, dayKey, formatDate } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useGoals } from "./useGoals";
import { useNow } from "./useNow";

const PAST_KEY = "chronos.reminder.past";
const EVENING_KEY = "chronos.reminder.evening";
const LOOKBACK_DAYS = 7;

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Only used to avoid repeating a reminder.
  }
}

/**
 * Once a day: reminds about recent days with missed goals and no reason yet;
 * and at the configured evening time, offers to review today.
 */
export function useReviewReminder() {
  const nowMs = useNow(60_000);
  const goals = useGoals(nowMs);
  const reminder = useAppStore((s) => s.settings[REMINDER_KEY] ?? DEFAULT_REMINDER);
  const setReviewDay = useUiStore((s) => s.setReviewDay);
  const { today, firstGoalDay, evaluate, unexplained } = goals;

  useEffect(() => {
    if (!firstGoalDay || readKey(PAST_KEY) === today) return;
    const pending: string[] = [];
    for (let i = LOOKBACK_DAYS; i >= 1; i--) {
      const day = dayKey(addLocalDays(new Date(`${today}T00:00`).getTime(), -i));
      if (day < firstGoalDay) continue;
      if (unexplained(evaluate(day)) > 0) pending.push(day);
    }
    writeKey(PAST_KEY, today);
    const latest = pending[pending.length - 1];
    if (!latest) return;
    toast.warning(`${pending.length} ngày gần đây không đạt chỉ tiêu và chưa ghi lý do`, {
      description: pending.map((d) => formatDate(new Date(`${d}T00:00`)).slice(0, 5)).join(", "),
      duration: 20_000,
      action: { label: "Ghi lý do", onClick: () => setReviewDay(latest) },
    });
  }, [today, firstGoalDay, evaluate, unexplained, setReviewDay]);

  useEffect(() => {
    if (!firstGoalDay || !/^\d{2}:\d{2}$/.test(reminder) || readKey(EVENING_KEY) === today) return;
    const [h, m] = reminder.split(":").map(Number);
    const at = new Date(`${today}T00:00`);
    at.setHours(h ?? 0, m ?? 0, 0, 0);
    if (nowMs < at.getTime()) return;
    writeKey(EVENING_KEY, today);
    const ev = evaluate(today);
    if (ev.missed.length === 0) return;
    toast.info(`Tổng kết hôm nay: còn ${ev.missed.length} chỉ tiêu chưa đạt`, {
      duration: 30_000,
      action: { label: "Tổng kết", onClick: () => setReviewDay(today) },
    });
  }, [nowMs, today, reminder, firstGoalDay, evaluate, setReviewDay]);
}
