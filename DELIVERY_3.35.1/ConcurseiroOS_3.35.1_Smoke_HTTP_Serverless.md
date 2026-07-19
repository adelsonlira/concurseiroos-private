# ConcurseiroOS v3.35.1 — Smoke HTTP e serverless

## HTTP compilado

Servidor: `dist/server.cjs`, Node.js 24.18.0.

| Verificação | Status HTTP | Resultado |
|---|---:|---|
| `/` | 200 | PASS |
| `/api/runtime-config` | 200 | PASS |
| `GET /api/training-fgv/check` | 405 | PASS — correção exige POST explícito |

## Serverless funcional

O smoke executou uma tentativa real mínima do Treino FGV:

1. carregou o catálogo público;
2. selecionou cinco questões;
3. confirmou ausência do gabarito no payload inicial;
4. chamou `POST /api/training-fgv/check`;
5. recebeu HTTP 200 e resposta operacional válida;
6. chamou `POST /api/training-fgv/finalize`;
7. recebeu HTTP 200 com `affectsSde = false` e `countsAsOfficialSimulation = false`.

## Auditoria de dependências

- `npm audit`: 0 vulnerabilidades;
- `npm audit --omit=dev`: 0 vulnerabilidades.
