# ADR-030 — Especificadores ESM explícitos no grafo serverless

**Status:** aceito  
**Data:** 2026-07-17  
**Versão:** 3.31.2

## Contexto

A Vercel executou `api/ai-health.js` como módulo ESM. O import emitido para `../src/server/runtimeEnvironment` não possuía extensão, e o Node não realizou resolução implícita para `.js`. A função encerrou com `ERR_MODULE_NOT_FOUND` antes de qualquer chamada externa.

Testes executados diretamente sobre TypeScript, Vitest ou bundles completos não reproduziam a falha porque seus resolvers aceitam especificadores sem extensão ou eliminam os imports ao empacotar.

## Decisão

1. Todo import relativo alcançável a partir de `api/*.ts` deve declarar extensão de runtime.
2. Módulos TypeScript locais são referenciados com sufixo `.js`; o compilador resolve o fonte `.ts` e preserva o caminho correto para execução.
3. Imports JSON executados por Node ESM devem declarar o atributo de tipo.
4. O pipeline inclui uma regressão sem bundle, carregada pela resolução nativa do Node.
5. Uma auditoria estática bloqueia a reintrodução de especificadores relativos sem extensão no grafo serverless catalogado.

## Consequências

- O teste se aproxima do formato efetivamente executado pela Vercel.
- Diagnósticos independentes continuam isolados de Express.
- Rotas compartilhadas deixam de depender de resolução implícita não suportada pelo Node ESM.
- A regra não altera o frontend nem exige mudança nas variáveis de ambiente.
