"use client";
import { Suspense, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { SetupNext } from "@/components/SetupNext";
import { CATEGORIES } from "@/components/CreateSheet";
import { api, notifyChanged, nowMinutes, useData } from "@/lib/client";
import { addDays, localToday, weekday, type ISODate } from "@/lib/dates";
import { isDueOn } from "@/lib/recurrence";
import { conflicts, dayPlan, type PlanItem } from "@/lib/dayplan";
import type { Activity, Task } from "@/lib/types";

const LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Grade do mês: começa no domingo da primeira semana e cobre 6 semanas. */
function monthGrid(year: number, month: number): ISODate[] {
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const start = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
const CAT = Object.fromEntries(CATEGORIES);

function duration(p: PlanItem) {
  const d = p.e - p.s;
  return d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? String(d % 60).padStart(2, "0") : ""}` : `${d} min`;
}

export default function Rotina() {
  const { openSheet, toast } = useUI();
  const { data } = useData<Activity[]>("/api/routine");
  const tasks = useData<Task[]>("/api/tasks");
  const todayISO = localToday();
  const [date, setDate] = useState<ISODate>(todayISO);
  const [view, setView] = useState(() => ({ y: Number(todayISO.slice(0, 4)), m: Number(todayISO.slice(5, 7)) - 1 }));
  const day = weekday(date);
  const isToday = date === todayISO;
  const grid = monthGrid(view.y, view.m);
  const monthPrefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
  function shift(n: number) {
    setView((v) => {
      const m = v.m + n;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }
  function pick(d: ISODate) {
    setDate(d);
    if (!d.startsWith(monthPrefix)) setView({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 });
  }
  function goToday() {
    pick(todayISO);
    setView({ y: Number(todayISO.slice(0, 4)), m: Number(todayISO.slice(5, 7)) - 1 });
  }
  const taskCount = (d: ISODate) => (tasks.data ?? []).filter((t) => isDueOn(t, d)).length;
  const hasRoutine = (d: ISODate) => (data ?? []).some((a) => a.weekdays.includes(weekday(d)));

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
      <div className="cal card">
        <div className="between cal-head">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevron-left" /></button>
          <b className="cal-title">{MONTHS[view.m]} {view.y}</b>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevron-right" /></button>
        </div>
        <div className="cal-grid" role="grid" aria-label="Calendário">
          {LETTER.map((l, i) => <span key={"h" + i} className="cal-wd">{l}</span>)}
          {grid.map((d) => {
            const n = taskCount(d);
            return (
              <button
                key={d}
                className={`cal-day ${d.startsWith(monthPrefix) ? "" : "out"} ${d === todayISO ? "today" : ""}`}
                aria-pressed={d === date}
                aria-label={`${Number(d.slice(8))} de ${MONTHS[Number(d.slice(5, 7)) - 1]}${n ? `, ${n} tarefa${n > 1 ? "s" : ""}` : ""}`}
                onClick={() => pick(d)}
              >
                <b className="num">{Number(d.slice(8))}</b>
                <span className="dots">
                  {hasRoutine(d) && <i className="r" />}
                  {n > 0 && <i className="t" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="between" style={{ marginTop: 18 }}>
        <p className="eyebrow">{isToday ? "Hoje · " : ""}{WEEKDAYS[day]}, {Number(date.slice(8))} de {MONTHS[Number(date.slice(5, 7)) - 1]}</p>
        {!isToday && <button className="link" onClick={goToday}>Ir para hoje</button>}
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
