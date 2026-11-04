import { writeFileSync } from "node:fs";
// Teste de ponta a ponta: cadastro, Face ID (autenticador virtual), onboarding, módulos e login.
// Uso: BASE=http://localhost:3000 node tests/e2e/fluxo.mjs [pasta-para-prints]
import { createRequire } from "node:module";

// Playwright vem do ambiente (npx playwright ou instalação global).
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = process.argv[2];
const user = "teste" + Date.now().toString().slice(-6);
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/status of 40[01]/.test(m.text()) && errors.push("console: " + m.text()));
const cdp = await ctx.newCDPSession(page);
await cdp.send("WebAuthn.enable");
const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
});
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
const step = (s) => console.log("✓", s);

await page.goto(BASE + "/login");
await shot("01-login");
await page.click("text=Criar conta");
await page.fill("#cd-user", user);
await page.fill("#cd-mail", user + "@exemplo.com");
await page.fill("#cd-pass", "SenhaForte#24");
await page.fill("#cd-pass2", "SenhaForte#24");
await page.check("#cd-terms");
await shot("02-cadastro");
await page.click("button:has-text('Criar conta')");
await page.waitForURL(/faceid|onboarding/);
step("cadastro → " + new URL(page.url()).pathname);
if (page.url().includes("faceid")) {
  await shot("03-faceid");
  await page.click("button:has-text('Ativar Face ID')");
  await page.waitForURL(/onboarding/);
  step("Face ID ativado");
}
await page.fill("input[aria-label='Seu nome']", "Jean");
await shot("04-pergunta-1");
await page.click("text=Continuar");
await page.fill("#q-wake", "06:00");
await page.fill("#q-sleep", "22:30");
await page.click("text=Continuar");
await page.click("text=Empreendedor");
await page.click("text=Continuar");
for (const a of ["Saúde", "Finanças", "Relacionamentos"]) await page.click(`.chip:has-text('${a}')`);
await page.click("text=Continuar");
await page.click("text=Entrar em forma");
await page.click("text=Continuar");
await page.click(".option:has-text('Manhã')");
await page.click("text=Continuar");
for (const a of ["Treinar", "Ler"]) await page.click(`.chip:has-text('${a}')`);
for (const a of ["Refrigerante", "Dormir tarde"]) await page.click(`.chip.bad:has-text('${a}')`);
await shot("05-pergunta-habitos");
await page.click("text=Continuar");
await page.click("text=Concluir");
await page.waitForURL(/montagem/);
await page.waitForSelector("text=Prévia da sua rotina");
await shot("06-montagem");
step("onboarding concluído");

await page.click("text=Começar pela rotina");
await page.waitForSelector(".block");
await shot("07-rotina");
const blocks = await page.locator(".block").count();
step(`rotina sugerida com ${blocks} atividades no dia`);
await page.click("[aria-label='Próximo mês']");
await page.locator(".cal-day:not(.out)").nth(14).click();
await page.waitForSelector("text=Ir para hoje");
await shot("07b-calendario");
await page.click("text=Ir para hoje");
step(`calendário: ${await page.locator(".cal-day").count()} dias, navegação de mês ok`);
await page.click("[aria-label='Adicionar à rotina']");
await page.fill("#f-title", "Inglês");
await page.fill("#f-s", "19:30");
await page.fill("#f-e", "20:15");
await page.click(".chip:has-text('Estudo')");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".toast");
step("atividade criada");
await page.click("text=Salvar rotina e ir para tarefas");
await page.waitForURL(/montagem/);
await page.click("text=Continuar");
await page.waitForURL(/tarefas/);
await page.waitForSelector(".item");
await page.click("[aria-label='Nova tarefa']");
await page.fill("#f-t", "Pagar fornecedores");
await page.fill("#f-h", "10:00");
await page.fill("#f-he", "10:30");
await page.click(".seg button:has-text('Quinzenal')");
await page.selectOption("#f-p", "high");
await shot("08-nova-tarefa");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".toast");
await page.click(".seg button:has-text('Quinzenais')");
await page.waitForSelector(".item:has-text('Pagar fornecedores')");
await page.click(".item:has-text('Pagar fornecedores') .check");
await page.waitForSelector(".item.done:has-text('Pagar fornecedores')");
await shot("09-tarefas");
await page.waitForSelector(".item:has-text('Pagar fornecedores'):has-text('10:00 – 10:30')");
step("tarefa quinzenal 10:00–10:30 criada e concluída");
await page.goto(BASE + "/rotina");
await page.waitForSelector(".block.task:has-text('Pagar fornecedores')");
step("tarefa aparece na linha do tempo da rotina");
await page.goto(BASE + "/tarefas");
await page.click(".seg button:has-text('Quinzenais')");
await page.waitForSelector(".item:has-text('Pagar fornecedores')");
await page.click("[aria-label='Editar Pagar fornecedores']");
await page.fill("#f-he", "09:00");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".sheet .error:has-text('depois do início')");
await page.fill("#f-he", "11:00");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".item:has-text('10:00 – 11:00')");
step("tarefa editada (fim antes do início recusado)");
await page.click(".seg button:has-text('Diárias')");
const first = (await page.locator(".item .t").first().textContent()).trim();
const before = await page.locator(".item").count();
await page.click(`[aria-label='Excluir ${first}']`);
await page.click(".item[role=alertdialog] button:has-text('Excluir')");
await page.waitForFunction((n) => document.querySelectorAll(".item").length === n - 1, before);
step(`tarefa "${first}" excluída`);
await page.click("text=Salvar tarefas e ir para hábitos");
await page.waitForURL(/montagem/);
await page.click("text=Continuar");
await page.waitForURL(/habitos/);
await page.click(".seg button:has-text('Desejados')");
await page.waitForSelector(".hcard:has-text('Treinar')");
await page.click(".hcard:has-text('Treinar') button:has-text('Marcar como feito hoje')");
await page.waitForSelector(".hcard:has-text('Treinar') button:has-text('Feito hoje')");
await page.click(".seg button:has-text('Ruins')");
await page.waitForSelector(".badcard:has-text('Refrigerante')");
await page.click(".badcard:has-text('Refrigerante') button:has-text('Tive uma recaída')");
await page.fill(".badcard input", "Almoço fora");
await shot("10-habito-ruim");
await page.click(".badcard button:has-text('Registrar')");
await page.waitForSelector(".toast:has-text('Recaída')");
step("hábito desejado marcado e recaída registrada");
await page.click("text=Concluir e ver meu dia");
await page.waitForURL(/hoje/);
await page.waitForSelector(".rings");
await shot("11-hoje");
step("tela Hoje carregada");

