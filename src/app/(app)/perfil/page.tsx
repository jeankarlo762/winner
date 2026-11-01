"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Icon } from "@/components/Icon";
import { useUser } from "@/components/Shell";
import { useTheme } from "@/components/Theme";
import { useUI } from "@/components/UI";
import { api, useData } from "@/lib/client";
import { enablePasskey, markLoggedOut, passkeyError, rememberFace } from "@/lib/passkey-client";

interface Passkey { id: string; device_name: string; created_at: string; last_used_at: string | null }

export default function Perfil() {
  const user = useUser();
  const router = useRouter();
  const { toast } = useUI();
  const [theme, toggleTheme] = useTheme();
  const keys = useData<Passkey[]>("/api/passkeys");
  const [name, setName] = useState(user.display_name);
  const [editName, setEditName] = useState(false);
  const [pw, setPw] = useState<{ open: boolean; current: string; next: string; error: string | null }>({ open: false, current: "", next: "", error: null });
  const [canPasskey, setCanPasskey] = useState(false);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    setCanPasskey(browserSupportsWebAuthn());
    setStandalone(matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  }, []);
  const hasFace = (keys.data?.length ?? user.passkeys) > 0;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PATCH", body: { display_name: name } });
      setEditName(false);
      toast("Nome atualizado");
      router.refresh();
    } catch (err) {
      toast((err as Error).message);
    }
  }
  async function toggleFace() {
    try {
      if (hasFace) {
        await api("/api/passkeys", { method: "DELETE" });
        rememberFace(false);
        toast("Face ID desativado");
      } else {
        await enablePasskey();
        toast("Face ID ativado");
      }
      keys.reload();
    } catch (err) {
      toast(passkeyError(err as Error));
    }
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PATCH", body: { current_password: pw.current, new_password: pw.next } });
      setPw({ open: false, current: "", next: "", error: null });
      toast("Senha alterada. Outros aparelhos foram desconectados.");
    } catch (err) {
      setPw((p) => ({ ...p, error: (err as Error).message }));
    }
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    markLoggedOut();
    // Apaga a cópia offline para o próximo usuário do aparelho não ver seus dados.
    if ("caches" in window) await caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <>
      <Link className="back" href="/hoje" aria-label="Voltar"><Icon name="back" /></Link>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="logo" style={{ width: 60, height: 60, borderRadius: "50%", fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22 }}>
          {(user.display_name || user.username).slice(0, 1).toUpperCase()}
        </span>
        {editName ? (
          <form className="row grow" onSubmit={saveName}>
            <div className="input grow"><input aria-label="Seu nome" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <button className="icon-btn" type="submit" aria-label="Salvar nome"><Icon name="check" /></button>
          </form>
        ) : (
          <button className="grow" style={{ textAlign: "left" }} onClick={() => setEditName(true)}>
            <h1 className="h2">{user.display_name}</h1>
            <span className="muted">@{user.username} · editar nome</span>
          </button>
        )}
      </div>

      <p className="eyebrow" style={{ margin: "26px 0 8px" }}>Atalhos</p>
      <div className="menu">
        <Link href="/lembretes"><span className="ic"><Icon name="bell" /></span><span className="grow">Lembretes</span><Icon name="right" /></Link>
        <Link href="/notas"><span className="ic"><Icon name="note" /></span><span className="grow">Notas</span><Icon name="right" /></Link>
        <Link href="/montagem"><span className="ic"><Icon name="target" /></span><span className="grow">Montagem inicial</span><Icon name="right" /></Link>
      </div>

      <p className="eyebrow" style={{ margin: "22px 0 8px" }}>Preferências</p>
      <div className="menu">
        <div>
          <span className="ic"><Icon name="moon" /></span><span className="grow">Modo escuro</span>
          <button className="switch" role="switch" aria-checked={theme === "dark"} aria-label="Modo escuro" onClick={toggleTheme} />
        </div>
        {canPasskey && (
          <div>
            <span className="ic"><Icon name="face" /></span>
            <span className="grow">Entrar com Face ID<br /><span className="muted" style={{ fontSize: 12.5 }}>{hasFace ? (keys.data ?? []).map((k) => k.device_name).join(", ") || "Ativado" : "Desativado"}</span></span>
            <button className="switch" role="switch" aria-checked={hasFace} aria-label="Entrar com Face ID" onClick={toggleFace} />
          </div>
        )}
        <button onClick={() => setPw((p) => ({ ...p, open: !p.open }))}><span className="ic"><Icon name="key" /></span><span className="grow">Trocar senha</span><Icon name="right" /></button>
      </div>
      {pw.open && (
        <form className="card stack" style={{ marginTop: 10 }} onSubmit={changePassword}>
          <div className="field"><label htmlFor="pw-cur">Senha atual</label><div className="input"><input id="pw-cur" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} /></div></div>
          <div className="field"><label htmlFor="pw-new">Nova senha</label><div className="input"><input id="pw-new" type="password" autoComplete="new-password" minLength={8} required value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} /></div></div>
          {pw.error && <div className="error">{pw.error}</div>}
          <button className="btn btn-primary btn-sm" type="submit">Salvar nova senha</button>
        </form>
      )}

      {!standalone && (
        <div className="card" style={{ marginTop: 22 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="download" size={18} /></span>
            <div className="grow" style={{ fontSize: 14 }}>
              <b>Instale o Winner no iPhone</b>
              <p className="muted" style={{ margin: "4px 0 0" }}>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. O app abre em tela cheia, como um aplicativo.</p>
            </div>
          </div>
        </div>
      )}

      <div className="menu" style={{ marginTop: 22 }}>
        <button onClick={logout} style={{ color: "var(--bad)" }}><span className="ic" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}><Icon name="logout" /></span><span className="grow">Sair</span></button>
      </div>
      <p className="hint" style={{ textAlign: "center", marginTop: 18 }}>{user.email}</p>
    </>
  );
}
