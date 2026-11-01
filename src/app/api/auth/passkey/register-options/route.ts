import { generateRegistrationOptions } from "@simplewebauthn/server";
import { ok, route } from "@/lib/http.ts";
import { requireUser } from "@/lib/auth.ts";
import { q } from "@/lib/db.ts";
import { rp, saveChallenge } from "@/lib/webauthn.ts";

export const POST = route(async () => {
  const user = await requireUser();
  const { rpID, rpName } = rp();
  const existing = await q<{ id: string; transports: string[] }>("select id, transports from passkeys where user_id = $1", [user.id]);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.username,
    userDisplayName: user.display_name || user.username,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports as AuthenticatorTransport[] })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await saveChallenge(options.challenge, user.id);
  return ok(options);
});
