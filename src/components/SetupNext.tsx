"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { useUser } from "./Shell";

/** Durante a montagem inicial, mostra o botão para salvar o passo e seguir. */
export function SetupNext({ step, label }: { step: 1 | 2 | 3; label: string }) {
  const user = useUser();
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!params.get("setup") && user.setup_step !== step) return null;
  return (
    <div style={{ marginTop: 22 }}>
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/me", { method: "PATCH", body: { setup_step: Math.max(user.setup_step, step + 1) } }).catch(() => {});
          router.push(step === 3 ? "/hoje" : "/montagem");
          router.refresh();
        }}
      >
        {label}
      </button>
    </div>
  );
}
