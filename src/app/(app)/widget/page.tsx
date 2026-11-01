"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useUI } from "@/components/UI";
import { api, useData } from "@/lib/client";
import { widgetScript } from "@/lib/widget-script";

const STEPS = [
  "Instale o app gratuito Scriptable pela App Store.",
  "Toque em “Gerar e copiar script” aqui embaixo.",
  "No Scriptable, toque em +, cole o script e dê o nome “Winner”.",
  "Na tela de início, segure o dedo num espaço vazio, toque em Editar → Adicionar Widget → Scriptable e escolha o tamanho.",
  "Segure o widget → Editar Widget: em Script escolha “Winner” e em Parameter escreva tarefas, rotina ou habitos.",
];

export default function WidgetPage() {
  const { toast } = useUI();
  const status = useData<{ active: boolean }>("/api/widget/token");
  const [script, setScript] = useState<string | null>(null);

  async function generate() {
    if (status.data?.active && !confirm("Gerar um novo script? Widgets já instalados com o script antigo vão parar de funcionar até você colar o novo.")) return;
    try {
      const { token } = await api<{ token: string }>("/api/widget/token", { method: "POST" });
      const text = widgetScript(window.location.origin, token);
      setScript(text);
      status.reload();
      try {
        await navigator.clipboard.writeText(text);
        toast("Script copiado. Agora cole no Scriptable.");
      } catch {
        toast("Script gerado. Toque em Copiar.");
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function copy() {
    if (!script) return;
    await navigator.clipboard.writeText(script).then(() => toast("Script copiado"), () => toast("Selecione o texto e copie"));
  }

  async function revoke() {
    if (!confirm("Desconectar todos os widgets? Eles vão mostrar um erro até você gerar um novo script.")) return;
    await api("/api/widget/token", { method: "DELETE" });
    setScript(null);
    status.reload();
    toast("Widgets desconectados");
  }

  return (
    <>
      <Link className="back" href="/perfil" aria-label="Voltar"><Icon name="back" /></Link>
      <h1 className="h2" style={{ marginTop: 8 }}>Widget no iPhone</h1>
      <p className="sub" style={{ marginTop: 4 }}>Veja suas tarefas, sua rotina ou seus hábitos na tela de início, sem abrir o app. Você pode ter um widget de cada.</p>

      <div className="card" style={{ marginTop: 18 }}>
        <ol className="steps">
          {STEPS.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        <a className="btn btn-ghost" href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noreferrer">Abrir Scriptable na App Store</a>
        <button className="btn btn-primary" onClick={generate}>Gerar e copiar script</button>
      </div>

      {script && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="between" style={{ marginBottom: 8 }}>
            <b>Script do widget</b>
            <button className="link" onClick={copy}>Copiar</button>
          </div>
          <textarea className="code" readOnly value={script} aria-label="Script do widget" onFocus={(e) => e.currentTarget.select()} />
          <p className="hint" style={{ marginTop: 8 }}>Este script dá acesso só para leitura aos seus dados. Não compartilhe com outras pessoas.</p>
        </div>
      )}

      {status.data?.active && (
        <button className="link" style={{ marginTop: 18, color: "var(--bad)" }} onClick={revoke}>Desconectar widgets</button>
      )}
    </>
  );
}
