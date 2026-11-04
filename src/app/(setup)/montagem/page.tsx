import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { sessionUser } from "@/lib/session";
import { routineView } from "@/lib/views";
import { toMinutes } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Montagem() {
  const user = await sessionUser({ requireOnboarded: false });
  if (!user.onboarded) redirect("/onboarding");
  const routine = (await routineView(user.id)).sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const step = Math.max(1, user.setup_step);
  const want = (user.onboarding.want as string[] | undefined)?.length ?? 0;
  const quit = (user.onboarding.quit as string[] | undefined)?.length ?? 0;
  const items: [string, string, string][] = [
    ["Rotina fixa", `${routine.length} atividades sugeridas, com início e fim`, "/rotina?setup=1"],
    ["Tarefas recorrentes", "Diárias, semanais, quinzenais e mensais", "/tarefas?setup=1"],
    ["Hábitos", `${want} para criar, ${quit} para abandonar`, "/habitos?setup=1"],
  ];
  const nextHref = step >= 4 ? "/hoje" : items[step - 1][2];
  return (
    <>
      <div style={{ paddingTop: 20 }}>
        <span className="tag blue">Pronto, {user.display_name}</span>
        <h1 className="h1" style={{ marginTop: 14 }}>Vamos montar seu sistema em 3 passos</h1>
        <p className="sub">Cada passo já vem preenchido com base nas suas respostas. Ajuste o que quiser.</p>
      </div>
      <div className="stack" style={{ marginTop: 24, gap: 10 }}>
        {items.map(([t, d, href], i) => {
          const state = i < step - 1 ? "ok" : i === step - 1 ? "cur" : "";
          return (
            <Link key={href} className={`setup ${state}`} href={href}>
              <span className="n">{state === "ok" ? <Icon name="check" size={16} style={{ strokeWidth: 3 }} /> : i + 1}</span>
              <span className="grow"><b>{t}</b><br /><span className="muted" style={{ fontSize: 13 }}>{d}</span></span>
              <Icon name="right" />
            </Link>
          );
        })}
      </div>
      {routine.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Prévia da sua rotina</p>
          {routine.slice(0, 5).map((r) => (
            <div key={r.id} className="between" style={{ padding: "6px 0", fontSize: 14 }}>
              <span>{r.title}</span>
              <span className="muted num">{r.start_time} – {r.end_time}</span>
            </div>
          ))}
          {routine.length > 5 && <p className="hint" style={{ margin: "6px 0 0" }}>+ {routine.length - 5} atividades</p>}
        </div>
      )}
      <div className="stack" style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" href={nextHref}>{step >= 4 ? "Ir para o meu dia" : step === 1 ? "Começar pela rotina" : "Continuar"}</Link>
        {step < 4 && <Link className="btn btn-text" href="/hoje">Pular e ver meu dia</Link>}
      </div>
    </>
  );
}
