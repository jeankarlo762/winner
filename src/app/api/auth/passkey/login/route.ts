import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { body, ok, route, HttpError } from "@/lib/http.ts";
import { createSession } from "@/lib/auth.ts";
import { one, q } from "@/lib/db.ts";
import { rp, takeChallenge } from "@/lib/webauthn.ts";

export const POST = route(async (req) => {
  const b = await body(req);
  const response = b.response as AuthenticationResponseJSON | undefined;
  if (!response || typeof response.id !== "string") throw new HttpError(400, "Resposta do Face ID inválida.");
  const { challenge } = await takeChallenge();
  const pk = await one<{ id: string; user_id: string; public_key: Buffer; counter: number; transports: string[] }>(
    "select id, user_id, public_key, counter, transports from passkeys where id = $1",
    [response.id],
  );
  if (!pk) throw new HttpError(401, "Esse Face ID não está ligado a nenhuma conta. Entre com a senha e ative de novo no perfil.");
  const { origin, rpID } = rp();
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: { id: pk.id, publicKey: new Uint8Array(pk.public_key), counter: pk.counter, transports: pk.transports as AuthenticatorTransport[] },
    });
  } catch {
    throw new HttpError(401, "Não foi possível confirmar o Face ID.");
  }
  if (!v.verified) throw new HttpError(401, "Não foi possível confirmar o Face ID.");
  await q("update passkeys set counter = $2, last_used_at = now() where id = $1", [pk.id, v.authenticationInfo.newCounter]);
  await createSession(pk.user_id);
  return ok({ ok: true });
});
