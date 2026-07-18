# ConcurseiroOS v3.33.0 — Smoke HTTP

## Express compilado

O servidor compilado foi iniciado em modo de produção e respondeu:

| Recurso | Status |
|---|---:|
| `GET /api/health` | HTTP 200 |
| `GET /api/runtime-config` | HTTP 200 |
| `GET /` | HTTP 200 |
| bundle com `Registrar resultado` | localizado |
| bundle com o aviso descritivo do ledger | localizado |

O HTML inicial foi servido pelo build web e os chunks do formulário contextual foram emitidos.

## Regressão serverless do Treino FGV

O smoke existente do Treino FGV foi repetido sobre os bundles finais:

- catálogo público: 664 questões;
- gabarito ausente antes da conferência;
- tentativa mínima: 5 questões;
- `POST /api/training-fgv/check`: HTTP 200;
- `POST /api/training-fgv/finalize`: HTTP 200;
- `affectsSde = false`;
- `countsAsOfficialSimulation = false`.

O ledger não adiciona endpoints próprios: ele usa a persistência, backup e sincronização existentes no cliente autenticado.
