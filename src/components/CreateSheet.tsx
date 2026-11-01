"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { api, hhmm, notifyChanged } from "@/lib/client";
import { localToday } from "@/lib/dates";

export type SheetType = "atividade" | "tarefa" | "habito" | "lembrete" | "nota";

const TYPES: [SheetType, string, string][] = [
  ["atividade", "Atividade", "clock"],
  ["tarefa", "Tarefa", "tasks"],
  ["habito", "Hábito", "habit"],
  ["lembrete", "Lembrete", "bell"],
  ["nota", "Nota", "note"],
];
const ENDPOINT: Record<SheetType, string> = { atividade: "/api/routine", tarefa: "/api/tasks", habito: "/api/habits", lembrete: "/api/reminders", nota: "/api/notes" };
export const CATEGORIES: [string, string][] = [
  ["trabalho", "Trabalho"],
  ["saude", "Saúde"],
  ["estudo", "Estudo"],
  ["pessoal", "Pessoal"],
  ["descanso", "Descanso"],
];
const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

type Item = Record<string, unknown>;

function defaults(type: SheetType, item?: Item): Item {
  if (item) {
    if (type === "lembrete") {
      const d = new Date(item.remind_at as string);
      return { ...item, date: localToday(d), time: hhmm(d) };
    }
    return { ...item };
  }
  const today = localToday();
  switch (type) {
    case "atividade":
      return { title: "", start_time: "07:00", end_time: "08:00", weekdays: [1, 2, 3, 4, 5], category: "pessoal" };
    case "tarefa":
      return { title: "", recurrence: "daily", weekdays: [new Date().getDay()], month_day: new Date().getDate(), anchor_date: today, time: "", priority: "normal", notes: "" };
    case "habito":
      return { kind: "good", name: "", per_week: 7, time: "", reason: "", triggers: "", replacement: "", start_date: today };
    case "lembrete": {
      const d = new Date(Date.now() + 60 * 60000);
      return { text: "", date: localToday(d), time: hhmm(d), repeat: "none" };
    }
    case "nota":
      return { title: "", body: "", tag: "", pinned: false };
  }
}

function payload(type: SheetType, f: Item): Item {
  switch (type) {
    case "atividade":
      return { title: f.title, start_time: f.start_time, end_time: f.end_time, weekdays: f.weekdays, category: f.category };
    case "tarefa": {
      const r = f.recurrence as string;
      return {
        title: f.title,
        notes: f.notes ?? "",
        recurrence: r,
        weekdays: r === "weekly" ? f.weekdays : [],
        month_day: r === "monthly" ? Number(f.month_day) : null,
        anchor_date: f.anchor_date,
        time: f.time || null,
        priority: f.priority,
      };
    }
    case "habito":
      return {
        kind: f.kind,
        name: f.name,
        per_week: Number(f.per_week),
        time: f.time || null,
        reason: f.reason ?? "",
        triggers: f.triggers ?? "",
        replacement: f.replacement ?? "",
        start_date: f.start_date,
      };
    case "lembrete":
      return { text: f.text, remind_at: new Date(`${f.date}T${f.time}:00`).toISOString(), repeat: f.repeat };
    case "nota":
      return { title: f.title, body: f.body, tag: f.tag, pinned: !!f.pinned };
  }
}