await page.click(".fab");
await page.click(".type-grid button:has-text('Lembrete')");
await page.fill("#f-l", "Ligar para o contador");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".toast");
await page.goto(BASE + "/lembretes");
await page.waitForSelector("text=Ligar para o contador");
await shot("12-lembretes");
step("lembrete criado");
await page.goto(BASE + "/notas");
await page.click("[aria-label='Nova nota']");
await page.fill("#f-nt", "Metas de 90 dias");
await page.fill("#f-nb", "Organizar a empresa e treinar 5x por semana.");
await page.fill("#f-tag", "Metas");
await page.check("text=Fixar no topo");
await page.click(".sheet button[type=submit]");
await page.waitForSelector(".note:has-text('Metas de 90 dias')");
await shot("13-notas");
step("nota criada");

await page.goto(BASE + "/perfil");
await page.waitForSelector("text=Entrar com Face ID");
await page.click("[aria-label='Modo escuro']");
await page.goto(BASE + "/hoje");
await page.waitForSelector(".rings");
await shot("14-hoje-escuro");
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
step("tema escuro: " + theme);
// Sem toque do usuário, o Face ID do preenchimento automático fica esperando (como no iPhone).
// Widget do iPhone: gera o script e lê os dados com o token dele.
await page.goto(BASE + "/perfil");
await page.click("text=Widget no iPhone");
const kinds = {};
const tokens = [];
for (const [tipo, label] of [["habitos", "Hábitos"], ["tarefas", "Tarefas"], ["rotina", "Rotina"]]) {
  await page.click(`[role=radio]:has-text('${label}')`);
  await page.click(`button:has-text('Criar widget de ${label}')`);
  await page.waitForSelector(`text=Script “Winner ${label}”`);
  const script = await page.locator("textarea.code").inputValue();
  if (!script.includes(`const TIPO = "${tipo}"`)) throw new Error("tipo não gravado no script " + tipo);
  if (tipo === "habitos") { await shot("15-widget"); writeFileSync(SHOTS + "/widget.js", script); }
  tokens.push(script.match(/wgt_[A-Za-z0-9_-]+/)[0]);
}
// Todos os widgets criados continuam funcionando.
for (const [i, tipo] of ["habitos", "tarefas", "rotina"].entries()) {
  const r = await page.request.get(BASE + `/api/widget?tipo=${tipo}&agora=00:01`, { headers: { authorization: "Bearer " + tokens[i] } });
  if (!r.ok()) throw new Error("widget " + tipo + " " + r.status());
  kinds[tipo] = (await r.json()).items.length;
}
const bad = await page.request.get(BASE + "/api/widget?tipo=tarefas", { headers: { authorization: "Bearer wgt_errado" } });
if (bad.status() !== 401) throw new Error("token inválido aceito");
step(`widgets escolhidos: hábitos ${kinds.habitos}, tarefas ${kinds.tarefas}, rotina ${kinds.rotina} (token errado recusado)`);
await cdp.send("WebAuthn.setAutomaticPresenceSimulation", { authenticatorId, enabled: false });
await page.goto(BASE + "/perfil");
await page.click("text=Sair");
await page.waitForURL(/login/);
await page.waitForTimeout(1500);
step("saiu (" + new URL(page.url()).pathname + ")");

await page.fill("#lg-user", user);
await page.fill("#lg-pass", "errada123");
await page.click("button[type=submit]");
await page.waitForSelector(".error");
await page.fill("#lg-pass", "SenhaForte#24");
await page.click("button[type=submit]");
await page.waitForURL(/hoje/);
step("login com senha (e senha errada recusada)");
await page.goto(BASE + "/perfil");
await page.click("text=Sair");
await page.waitForURL(/login/);
await page.waitForTimeout(1000);
await cdp.send("WebAuthn.setAutomaticPresenceSimulation", { authenticatorId, enabled: true });
if (await page.locator("text=Entrar com Face ID").count()) throw new Error("botão de Face ID ainda aparece");
// Reabrir o app depois de sair: pede o Face ID sozinho.
await page.reload({ waitUntil: "commit" }).catch(() => {});
await page.waitForURL(/hoje/, { timeout: 10000 });
step("sem botão; ao reabrir entra com Face ID automático");
// Sessão expirada / app reaberto: com Face ID configurado, entra sozinho sem perguntar.
await ctx.clearCookies();
await page.evaluate(() => sessionStorage.clear());
// O Face ID automático pode trocar de página antes do "load" da tela de login.
await page.goto(BASE + "/login", { waitUntil: "commit" }).catch(() => {});
await page.waitForURL(/hoje/, { timeout: 10000 });
step("app reaberto entra direto com Face ID");

await browser.close();
if (errors.length) {
  console.log("Erros no navegador:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("Tudo certo.");
