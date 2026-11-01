"use client";
import Link from "next/link";
import { useState } from "react";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/client";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/\d/.test(p) && /[a-zA-Z]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
}

export default function SignupPage() {
  const [f, setF] = useState({ username: "", email: "", password: "", confirm: "", terms: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const s = strength(f.password);
  const userOk = /^[a-z0-9._]{3,30}$/.test(f.username);
  const match = f.confirm.length > 0 && f.confirm === f.password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userOk) return setError("Nome de usuário: use de 3 a 30 letras minúsculas, números, ponto ou _.");
    if (f.password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (!match) return setError("As senhas não conferem.");
    if (!f.terms) return setError("Para criar a conta, aceite os termos de uso.");
    setBusy(true);
    try {
      await api("/api/auth/register", { method: "POST", body: { username: f.username, email: f.email, password: f.password } });
      const face = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable().catch(() => false));
      window.location.href = face ? "/faceid" : "/onboarding";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <Link className="back" href="/login" aria-label="Voltar">
        <Icon name="back" />
      </Link>
      <h1 className="h1" style={{ marginTop: 8 }}>
        Crie sua conta
      </h1>
      <p className="sub">Leva menos de um minuto.</p>
      <form className="stack" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="cd-user">Nome de usuário</label>
          <div className="input">
            <Icon name="at" />
            <input id="cd-user" autoCapitalize="none" autoCorrect="off" autoComplete="username" maxLength={30} value={f.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} />
            {f.username && (userOk ? <span className="ok">Válido</span> : <span className="no">Inválido</span>)}
          </div>
          <span className="hint">Letras minúsculas, números, ponto e _. Você usa para entrar.</span>
        </div>
        <div className="field">
          <label htmlFor="cd-mail">E-mail</label>
          <div className="input">
            <Icon name="mail" />
            <input id="cd-mail" type="email" autoComplete="email" required value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cd-pass">Senha</label>
          <div className="input">
            <Icon name="lock" />
            <input id="cd-pass" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className={`meter ${s <= 1 ? "weak" : s === 2 ? "mid" : ""}`}>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < s ? "on" : ""} />
            ))}
          </div>
          <span className="hint">{f.password ? (s <= 1 ? "Senha fraca." : s === 2 ? "Senha razoável." : "Senha forte.") : ""} Use 8 caracteres ou mais, com número e símbolo.</span>
        </div>
        <div className="field">
          <label htmlFor="cd-pass2">Confirmar senha</label>
          <div className="input">
            <Icon name="lock" />
            <input id="cd-pass2" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} />
            {f.confirm && (match ? <span className="ok">Confere</span> : <span className="no">Diferente</span>)}
          </div>
        </div>
        <label className="check-line muted">
          <input id="cd-terms" type="checkbox" checked={f.terms} onChange={(e) => set("terms", e.target.checked)} /> Li e aceito os termos de uso e a política de privacidade
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </>
  );
}
