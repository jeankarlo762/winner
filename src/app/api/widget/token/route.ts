import { body, oneOf, ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { issueWidgetToken, revokeWidgetToken, WIDGET_KINDS, widgetCount } from "@/lib/widget.ts";

export const GET = route(async () => {
  const user = await requireUser();
  const count = await widgetCount(user.id);
  return ok({ active: count > 0, count });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const kind = oneOf((await body(req)).kind, "Tipo de widget", WIDGET_KINDS);
  return ok({ token: await issueWidgetToken(user.id, kind) });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  await revokeWidgetToken(user.id);
  return ok({ active: false, count: 0 });
});
