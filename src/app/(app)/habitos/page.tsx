"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { SetupNext } from "@/components/SetupNext";
import { api, notifyChanged, useData } from "@/lib/client";
import { localToday } from "@/lib/dates";
import type { BadHabit, GoodHabit, Habit } from "@/lib/types";

const DL = ["D", "S", "T", "Q", "Q", "S", "S"];
type Tab = "bons" | "desejados" | "ruins";

function GoodCard({ h }: { h: GoodHabit }) {
  const { openSheet, toast } = useUI();
  const desired = h.kind === "desired";
  const goal = h.goalDays ?? 21;
  async function toggle() {
    await api(`/api/habits/${h.id}/log`, { method: "POST", body: { date: localToday(), type: "done" } }).catch((e) => toast(e.message));
    notifyChanged();
  }
  async function promote() {
    await api(`/api/habits/${h.id}`, { method: "PATCH", body: { kind: "good" } }).catch((e) => toast(e.message));
    toast("Agora é um hábito bom!");
    notifyChanged();
  }
  return (
    <div className="hcard">
      <div className="between" style={{ alignItems: "flex-start" }}>
        <button className="grow" style={{ textAlign: "left" }} onClick={() => openSheet("habito", h as unknown as Record<string, unknown>)}>
          <b className="h3">{h.name}</b>
          <br />
          <span className="muted" style={{ fontSize: 13 }}>
            {h.per_week === 7 ? "Todo dia" : `${h.per_week}x por semana`}
            {h.time ? ` · ${h.time}` : ""}
            {` · ${h.weekCount} de ${h.per_week} nesta semana`}
          </span>
        </button>
        {desired ? <span className="tag blue">Em construção</span> : <span className="streak"><Icon name="habit" /><span className="num">{h.streak} {h.streak === 1 ? "dia" : "dias"}</span></span>}
      </div>
      {desired && h.reason && <span className="muted" style={{ fontSize: 13 }}>Por quê: {h.reason}</span>}
      {desired ? (
        <div>
          <div className="between" style={{ fontSize: 12.5, marginBottom: 6 }}><span className="muted">Dias seguidos</span><b className="num">{Math.min(h.streak, goal)} de {goal}</b></div>
          <div className="progress"><i style={{ width: `${Math.min(100, (h.streak / goal) * 100)}%` }} /></div>
        </div>
      ) : (
        <div className="week">
          {h.week.map((d, i) => (
            <span key={d.date}><i className={`${d.done ? "on" : ""} ${i === 6 ? "today" : ""}`} />{DL[new Date(d.date + "T12:00:00").getDay()]}</span>
          ))}
        </div>
      )}
      <div className="two" style={{ gridTemplateColumns: desired && h.streak >= goal ? "1fr 1fr" : "1fr" }}>
        <button className={`btn btn-sm ${h.doneToday ? "btn-primary" : "btn-ghost"}`} onClick={toggle} aria-pressed={h.doneToday}>
          <Icon name="check" /> {h.doneToday ? "Feito hoje" : "Marcar como feito hoje"}
        </button>
        {desired && h.streak >= goal && <button className="btn btn-sm btn-ghost" onClick={promote}>Virar hábito bom</button>}
      </div>
    </div>
  );
}

