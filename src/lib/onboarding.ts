import { toMinutes } from "./dates.ts";

export interface Answers {
  name: string;
  wake: string;
  sleep: string;
  occupation: "student" | "fixed" | "freelancer" | "entrepreneur";
  areas: string[];
  goal: string;
  period: "morning" | "afternoon" | "evening";
  want: string[];
  quit: string[];
  notify: "each" | "summary" | "none";
}

export const OCCUPATIONS = ["student", "fixed", "freelancer", "entrepreneur"] as const;
export const PERIODS = ["morning", "afternoon", "evening"] as const;
export const NOTIFY = ["each", "summary", "none"] as const;
export const AREAS = ["Saúde", "Carreira", "Finanças", "Estudos", "Relacionamentos", "Espiritualidade", "Lazer"];
export const WANT = ["Treinar", "Ler", "Meditar", "Acordar cedo", "Beber água", "Estudar"];
export const QUIT = ["Redes sociais em excesso", "Refrigerante", "Procrastinar", "Dormir tarde", "Fumar", "Fast food"];

export interface SuggestedActivity { title: string; start: string; end: string; weekdays: number[]; category: string }
export interface SuggestedTask { title: string; recurrence: "daily" | "weekly" | "biweekly" | "monthly"; weekdays?: number[]; month_day?: number; time?: string; end_time?: string; priority?: "normal" | "high" }
export interface SuggestedHabit { name: string; kind: "good" | "desired" | "bad"; per_week?: number; reason?: string; triggers?: string; replacement?: string }

const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEK = [1, 2, 3, 4, 5];

function hm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function suggestRoutine(a: Answers): SuggestedActivity[] {
  const wake = toMinutes(a.wake);
  const sleep = toMinutes(a.sleep);
  const out: SuggestedActivity[] = [{ title: "Acordar e se arrumar", start: hm(wake), end: hm(wake + 30), weekdays: ALL, category: "saude" }];
  let cursor = wake + 30;
  const trains = a.want.includes("Treinar") || a.areas.includes("Saúde");
  if (trains && a.period === "morning") {
    out.push({ title: "Treino", start: hm(cursor), end: hm(cursor + 60), weekdays: WEEK, category: "saude" });
    cursor += 60;
  }
  out.push({ title: "Café da manhã", start: hm(cursor), end: hm(cursor + 30), weekdays: ALL, category: "pessoal" });
  cursor += 30;
  const morningStart = Math.max(cursor, 8 * 60);
  const blocks: Record<Answers["occupation"], [string, string, string]> = {
    student: ["Aulas", "Estudos", "estudo"],
    fixed: ["Trabalho", "Trabalho", "trabalho"],
    freelancer: ["Trabalho focado", "Projetos e clientes", "trabalho"],
    entrepreneur: ["Trabalho focado", "Reuniões e operação", "trabalho"],
  };
  const [am, pm, cat] = blocks[a.occupation];
  if (morningStart < 12 * 60) out.push({ title: am, start: hm(morningStart), end: "12:00", weekdays: WEEK, category: cat });
  out.push({ title: "Almoço", start: "12:00", end: "13:00", weekdays: ALL, category: "pessoal" });
  out.push({ title: pm, start: "13:00", end: "18:00", weekdays: WEEK, category: cat });
  if (trains && a.period !== "morning") out.push({ title: "Treino", start: "18:30", end: "19:30", weekdays: WEEK, category: "saude" });
  if (a.want.includes("Estudar") || a.areas.includes("Estudos")) out.push({ title: "Estudo", start: "20:00", end: "21:00", weekdays: WEEK, category: "estudo" });
  if (a.areas.includes("Relacionamentos")) out.push({ title: "Tempo com a família", start: "19:30", end: "20:00", weekdays: ALL, category: "pessoal" });
  if (a.want.includes("Ler")) out.push({ title: "Leitura", start: hm(sleep - 45), end: hm(sleep - 15), weekdays: ALL, category: "estudo" });
  out.push({ title: "Dormir", start: hm(sleep), end: hm(wake), weekdays: ALL, category: "descanso" });
  return out.sort((x, y) => toMinutes(x.start) - toMinutes(y.start));
}

export function suggestTasks(a: Answers): SuggestedTask[] {
  const out: SuggestedTask[] = [
    { title: "Planejar o dia", recurrence: "daily", time: hm(toMinutes(a.wake) + 60), end_time: hm(toMinutes(a.wake) + 70) },
    { title: "Revisar o dia antes de dormir", recurrence: "daily", time: hm(toMinutes(a.sleep) - 30), end_time: hm(toMinutes(a.sleep) - 15) },
    { title: "Revisão da semana", recurrence: "weekly", weekdays: [0], time: "20:00", end_time: "20:30" },
    { title: "Revisar metas do mês", recurrence: "monthly", month_day: 1, time: "20:30", end_time: "21:00" },
  ];
  if (a.areas.includes("Finanças")) {
    out.push({ title: "Pagar contas do mês", recurrence: "monthly", month_day: 5, time: "10:00", end_time: "10:30", priority: "high" });
    out.push({ title: "Conferir gastos", recurrence: "biweekly", time: "19:00", end_time: "19:30" });
  }
  if (a.occupation === "entrepreneur" || a.occupation === "fixed") out.push({ title: "Reunião de alinhamento", recurrence: "weekly", weekdays: [1], time: "09:00", end_time: "09:30" });
  if (a.want.includes("Beber água")) out.push({ title: "Encher a garrafa de água", recurrence: "daily", time: hm(toMinutes(a.wake) + 30), end_time: hm(toMinutes(a.wake) + 35) });
  // Um intervalo que passaria da meia-noite termina às 23:59.
  return out.map((t) => (t.time && t.end_time && t.end_time <= t.time ? { ...t, end_time: "23:59" } : t));
}

const REPLACE: Record<string, [string, string]> = {
  "Redes sociais em excesso": ["Celular por perto sem motivo", "Deixar o celular em outro cômodo"],
  Refrigerante: ["Refeições fora, calor", "Água com gás e limão"],
  Procrastinar: ["Tarefa grande sem primeiro passo", "Começar com 5 minutos"],
  "Dormir tarde": ["Telas depois das 22h", "Livro na cabeceira"],
  Fumar: ["Café, estresse", "Caminhada curta"],
  "Fast food": ["Fome sem planejamento", "Deixar marmita pronta"],
};

export function suggestHabits(a: Answers): SuggestedHabit[] {
  return [
    ...a.want.map<SuggestedHabit>((n) => ({ name: n, kind: "desired", per_week: n === "Treinar" ? 5 : 7, reason: a.goal.slice(0, 200) })),
    ...a.quit.map<SuggestedHabit>((n) => ({ name: n, kind: "bad", triggers: REPLACE[n]?.[0] ?? "", replacement: REPLACE[n]?.[1] ?? "" })),
  ];
}
