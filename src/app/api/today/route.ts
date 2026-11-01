import { ok, route, todayFrom } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { habitsView, remindersView, routineView, tasksView } from "@/lib/views.ts";

export const GET = route(async (req) => {
  const user = await requireUser();
  const today = todayFrom(req);
  const [routine, tasks, habits, reminders] = await Promise.all([routineView(user.id), tasksView(user.id, today), habitsView(user.id, today), remindersView(user.id)]);
  return ok({ today, routine, tasks: tasks.filter((t) => t.dueToday || t.overdue), habits, reminders: reminders.filter((r) => !r.done_at) });
});
