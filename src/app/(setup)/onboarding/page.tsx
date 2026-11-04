"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useUser } from "@/components/Shell";
import { api } from "@/lib/client";
import { localToday, toMinutes } from "@/lib/dates";

const AREAS = ["Saúde", "Carreira", "Finanças", "Estudos", "Relacionamentos", "Espiritualidade", "Lazer"];
const WANT = ["Treinar", "Ler", "Meditar", "Acordar cedo", "Beber água", "Estudar"];
const QUIT = ["Redes sociais em excesso", "Refrigerante", "Procrastinar", "Dormir tarde", "Fumar", "Fast food"];
const GOALS = ["Organizar minha rotina", "Entrar em forma", "Aprender inglês", "Juntar dinheiro"];

type Opt = { v: string; l: string; d: string };
const OCC: Opt[] = [
  { v: "student", l: "Estudante", d: "Aulas e estudos ocupam o dia" },
  { v: "fixed", l: "Trabalho com horário fixo", d: "CLT, turnos ou expediente" },
  { v: "freelancer", l: "Autônomo ou freelancer", d: "Horários flexíveis" },
  { v: "entrepreneur", l: "Empreendedor", d: "Toco meu próprio negócio" },
];
const PERIOD: Opt[] = [
  { v: "morning", l: "Manhã", d: "06h às 12h" },
  { v: "afternoon", l: "Tarde", d: "12h às 18h" },
  { v: "evening", l: "Noite", d: "18h em diante" },
];
const NOTIFY: Opt[] = [
  { v: "each", l: "Lembrar de cada item", d: "Rotina, tarefas, hábitos e lembretes" },
  { v: "summary", l: "Só um resumo de manhã", d: "Uma notificação com o plano do dia" },
  { v: "none", l: "Nenhuma notificação", d: "Eu abro o app quando quiser" },
];

interface A {
  name: string; wake: string; sleep: string; occupation: string; areas: string[]; goal: string; period: string; want: string[]; quit: string[]; notify: string;
}

export default function Onboarding() {
  const router = useRouter();
  const user = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [a, setA] = useState<A>({
    name: user.display_name && user.display_name !== user.username ? user.display_name : "",
    wake: "06:30", sleep: "23:00", occupation: "", areas: [], goal: "", period: "", want: [], quit: [], notify: "each",
  });
  const set = <K extends keyof A>(k: K, v: A[K]) => setA((p) => ({ ...p, [k]: v }));
  const toggle = (k: "areas" | "want" | "quit", v: string) => set(k, a[k].includes(v) ? a[k].filter((x) => x !== v) : [...a[k], v]);

  let sleepH = toMinutes(a.wake) - toMinutes(a.sleep);
  if (sleepH < 0) sleepH += 1440;

  const single = (k: "occupation" | "period" | "notify", opts: Opt[]) => (
    <div className="stack" style={{ gap: 10 }}>
      {opts.map((o) => (
        <button key={o.v} className="option" aria-pressed={a[k] === o.v} onClick={() => set(k, o.v)}>
          <span className="radio" />
          <span>
            <b>{o.l}</b>
            <span className="d">{o.d}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const steps: { q: string; d: string; body: React.ReactNode; valid: boolean }[] = [
    {
      q: "Como você quer ser chamado?", d: "É assim que o app vai falar com você.", valid: a.name.trim().length > 0,
      body: <div className="input"><input aria-label="Seu nome" autoFocus maxLength={40} value={a.name} placeholder="Seu nome" onChange={(e) => set("name", e.target.value)} /></div>,
    },
    {
      q: "Que horas você costuma acordar e dormir?", d: "Usamos isso para montar sua rotina base.", valid: !!a.wake && !!a.sleep,
      body: (
        <>
          <div className="two">
            <div className="field"><label htmlFor="q-wake">Acordo às</label><div className="input"><input id="q-wake" type="time" value={a.wake} onChange={(e) => set("wake", e.target.value)} /></div></div>
            <div className="field"><label htmlFor="q-sleep">Durmo às</label><div className="input"><input id="q-sleep" type="time" value={a.sleep} onChange={(e) => set("sleep", e.target.value)} /></div></div>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>Isso dá {Math.floor(sleepH / 60)}h{sleepH % 60 ? String(sleepH % 60).padStart(2, "0") : ""} de sono por noite.</p>
        </>
      ),
    },
    { q: "Qual é sua ocupação principal?", d: "Ajuda a sugerir blocos de trabalho e estudo.", valid: !!a.occupation, body: single("occupation", OCC) },
    {
      q: "Quais áreas você quer melhorar?", d: "Escolha quantas quiser.", valid: a.areas.length > 0,
      body: <div className="chips">{AREAS.map((o) => <button key={o} className="chip" aria-pressed={a.areas.includes(o)} onClick={() => toggle("areas", o)}>{o}</button>)}</div>,
    },
    {
      q: "Qual seu principal objetivo nos próximos 90 dias?", d: "Uma frase basta. Você pode mudar depois.", valid: true,
      body: (
        <>
          <textarea className="input" aria-label="Seu objetivo" maxLength={300} value={a.goal} onChange={(e) => set("goal", e.target.value)} />
          <div className="chips" style={{ marginTop: 12 }}>{GOALS.map((g) => <button key={g} className="chip" onClick={() => set("goal", g)}>{g}</button>)}</div>
        </>
      ),
    },
    { q: "Em que período você rende mais?", d: "Colocamos as atividades importantes nesse horário.", valid: !!a.period, body: single("period", PERIOD) },
    {
      q: "Que hábitos você quer criar e quais quer abandonar?", d: "Viram sugestões no módulo de hábitos.", valid: true,
      body: (
        <>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Quero criar</p>
          <div className="chips">{WANT.map((o) => <button key={o} className="chip" aria-pressed={a.want.includes(o)} onClick={() => toggle("want", o)}>{o}</button>)}</div>
          <p className="eyebrow" style={{ margin: "22px 0 10px" }}>Quero abandonar</p>
          <div className="chips">{QUIT.map((o) => <button key={o} className="chip bad" aria-pressed={a.quit.includes(o)} onClick={() => toggle("quit", o)}>{o}</button>)}</div>
        </>
      ),
    },
    { q: "Como prefere ser lembrado?", d: "Dá para ajustar depois.", valid: !!a.notify, body: single("notify", NOTIFY) },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

  async function next() {
    if (!cur.valid) return;
    if (!last) return setStep(step + 1);
    setBusy(true);
    setError(null);
    try {
      await api("/api/onboarding", { method: "POST", body: { ...a, today: localToday() } });
      router.push("/montagem");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="between">
        {step > 0 ? (
          <button className="back" onClick={() => setStep(step - 1)} aria-label="Voltar"><Icon name="back" /></button>
        ) : <span style={{ width: 44 }} />}
        <span className="muted num" style={{ fontSize: 13, fontWeight: 600 }}>{step + 1} de {steps.length}</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="steps-bar">{steps.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
      <h1 className="h1">{cur.q}</h1>
      <p className="sub" style={{ marginBottom: 24 }}>{cur.d}</p>
      {cur.body}
      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      <div style={{ marginTop: 32 }}>
        <button className="btn btn-primary" onClick={next} disabled={!cur.valid || busy}>
          {busy ? "Montando seu sistema..." : last ? "Concluir" : "Continuar"}
        </button>
      </div>
    </>
  );
}
