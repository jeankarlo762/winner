import { q } from "./db.ts";
import { addDays, type ISODate } from "./dates.ts";
import { currentOccurrence, describe, isDueOn, nextOccurrence, type RecurringTask } from "./recurrence.ts";
import { cleanStats, DESIRED_GOAL_DAYS, lastWeek, streak, type HabitLog } from "./habits.ts";

export interface TaskRow extends RecurringTask {
  id: string;
  title: string;
  notes: string;
  time: string | null;
  end_time: string | null;
  priority: "normal" | "high";
}

export async function tasksView(userId: string, today: ISODate) {
  const tasks = await q<TaskRow>(
    "select id, title, notes, recurrence, weekdays, month_day, anchor_date, time, end_time, priority from tasks where user_id = $1 and not archived order by time nulls last, created_at",
    [userId],
  );
  const done = await q<{ task_id: string; occurrence: string }>(
    "select c.task_id, c.occurrence from task_completions c join tasks t on t.id = c.task_id where t.user_id = $1 and c.occurrence >= $2",
    [userId, addDays(today, -62)],
  );
  const doneSet = new Set(done.map((d) => d.task_id + "|" + d.occurrence));
  return tasks
    .map((t) => {
      const occurrence = currentOccurrence(t, today);
      const isDone = occurrence ? doneSet.has(t.id + "|" + occurrence) : false;
      return {
        ...t,
        label: describe(t),
        dueToday: isDueOn(t, today),
        occurrence,
        done: isDone,
        next: nextOccurrence(t, isDone || !occurrence ? addDays(today, 1) : today),
        overdue: !!occurrence && occurrence !== today && !isDone && t.recurrence !== "daily",
      };
    })
    .filter((t) => !(t.recurrence === "once" && t.done && t.occurrence !== today));
}

export interface HabitRow {
  id: string;
  name: string;
  kind: "good" | "desired" | "bad";
  per_week: number;
  time: string | null;
  reason: string;
  triggers: string;
  replacement: string;
  start_date: ISODate;
}

export async function habitsView(userId: string, today: ISODate) {
  const habits = await q<HabitRow>(
    "select id, name, kind, per_week, time, reason, triggers, replacement, start_date from habits where user_id = $1 and not archived order by created_at",
    [userId],
  );
  const logs = await q<HabitLog & { habit_id: string }>(
    "select l.habit_id, l.date, l.type from habit_logs l join habits h on h.id = l.habit_id where h.user_id = $1",
    [userId],
  );
  const by = new Map<string, HabitLog[]>();
  for (const l of logs) by.set(l.habit_id, [...(by.get(l.habit_id) ?? []), l]);
  return habits.map((h) => {
    const hl = by.get(h.id) ?? [];
    if (h.kind === "bad") {
      const s = cleanStats(h.start_date, hl, today);
      const resistedToday = hl.filter((l) => l.type === "resist" && l.date === today).length;
      return { ...h, cleanDays: s.days, record: s.record, relapses: s.relapses, resistedToday };
    }
    const week = lastWeek(hl, today);
    return {
      ...h,
      doneToday: hl.some((l) => l.type === "done" && l.date === today),
      streak: streak(hl, today),
      week,
      weekCount: week.filter((d) => d.done).length,
      goalDays: h.kind === "desired" ? DESIRED_GOAL_DAYS : null,
    };
  });
}

export async function routineView(userId: string) {
  return q<{ id: string; title: string; start_time: string; end_time: string; weekdays: number[]; category: string }>(
    "select id, title, start_time, end_time, weekdays, category from routine_activities where user_id = $1 order by start_time",
    [userId],
  );
}

export async function remindersView(userId: string) {
  return q<{ id: string; text: string; remind_at: string; repeat: string; done_at: string | null }>(
    "select id, text, remind_at, repeat, done_at from reminders where user_id = $1 and (done_at is null or done_at > now() - interval '1 day') order by remind_at limit 200",
    [userId],
  );
}
