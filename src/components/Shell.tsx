"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import { Icon, Logo } from "./Icon";
import { UIProvider, useUI } from "./UI";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  setup_step: number;
  passkeys: number;
}

const UserCtx = createContext<SessionUser | null>(null);
export const useUser = () => useContext(UserCtx)!;

const TABS: [string, string, string][] = [
  ["/hoje", "Hoje", "home"],
  ["/rotina", "Rotina", "clock"],
  ["/tarefas", "Tarefas", "tasks"],
  ["/habitos", "Hábitos", "habit"],
];
const SIDE: [string, string, string][] = [
  ["/lembretes", "Lembretes", "bell"],
  ["/notas", "Notas", "note"],
  ["/perfil", "Perfil", "user"],
];

function TabBar() {
  const path = usePathname();
  const { openSheet } = useUI();
  const link = ([href, label, icon]: [string, string, string], extra = "") => (
    <Link key={href} href={href} className={extra} aria-current={path.startsWith(href) ? "page" : undefined}>
      <Icon name={icon} />
      {label}
    </Link>
  );
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <span className="brand">
        <Logo size={34} />
        Winner
      </span>
      {link(TABS[0])}
      {link(TABS[1])}
      <button className="fab" onClick={() => openSheet(path.startsWith("/rotina") ? "atividade" : path.startsWith("/habitos") ? "habito" : path.startsWith("/lembretes") ? "lembrete" : path.startsWith("/notas") ? "nota" : "tarefa")} aria-label="Criar">
        <Icon name="plus" />
      </button>
      {link(TABS[2])}
      {link(TABS[3])}
      {SIDE.map((s) => link(s, "side-only"))}
    </nav>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <UserCtx.Provider value={user}>
      <UIProvider>
        <div className="with-side">
          <main className="page">{children}</main>
        </div>
        <TabBar />
      </UIProvider>
    </UserCtx.Provider>
  );
}

export function SetupShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <UserCtx.Provider value={user}>
      <UIProvider>
        <main className="page bare">{children}</main>
      </UIProvider>
    </UserCtx.Provider>
  );
}
