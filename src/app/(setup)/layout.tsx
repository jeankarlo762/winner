import { SetupShell } from "@/components/Shell";
import { sessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser({ requireOnboarded: false });
  return <SetupShell user={user}>{children}</SetupShell>;
}
