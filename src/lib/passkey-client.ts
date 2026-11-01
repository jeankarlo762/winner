"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { api } from "./client";

export async function enablePasskey() {
  const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/auth/passkey/register-options", { method: "POST" });
  const response = await startRegistration({ optionsJSON });
  await api("/api/auth/passkey/register", { method: "POST", body: { response } });
}

export function passkeyError(e: Error) {
  if (e.name === "NotAllowedError") return "Cancelado. Você pode tentar de novo quando quiser.";
  if (e.name === "InvalidStateError") return "Este aparelho já está cadastrado.";
  return e.message;
}
