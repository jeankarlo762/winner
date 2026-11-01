import { body, fail, isUuid, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { deleteRow, parsers, updateRow } from "@/lib/entities.ts";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Item não encontrado.");
  return ok(await updateRow("tasks", user.id, id, parsers.tasks(await body(req), true)));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Item não encontrado.");
  await deleteRow("tasks", user.id, id);
  return ok({ ok: true });
});
