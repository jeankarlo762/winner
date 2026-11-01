import { body, ok, oneOf, route, str, HttpError } from "@/lib/http.ts";
import { currentUser, hashPassword, requireUser, revokeOtherSessions, verifyPassword } from "@/lib/auth.ts";
import { one, q } from "@/lib/db.ts";

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return ok({ user: null });
  const pk = await one<{ n: number }>("select count(*)::int as n from passkeys where user_id = $1", [user.id]);
  return ok({ user: { ...user, passkeys: pk?.n ?? 0 } });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  if ("display_name" in b) await q("update users set display_name = $2, updated_at = now() where id = $1", [user.id, str(b.display_name, "o nome", { min: 1, max: 40 })]);
  if ("theme" in b) await q("update users set theme = $2 where id = $1", [user.id, oneOf(b.theme, "Tema", ["light", "dark", "system"] as const)]);
  if ("setup_step" in b) {
    const n = b.setup_step;
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > 4) throw new HttpError(400, "Etapa inválida.");
    await q("update users set setup_step = $2 where id = $1", [user.id, n]);
  }
  if ("new_password" in b) {
    const full = await one<{ password_hash: string }>("select password_hash from users where id = $1", [user.id]);
    if (typeof b.current_password !== "string" || !(await verifyPassword(full!.password_hash, b.current_password))) throw new HttpError(400, "A senha atual está incorreta.");
    if (typeof b.new_password !== "string" || b.new_password.length < 8) throw new HttpError(400, "A nova senha precisa ter pelo menos 8 caracteres.");
    await q("update users set password_hash = $2, updated_at = now() where id = $1", [user.id, await hashPassword(b.new_password)]);
    await revokeOtherSessions(user.id);
  }
  return ok({ ok: true });
});
