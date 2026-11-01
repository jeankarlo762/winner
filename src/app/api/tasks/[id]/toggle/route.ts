import { body, fail, isUuid, ok, route, HttpError } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { one, q } from "@/lib/db.ts";
import { isISODate } from "@/lib/dates.ts";

type Ctx = { params: Promise<{ id: string }> };

/** Marca ou desmarca a ocorrência informada de uma tarefa. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Tarefa não encontrada.");
  const b = await body(req);
  if (!isISODate(b.occurrence)) throw new HttpError(400, "Data inválida.");
  const task = await one("select id from tasks where id = $1 and user_id = $2", [id, user.id]);
  if (!task) return fail(404, "Tarefa não encontrada.");
  const removed = await q("delete from task_completions where task_id = $1 and occurrence = $2 returning task_id", [id, b.occurrence]);
  if (removed.length) return ok({ done: false });
  await q("insert into task_completions (task_id, occurrence) values ($1, $2)", [id, b.occurrence]);
  return ok({ done: true });
});
