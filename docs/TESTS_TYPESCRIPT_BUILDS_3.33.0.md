# ConcurseiroOS v3.33.0 — Testes, TypeScript e builds

## Regressão completa

Comando:

```text
npx vitest run --maxWorkers=4
```

Resultado:

```text
Test Files  82 passed (82)
Tests       525 passed (525)
Duration    8.94s
```

A regressão inclui 29 testes novos do ledger, 33 testes do Treino FGV e 32 testes do Diagnóstico Piloto.

## TypeScript

```text
npm run typecheck
```

Resultado: PASS, sem erros.

## Build web

```text
npx vite build
```

Resultado: PASS, 2.261 módulos transformados.

O comando direto evitou executar `training:build` ou as auditorias dos 301 assets, conforme a estratégia de desenvolvimento da versão.

## Build Express

```text
npm run build:server
```

Resultado: PASS. Artefato local validado em `dist/server.cjs`.

## Build serverless

```text
npm run build:serverless
```

Resultado: PASS para:

- `dist/http-app.mjs`;
- `dist/serverless-api/training-fgv/check.js`;
- `dist/serverless-api/training-fgv/finalize.js`.

## Auditorias

```text
npm run validate:memory
npm run sde:audit
npm run readiness:audit
```

Resultados:

- memória institucional sincronizada com 3.33.0;
- SDE PASS, 117 ações e 50 parâmetros;
- prontidão `READY_WITH_LIMITATIONS`, confiança `MEDIUM`.
