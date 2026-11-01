import { body, fail, isUuid, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { deleteRow, parsers, updateRow } from "@/lib/entities.ts";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Item não encontrado.");
  return ok(await updateRow("reminders", user.id, id, parsers.reminders(await body(req), true)));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "Item não encontrado.");
  await deleteRow("reminders", user.id, id);
  return ok({ ok: true });
});
