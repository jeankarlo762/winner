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
  return (
    <div className={`item ${done ? "done" : ""}`}>
      <button className="check" onClick={toggle} disabled={!task.occurrence} aria-pressed={done} aria-label={done ? `Desmarcar ${task.title}` : `Concluir ${task.title}`}>
        <Icon name="check" />
      </button>
      <button className="grow" style={{ textAlign: "left" }} onClick={() => openSheet("tarefa", task as unknown as Record<string, unknown>)}>
        <span className="t">{task.title}</span>
        <span className="m">
          <Icon name="repeat" size={13} />
          {task.label}
          {task.priority === "high" && <span className="tag alta">Prioridade</span>}
          {task.overdue && task.occurrence && <span className="tag alta">Desde {br(task.occurrence)}</span>}
          {!task.occurrence && task.next && <span className="tag">Começa {br(task.next)}</span>}
          {done && task.next && task.recurrence !== "once" && task.recurrence !== "daily" && <span className="tag blue">Próxima {br(task.next)}</span>}
        </span>
      </button>
    </div>
  );
}
