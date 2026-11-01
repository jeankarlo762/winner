"use client";
import { Suspense, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { SetupNext } from "@/components/SetupNext";
import { CATEGORIES } from "@/components/CreateSheet";
import { api, notifyChanged, nowMinutes, useData } from "@/lib/client";
import { localToday } from "@/lib/dates";
import { conflicts, dayPlan, type PlanItem } from "@/lib/dayplan";
import type { Activity, Task } from "@/lib/types";

const LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];
const CAT = Object.fromEntries(CATEGORIES);

function duration(p: PlanItem) {
  const d = p.e - p.s;
  return d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? String(d % 60).padStart(2, "0") : ""}` : `${d} min`;
}

export default function Rotina() {
  const { openSheet, toast } = useUI();
  const { data } = useData<Activity[]>("/api/routine");
  const tasks = useData<Task[]>("/api/tasks");
  const today = new Date();
  const [day, setDay] = useState(today.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });
  const date = localToday(week[day]);
  const isToday = day === today.getDay();
  const { items: list, untimed } = dayPlan(data ?? [], tasks.data ?? [], date, day);
  const clash = conflicts(list);
  const now = nowMinutes();

  async function toggle(t: Task) {
    if (t.occurrence !== date) return;
    try {
      const r = await api<{ done: boolean }>(`/api/tasks/${t.id}/toggle`, { method: "POST", body: { occurrence: date } });
      if (r.done) toast("Tarefa concluída");
      notifyChanged();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <>
      <div className="between">
        <div>
          <h1 className="h2">Rotina</h1>
          <p className="sub" style={{ marginTop: 2 }}>Atividades fixas e tarefas do dia</p>
        </div>
        <button className="icon-btn" onClick={() => openSheet("atividade")} aria-label="Adicionar à rotina"><Icon name="plus" /></button>
      </div>
      <div className="daypick" role="group" aria-label="Dia da semana">
        {week.map((d, i) => (
          <button key={i} aria-pressed={day === i} onClick={() => setDay(i)}>
            {LETTER[i]}
            <b className="num">{d.getDate()}</b>
          </button>
        ))}
      </div>
      {clash.length > 0 && (
        <div className="conflict" role="status">
          <Icon name="alert" size={18} />
          <span>“{clash[0][0].title}” e “{clash[0][1].title}” estão no mesmo horário.</span>
        </div>
      )}
      {!data || !tasks.data ? (
        <div className="skeleton" />
      ) : list.length ? (
        <div className="timeline">
          {list.map((p) => {
            const isNow = isToday && p.s <= now && now < p.e;
            const t = p.task;
            if (t) {
              const canCheck = t.occurrence === date;
              const done = canCheck && t.done;
              return (
                <div className={`slot ${done ? "done" : ""}`} key={p.key}>
                  <span className="tm num">{p.start}</span>
                  <div className={`block task ${isNow ? "now" : ""}`} style={{ ["--cat" as string]: "var(--accent)" }}>
                    {canCheck && (
                      <button className="check" onClick={() => toggle(t)} aria-pressed={done} aria-label={done ? `Desmarcar ${t.title}` : `Concluir ${t.title}`}>
                        <Icon name="check" />
                      </button>
                    )}
                    <button className="grow" style={{ textAlign: "left" }} onClick={() => openSheet("tarefa", t as unknown as Record<string, unknown>)}>
                      <b className="t">{t.title}</b>
                      <small className="num">{p.start} – {p.end} · {duration(p)} · {t.label}</small>
                    </button>
                    <span className="pill">{isNow ? "Agora" : "Tarefa"}</span>
                  </div>
                </div>
              );
            }
            const a = p.activity!;
            return (
              <div className="slot" key={p.key}>
                <span className="tm num">{p.start}</span>
                <button className={`block ${isNow ? "now" : ""}`} style={{ ["--cat" as string]: `var(--c-${a.category})` }} onClick={() => openSheet("atividade", a as unknown as Record<string, unknown>)}>
                  <span>
                    <b>{a.title}</b>
                    <small className="num">{p.start} – {p.end} · {duration(p)}</small>
                  </span>
                  <span className="pill">{isNow ? "Agora" : CAT[a.category] ?? a.category}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty" style={{ marginTop: 18 }}>
          <b>Nada neste dia</b>
          Toque em + para adicionar uma atividade ou tarefa com horário de início e fim.
        </div>
      )}
      {untimed.length > 0 && (
        <div className="section">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Tarefas sem horário</p>
          <div className="card list">
            {untimed.map((t) => (
              <button key={t.id} className="item" onClick={() => openSheet("tarefa", t as unknown as Record<string, unknown>)}>
                <span className="grow"><span className="t">{t.title}</span><span className="m">Toque para definir o horário</span></span>
                <Icon name="edit" size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
      <Suspense>
        <SetupNext step={1} label="Salvar rotina e ir para tarefas" />
      </Suspense>
    </>
  );
}
