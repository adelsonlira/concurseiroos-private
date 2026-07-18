# Resultados de validação — ConcurseiroOS 3.31.4

## Cobertura específica do hotfix

Foram mantidos os 16 testes anteriores do diagnóstico e adicionados 16 testes de navegação, totalizando 32 verificações no módulo. A cobertura confirma:

- entrada pelo menu sempre em `landing`, com ou sem histórico;
- ausência de abertura automática da tentativa finalizada mais recente;
- abertura do resultado exato por `attemptId`;
- retorno do resultado para a landing ao clicar novamente no item lateral;
- início, retomada e recarregamento da tentativa ativa;
- preservação de posição, respostas, revisão e origem do cronômetro no F5;
- cancelamento sem novo resultado e sem alteração do histórico;
- redirecionamento para o resultado recém-finalizado;
- F5 mantendo o mesmo resultado específico;
- navegação e retorno sem mutação de tentativas;
- histórico append-only e tentativas finalizadas imutáveis;
- neutralidade do store principal, SDE, mastery e prioridades.

## Suíte integral

- `npm run build`: **PASS**.
- Testes: **452 aprovados em 74 arquivos**.
- Falhas: **0**.
- TypeScript (`tsc --noEmit`): **PASS**.
- Validações de memória institucional: **PASS**.
- Auditoria do diagnóstico: **PASS** — 24 questões, seis assets, controles 14/53 e catálogo público sanitizado.
- Auditoria do SDE: **PASS** — 117 ações e 50 parâmetros.
- Build web: **PASS** — 2.243 módulos transformados.
- Build Express: **PASS**.
- Build serverless ESM: **PASS**.
- Assets emitidos no build: **6/6**.

## Smoke HTTP no runtime compilado

Executado com `NODE_ENV=production`, `AUTH_MODE=disabled` e `node dist/server.cjs`:

- `/`: HTTP **200**;
- `/api/health`: HTTP **200**;
- `/api/runtime-config`: HTTP **200**;
- `GET /api/diagnostic-finalize`: HTTP **405**, sem exposição de `operationalAnswer`;
- `POST /api/diagnostic-finalize`: HTTP **200**, com 24 correções, 24 registros de rastreabilidade, 24 brancos e `affectsSde = false`;
- seis URLs de assets do diagnóstico: HTTP **200**.

## Dependências

- `npm audit --omit=dev`: **0 vulnerabilidades**.
- `npm audit`: **0 vulnerabilidades**.

## Preservações verificadas por checksum

Permaneceram byte a byte inalterados frente à v3.31.3:

- import interno com as 24 questões e gabarito;
- catálogo público sanitizado;
- os seis PNGs;
- registro de assets;
- store principal `src/store.ts`.

Não houve arquivo removido. O hotfix adiciona seis arquivos e modifica dezenove, incluindo relatórios de qualidade regenerados pelo pipeline.

## Observações do ambiente

- O runtime declarado do produto é Node.js 24.x; a execução disponível ocorreu em Node.js 22.16.0, mantendo o aviso de runtime já conhecido.
- Uma tentativa adicional de automação visual com Chromium headless foi bloqueada pela política administrada do ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR` para loopback). Isso não afetou o smoke HTTP obrigatório nem a suíte de navegação e persistência.
