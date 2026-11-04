import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { one, q } from "./db.ts";
import { HttpError } from "./http.ts";

export const SESSION_COOKIE = "winner_session";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  theme: "light" | "dark" | "system";
  onboarding: Record<string, unknown>;
  onboarded_at: string | null;
  setup_step: number;
}

const USER_COLS = "u.id, u.username, u.email, u.display_name, u.theme, u.onboarding, u.onboarded_at, u.setup_step";

export const hashPassword = (pw: string) => hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (h: string, pw: string) => verify(h, pw).catch(() => false);

// Hash fixo para gastar o mesmo tempo quando o usuário não existe.
let dummyHash: Promise<string> | null = null;
export function dummyVerify(pw: string) {
  dummyHash ??= hashPassword("senha-inexistente-para-tempo-constante");
  return dummyHash.then((h) => verifyPassword(h, pw));
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await q("insert into sessions (id, user_id, expires_at) values ($1, $2, $3)", [sha(token), userId, expires]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_ORIGIN ?? "").startsWith("https://"),
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q("delete from sessions where id = $1", [sha(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return one<User>(
    `select ${USER_COLS} from sessions s join users u on u.id = s.user_id where s.id = $1 and s.expires_at > now()`,
    [sha(token)],
  );
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Sua sessão expirou. Entre de novo.");
  return u;
}

export async function revokeOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  await q("delete from sessions where user_id = $1 and id <> $2", [userId, sha(token)]);
}

// Limite simples em memória: 8 tentativas a cada 15 min por chave.
const attempts = new Map<string, { n: number; until: number }>();
export function rateLimit(key: string, max = 8, windowMs = 15 * 60000) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return;
  }
  a.n++;
  if (a.n > max) throw new HttpError(429, "Muitas tentativas. Espere alguns minutos e tente de novo.");
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}

export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
