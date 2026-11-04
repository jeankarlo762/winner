import { isISODate, isTime } from "./dates.ts";
import { HttpError, intList, oneOf, str } from "./http.ts";
import { one, q } from "./db.ts";

type Row = Record<string, unknown>;
type Parser = (b: Row, partial: boolean) => Row;

const CATEGORIES = ["trabalho", "saude", "estudo", "pessoal", "descanso"] as const;

function pick(b: Row, partial: boolean, key: string, parse: (v: unknown) => unknown, out: Row, col = key) {
  if (partial && !(key in b)) return;
  out[col] = parse(b[key]);
}

const time = (field: string, optional = false) => (v: unknown) => {
  if (optional && (v === null || v === undefined || v === "")) return null;
  if (!isTime(v)) throw new HttpError(400, `${field} inválido. Use HH:MM.`);
  return v;
};
const date = (field: string) => (v: unknown) => {
  if (!isISODate(v)) throw new HttpError(400, `${field} inválida.`);
  return v;
};
const bool = (v: unknown) => v === true;

export const parsers: Record<string, Parser> = {
  routine_activities(b, partial) {
    const o: Row = {};
    pick(b, partial, "title", (v) => str(v, "a atividade", { min: 1, max: 80 }), o);
    pick(b, partial, "start_time", time("Horário de início"), o);
    pick(b, partial, "end_time", time("Horário de fim"), o);
    pick(b, partial, "weekdays", (v) => {
      const l = intList(v, "Dias da semana", 0, 6);
      if (!l.length) throw new HttpError(400, "Escolha pelo menos um dia da semana.");
      return l;
    }, o);
    pick(b, partial, "category", (v) => oneOf(v, "Categoria", CATEGORIES), o);
    return o;
  },
  tasks(b, partial) {
    const o: Row = {};
    pick(b, partial, "title", (v) => str(v, "a tarefa", { min: 1, max: 120 }), o);
    pick(b, partial, "notes", (v) => str(v, "a observação", { max: 1000, optional: true }), o);
    pick(b, partial, "recurrence", (v) => oneOf(v, "Repetição", ["once", "daily", "weekly", "biweekly", "monthly"] as const), o);
    pick(b, partial, "weekdays", (v) => (v === undefined ? [] : intList(v, "Dias da semana", 0, 6)), o);
    pick(b, partial, "month_day", (v) => {
      if (v === null || v === undefined) return null;
      if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 31) throw new HttpError(400, "Dia do mês inválido.");
      return v;
    }, o);
    pick(b, partial, "anchor_date", date("Data inicial"), o);
    pick(b, partial, "time", time("Horário de início", true), o);
    pick(b, partial, "end_time", time("Horário de fim", true), o);
    pick(b, partial, "priority", (v) => oneOf(v ?? "normal", "Prioridade", ["normal", "high"] as const), o);
    pick(b, partial, "archived", bool, o);
    if (o.recurrence === "weekly" && Array.isArray(o.weekdays) && !o.weekdays.length) throw new HttpError(400, "Escolha pelo menos um dia da semana.");
    if ("time" in o || "end_time" in o) {
      if (!o.time || !o.end_time) throw new HttpError(400, "Informe o horário de início e de fim da tarefa.");
      if ((o.end_time as string) <= (o.time as string)) throw new HttpError(400, "O horário de fim precisa ser depois do início.");
    }
    return o;
  },
  habits(b, partial) {
    const o: Row = {};
    pick(b, partial, "name", (v) => str(v, "o nome do hábito", { min: 1, max: 80 }), o);
    pick(b, partial, "kind", (v) => oneOf(v, "Tipo de hábito", ["good", "desired", "bad"] as const), o);
    pick(b, partial, "per_week", (v) => {
      const n = v ?? 7;
      if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 7) throw new HttpError(400, "Frequência inválida.");
      return n;
    }, o);
    pick(b, partial, "time", time("Horário", true), o);
    pick(b, partial, "reason", (v) => str(v, "o motivo", { max: 300, optional: true }), o);
    pick(b, partial, "triggers", (v) => str(v, "os gatilhos", { max: 300, optional: true }), o);
    pick(b, partial, "replacement", (v) => str(v, "o substituto", { max: 300, optional: true }), o);
    pick(b, partial, "start_date", date("Data de início"), o);
    pick(b, partial, "archived", bool, o);
    return o;
  },
  reminders(b, partial) {
    const o: Row = {};
    pick(b, partial, "text", (v) => str(v, "o lembrete", { min: 1, max: 200 }), o);
    pick(b, partial, "remind_at", (v) => {
      if (typeof v !== "string" || Number.isNaN(Date.parse(v))) throw new HttpError(400, "Data e hora inválidas.");
      return new Date(v).toISOString();
    }, o);
    pick(b, partial, "repeat", (v) => oneOf(v ?? "none", "Repetição", ["none", "daily", "weekdays", "weekly", "monthly", "yearly"] as const), o);
    return o;
  },
  notes(b, partial) {
    const o: Row = {};
    pick(b, partial, "title", (v) => str(v, "o título", { max: 120, optional: true }), o);
    pick(b, partial, "body", (v) => str(v, "o texto", { max: 20000, optional: true }), o);
    pick(b, partial, "tag", (v) => str(v, "a etiqueta", { max: 30, optional: true }), o);
    pick(b, partial, "pinned", bool, o);
    if (!partial && !o.title && !o.body) throw new HttpError(400, "Escreva um título ou um texto.");
    if (partial && Object.keys(o).length) o.updated_at = new Date().toISOString();
    return o;
  },
};

export type Table = keyof typeof parsers;

export async function insertRow(table: Table, userId: string, data: Row) {
  const cols = Object.keys(data);
  const vals = cols.map((c) => data[c]);
  const sql = `insert into ${table} (user_id${cols.map((c) => ", " + c).join("")}) values ($1${cols.map((_, i) => ", $" + (i + 2)).join("")}) returning *`;
  return one(sql, [userId, ...vals]);
}

export async function updateRow(table: Table, userId: string, id: string, data: Row) {
  const cols = Object.keys(data);
  if (!cols.length) throw new HttpError(400, "Nada para atualizar.");
  const sets = cols.map((c, i) => `${c} = $${i + 3}`).join(", ");
  const row = await one(`update ${table} set ${sets} where id = $1 and user_id = $2 returning *`, [id, userId, ...cols.map((c) => data[c])]);
  if (!row) throw new HttpError(404, "Item não encontrado.");
  return row;
}

export async function deleteRow(table: Table, userId: string, id: string) {
  const rows = await q(`delete from ${table} where id = $1 and user_id = $2 returning id`, [id, userId]);
  if (!rows.length) throw new HttpError(404, "Item não encontrado.");
}
