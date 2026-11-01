import { body, fail, isUuid, ok, oneOf, route, str, HttpError } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { one, q } from "@/lib/db.ts";
import { isISODate } from "@/lib/dates.ts";

type Ctx = { params: Promise<{ id: string }> };

/**
 * done: alterna "feito" no dia (hábitos bons e desejados).
 * relapse / resist: registra recaída ou vontade vencida (hábitos ruins).
 */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Hábito não encontrado.");
  const b = await body(req);
  if (!isISODate(b.date)) throw new HttpError(400, "Data inválida.");
  const type = oneOf(b.type, "Registro", ["done", "relapse", "resist"] as const);
  const habit = await one<{ kind: string }>("select kind from habits where id = $1 and user_id = $2", [id, user.id]);
  if (!habit) return fail(404, "Hábito não encontrado.");
  if ((habit.kind === "bad") !== (type !== "done")) throw new HttpError(400, "Esse registro não vale para esse tipo de hábito.");
  if (type === "done") {
    const removed = await q("delete from habit_logs where habit_id = $1 and date = $2 and type = 'done' returning id", [id, b.date]);
    if (removed.length) return ok({ done: false });
  }
  await q("insert into habit_logs (habit_id, date, type, note) values ($1, $2, $3, $4)", [id, b.date, type, str(b.note, "a observação", { max: 300, optional: true })]);
  return ok({ done: true });
});
