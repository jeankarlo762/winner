import { createHash, randomBytes } from "node:crypto";
import { one, q } from "./db.ts";
import { toMinutes, weekday, type ISODate } from "./dates.ts";
import { dayPlan } from "./dayplan.ts";
import { habitsView, routineView, tasksView } from "./views.ts";
import type { Activity, Task } from "./types.ts";

export const WIDGET_KINDS = ["tarefas", "rotina", "habitos"] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

export interface WidgetItem {
  title: string;
  sub: string;
  done: boolean;
  now?: boolean;
}
export interface WidgetData {
  kind: WidgetKind;
  title: string;
  summary: string;
  items: WidgetItem[];
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

/** Gera um token novo (o anterior para de funcionar). */
export async function issueWidgetToken(userId: string) {
  const token = "wgt_" + randomBytes(32).toString("base64url");
  await q(
    "insert into widget_tokens (id, user_id) values ($1, $2) on conflict (user_id) do update set id = excluded.id, created_at = now()",
    [sha(token), userId],
  );
  return token;
}

export async function revokeWidgetToken(userId: string) {
  await q("delete from widget_tokens where user_id = $1", [userId]);
}

export async function hasWidgetToken(userId: string) {
  return !!(await one("select 1 from widget_tokens where user_id = $1", [userId]));
}

export async function widgetUser(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token.startsWith("wgt_") || token.length > 100) return null;
  const row = await one<{ user_id: string }>("select user_id from widget_tokens where id = $1", [sha(token)]);
  return row?.user_id ?? null;
}

export async function widgetData(userId: string, kind: WidgetKind, today: ISODate, nowMin: number): Promise<WidgetData> {
  if (kind === "habitos") {
    const habits = await habitsView(userId, today);
    const items = habits.map((h) =>
      "cleanDays" in h
        ? { title: h.name, sub: `${h.cleanDays} ${h.cleanDays === 1 ? "dia" : "dias"} livre`, done: false }
        : { title: h.name, sub: h.streak ? `${h.streak} ${h.streak === 1 ? "dia" : "dias"} seguidos` : "Ainda não hoje", done: !!h.doneToday },
    );
    const track = habits.filter((h) => !("cleanDays" in h));
    const done = track.filter((h) => "doneToday" in h && h.doneToday).length;
    return { kind, title: "Hábitos", summary: `${done} de ${track.length} hoje`, items };
  }
  const tasks = (await tasksView(userId, today)) as unknown as Task[];
  if (kind === "tarefas") {
    const list = (tasks as (Task & { dueToday: boolean; overdue: boolean })[])
      .filter((t) => t.dueToday || t.overdue)
      .sort((a, b) => Number(a.done) - Number(b.done) || (a.time ?? "99").localeCompare(b.time ?? "99"));
    const items = list.map((t) => ({
      title: t.title,
      sub: t.time && t.end_time ? `${t.time}–${t.end_time}` : t.overdue ? "Atrasada" : "Hoje",
      done: !!t.done,
      now: !!t.time && !!t.end_time && toMinutes(t.time) <= nowMin && nowMin < toMinutes(t.end_time),
    }));
    return { kind, title: "Tarefas de hoje", summary: `${list.filter((t) => t.done).length} de ${list.length} feitas`, items };
  }
  const routine = (await routineView(userId)) as Activity[];
  const plan = dayPlan(routine, tasks, today, weekday(today)).items.filter((p) => p.e > nowMin);
  const items = plan.map((p) => ({
    title: p.title,
    sub: `${p.start}–${p.end}${p.kind === "task" ? " · tarefa" : ""}`,
    done: !!p.task?.done && p.task.occurrence === today,
    now: p.s <= nowMin && nowMin < p.e,
  }));
  return { kind, title: "Rotina de hoje", summary: items.length ? `${items.length} até o fim do dia` : "Dia encerrado", items };
}
