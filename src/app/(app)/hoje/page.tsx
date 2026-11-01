"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUser } from "@/components/Shell";
import { useUI } from "@/components/UI";
import { api, greeting, hhmm, longDate, notifyChanged, nowMinutes, useData } from "@/lib/client";
import { toMinutes } from "@/lib/dates";
import type { Activity, BadHabit, GoodHabit, TodayData } from "@/lib/types";
import { TaskRow } from "../tarefas/TaskRow";

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 22, c = 2 * Math.PI * r, p = max ? c * Math.min(1, value / max) : 0;
  return (
    <svg viewBox="0 0 54 54" aria-hidden="true">
      <circle cx="27" cy="27" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
      <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${p} ${c}`} />
    </svg>
  );
}

const endOf = (a: Activity) => (toMinutes(a.end_time) <= toMinutes(a.start_time) ? toMinutes(a.end_time) + 1440 : toMinutes(a.end_time));

export default function Hoje() {
  const user = useUser();
  const { toast } = useUI();
  const { data, setData } = useData<TodayData>("/api/today");
  const [now, setNow] = useState(nowMinutes());
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <><div className="skeleton" style={{ height: 80 }} /><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" style={{ height: 200 }} /></>;

  const dow = new Date().getDay();
  const todays = data.routine.filter((a) => a.weekdays.includes(dow)).sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const yesterday = (dow + 6) % 7;
  const overnight = data.routine.find((a) => a.weekdays.includes(yesterday) && toMinutes(a.end_time) <= toMinutes(a.start_time) && now < toMinutes(a.end_time));
  const current = overnight ?? todays.find((a) => toMinutes(a.start_time) <= now && now < endOf(a));
  const next = todays.filter((a) => toMinutes(a.start_time) > now).slice(0, 3);
  const passed = todays.filter((a) => endOf(a) <= now).length;
  const tasksDone = data.tasks.filter((t) => t.done).length;
  const good = data.habits.filter((h): h is GoodHabit => h.kind !== "bad");
  const bad = data.habits.filter((h): h is BadHabit => h.kind === "bad").sort((a, b) => b.cleanDays - a.cleanDays);
  const goodDone = good.filter((h) => h.doneToday).length;
  const startedToday = new Date();
  const reminders = data.reminders.filter((r) => new Date(r.remind_at).toDateString() === startedToday.toDateString() || new Date(r.remind_at) < startedToday);

  let pct = 0, left = 0;
  if (current) {
    const s = toMinutes(current.start_time);
    const e = endOf(current);
    const n = overnight ? now + 1440 : now;
    pct = Math.round(((n - s) / (e - s)) * 100);
    left = e - n;
  }

  async function toggleHabit(h: GoodHabit) {
    setData({ ...data!, habits: data!.habits.map((x) => (x.id === h.id ? { ...h, doneToday: !h.doneToday } : x)) });
    await api(`/api/habits/${h.id}/log`, { method: "POST", body: { date: data!.today, type: "done" } }).catch((e) => toast(e.message));
    notifyChanged();
  }

  return (
    <>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">{longDate()}</p>
          <h1 className="h1" style={{ marginTop: 4 }}>{greeting()}, {user.display_name}</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="icon-btn" href="/lembretes" aria-label="Lembretes">
            <Icon name="bell" />
            {reminders.length > 0 && <span className="dot" />}
          </Link>
          <Link className="icon-btn" href="/perfil" aria-label="Perfil"><Icon name="user" /></Link>
        </div>
      </div>

      <div className="rings">
        <div className="ring"><Ring value={tasksDone} max={data.tasks.length} color="var(--accent)" /><b className="num">{tasksDone}/{data.tasks.length}</b><span>Tarefas</span></div>
        <div className="ring"><Ring value={goodDone} max={good.length} color="var(--good)" /><b className="num">{goodDone}/{good.length}</b><span>Hábitos</span></div>
        <div className="ring"><Ring value={passed} max={todays.length} color="var(--c-estudo)" /><b className="num">{passed}/{todays.length}</b><span>Rotina</span></div>
      </div>

      <div className="card-navy" style={{ marginTop: 16 }}>
        {current ? (
          <>
            <div className="between"><span className="eyebrow" style={{ color: "var(--navy-muted)" }}>Agora</span><span className="muted num" style={{ fontSize: 13 }}>{current.start_time} – {current.end_time}</span></div>
            <div className="now-time" style={{ margin: "6px 0 12px" }}>{current.title}</div>
            <div className="progress"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
            <p className="muted num" style={{ fontSize: 12.5, margin: "8px 0 0" }}>{left >= 60 ? `${Math.floor(left / 60)}h${left % 60 ? String(left % 60).padStart(2, "0") : ""}` : `${left} min`} restantes</p>
          </>
        ) : (
          <>
            <span className="eyebrow" style={{ color: "var(--navy-muted)" }}>Agora · {hhmm(new Date())}</span>
            <div className="now-time" style={{ margin: "6px 0 4px" }}>Tempo livre</div>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{todays.length ? "Nenhuma atividade fixa neste horário." : "Você ainda não tem atividades na rotina de hoje."}</p>
          </>
        )}
        {next.length > 0 && (
          <div className="next-list">{next.map((r) => <div key={r.id}><span className="num">{r.start_time}</span><span>{r.title}</span></div>)}</div>
        )}
        {!todays.length && <Link href="/rotina" className="link" style={{ color: "#fff", display: "inline-block", marginTop: 12 }}>Montar rotina</Link>}
      </div>

      <div className="section">
        <div className="section-head"><h2 className="h3">Tarefas de hoje</h2><Link className="link" href="/tarefas">Ver todas</Link></div>
        {data.tasks.length ? (
          <div className="card list">{data.tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
        ) : (
          <div className="card empty"><b>Nada para hoje</b>Crie uma tarefa no botão +.</div>
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2 className="h3">Hábitos</h2><Link className="link" href="/habitos">Ver todos</Link></div>
        {good.length > 0 && (
          <div className="hab-row">
            {good.map((h) => (
              <button key={h.id} className={`hab-chip ${h.doneToday ? "done" : ""}`} aria-pressed={h.doneToday} onClick={() => toggleHabit(h)}>
                <span className="circle"><Icon name="check" /></span>{h.name}
              </button>
            ))}
          </div>
        )}
        {bad[0] && (
          <Link className="clean" href="/habitos?tab=ruins">
            <Icon name="shield" size={28} style={{ color: "var(--good)" }} />
            <div className="grow"><b>{bad[0].cleanDays} {bad[0].cleanDays === 1 ? "dia" : "dias"} sem {bad[0].name.toLowerCase()}</b><br /><span className="muted" style={{ fontSize: 13 }}>Recorde: {bad[0].record} dias</span></div>
            <span className="big num">{bad[0].cleanDays}</span>
          </Link>
        )}
        {!good.length && !bad.length && <div className="card empty"><b>Nenhum hábito ainda</b>Comece pelos hábitos que quer criar ou abandonar.</div>}
      </div>

      {reminders.length > 0 && (
        <div className="section">
          <div className="section-head"><h2 className="h3">Lembretes de hoje</h2><Link className="link" href="/lembretes">Ver todos</Link></div>
          <div className="card list">
            {reminders.slice(0, 3).map((r) => {
              const d = new Date(r.remind_at);
              return <div key={r.id} className={`rem ${d < new Date() ? "late" : ""}`}><span className="tm num">{hhmm(d)}</span><div className="grow">{r.text}</div></div>;
            })}
          </div>
        </div>
      )}
    </>
  );
}
