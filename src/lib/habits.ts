import { addDays, diffDays, type ISODate } from "./dates.ts";

export interface HabitLog {
  date: ISODate;
  type: "done" | "relapse" | "resist";
}

/** Dias seguidos com "feito", terminando hoje (ou ontem, se hoje ainda não foi marcado). */
export function streak(logs: HabitLog[], today: ISODate): number {
  const done = new Set(logs.filter((l) => l.type === "done").map((l) => l.date));
  let d = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Últimos 7 dias, do mais antigo para hoje. */
export function lastWeek(logs: HabitLog[], today: ISODate): { date: ISODate; done: boolean }[] {
  const done = new Set(logs.filter((l) => l.type === "done").map((l) => l.date));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, done: done.has(date) };
  });
}

/** Hábito ruim: dias limpo desde a última recaída (ou desde o início) e o recorde. */
export function cleanStats(startDate: ISODate, logs: HabitLog[], today: ISODate): { days: number; record: number; relapses: number } {
  const relapses = logs
    .filter((l) => l.type === "relapse" && diffDays(l.date, startDate) >= 0 && diffDays(today, l.date) >= 0)
    .map((l) => l.date)
    .sort();
  let prev = startDate;
  let record = 0;
  for (const r of relapses) {
    record = Math.max(record, diffDays(r, prev));
    prev = r;
  }
  const days = Math.max(0, diffDays(today, prev));
  return { days, record: Math.max(record, days), relapses: relapses.length };
}

export const DESIRED_GOAL_DAYS = 21;
