import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { body, ok, route, HttpError } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { q } from "@/lib/db.ts";
import { rp, takeChallenge } from "@/lib/webauthn.ts";

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const { challenge, user_id } = await takeChallenge();
  if (user_id !== user.id) throw new HttpError(400, "O pedido expirou. Tente de novo.");
  const { origin, rpID } = rp();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: b.response as RegistrationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    throw new HttpError(400, "Não foi possível confirmar o Face ID. Tente de novo.");
  }
  if (!verification.verified || !verification.registrationInfo) throw new HttpError(400, "Não foi possível confirmar o Face ID.");
  const { credential } = verification.registrationInfo;
  const ua = req.headers.get("user-agent") ?? "";
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Mac/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : "Aparelho";
  await q(
    "insert into passkeys (id, user_id, public_key, counter, transports, device_name) values ($1, $2, $3, $4, $5, $6) on conflict (id) do nothing",
    [credential.id, user.id, Buffer.from(credential.publicKey), credential.counter, credential.transports ?? [], device],
  );
  return ok({ ok: true });
});
