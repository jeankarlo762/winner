"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { api, hhmm, notifyChanged, useData } from "@/lib/client";
import type { Reminder } from "@/lib/types";

const REPEAT: Record<string, string> = { none: "Uma vez", daily: "Todo dia", weekdays: "Seg a sex", weekly: "Toda semana", monthly: "Todo mês", yearly: "Todo ano" };
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function group(r: Reminder, now: Date): string {
  const d = new Date(r.remind_at);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 86400000);
  if (d < now) return "Atrasados";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days < 7) return "Esta semana";
  return "Mais tarde";
}
const ORDER = ["Atrasados", "Hoje", "Amanhã", "Esta semana", "Mais tarde"];

export default function Lembretes() {
  const { openSheet, toast } = useUI();
  const { data } = useData<Reminder[]>("/api/reminders");
  const now = new Date();
  const pending = (data ?? []).filter((r) => !r.done_at);
  const groups = ORDER.map((g) => [g, pending.filter((r) => group(r, now) === g)] as const).filter(([, l]) => l.length);

  async function act(r: Reminder, action: string, msg: string) {
    try {
      await api(`/api/reminders/${r.id}/action`, { method: "POST", body: { action } });
      toast(msg);
      notifyChanged();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <>
      <div className="between">
        <Link className="back" href="/hoje" aria-label="Voltar"><Icon name="back" /></Link>
        <button className="icon-btn" onClick={() => openSheet("lembrete")} aria-label="Novo lembrete"><Icon name="plus" /></button>
      </div>
      <h1 className="h2" style={{ marginTop: 6 }}>Lembretes</h1>
      {!data ? <div className="skeleton" /> : !groups.length && <div className="card empty" style={{ marginTop: 18 }}><b>Nenhum lembrete pendente</b>Toque em + para criar um.</div>}
      {groups.map(([g, list]) => (
        <div className="section" style={{ marginTop: 20 }} key={g}>
          <p className="eyebrow" style={{ marginBottom: 4, color: g === "Atrasados" ? "var(--bad)" : undefined }}>{g}</p>
          <div className="card list">
            {list.map((r) => {
              const d = new Date(r.remind_at);
              const label = g === "Esta semana" ? WD[d.getDay()] : g === "Mais tarde" ? `${d.getDate()}/${d.getMonth() + 1}` : hhmm(d);
              return (
                <div key={r.id} className={`rem ${g === "Atrasados" ? "late" : ""}`}>
                  <span className="tm num">{label}</span>
                  <div className="grow">
                    <button style={{ textAlign: "left", fontWeight: 500 }} onClick={() => openSheet("lembrete", r as unknown as Record<string, unknown>)}>{r.text}</button>
                    <div className="muted" style={{ fontSize: 12.5 }}>{REPEAT[r.repeat]}{g === "Esta semana" || g === "Mais tarde" ? ` · ${hhmm(d)}` : ""}</div>
                    {(g === "Atrasados" || g === "Hoje") && (
                      <div className="snooze">
                        <button onClick={() => act(r, "snooze10", "Adiado 10 minutos")}>+10 min</button>
                        <button onClick={() => act(r, "snooze60", "Adiado 1 hora")}>+1 h</button>
                        <button onClick={() => act(r, "tomorrow", "Adiado para amanhã")}>Amanhã</button>
                      </div>
                    )}
                  </div>
                  <button className="check" style={{ borderRadius: "50%" }} onClick={() => act(r, "done", r.repeat === "none" ? "Lembrete concluído" : "Feito. Próximo agendado.")} aria-label={`Concluir ${r.text}`}>
                    <Icon name="check" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
