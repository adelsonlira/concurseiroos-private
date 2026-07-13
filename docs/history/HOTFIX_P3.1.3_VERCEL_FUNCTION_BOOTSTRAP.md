# HOTFIX P3.1.3 — Inicialização segura das Vercel Functions

## Sintoma

- `/api/health` deixou de retornar 404, confirmando que a Function foi criada.
- A invocação passou a retornar `500 FUNCTION_INVOCATION_FAILED`, indicando falha durante a inicialização da Function.

## Causa arquitetural eliminada

As Functions em `api/` importavam o `server.ts` completo. Esse módulo carregava no cold start:

- Vite, usado somente no desenvolvimento local;
- configuração de arquivos estáticos;
- cliente Gemini criado no topo do módulo, mesmo em `/api/health`;
- toda a aplicação Express antes de responder ao health check.

A Function de saúde não precisa de nenhuma dessas dependências.

## Correções

1. `api/health.ts` agora é uma Function Web API independente e sem imports do aplicativo.
2. A aplicação HTTP compartilhada foi movida para `src/server/httpApp.ts`.
3. `httpApp.ts` não importa Vite, não monta arquivos estáticos e não abre porta.
4. O SDK Gemini é carregado dinamicamente somente dentro de endpoints de IA.
5. Ausência de `GEMINI_API_KEY` gera resposta controlada 503 quando um endpoint de IA é chamado, sem derrubar health/auth.
6. `server.ts` ficou restrito ao bootstrap local e carrega Vite dinamicamente apenas em desenvolvimento.
7. As cinco Functions de IA importam `src/server/httpApp.ts`, não o bootstrap local.
8. Build serverless dedicado adicionado para validar o módulo compartilhado.

## Validação

- 248/248 testes aprovados.
- TypeScript aprovado.
- Build web aprovado.
- Build local do servidor aprovado.
- Build do app serverless aprovado.
- Importação do app HTTP em ambiente `VERCEL=1`, sem Gemini, aprovada.
- Function de health independente executada e retornou HTTP 200.
- Servidor de produção local retornou HTTP 200 em `/api/health` e `/`.

## Limitação de validação

O `npm audit` não pôde consultar o registro público por indisponibilidade de DNS no ambiente de execução. Nenhuma dependência foi adicionada ou atualizada neste hotfix.
