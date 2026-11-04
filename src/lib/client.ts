"use client";
import { useCallback, useEffect, useState } from "react";
import { localToday } from "./dates.ts";

export const CHANGED = "winner:changed";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = path + (path.includes("?") ? "&" : "?") + "today=" + localToday();
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: method === "GET" ? undefined : { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth")) {
    window.location.href = "/login";
  }
  if (!res.ok) throw new ApiError(res.status, data.error || "Algo deu errado. Tente de novo.");
  return data as T;
}

export function notifyChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/** Busca dados e recarrega quando algo muda no app. */
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [path]);
  useEffect(() => {
    reload();
    const on = () => reload();
    window.addEventListener(CHANGED, on);
    window.addEventListener("focus", on);
    return () => {
      window.removeEventListener(CHANGED, on);
      window.removeEventListener("focus", on);
    };
  }, [reload]);
  return { data, error, reload, setData };
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const WD = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function longDate(d = new Date()) {
  return `${WD[d.getDay()]}, ${d.getDate()} de ${MO[d.getMonth()]}`;
}
export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
export function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