export function CreateSheet({
  type: initialType,
  item,
  lockType,
  onClose,
  toast,
}: {
  type: SheetType;
  item?: Item;
  lockType?: boolean;
  onClose: () => void;
  toast: (m: string) => void;
}) {
  const [type, setType] = useState<SheetType>(initialType);
  const [f, setF] = useState<Item>(() => defaults(initialType, item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = !!item?.id;
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const toggleDay = (d: number) => {
    const cur = (f.weekdays as number[]) ?? [];
    set("weekdays", cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort());
  };
  const label = TYPES.find((t) => t[0] === type)![1];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = editing ? `${ENDPOINT[type]}/${item!.id}` : ENDPOINT[type];
      await api(url, { method: editing ? "PATCH" : "POST", body: payload(type, f) });
      notifyChanged();
      toast(editing ? "Alterações salvas" : `${label} criad${type === "tarefa" || type === "atividade" || type === "nota" ? "a" : "o"}`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`${ENDPOINT[type]}/${item!.id}`, { method: "DELETE" });
      notifyChanged();
      toast("Excluído");
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const daysRow = (
    <div className="days" role="group" aria-label="Dias da semana">
      {DAYS.map((d, i) => (
        <button type="button" key={i} aria-label={DAY_NAMES[i]} aria-pressed={(f.weekdays as number[])?.includes(i)} onClick={() => toggleDay(i)}>
          {d}
        </button>
      ))}
    </div>
  );

  return (
    <section className="sheet" role="dialog" aria-modal="true" aria-label={editing ? `Editar ${label.toLowerCase()}` : "Criar"}>
      <div className="grabber" />
      <div className="between" style={{ marginBottom: 14 }}>
        <h2 className="h2" style={{ fontSize: 20 }}>
          {editing ? `Editar ${label.toLowerCase()}` : "Criar"}
        </h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <Icon name="x" />
        </button>
      </div>
      {!lockType && (
        <div className="type-grid">
          {TYPES.map(([k, l, ic]) => (
            <button
              type="button"
              key={k}
              aria-pressed={type === k}
              onClick={() => {
                setType(k);
                setF(defaults(k));
                setError(null);
              }}
            >
              <Icon name={ic} />
              {l}
            </button>
          ))}
        </div>
      )}
      <form className="stack" style={{ marginTop: 18 }} onSubmit={save}>
        {type === "atividade" && (
          <>
            <Field id="f-title" label="Atividade">
              <input id="f-title" required maxLength={80} placeholder="Ex.: Academia" value={f.title as string} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="two">
              <Field id="f-s" label="Começa">
                <input id="f-s" type="time" required value={f.start_time as string} onChange={(e) => set("start_time", e.target.value)} />
              </Field>
              <Field id="f-e" label="Termina">
                <input id="f-e" type="time" required value={f.end_time as string} onChange={(e) => set("end_time", e.target.value)} />
              </Field>
            </div>
            <div className="field">
              <span className="label">Dias da semana</span>
              {daysRow}
            </div>
            <div className="field">
              <span className="label">Categoria</span>
              <div className="chips">
                {CATEGORIES.map(([k, l]) => (
                  <button type="button" key={k} className="chip" aria-pressed={f.category === k} onClick={() => set("category", k)}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--c-${k})` }} />
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {type === "tarefa" && (
          <>
            <Field id="f-t" label="Tarefa">
              <input id="f-t" required maxLength={120} placeholder="Ex.: Pagar fornecedores" value={f.title as string} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="field">
              <span className="label">Repetição</span>
              <div className="seg">
                {[
                  ["daily", "Diária"],
                  ["weekly", "Semanal"],
                  ["biweekly", "Quinzenal"],
                  ["monthly", "Mensal"],
                  ["once", "Uma vez"],
                ].map(([k, l]) => (
                  <button type="button" key={k} aria-pressed={f.recurrence === k} onClick={() => set("recurrence", k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {f.recurrence === "weekly" && (
              <div className="field">
                <span className="label">Em quais dias</span>
                {daysRow}
              </div>
            )}
            {(f.recurrence === "biweekly" || f.recurrence === "once" || f.recurrence === "daily") && (
              <Field id="f-a" label={f.recurrence === "once" ? "Data" : f.recurrence === "biweekly" ? "Primeira data" : "Começa em"} hint={f.recurrence === "biweekly" ? "Repete a cada 15 dias a partir dessa data." : undefined}>
                <input id="f-a" type="date" required value={f.anchor_date as string} onChange={(e) => set("anchor_date", e.target.value)} />
              </Field>
            )}
            {f.recurrence === "monthly" && (
              <Field id="f-m" label="Dia do mês" hint="Em meses mais curtos, cai no último dia.">
                <select id="f-m" value={String(f.month_day ?? 1)} onChange={(e) => set("month_day", Number(e.target.value))}>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Dia {i + 1}
                    </option>
                  ))}
                  <option value={0}>Último dia do mês</option>
                </select>
              </Field>
            )}
            <div className="two">
              <Field id="f-h" label="Horário (opcional)">
                <input id="f-h" type="time" value={(f.time as string) ?? ""} onChange={(e) => set("time", e.target.value)} />
              </Field>
              <Field id="f-p" label="Prioridade">
                <select id="f-p" value={f.priority as string} onChange={(e) => set("priority", e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {type === "habito" && (
          <>
            <div className="field">
              <span className="label">Tipo de hábito</span>
              <div className="seg">
                {[
                  ["good", "Bom"],
                  ["desired", "Desejado"],
                  ["bad", "Ruim"],
                ].map(([k, l]) => (
                  <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => set("kind", k)} disabled={editing}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="hint">
                {f.kind === "good" ? "Algo que você já faz e quer manter." : f.kind === "desired" ? "Algo que você quer começar. Inclui skills que quer desenvolver." : "Algo que você quer abandonar. O app conta os dias sem ele."}
              </span>
            </div>
            <Field id="f-hn" label="Nome">
              <input id="f-hn" required maxLength={80} placeholder={f.kind === "bad" ? "Ex.: Refrigerante" : "Ex.: Ler 20 páginas"} value={f.name as string} onChange={(e) => set("name", e.target.value)} />
            </Field>
            {f.kind === "bad" ? (
              <>
                <Field id="f-tr" label="O que costuma provocar?">
                  <input id="f-tr" maxLength={300} placeholder="Ex.: almoço fora, calor" value={f.triggers as string} onChange={(e) => set("triggers", e.target.value)} />
                </Field>
                <Field id="f-sb" label="O que fazer no lugar">
                  <input id="f-sb" maxLength={300} placeholder="Ex.: água com gás e limão" value={f.replacement as string} onChange={(e) => set("replacement", e.target.value)} />
                </Field>
                <Field id="f-sd" label="Sem esse hábito desde">
                  <input id="f-sd" type="date" required max={localToday()} value={f.start_date as string} onChange={(e) => set("start_date", e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <div className="two">
                  <Field id="f-fq" label="Frequência">
                    <select id="f-fq" value={String(f.per_week)} onChange={(e) => set("per_week", Number(e.target.value))}>
                      <option value={7}>Todo dia</option>
                      {[6, 5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n}x por semana
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="f-hh" label="Horário (opcional)">
                    <input id="f-hh" type="time" value={(f.time as string) ?? ""} onChange={(e) => set("time", e.target.value)} />
                  </Field>
                </div>
                {f.kind === "desired" && (
                  <Field id="f-why" label="Por que você quer isso?">
                    <input id="f-why" maxLength={300} placeholder="Sua motivação aparece no card" value={f.reason as string} onChange={(e) => set("reason", e.target.value)} />
                  </Field>
                )}
              </>
            )}
          </>
        )}

        {type === "lembrete" && (
          <>
            <Field id="f-l" label="Lembrar de">
              <input id="f-l" required maxLength={200} placeholder="Ex.: Ligar para o contador" value={f.text as string} onChange={(e) => set("text", e.target.value)} />
            </Field>
            <div className="two">
              <Field id="f-ld" label="Dia">
                <input id="f-ld" type="date" required value={f.date as string} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field id="f-lh" label="Hora">
                <input id="f-lh" type="time" required value={f.time as string} onChange={(e) => set("time", e.target.value)} />
              </Field>
            </div>
            <Field id="f-lr" label="Repetir">
              <select id="f-lr" value={f.repeat as string} onChange={(e) => set("repeat", e.target.value)}>
                <option value="none">Não repetir</option>
                <option value="daily">Todo dia</option>
                <option value="weekdays">Seg a sex</option>
                <option value="weekly">Toda semana</option>
                <option value="monthly">Todo mês</option>
                <option value="yearly">Todo ano</option>
              </select>
            </Field>
          </>
        )}

        {type === "nota" && (
          <>
            <Field id="f-nt" label="Título">
              <input id="f-nt" maxLength={120} placeholder="Título da nota" value={f.title as string} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <textarea className="input" id="f-nb" aria-label="Texto da nota" placeholder="Escreva aqui..." style={{ minHeight: 160 }} value={f.body as string} onChange={(e) => set("body", e.target.value)} />
            <div className="two">
              <Field id="f-tag" label="Etiqueta">
                <input id="f-tag" maxLength={30} placeholder="Ex.: Trabalho" value={f.tag as string} onChange={(e) => set("tag", e.target.value)} />
              </Field>
              <label className="check-line" style={{ alignSelf: "end", minHeight: 52 }}>
                <input type="checkbox" checked={!!f.pinned} onChange={(e) => set("pinned", e.target.checked)} /> Fixar no topo
              </label>
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Salvando..." : editing ? "Salvar alterações" : `Salvar ${label.toLowerCase()}`}
        </button>
        {editing &&
          (confirmDelete ? (
            <div className="two">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
                Confirmar exclusão
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-text" style={{ color: "var(--bad)" }} onClick={() => setConfirmDelete(true)}>
              Excluir
            </button>
          ))}
      </form>
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input">{children}</div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
