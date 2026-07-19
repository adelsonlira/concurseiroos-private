# ConcurseiroOS v3.35.1 — TypeScript e builds

## TypeScript

`tsc --noEmit`: **PASS**, executado pelo pipeline `npm run validate`.

## Build web

- status: **PASS**;
- Vite: build concluído em 6,15 s;
- assets do Diagnóstico Piloto: 6/6;
- assets do Treino FGV: 301/301;
- catálogo público sem metadados privados na auditoria amostral;
- aviso não bloqueante: chunk `study-engine` com aproximadamente 1.088,10 kB minificado e 254,88 kB gzip.

## Build Express

- status: **PASS**;
- `dist/server.cjs`: aproximadamente 1,4 MB;
- sourcemap: aproximadamente 1,9 MB.

## Build serverless

- status: **PASS**;
- `dist/http-app.mjs`: emitido;
- funções `training-fgv/check` e `training-fgv/finalize`: emitidas em ESM.

## Integridade preservada

- 797 registros de origem;
- 664 questões elegíveis;
- 301 assets;
- 311 arquivos protegidos do corpus/catálogos sem diferenças frente à baseline.
