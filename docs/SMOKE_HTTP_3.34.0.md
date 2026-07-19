# Smoke HTTP — ConcurseiroOS v3.34.0

## Express compilado

O servidor `dist/server.cjs` foi iniciado em Node.js 24.11.1 com `NODE_ENV=production` e autenticação desabilitada apenas para o smoke local.

Resultados:

| Verificação | Resultado |
|---|---:|
| `GET /` | HTTP 200 |
| `GET /api/runtime-config` | HTTP 200 |
| `GET /api/training-fgv/check` | HTTP 405 |
| HTML contém o ponto de montagem React | PASS |
| configuração pública não expõe segredo | PASS |

## Funções serverless compiladas

O smoke executou uma tentativa real mínima do Treino FGV usando os entrypoints compilados:

1. catálogo público com 664 questões, sem resposta operacional;
2. tentativa de cinco questões distintas;
3. `POST /api/training-fgv/check`;
4. HTTP 200 e resposta operacional somente após a ação explícita;
5. `POST /api/training-fgv/finalize`;
6. HTTP 200;
7. `affectsSde = false`;
8. `countsAsOfficialSimulation = false`.

Esse smoke confirma que a evolução do SDE não regrediu o runtime serverless do Treino FGV.
