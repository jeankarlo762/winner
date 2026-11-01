import { body, fail, isUuid, ok, oneOf, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { one } from "@/lib/db.ts";

type Ctx = { params: Promise<{ id: string }> };

const NEXT: Record<string, string> = {
  daily: "1 day",
  weekly: "7 days",
  monthly: "1 month",
  yearly: "1 year",
};

/** done: conclui (ou passa para a próxima vez, se repete). snooze: adia. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Lembrete não encontrado.");
  const b = await body(req);
  const action = oneOf(b.action, "Ação", ["done", "snooze10", "snooze60", "tomorrow"] as const);
  const r = await one<{ repeat: string }>("select repeat from reminders where id = $1 and user_id = $2", [id, user.id]);
  if (!r) return fail(404, "Lembrete não encontrado.");
  let sql: string;
  if (action === "done") {
    if (r.repeat === "none") sql = "update reminders set done_at = now() where id = $1 returning *";
    else if (r.repeat === "weekdays")
      sql = `update reminders set remind_at = remind_at + case extract(isodow from remind_at) when 5 then interval '3 days' when 6 then interval '2 days' else interval '1 day' end where id = $1 returning *`;
    else sql = `update reminders set remind_at = remind_at + interval '${NEXT[r.repeat]}' where id = $1 returning *`;
  } else {
    const add = action === "snooze10" ? "10 minutes" : action === "snooze60" ? "1 hour" : "1 day";
    sql = `update reminders set remind_at = greatest(remind_at, now()) + interval '${add}' where id = $1 returning *`;
  }
  return ok(await one(sql, [id]));
});
