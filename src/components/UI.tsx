"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CreateSheet, type SheetType } from "./CreateSheet";

interface SheetState {
  type: SheetType;
  item?: Record<string, unknown>;
  lockType?: boolean;
}
interface UICtx {
  toast: (msg: string) => void;
  openSheet: (type: SheetType, item?: Record<string, unknown>) => void;
}

const Ctx = createContext<UICtx>({ toast: () => {}, openSheet: () => {} });
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  const openSheet = useCallback((type: SheetType, item?: Record<string, unknown>) => setSheet({ type, item, lockType: !!item }), []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheet]);

  return (
    <Ctx.Provider value={{ toast, openSheet }}>
      {children}
      {sheet && (
        <>
          <div className="scrim" onClick={() => setSheet(null)} />
          <CreateSheet key={sheet.type + String(sheet.item?.id ?? "")} {...sheet} onClose={() => setSheet(null)} toast={toast} />
        </>
      )}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}
