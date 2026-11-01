"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, WebAuthnAbortService } from "@simplewebauthn/browser";
import { Icon, Logo } from "@/components/Icon";
import { ThemeButton } from "@/components/Theme";
import { api } from "@/lib/client";

async function passkeyLogin(autofill: boolean) {
  const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/auth/passkey/login-options", { method: "POST" });
  const response = await startAuthentication({ optionsJSON, useBrowserAutofill: autofill });
  await api("/api/auth/passkey/login", { method: "POST", body: { response } });
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);

  useEffect(() => {
    setCanPasskey(browserSupportsWebAuthn());
    // No iPhone, o Face ID aparece direto no teclado ao tocar no campo de usuário.
    browserSupportsWebAuthnAutofill().then((ok) => {
      if (!ok) return;
      passkeyLogin(true)
        .then(() => (window.location.href = "/hoje"))
        .catch(() => {});
    });
    return () => WebAuthnAbortService.cancelCeremony();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: { username, password } });
      window.location.href = "/hoje";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function face() {
    setError(null);
    setBusy(true);
    try {
      await passkeyLogin(false);
      window.location.href = "/hoje";
    } catch (err) {
      const e = err as Error;
      setError(e.name === "NotAllowedError" ? "Face ID cancelado. Tente de novo ou entre com a senha." : e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="between">
        <span />
        <ThemeButton />
      </div>
      <div className="stack" style={{ marginTop: 28 }}>
        <Logo size={56} />
        <div>
          <h1 className="h1">Bom te ver de novo</h1>
          <p className="sub">Entre para ver o seu dia.</p>
        </div>
      </div>
      <form className="stack" style={{ marginTop: 28 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="lg-user">Nome de usuário ou e-mail</label>
          <div className="input">
            <Icon name="at" />
            <input id="lg-user" name="username" required autoCapitalize="none" autoCorrect="off" autoComplete="username webauthn" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="lg-pass">Senha</label>
          <div className="input">
            <Icon name="lock" />
            <input id="lg-pass" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
        {canPasskey && (
          <>
            <div className="divider">ou</div>
            <button className="btn btn-ghost" type="button" onClick={face} disabled={busy}>
              <Icon name="face" /> Entrar com Face ID
            </button>
          </>
        )}
      </form>
      <p style={{ textAlign: "center", marginTop: 24 }} className="muted">
        Ainda não tem conta?{" "}
        <Link className="link" href="/cadastro">
          Criar conta
        </Link>
      </p>
    </>
  );
}
