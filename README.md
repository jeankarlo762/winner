# Winner

Webapp (PWA) para organizar rotina, tarefas recorrentes, hábitos, lembretes e notas. Feito primeiro para o celular, funciona também no PC.

## O que já funciona

- **Conta:** cadastro com nome de usuário, e-mail e senha (Argon2id); login por usuário ou e-mail; sessão em cookie httpOnly por 30 dias; troca de senha desconecta os outros aparelhos.
- **Face ID / Touch ID:** chaves de acesso (passkeys, WebAuthn). No iPhone, o Face ID aparece direto no campo de usuário e no botão "Entrar com Face ID". Ativa depois do cadastro ou no Perfil.
- **Onboarding:** 8 perguntas que geram uma rotina, tarefas e hábitos iniciais. Depois, montagem guiada em 3 passos (rotina, tarefas, hábitos).
- **Rotina:** atividades fixas com início e fim, dias da semana e categoria, com aviso de horário em conflito e destaque da atividade de agora.
- **Tarefas:** diárias, semanais (dias escolhidos), quinzenais (a cada 15 dias), mensais (dia do mês ou último dia) e únicas. Ao concluir, a próxima ocorrência aparece sozinha.
- **Hábitos:** bons (sequência e semana), desejados (meta de 21 dias seguidos e opção de virar hábito bom) e ruins (contador de dias limpo, recorde, gatilhos, substituto, "venci a vontade" e registro de recaída).
- **Lembretes:** data, hora e repetição; adiar 10 min, 1 h ou para amanhã.
- **Notas:** etiqueta, fixar no topo e busca.
- **Tela Hoje:** atividade atual, próximas, tarefas do dia, hábitos e lembretes.
- **Tema** claro (branco e azul) e escuro (midnight e azul naval), salvo por aparelho.
- **PWA:** instalável na tela de início, com cópia offline das últimas telas vistas.

## Rodar localmente

Requer Node 20+ e PostgreSQL.

```bash
cp .env.example .env          # ajuste DATABASE_URL e APP_ORIGIN
npm install
npm run db:migrate            # cria as tabelas (pode rodar de novo sem problema)
npm run dev                   # http://localhost:3000
```

O Face ID só funciona em `localhost` ou em HTTPS, e precisa que `APP_ORIGIN` seja exatamente o endereço aberto no navegador.

## Testes

```bash
npm test                      # regras de recorrência, hábitos e sugestões
npm run lint                  # checagem de tipos
# ponta a ponta (servidor rodando; usa Playwright e um autenticador virtual para o Face ID):
BASE=http://localhost:3000 node tests/e2e/fluxo.mjs
```

## Publicar no Railway

1. Crie um projeto com o serviço deste repositório e adicione um banco PostgreSQL.
2. Variáveis do serviço: `DATABASE_URL` (referência ao Postgres) e `APP_ORIGIN` (o domínio público, com `https://`).
3. Comando de build: `npm run build`. Comando de início: `npm run db:migrate && npm start`.

## Estrutura

- `db/schema.sql`: tabelas.
- `src/lib`: banco, autenticação, passkeys, recorrência, cálculo de hábitos, sugestões do onboarding.
- `src/app/api`: rotas da API.
- `src/app/(auth)`, `(setup)`, `(app)`: telas de login/cadastro, montagem inicial e o app.

## Próximos passos

- Notificações push (Web Push) para lembretes e rotina.
- Recuperação de senha por e-mail (precisa de um serviço de envio).
- Limite de tentativas de login guardado no banco ou Redis (hoje fica em memória, por instância).
