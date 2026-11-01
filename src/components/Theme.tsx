"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export type Theme = "light" | "dark";

/** Roda antes da página pintar, para não piscar o tema errado. */
export const themeScript = `try{var t=localStorage.getItem("winner-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("winner-theme", t);
  } catch {}
  window.dispatchEvent(new Event("winner:theme"));
  fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: t }) }).catch(() => {});
}

export function useTheme(): [Theme, () => void] {
  const [t, setT] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => setT(currentTheme());
    sync();
    window.addEventListener("winner:theme", sync);
    return () => window.removeEventListener("winner:theme", sync);
  }, []);
  return [t, () => applyTheme(currentTheme() === "dark" ? "light" : "dark")];
}

export function ThemeButton() {
  const [t, toggle] = useTheme();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={t === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
      <Icon name={t === "dark" ? "sun" : "moon"} />
    </button>
  );
}