function BadCard({ h }: { h: BadHabit }) {
  const { openSheet, toast } = useUI();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  async function log(type: "resist" | "relapse") {
    try {
      await api(`/api/habits/${h.id}/log`, { method: "POST", body: { date: localToday(), type, note } });
      toast(type === "resist" ? "Boa! Vontade vencida registrada." : "Recaída registrada. Recomeçando hoje.");
      setConfirm(false);
      setNote("");
      notifyChanged();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <div className="badcard">
      <div className="between">
        <button style={{ textAlign: "left", color: "inherit" }} onClick={() => openSheet("habito", h as unknown as Record<string, unknown>)}><b className="h3">{h.name}</b></button>
        <Icon name="shield" />
      </div>
      <div><span className="count num">{h.cleanDays}</span> <span className="muted">{h.cleanDays === 1 ? "dia limpo" : "dias limpo"}</span></div>
      <div className="progress"><i style={{ width: `${h.record ? Math.min(100, (h.cleanDays / h.record) * 100) : 0}%` }} /></div>
      <span className="muted num" style={{ fontSize: 12.5, marginTop: -6 }}>
        Recorde: {h.record} dias{h.record > h.cleanDays ? ` · faltam ${h.record - h.cleanDays} para bater` : h.cleanDays > 0 ? " · você está no seu recorde" : ""}
        {h.resistedToday > 0 ? ` · ${h.resistedToday}x vencida hoje` : ""}
      </span>
      {(h.triggers || h.replacement) && (
        <div className="meta">
          <div><b>Gatilhos</b>{h.triggers || "Não informado"}</div>
          <div><b>Em vez disso</b>{h.replacement || "Não informado"}</div>
        </div>
      )}
      {confirm ? (
        <div className="confirm">
          <span>Registrar recaída? O contador volta a zero, mas seu recorde de {h.record} dias fica salvo.</span>
          <div className="field">
            <label htmlFor={`trig-${h.id}`} style={{ color: "var(--navy-muted)" }}>O que provocou? (opcional)</label>
            <div className="input"><input id={`trig-${h.id}`} maxLength={300} placeholder="Ex.: almoço fora" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <div className="acts">
            <button className="relapse" onClick={() => setConfirm(false)}>Cancelar</button>
            <button className="confirm-relapse" onClick={() => log("relapse")}>Registrar</button>
          </div>
        </div>
      ) : (
        <div className="acts">
          <button className="resist" onClick={() => log("resist")}>Venci a vontade</button>
          <button className="relapse" onClick={() => setConfirm(true)}>Tive uma recaída</button>
        </div>
      )}
    </div>
  );
}

function HabitsInner() {
  const params = useSearchParams();
  const { openSheet } = useUI();
  const { data } = useData<Habit[]>("/api/habits");
  const initial = (params.get("tab") as Tab) ?? "bons";
  const [tab, setTab] = useState<Tab>(["bons", "desejados", "ruins"].includes(initial) ? initial : "bons");
  const list = (data ?? []).filter((h) => (tab === "bons" ? h.kind === "good" : tab === "desejados" ? h.kind === "desired" : h.kind === "bad"));
  const counts = { bons: 0, desejados: 0, ruins: 0 };
  for (const h of data ?? []) counts[h.kind === "good" ? "bons" : h.kind === "desired" ? "desejados" : "ruins"]++;

  return (
    <>
      <div className="between">
        <div>
          <h1 className="h2">Hábitos</h1>
          <p className="sub" style={{ marginTop: 2 }}>Construir os bons, remover os ruins</p>
        </div>
        <button className="icon-btn" onClick={() => openSheet("habito")} aria-label="Novo hábito"><Icon name="plus" /></button>
      </div>
      <div className="seg" style={{ marginTop: 16 }}>
        {(["bons", "desejados", "ruins"] as Tab[]).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)} <span className="num" style={{ opacity: 0.6 }}>{counts[t]}</span>
          </button>
        ))}
      </div>
      <div className="stack" style={{ marginTop: 16 }}>
        {tab === "desejados" && <p className="hint" style={{ margin: 0 }}>Hábitos em construção. Depois de 21 dias seguidos, você pode promover para hábito bom. Skills que quer desenvolver entram aqui.</p>}
        {tab === "ruins" && <p className="hint" style={{ margin: 0 }}>Aqui o objetivo é remover. Você não marca todo dia: o contador sobe sozinho e você registra só quando houver recaída.</p>}
        {!data ? <div className="skeleton" /> : list.length ? (
          list.map((h) => (h.kind === "bad" ? <BadCard key={h.id} h={h} /> : <GoodCard key={h.id} h={h} />))
        ) : (
          <div className="card empty"><b>Nada por aqui ainda</b>Toque em + para adicionar.</div>
        )}
      </div>
      <SetupNext step={3} label="Concluir e ver meu dia" />
    </>
  );
}

export default function Habitos() {
  return (
    <Suspense>
      <HabitsInner />
    </Suspense>
  );
}
