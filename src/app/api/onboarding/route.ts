import { body, ok, oneOf, route, str, HttpError } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { isTime, localToday } from "@/lib/dates.ts";
import { pool } from "@/lib/db.ts";
import { AREAS, NOTIFY, OCCUPATIONS, PERIODS, QUIT, WANT, suggestHabits, suggestRoutine, suggestTasks, type Answers } from "@/lib/onboarding.ts";

const listOf = (v: unknown, allowed: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && allowed.includes(x)) : []);

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  if (!isTime(b.wake) || !isTime(b.sleep)) throw new HttpError(400, "Informe os horários de acordar e dormir.");
  const a: Answers = {
    name: str(b.name, "seu nome", { min: 1, max: 40 }),
    wake: b.wake,
    sleep: b.sleep,
    occupation: oneOf(b.occupation, "Ocupação", OCCUPATIONS),
    areas: listOf(b.areas, AREAS),
    goal: str(b.goal, "o objetivo", { max: 300, optional: true }),
    period: oneOf(b.period, "Período", PERIODS),
    want: listOf(b.want, WANT),
    quit: listOf(b.quit, QUIT),
    notify: oneOf(b.notify, "Notificações", NOTIFY),
  };
  const today = typeof b.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.today) ? b.today : localToday();
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("update users set onboarding = $2, display_name = $3, onboarded_at = coalesce(onboarded_at, now()), setup_step = greatest(setup_step, 1) where id = $1", [
      user.id,
      a,
      a.name,
    ]);
    // Só preenche sugestões em conta vazia, para não duplicar se refizer as perguntas.
    const { rows } = await client.query("select (select count(*) from routine_activities where user_id = $1) + (select count(*) from tasks where user_id = $1) + (select count(*) from habits where user_id = $1) as n", [user.id]);
    if (Number(rows[0].n) === 0) {
      for (const r of suggestRoutine(a))
        await client.query("insert into routine_activities (user_id, title, start_time, end_time, weekdays, category) values ($1,$2,$3,$4,$5,$6)", [user.id, r.title, r.start, r.end, r.weekdays, r.category]);
      for (const t of suggestTasks(a))
        await client.query("insert into tasks (user_id, title, recurrence, weekdays, month_day, anchor_date, time, priority) values ($1,$2,$3,$4,$5,$6,$7,$8)", [
          user.id, t.title, t.recurrence, t.weekdays ?? [], t.month_day ?? null, today, t.time ?? null, t.priority ?? "normal",
        ]);
      for (const h of suggestHabits(a))
        await client.query("insert into habits (user_id, name, kind, per_week, reason, triggers, replacement, start_date) values ($1,$2,$3,$4,$5,$6,$7,$8)", [
          user.id, h.name, h.kind, h.per_week ?? 7, h.reason ?? "", h.triggers ?? "", h.replacement ?? "", today,
        ]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  return ok({ ok: true });
});
