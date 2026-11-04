"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { api, notifyChanged } from "@/lib/client";
import type { Task } from "@/lib/types";

const br = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export function TaskRow({ task }: { task: Task }) {
  const { toast, openSheet } = useUI();
  const [done, setDone] = useState(task.done);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(task.done);
  if (prev !== task.done) {
    setPrev(task.done);
    setDone(task.done);
  }
  async function toggle() {
    if (!task.occurrence) return;
    setDone(!done);
    try {
      const r = await api<{ done: boolean }>(`/api/tasks/${task.id}/toggle`, { method: "POST", body: { occurrence: task.occurrence } });
      if (r.done) toast(task.recurrence === "once" ? "Tarefa concluída" : "Feito! A próxima já está agendada.");
      notifyChanged();
    } catch (e) {
      setDone(done);
      toast((e as Error).message);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast("Tarefa excluída");
      notifyChanged();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  }
  const edit = () => openSheet("tarefa", task as unknown as Record<string, unknown>);

  if (confirm)
    return (
      <div className="item" role="alertdialog" aria-label={`Excluir ${task.title}`}>
        <span className="grow" style={{ fontSize: 14 }}>
          Excluir <b>{task.title}</b>? Ela some de todos os dias.
        </span>
        <button className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={() => setConfirm(false)}>
          Cancelar
        </button>
        <button className="btn btn-danger btn-sm" style={{ width: "auto" }} onClick={remove} disabled={busy}>
          Excluir
        </button>
      </div>
    );

  return (
    <div className={`item ${done ? "done" : ""}`}>
      <button className="check" onClick={toggle} disabled={!task.occurrence} aria-pressed={done} aria-label={done ? `Desmarcar ${task.title}` : `Concluir ${task.title}`}>
        <Icon name="check" />
      </button>
      <button className="grow" style={{ textAlign: "left" }} onClick={edit}>
        <span className="t">{task.title}</span>
        {task.time && (
          <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)", display: "block" }}>
            {task.time}
            {task.end_time ? ` – ${task.end_time}` : ""}
          </span>
        )}
        <span className="m">
          <Icon name="repeat" size={13} />
          {task.label}
          {task.priority === "high" && <span className="tag alta">Prioridade</span>}
          {task.overdue && task.occurrence && <span className="tag alta">Desde {br(task.occurrence)}</span>}
          {!task.occurrence && task.next && <span className="tag">Começa {br(task.next)}</span>}
          {done && task.next && task.recurrence !== "once" && task.recurrence !== "daily" && <span className="tag blue">Próxima {br(task.next)}</span>}
        </span>
      </button>
      <button className="more" onClick={edit} aria-label={`Editar ${task.title}`}>
        <Icon name="edit" size={18} />
      </button>
      <button className="more" onClick={() => setConfirm(true)} aria-label={`Excluir ${task.title}`}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}
