import { ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { hasWidgetToken, issueWidgetToken, revokeWidgetToken } from "@/lib/widget.ts";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ active: await hasWidgetToken(user.id) });
});

export const POST = route(async () => {
  const user = await requireUser();
  return ok({ token: await issueWidgetToken(user.id) });
});

export const DELETE = route(async () => {
  const user = await requireUser();
  await revokeWidgetToken(user.id);
  return ok({ active: false });
});
