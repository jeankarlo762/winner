import { body, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { insertRow, parsers } from "@/lib/entities.ts";
import { remindersView } from "@/lib/views.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  return ok(await remindersView(user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  return ok(await insertRow("reminders", user.id, parsers.reminders(await body(req), false)), { status: 201 });
});
