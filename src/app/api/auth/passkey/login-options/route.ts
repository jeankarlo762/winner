import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { ok, route } from "@/lib/http.ts";
import { clientIp, rateLimit } from "@/lib/auth.ts";
import { rp, saveChallenge } from "@/lib/webauthn.ts";

export const POST = route(async (req) => {
  rateLimit("passkey-options:" + clientIp(req), 60);
  const options = await generateAuthenticationOptions({ rpID: rp().rpID, userVerification: "required" });
  await saveChallenge(options.challenge, null);
  return ok(options);
});
