import { body, ok, route, todayFrom } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { insertRow, parsers } from "@/lib/entities.ts";
import { tasksView } from "@/lib/views.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await tasksView(user.id, todayFrom(req)));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return ok(await insertRow("tasks", user.id, parsers.tasks(await body(req), false)), { status: 201 });
});
