import { ok, route, HttpError } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { q } from "@/lib/db.ts";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await q("select id, device_name, created_at, last_used_at from passkeys where user_id = $1 order by created_at", [user.id]));
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  const rows = id
    ? await q("delete from passkeys where user_id = $1 and id = $2 returning id", [user.id, id])
    : await q("delete from passkeys where user_id = $1 returning id", [user.id]);
  if (id && !rows.length) throw new HttpError(404, "Chave não encontrada.");
  return ok({ removed: rows.length });
});
