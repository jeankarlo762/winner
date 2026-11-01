// Script do app Scriptable (iPhone) que desenha o widget do Winner.
// O tipo (tarefas, rotina ou habitos) é escolhido no app ao gerar o script.
export type WidgetKind = "tarefas" | "rotina" | "habitos";
export const WIDGET_LABEL: Record<WidgetKind, string> = { tarefas: "Tarefas", rotina: "Rotina", habitos: "Hábitos" };

export function widgetScript(origin: string, token: string, kind: WidgetKind) {
  return `// Winner — widget de ${WIDGET_LABEL[kind]} para o Scriptable
const URL_APP = ${JSON.stringify(origin)};
const TOKEN = ${JSON.stringify(token)};
const TIPO = ${JSON.stringify(kind)};

const kind = ((args.widgetParameter || TIPO) + "").trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
const today = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const now = pad(d.getHours()) + ":" + pad(d.getMinutes());

const BG = Color.dynamic(new Color("#FFFFFF"), new Color("#05070F"));
const FG = Color.dynamic(new Color("#0B1530"), new Color("#E8EDFB"));
const MUTED = Color.dynamic(new Color("#5B6785"), new Color("#8C97B5"));
const ACCENT = Color.dynamic(new Color("#1D5BD8"), new Color("#5B8CFF"));
const GOOD = Color.dynamic(new Color("#16A36A"), new Color("#3DD68C"));

const w = new ListWidget();
w.backgroundColor = BG;
w.setPadding(14, 14, 14, 14);
w.url = URL_APP + (kind === "rotina" ? "/rotina" : kind === "habitos" ? "/habitos" : "/tarefas");
w.refreshAfterDate = new Date(Date.now() + 15 * 60000);

try {
  const req = new Request(URL_APP + "/api/widget?tipo=" + encodeURIComponent(kind) + "&today=" + today + "&agora=" + now);
  req.headers = { Authorization: "Bearer " + TOKEN };
  const data = await req.loadJSON();
  if (data.error) throw new Error(data.error);

  const head = w.addStack();
  head.centerAlignContent();
  const t = head.addText(data.title);
  t.font = Font.boldSystemFont(14);
  t.textColor = ACCENT;
  head.addSpacer();
  const s = head.addText(data.summary);
  s.font = Font.mediumSystemFont(11);
  s.textColor = MUTED;
  w.addSpacer(8);

  const max = config.widgetFamily === "large" ? 9 : config.widgetFamily === "small" ? 3 : 4;
  if (!data.items.length) {
    const e = w.addText("Nada por aqui 🎉");
    e.font = Font.systemFont(13);
    e.textColor = MUTED;
  }
  for (const it of data.items.slice(0, max)) {
    const row = w.addStack();
    row.centerAlignContent();
    const sym = SFSymbol.named(it.done ? "checkmark.circle.fill" : it.now ? "largecircle.fill.circle" : "circle");
    const img = row.addImage(sym.image);
    img.imageSize = new Size(14, 14);
    img.tintColor = it.done ? GOOD : ACCENT;
    row.addSpacer(6);
    const col = row.addStack();
    col.layoutVertically();
    const a = col.addText(it.title);
    a.font = it.now ? Font.boldSystemFont(13) : Font.mediumSystemFont(13);
    a.textColor = it.done ? MUTED : FG;
    a.lineLimit = 1;
    if (config.widgetFamily !== "small") {
      const b = col.addText(it.sub);
      b.font = Font.systemFont(10.5);
      b.textColor = MUTED;
      b.lineLimit = 1;
    }
    w.addSpacer(5);
  }
  if (data.items.length > max) {
    const more = w.addText("+" + (data.items.length - max) + " no app");
    more.font = Font.systemFont(10.5);
    more.textColor = MUTED;
  }
} catch (e) {
  const err = w.addText("Winner: " + e.message);
  err.font = Font.systemFont(12);
  err.textColor = MUTED;
}
w.addSpacer();

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
`;
}
