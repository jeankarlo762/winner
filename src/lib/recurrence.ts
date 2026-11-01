import { addDays, dayOfMonth, daysInMonth, diffDays, weekday, type ISODate } from "./dates.ts";

export type Recurrence = "once" | "daily" | "weekly" | "biweekly" | "monthly";

export interface RecurringTask {
  recurrence: Recurrence;
  weekdays: number[];
  month_day: number | null;
  anchor_date: ISODate;
}

/** Quinzenal = a cada 15 dias a partir da data inicial. */
export const BIWEEKLY_DAYS = 15;

export function isDueOn(t: RecurringTask, d: ISODate): boolean {
  if (diffDays(d, t.anchor_date) < 0) return false;
  switch (t.recurrence) {
    case "once":
      return d === t.anchor_date;
    case "daily":
      return true;
    case "weekly":
      return t.weekdays.length ? t.weekdays.includes(weekday(d)) : weekday(d) === weekday(t.anchor_date);
    case "biweekly":
      return diffDays(d, t.anchor_date) % BIWEEKLY_DAYS === 0;
    case "monthly": {
      const last = daysInMonth(d);
      const want = t.month_day ?? dayOfMonth(t.anchor_date);
      const target = want === 0 || want > last ? last : want;
      return dayOfMonth(d) === target;
    }
  }
}

/** A ocorrência atual: a mais recente que já venceu (até 62 dias atrás). */
export function currentOccurrence(t: RecurringTask, today: ISODate): ISODate | null {
  for (let i = 0; i <= 62; i++) {
    const d = addDays(today, -i);
    if (isDueOn(t, d)) return d;
  }
  return null;
}

export function nextOccurrence(t: RecurringTask, from: ISODate): ISODate | null {
  for (let i = 0; i <= 62; i++) {
    const d = addDays(from, i);
    if (isDueOn(t, d)) return d;
  }
  return null;
}

const DAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DAY_FULL = ["Todo domingo", "Toda segunda", "Toda terça", "Toda quarta", "Toda quinta", "Toda sexta", "Todo sábado"];

export function describe(t: RecurringTask, time?: string | null): string {
  const at = time ? ` · ${time}` : "";
  switch (t.recurrence) {
    case "once":
      return `Uma vez · ${t.anchor_date.split("-").reverse().slice(0, 2).join("/")}${at}`;
    case "daily":
      return `Todo dia${at}`;
    case "weekly": {
      const days = [...t.weekdays].sort();
      if (days.length === 1) return DAY_FULL[days[0]] + at;
      if (days.join() === "1,2,3,4,5") return "Seg a sex" + at;
      return days.map((d) => DAY[d]).join(", ") + at;
    }
    case "biweekly":
      return `A cada ${BIWEEKLY_DAYS} dias${at}`;
    case "monthly":
      return (t.month_day === 0 ? "Último dia do mês" : `Todo dia ${t.month_day ?? Number(t.anchor_date.slice(8))}`) + at;
  }
}
