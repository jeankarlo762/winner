import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (await currentUser()) redirect("/hoje");
  return <main className="page bare">{children}</main>;
}
