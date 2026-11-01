import { AppShell } from "@/components/Shell";
import { sessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser({ requireOnboarded: true });
  return <AppShell user={user}>{children}</AppShell>;
}
