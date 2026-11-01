import { body, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { insertRow, parsers } from "@/lib/entities.ts";
import { q } from "@/lib/db.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await q("select id, title, body, tag, pinned, updated_at from notes where user_id = $1 order by pinned desc, updated_at desc", [user.id]));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return ok(await insertRow("notes", user.id, parsers.notes(await body(req), false)), { status: 201 });
});
