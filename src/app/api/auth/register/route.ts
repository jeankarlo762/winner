import { body, ok, route, str, HttpError } from "@/lib/http.ts";
import { clientIp, createSession, EMAIL_RE, hashPassword, rateLimit, USERNAME_RE } from "@/lib/auth.ts";
import { one } from "@/lib/db.ts";

export const POST = route(async (req) => {
  rateLimit("register:" + clientIp(req), 10, 60 * 60000);
  const b = await body(req);
  const username = str(b.username, "o nome de usuário", { min: 3, max: 30 }).toLowerCase();
  const email = str(b.email, "o e-mail", { min: 3, max: 200 }).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "Nome de usuário: use de 3 a 30 letras minúsculas, números, ponto ou _.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Digite um e-mail válido.");
  if (password.length < 8 || password.length > 200) throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres.");
  const taken = await one<{ username: string; email: string }>("select username, email from users where username = $1 or email = $2", [username, email]);
  if (taken) throw new HttpError(409, taken.username === username ? "Esse nome de usuário já está em uso." : "Já existe uma conta com esse e-mail.");
  const user = await one<{ id: string }>(
    "insert into users (username, email, password_hash, display_name) values ($1, $2, $3, $4) returning id",
    [username, email, await hashPassword(password), username],
  );
  await createSession(user!.id);
  return ok({ ok: true });
});
