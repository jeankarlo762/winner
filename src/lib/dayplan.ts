import { toMinutes, type ISODate } from "./dates.ts";
import { isDueOn } from "./recurrence.ts";
import type { Activity, Task } from "./types.ts";

/** Um item da linha do tempo do dia: atividade fixa da rotina ou tarefa com horário. */
export interface PlanItem {
  key: string;
  kind: "activity" | "task";
  title: string;
  start: string;
  end: string;
  /** minutos desde 00:00; o fim passa de 1440 quando atravessa a meia-noite */
  s: number;
  e: number;
  activity?: Activity;
  task?: Task;
}

export function span(start: string, end: string): [number, number] {
  const s = toMinutes(start);
  let e = toMinutes(end);
  if (e <= s) e += 1440;
  return [s, e];
}

/** Monta o dia: atividades da rotina daquele dia da semana + tarefas que vencem na data, por horário. */
export function dayPlan(routine: Activity[], tasks: Task[], date: ISODate, weekday: number): { items: PlanItem[]; untimed: Task[] } {
  const items: PlanItem[] = [];
  for (const a of routine) {
    if (!a.weekdays.includes(weekday)) continue;
    const [s, e] = span(a.start_time, a.end_time);
    items.push({ key: "a" + a.id, kind: "activity", title: a.title, start: a.start_time, end: a.end_time, s, e, activity: a });
  }
  const untimed: Task[] = [];
  for (const t of tasks) {
    if (!isDueOn(t, date)) continue;
    if (!t.time) {
      untimed.push(t);
      continue;
    }
    const end = t.end_time ?? t.time;
    const [s, e] = t.end_time ? span(t.time, end) : [toMinutes(t.time), toMinutes(t.time) + 15];
    items.push({ key: "t" + t.id, kind: "task", title: t.title, start: t.time, end, s, e, task: t });
  }
  items.sort((x, y) => x.s - y.s || (x.kind === "task" ? 1 : -1));
  return { items, untimed };
}

/** Pares que se sobrepõem. Uma tarefa dentro de um bloco da rotina não conta como conflito. */
export function conflicts(items: PlanItem[]): [PlanItem, PlanItem][] {
  const out: [PlanItem, PlanItem][] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (!(a.s < b.e && b.s < a.e)) continue;
      if (a.kind !== b.kind) continue;
      out.push([a, b]);
    }
  return out;
}
