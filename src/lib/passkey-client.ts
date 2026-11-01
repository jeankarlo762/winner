"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { api } from "./client";

export async function enablePasskey() {
  const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/auth/passkey/register-options", { method: "POST" });
  const response = await startRegistration({ optionsJSON });
  await api("/api/auth/passkey/register", { method: "POST", body: { response } });
  rememberFace(true);
}

export function passkeyError(e: Error) {
  if (e.name === "NotAllowedError") return "Cancelado. Você pode tentar de novo quando quiser.";
  if (e.name === "InvalidStateError") return "Este aparelho já está cadastrado.";
  return e.message;
}

// Lembra neste aparelho que o Face ID está configurado, para a tela de login
// já abrir o Face ID sozinha, sem perguntar.
const KEY = "winner-faceid";
const LEFT = "winner-saiu";
function store(fn: () => void) {
  try { fn(); } catch {}
}
export const faceRemembered = () => { let v = false; store(() => (v = localStorage.getItem(KEY) === "1")); return v; };
export const rememberFace = (on: boolean) => store(() => (on ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY)));
/** Depois de "Sair", não entra de novo sozinho (senão não daria para sair). */
export const markLoggedOut = () => store(() => sessionStorage.setItem(LEFT, "1"));
export const takeLoggedOut = () => { let v = false; store(() => { v = sessionStorage.getItem(LEFT) === "1"; sessionStorage.removeItem(LEFT); }); return v; };
