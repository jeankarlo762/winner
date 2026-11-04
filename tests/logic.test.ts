import { test } from "node:test";
import assert from "node:assert/strict";
import { isDueOn, currentOccurrence, describe } from "../src/lib/recurrence.ts";
import { streak, cleanStats, lastWeek } from "../src/lib/habits.ts";
import { addDays, isISODate, weekday } from "../src/lib/dates.ts";
import { suggestRoutine, type Answers } from "../src/lib/onboarding.ts";

test("datas", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(weekday("2026-11-01"), 0);
  assert.ok(isISODate("2026-11-01"));
  assert.ok(!isISODate("2026-02-30"));
});

test("recorrência semanal, quinzenal e mensal", () => {
  const w = { recurrence: "weekly" as const, weekdays: [1, 3], month_day: null, anchor_date: "2026-10-01" };
  assert.ok(isDueOn(w, "2026-11-02"));
  assert.ok(!isDueOn(w, "2026-11-03"));
  const b = { recurrence: "biweekly" as const, weekdays: [], month_day: null, anchor_date: "2026-11-01" };
  assert.ok(isDueOn(b, "2026-11-16"));
  assert.ok(!isDueOn(b, "2026-11-15"));
  assert.equal(currentOccurrence(b, "2026-11-20"), "2026-11-16");
  const m = { recurrence: "monthly" as const, weekdays: [], month_day: 31, anchor_date: "2026-01-01" };
  assert.ok(isDueOn(m, "2026-02-28"), "dia 31 cai no último dia de fevereiro");
  const last = { ...m, month_day: 0 };
  assert.ok(isDueOn(last, "2026-04-30"));
  assert.ok(!isDueOn(last, "2026-04-29"));
  assert.equal(describe(w, "09:00"), "seg, qua · 09:00");
  assert.equal(describe({ ...w, weekdays: [1, 2, 3, 4, 5] }), "Seg a sex");
});

test("tarefa não vence antes da data inicial", () => {
  assert.ok(!isDueOn({ recurrence: "daily", weekdays: [], month_day: null, anchor_date: "2026-11-05" }, "2026-11-04"));
});

test("sequência e semana de hábitos", () => {
  const logs = [{ date: "2026-10-30", type: "done" as const }, { date: "2026-10-31", type: "done" as const }];
  assert.equal(streak(logs, "2026-11-01"), 2, "conta até ontem se hoje não foi marcado");
  assert.equal(streak([...logs, { date: "2026-11-01", type: "done" }], "2026-11-01"), 3);
  assert.equal(streak(logs, "2026-11-02"), 0);
  assert.equal(lastWeek(logs, "2026-11-01").filter((d) => d.done).length, 2);
});

test("hábito ruim: dias limpo e recorde", () => {
  const s = cleanStats("2026-10-01", [{ date: "2026-10-20", type: "relapse" }], "2026-11-01");
  assert.deepEqual(s, { days: 12, record: 19, relapses: 1 });
  assert.deepEqual(cleanStats("2026-10-25", [], "2026-11-01"), { days: 7, record: 7, relapses: 0 });
});

test("rotina sugerida pelo onboarding", () => {
  const a: Answers = { name: "Ana", wake: "06:00", sleep: "22:30", occupation: "entrepreneur", areas: ["Saúde"], goal: "", period: "morning", want: ["Treinar", "Ler"], quit: [], notify: "each" };
  const r = suggestRoutine(a);
  assert.equal(r[0].start, "06:00");
  assert.ok(r.some((x) => x.title === "Treino" && x.start === "06:30"));
  assert.ok(r.some((x) => x.title === "Leitura" && x.start === "21:45"));
  assert.ok(r.some((x) => x.title === "Dormir" && x.end === "06:00"));
});

test("descrição com intervalo de horário", () => {
  assert.equal(describe({ recurrence: "daily", weekdays: [], month_day: null, anchor_date: "2026-11-01" }, "08:00", "09:00"), "Todo dia · 08:00–09:00");
});
