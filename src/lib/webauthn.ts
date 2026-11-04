import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { one, q } from "./db.ts";
import { HttpError } from "./http.ts";

const CHALLENGE_COOKIE = "winner_challenge";

export function rp() {
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new HttpError(500, "APP_ORIGIN não configurada no servidor.");
  return { origin, rpID: new URL(origin).hostname, rpName: "Winner" };
}

export async function saveChallenge(challenge: string, userId: string | null) {
  const id = randomBytes(18).toString("base64url");
  await q("delete from auth_challenges where expires_at < now()");
  await q("insert into auth_challenges (id, challenge, user_id, expires_at) values ($1, $2, $3, now() + interval '5 minutes')", [
    id,
    challenge,
    userId,
  ]);
  (await cookies()).set(CHALLENGE_COOKIE, id, { httpOnly: true, sameSite: "strict", path: "/api/auth", maxAge: 300, secure: rp().origin.startsWith("https://") });
}

/** Lê e apaga o desafio (uso único). */
export async function takeChallenge(): Promise<{ challenge: string; user_id: string | null }> {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!id) throw new HttpError(400, "O pedido expirou. Tente de novo.");
  const row = await one<{ challenge: string; user_id: string | null }>(
    "delete from auth_challenges where id = $1 and expires_at > now() returning challenge, user_id",
    [id],
  );
  if (!row) throw new HttpError(400, "O pedido expirou. Tente de novo.");
  return row;
}
