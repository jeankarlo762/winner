"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { enablePasskey, passkeyError } from "@/lib/passkey-client";
import { useUser } from "@/components/Shell";

export default function FaceIdPage() {
  const router = useRouter();
  const user = useUser();
  const next = user.setup_step > 0 ? "/hoje" : "/onboarding";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await enablePasskey();
      router.push(next);
    } catch (err) {
      setError(passkeyError(err as Error));
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 48, gap: 18 }}>
        <div style={{ width: 120, height: 120, borderRadius: 32, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
          <Icon name="face" size={64} style={{ strokeWidth: 1.5 }} />
        </div>
        <h1 className="h1">Entrar com Face ID</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 300 }}>
          Da próxima vez, é só olhar para o iPhone. Sua senha continua valendo como alternativa.
        </p>
        <div className="card" style={{ textAlign: "left", fontSize: 13.5, width: "100%" }}>
          <b>Como funciona</b>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Criamos uma chave de acesso (passkey) guardada no seu aparelho. O Face ID confirma que é você; seu rosto nunca sai do aparelho.
          </p>
        </div>
      </div>
      <div className="stack" style={{ marginTop: 28 }}>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-primary" onClick={enable} disabled={busy}>
          <Icon name="face" /> {busy ? "Aguardando o Face ID..." : "Ativar Face ID"}
        </button>
        <button className="btn btn-text" onClick={() => router.push(next)}>
          Agora não
        </button>
      </div>
    </>
  );
}
