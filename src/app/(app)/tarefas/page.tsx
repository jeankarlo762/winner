"use client";
import { Suspense, useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { SetupNext } from "@/components/SetupNext";
import { useData } from "@/lib/client";
import type { Task } from "@/lib/types";
import { TaskRow } from "./TaskRow";

const TABS: [Task["recurrence"], string][] = [
  ["daily", "Diárias"],
  ["weekly", "Semanais"],
  ["biweekly", "Quinzenais"],
  ["monthly", "Mensais"],
  ["once", "Únicas"],
];

export default function Tarefas() {
  const { openSheet } = useUI();
  const { data } = useData<Task[]>("/api/tasks");
  const [tab, setTab] = useState<Task["recurrence"]>("daily");
  const list = (data ?? []).filter((t) => t.recurrence === tab);
  const done = list.filter((t) => t.done).length;

  return (
    <>
      <div className="between">
        <div>
          <h1 className="h2">Tarefas</h1>
          <p className="sub num" style={{ marginTop: 2 }}>{list.length ? `${done} de ${list.length} concluídas neste ciclo` : "Organize o que se repete"}</p>
        </div>
        <button className="icon-btn" onClick={() => openSheet("tarefa")} aria-label="Nova tarefa"><Icon name="plus" /></button>
      </div>
      <div className="seg" style={{ marginTop: 16 }}>
        {TABS.map(([k, l]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {list.length > 0 && <div className="progress" style={{ marginTop: 16 }}><i style={{ width: `${(done / list.length) * 100}%` }} /></div>}
      {!data ? (
        <div className="skeleton" />
      ) : list.length ? (
        <div className="card list" style={{ marginTop: 14 }}>{list.map((t) => <TaskRow key={t.id} task={t} />)}</div>
      ) : (
        <div className="card empty" style={{ marginTop: 14 }}>
          <b>Nenhuma tarefa {TABS.find((t) => t[0] === tab)![1].toLowerCase()}</b>
          Toque em + para criar.
        </div>
      )}
      <p className="hint" style={{ marginTop: 12 }}>Ao concluir, a tarefa volta sozinha na próxima data. Use o lápis para editar e a lixeira para excluir.</p>
      <Suspense>
        <SetupNext step={2} label="Salvar tarefas e ir para hábitos" />
      </Suspense>
    </>
  );
}
