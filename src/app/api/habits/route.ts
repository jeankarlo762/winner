import { body, ok, route, todayFrom } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { insertRow, parsers } from "@/lib/entities.ts";
import { habitsView } from "@/lib/views.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await habitsView(user.id, todayFrom(req)));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return ok(await insertRow("habits", user.id, parsers.habits(await body(req), false)), { status: 201 });
});
