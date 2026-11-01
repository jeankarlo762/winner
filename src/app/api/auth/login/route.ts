import { body, ok, route, HttpError } from "@/lib/http.ts";
import { clientIp, createSession, dummyVerify, rateLimit, verifyPassword } from "@/lib/auth.ts";
import { one } from "@/lib/db.ts";

export const POST = route(async (req) => {
  const b = await body(req);
  const login = typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  rateLimit("login-ip:" + clientIp(req), 30);
  rateLimit("login-user:" + login);
  const user = await one<{ id: string; password_hash: string }>(
    "select id, password_hash from users where username = $1 or email = $1",
    [login],
  );
  const valid = user ? await verifyPassword(user.password_hash, password) : await dummyVerify(password);
  if (!user || !valid) throw new HttpError(401, "Usuário ou senha incorretos.");
  await createSession(user.id);
  return ok({ ok: true });
});
