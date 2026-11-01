"use client";
import { Suspense, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { SetupNext } from "@/components/SetupNext";
import { CATEGORIES } from "@/components/CreateSheet";
import { nowMinutes, useData } from "@/lib/client";
import { toMinutes } from "@/lib/dates";
import type { Activity } from "@/lib/types";

const LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];
const CAT = Object.fromEntries(CATEGORIES);

function duration(a: Activity) {
  let d = toMinutes(a.end_time) - toMinutes(a.start_time);
  if (d <= 0) d += 1440;
  return d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? String(d % 60).padStart(2, "0") : ""}` : `${d} min`;
}

function conflicts(list: Activity[]): [Activity, Activity][] {
  const out: [Activity, Activity][] = [];
  const span = (a: Activity) => {
    const s = toMinutes(a.start_time);
    let e = toMinutes(a.end_time);
    if (e <= s) e += 1440;
    return [s, e];
  };
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const [s1, e1] = span(list[i]);
      const [s2, e2] = span(list[j]);
      if (s1 < e2 && s2 < e1) out.push([list[i], list[j]]);
    }
  return out;
}

export default function Rotina() {
  const { openSheet } = useUI();
  const { data } = useData<Activity[]>("/api/routine");
  const today = new Date();
  const [day, setDay] = useState(today.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });
  const list = (data ?? []).filter((a) => a.weekdays.includes(day)).sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const clash = conflicts(list);
  const now = nowMinutes();

  return (
    <>
      <div className="between">
        <div>
          <h1 className="h2">Rotina</h1>
          <p className="sub" style={{ marginTop: 2 }}>Atividades fixas, com início e fim</p>
        </div>
        <button className="icon-btn" onClick={() => openSheet("atividade")} aria-label="Nova atividade"><Icon name="plus" /></button>
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
      {!data ? (
        <div className="skeleton" />
      ) : list.length ? (
        <div className="timeline">
          {list.map((a) => {
            const s = toMinutes(a.start_time);
            let e = toMinutes(a.end_time);
            if (e <= s) e += 1440;
            const isNow = day === today.getDay() && s <= now && now < e;
            return (
              <div className="slot" key={a.id}>
                <span className="tm num">{a.start_time}</span>
                <button className={`block ${isNow ? "now" : ""}`} style={{ ["--cat" as string]: `var(--c-${a.category})` }} onClick={() => openSheet("atividade", a as unknown as Record<string, unknown>)}>
                  <span>
                    <b>{a.title}</b>
                    <small className="num">{a.start_time} – {a.end_time} · {duration(a)}</small>
                  </span>
                  <span className="pill">{isNow ? "Agora" : CAT[a.category] ?? a.category}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty" style={{ marginTop: 18 }}>
          <b>Nenhuma atividade neste dia</b>
          Toque em + para adicionar uma atividade com horário de início e fim.
        </div>
      )}
      <Suspense>
        <SetupNext step={1} label="Salvar rotina e ir para tarefas" />
      </Suspense>
    </>
  );
}
