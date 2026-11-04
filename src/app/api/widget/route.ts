import { fail, ok, route, todayFrom } from "@/lib/http.ts";
import { isTime, toMinutes } from "@/lib/dates.ts";
import { WIDGET_KINDS, widgetData, widgetUser, type WidgetKind } from "@/lib/widget.ts";

// Leitura para o widget do iPhone: autenticado por token (Authorization: Bearer wgt_...), só leitura.
export const GET = route(async (req) => {
  const userId = await widgetUser(req);
  if (!userId) return fail(401, "Token do widget inválido. Gere um novo no Perfil do Winner.");
  const params = new URL(req.url).searchParams;
  const k = params.get("tipo") ?? "tarefas";
  const kind: WidgetKind = (WIDGET_KINDS as readonly string[]).includes(k) ? (k as WidgetKind) : "tarefas";
  const now = params.get("agora");
  const nowMin = isTime(now) ? toMinutes(now) : 0;
  return ok(await widgetData(userId, kind, todayFrom(req), nowMin), { headers: { "cache-control": "no-store" } });
});
