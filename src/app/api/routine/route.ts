import { body, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { insertRow, parsers } from "@/lib/entities.ts";
import { routineView } from "@/lib/views.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await routineView(user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return ok(await insertRow("routine_activities", user.id, parsers.routine_activities(await body(req), false)), { status: 201 });
});
