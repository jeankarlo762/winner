import { redirect } from "next/navigation";
import { currentUser } from "./auth.ts";
import { one } from "./db.ts";
import type { SessionUser } from "@/components/Shell";

export async function sessionUser(opts: { requireOnboarded: boolean }): Promise<SessionUser & { onboarding: Record<string, unknown>; onboarded: boolean }> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (opts.requireOnboarded && !u.onboarded_at) redirect("/onboarding");
  const pk = await one<{ n: number }>("select count(*)::int as n from passkeys where user_id = $1", [u.id]);
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    display_name: u.display_name,
    setup_step: u.setup_step,
    passkeys: pk?.n ?? 0,
    onboarding: u.onboarding,
    onboarded: !!u.onboarded_at,
  };
}
