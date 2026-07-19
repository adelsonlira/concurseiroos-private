# Pipeline integral em checkout limpo

## Ambiente

- Node.js: `v24.18.0`.
- npm: `10.9.2`.
- Commit: `230765c65619f4c521b09714ba551191c6240290`.
- Intervenção manual: nenhuma.

| Comando/etapa | Início UTC | Término UTC | Duração | Código | Filhos remanescentes | Resultado |
|---|---|---|---:|---:|---:|---|
| `03_npm_ci` | 2026-07-19T22:33:10.060Z | 2026-07-19T22:33:17.030Z | 6.970 s | 0 | 0 | PASS |
| `04_training_audit_git` | 2026-07-19T22:33:17.039Z | 2026-07-19T22:33:17.746Z | 0.707 s | 0 | 0 | PASS |
| `05_validate` | 2026-07-19T22:33:17.748Z | 2026-07-19T22:34:03.662Z | 45.913 s | 0 | 0 | PASS |
| `06a_build_web` | 2026-07-19T22:34:03.665Z | 2026-07-19T22:34:12.293Z | 8.628 s | 0 | 0 | PASS |
| `06b_build_server` | 2026-07-19T22:34:12.295Z | 2026-07-19T22:34:12.753Z | 0.459 s | 0 | 0 | PASS |
| `06c_build_serverless` | 2026-07-19T22:34:12.756Z | 2026-07-19T22:34:13.455Z | 0.699 s | 0 | 0 | PASS |
| `07_smoke_serverless` | 2026-07-19T22:34:13.457Z | 2026-07-19T22:34:14.335Z | 0.878 s | 0 | 0 | PASS |
| `08a_npm_audit` | 2026-07-19T22:34:14.337Z | 2026-07-19T22:34:15.367Z | 1.030 s | 0 | 0 | PASS |
| `08b_npm_audit_prod` | 2026-07-19T22:34:15.369Z | 2026-07-19T22:34:19.566Z | 4.197 s | 0 | 0 | PASS |
| `09_termination_audit` | 2026-07-19T22:34:19.568Z | 2026-07-19T22:34:49.688Z | 30.119 s | 0 | 0 | PASS |
| `10_build` | 2026-07-19T22:34:49.690Z | 2026-07-19T22:35:48.261Z | 58.571 s | 0 | 0 | PASS |

## Durações consolidadas

- Pipeline oficial após `npm ci`, de `training:audit-git` até `npm audit --omit=dev`: **62.527 s**.
- Mesmo pipeline incluindo `npm ci`: **69.506 s**.
- Execução completa registrada, incluindo auditoria explícita e a verificação adicional de `npm run build`: **158.201 s**.

Todos os comandos retornaram código zero e nenhum deixou processos filhos remanescentes. Nenhum timeout foi utilizado como sucesso.
