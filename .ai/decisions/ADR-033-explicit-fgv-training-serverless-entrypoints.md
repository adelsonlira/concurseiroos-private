# ADR-033 — Entry points serverless explícitos do Treino FGV

## Status

Aceito em 2026-07-18 para a versão 3.32.1.

## Contexto

A 3.32.0 registrava as rotas `/api/training-fgv/check` e `/api/training-fgv/finalize` apenas no aplicativo Express compartilhado. O desenvolvimento local e o smoke do `httpApp` funcionavam, mas o deploy Vercel usa descoberta de funções pelo diretório `api/`. Sem arquivos correspondentes, a requisição não alcançava o Express em produção.

## Decisão

Criar entry points explícitos e aninhados em `api/training-fgv/check.ts` e `api/training-fgv/finalize.ts`. Cada função encaminha a requisição ao `httpApp` autenticado e importa estaticamente o servidor de correção, validando os catálogos no cold start. O build local gera bundles equivalentes em `dist/serverless-api` e o smoke executa os handlers compilados por HTTP real.

## Consequências

- A rota publicada corresponde exatamente à URL usada pelo cliente.
- O catálogo privado é rastreável pelo bundler serverless sem ser incluído no bundle público web.
- Autenticação, parsing JSON e tratamento HTTP permanecem centralizados no `httpApp`.
- GET continua bloqueado e a resposta operacional só é entregue após POST explícito.
