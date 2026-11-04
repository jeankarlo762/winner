"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { api, useData } from "@/lib/client";
import { WIDGET_LABEL, widgetScript, type WidgetKind } from "@/lib/widget-script";

const KINDS: { kind: WidgetKind; icon: string; desc: string }[] = [
  { kind: "habitos", icon: "habit", desc: "Hábitos do dia, sequências e dias livre dos hábitos ruins." },
  { kind: "tarefas", icon: "tasks", desc: "Tarefas de hoje com horário e o que já foi feito." },
  { kind: "rotina", icon: "clock", desc: "O que está acontecendo agora e o resto do dia." },
];

export default function WidgetPage() {
  const { toast } = useUI();
  const status = useData<{ active: boolean; count: number }>("/api/widget/token");
  const [kind, setKind] = useState<WidgetKind>("tarefas");
  const [made, setMade] = useState<{ kind: WidgetKind; script: string } | null>(null);
  const name = `Winner ${WIDGET_LABEL[kind]}`;

  async function generate() {
    try {
      const { token } = await api<{ token: string }>("/api/widget/token", { method: "POST", body: { kind } });
      const script = widgetScript(window.location.origin, token, kind);
      setMade({ kind, script });
      status.reload();
      try {
        await navigator.clipboard.writeText(script);
        toast(`Script de ${WIDGET_LABEL[kind]} copiado`);
      } catch {
        toast("Script gerado. Toque em Copiar.");
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function copy() {
    if (!made) return;
    await navigator.clipboard.writeText(made.script).then(() => toast("Script copiado"), () => toast("Selecione o texto e copie"));
  }

  async function revoke() {
    if (!confirm("Desconectar todos os widgets? Eles vão mostrar um erro até você criar de novo.")) return;
    await api("/api/widget/token", { method: "DELETE" });
    setMade(null);
    status.reload();
    toast("Widgets desconectados");
  }

  return (
    <>
      <Link className="back" href="/perfil" aria-label="Voltar"><Icon name="back" /></Link>
      <h1 className="h2" style={{ marginTop: 8 }}>Widget no iPhone</h1>
      <p className="sub" style={{ marginTop: 4 }}>Escolha o que o widget vai mostrar na tela de início. Para ter mais de um, crie um de cada tipo.</p>

      <p className="eyebrow" style={{ margin: "20px 0 8px" }}>Tipo de widget</p>
      <div className="stack" role="radiogroup" aria-label="Tipo de widget" style={{ gap: 10 }}>
        {KINDS.map((k) => (
          <button key={k.kind} className="option" role="radio" aria-checked={kind === k.kind} aria-pressed={kind === k.kind} onClick={() => setKind(k.kind)}>
            <span className="ic" style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={k.icon} size={20} /></span>
            <span className="grow"><b>{WIDGET_LABEL[k.kind]}</b><span className="d">{k.desc}</span></span>
            <span className="radio" />
          </button>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 18, width: "100%" }} onClick={generate}>Criar widget de {WIDGET_LABEL[kind]}</button>

      {made && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="between" style={{ marginBottom: 8 }}>
            <b>Script “Winner {WIDGET_LABEL[made.kind]}”</b>
            <button className="link" onClick={copy}>Copiar</button>
          </div>
          <textarea className="code" readOnly value={made.script} aria-label="Script do widget" onFocus={(e) => e.currentTarget.select()} />
          <p className="hint" style={{ marginTop: 8 }}>Dá acesso só para leitura aos seus dados. Não compartilhe com outras pessoas.</p>
        </div>
      )}

      <p className="eyebrow" style={{ margin: "22px 0 8px" }}>Como instalar</p>
      <div className="card">
        <ol className="steps">
          <li>Instale o app gratuito <a className="link" href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noreferrer">Scriptable</a>.</li>
          <li>Escolha o tipo acima e toque em “Criar widget”. O script é copiado.</li>
          <li>No Scriptable, toque em +, cole o script e dê o nome “{made ? `Winner ${WIDGET_LABEL[made.kind]}` : name}”.</li>
          <li>Na tela de início, segure num espaço vazio → Editar → Adicionar Widget → Scriptable, e escolha o tamanho.</li>
          <li>Segure o widget → Editar Widget → em Script, escolha “{made ? `Winner ${WIDGET_LABEL[made.kind]}` : name}”.</li>
        </ol>
      </div>

      {status.data?.active && (
        <button className="link" style={{ marginTop: 18, color: "var(--bad)" }} onClick={revoke}>
          Desconectar {status.data.count > 1 ? `os ${status.data.count} widgets` : "o widget"}
        </button>
      )}
    </>
  );
}
