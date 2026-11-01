import { NextResponse } from "next/server";
import { isISODate, localToday, type ISODate } from "./dates.ts";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 64_000) throw new HttpError(413, "Conteúdo grande demais.");
  try {
    const b = await req.json();
    if (b && typeof b === "object" && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch {}
  throw new HttpError(400, "Corpo da requisição inválido.");
}

export function str(v: unknown, field: string, { min = 0, max = 500, optional = false } = {}): string {
  if (v === undefined || v === null) {
    if (optional) return "";
    throw new HttpError(400, `Preencha ${field}.`);
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} inválido.`);
  const s = v.trim();
  if (s.length < min) throw new HttpError(400, min <= 1 ? `Preencha ${field}.` : `${field} precisa de pelo menos ${min} caracteres.`);
  if (s.length > max) throw new HttpError(400, `${field} pode ter no máximo ${max} caracteres.`);
  return s;
}

export function oneOf<T extends string>(v: unknown, field: string, options: readonly T[]): T {
  if (typeof v === "string" && (options as readonly string[]).includes(v)) return v as T;
  throw new HttpError(400, `${field} inválido.`);
}

export function intList(v: unknown, field: string, min: number, max: number): number[] {
  if (!Array.isArray(v) || v.some((n) => !Number.isInteger(n) || n < min || n > max)) throw new HttpError(400, `${field} inválido.`);
  return [...new Set(v as number[])].sort((a, b) => a - b);
}

/** O cliente envia o "hoje" local dele em ?today=AAAA-MM-DD. */
export function todayFrom(req: Request): ISODate {
  const t = new URL(req.url).searchParams.get("today");
  return isISODate(t) ? t : localToday();
}

export function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Converte HttpError em resposta e esconde erros internos. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error(e);
      return fail(500, "Algo deu errado. Tente de novo.");
    }
  };
}
