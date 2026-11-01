"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { useData } from "@/lib/client";
import type { Note } from "@/lib/types";

export default function Notas() {
  const { openSheet } = useUI();
  const { data } = useData<Note[]>("/api/notes");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter((n) => !q || (n.title + " " + n.body + " " + n.tag).toLowerCase().includes(q));
  const card = (n: Note) => (
    <button key={n.id} className={`note ${n.pinned ? "pinned" : ""}`} onClick={() => openSheet("nota", n as unknown as Record<string, unknown>)}>
      <span className="between">
        {n.tag ? <span className={`tag ${n.pinned ? "blue" : ""}`}>{n.tag}</span> : <span />}
        {n.pinned && <Icon name="pin" size={16} style={{ color: "var(--accent)" }} />}
      </span>
      {n.title && <b>{n.title}</b>}
      {n.body && <p>{n.body}</p>}
    </button>
  );
  const pinned = list.filter((n) => n.pinned);
  const others = list.filter((n) => !n.pinned);
  return (
    <>
      <div className="between">
        <Link className="back" href="/hoje" aria-label="Voltar"><Icon name="back" /></Link>
        <button className="icon-btn" onClick={() => openSheet("nota")} aria-label="Nova nota"><Icon name="plus" /></button>
      </div>
      <h1 className="h2" style={{ marginTop: 6 }}>Notas</h1>
      <div className="input" style={{ marginTop: 14 }}>
        <Icon name="search" />
        <input aria-label="Buscar nas notas" placeholder="Buscar nas notas" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!data && <div className="skeleton" />}
      {pinned.length > 0 && <><p className="eyebrow" style={{ margin: "20px 0 10px" }}>Fixadas</p><div className="notes-grid">{pinned.map(card)}</div></>}
      {others.length > 0 && <><p className="eyebrow" style={{ margin: "20px 0 10px" }}>{pinned.length ? "Outras" : "Todas"}</p><div className="notes-grid">{others.map(card)}</div></>}
      {data && !list.length && (
        <div className="card empty" style={{ marginTop: 18 }}>
          {q ? <><b>Nada encontrado</b>Nenhuma nota com “{query}”.</> : <><b>Nenhuma nota ainda</b>Toque em + para escrever a primeira.</>}
        </div>
      )}
    </>
  );
}
