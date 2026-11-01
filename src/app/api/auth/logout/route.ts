import { ok, route } from "@/lib/http.ts";
import { destroySession } from "@/lib/auth.ts";

export const POST = route(async () => {
  await destroySession();
  return ok({ ok: true });
});
