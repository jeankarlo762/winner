"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, WebAuthnAbortService } from "@simplewebauthn/browser";
import { Icon, Logo } from "@/components/Icon";
import { ThemeButton } from "@/components/Theme";
import { api } from "@/lib/client";
import { faceRemembered, rememberFace, takeLoggedOut } from "@/lib/passkey-client";

async function passkeyLogin(autofill: boolean) {
  const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/auth/passkey/login-options", { method: "POST" });
  const response = await startAuthentication({ optionsJSON, useBrowserAutofill: autofill });
  await api("/api/auth/passkey/login", { method: "POST", body: { response } });
  rememberFace(true);
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const supported = browserSupportsWebAuthn();
    let alive = true;
    // No iPhone, o Face ID aparece direto no teclado ao tocar no campo de usuário.
    const autofill = () =>
      browserSupportsWebAuthnAutofill().then((ok) => {
        if (!ok || !alive) return;
        passkeyLogin(true)
          .then(() => (window.location.href = "/hoje"))
          .catch(() => {});
      });
    // Face ID já configurado neste aparelho: entra direto, sem perguntar.
    const leaving = takeLoggedOut();
    if (supported && faceRemembered() && !leaving) {
      setAuto(true);
      passkeyLogin(false)
        .then(() => (window.location.href = "/hoje"))
        .catch(() => {
          if (!alive) return;
          setAuto(false);
          autofill();
        });
    } else {
      autofill();
    }
    return () => {
      alive = false;
      WebAuthnAbortService.cancelCeremony();
    };
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

  if (auto)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 120, gap: 18 }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
          <Icon name="face" size={48} />
        </div>
        <h1 className="h2">Entrando com Face ID...</h1>
        <button className="btn btn-ghost" type="button" onClick={() => { WebAuthnAbortService.cancelCeremony(); }}>
          Usar senha
        </button>
      </div>
    );

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
