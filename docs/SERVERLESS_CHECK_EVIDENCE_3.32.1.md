# ConcurseiroOS v3.32.1 — Evidência serverless da correção

## Build validado

Foram produzidos:

- `dist/http-app.mjs`;
- `dist/serverless-api/training-fgv/check.js`;
- `dist/serverless-api/training-fgv/finalize.js`.

Os entrypoints compilados carregam o catálogo privado no backend. O catálogo web inicial foi examinado antes da chamada e não continha resposta operacional nem os metadados privados proibidos.

## Smoke funcional mínimo

O script `scripts/smokeFgvTrainingServerless.mjs` executou handlers compilados por HTTP real:

1. carregou o catálogo público com 664 questões;
2. confirmou ausência da resposta operacional antes da conferência;
3. criou tentativa com cinco IDs únicos;
4. selecionou a alternativa A da primeira questão;
5. chamou `POST /api/training-fgv/check`;
6. recebeu HTTP 200 e payload de correção válido;
7. chamou `POST /api/training-fgv/finalize`;
8. recebeu HTTP 200 com cinco questões;
9. confirmou `affectsSde = false` e `countsAsOfficialSimulation = false`.

### Resultado resumido

| Verificação | Resultado |
|---|---|
| Questões públicas | 664 |
| Resposta operacional antes da conferência | ausente |
| Total da tentativa | 5 |
| POST de conferência | HTTP 200 |
| Formato da resposta operacional | válido A–E |
| POST de finalização | HTTP 200 |
| Efeito no SDE | falso |
| Simulado oficial | falso |

A alternativa operacional concreta não é transcrita neste relatório para não transformar evidência de infraestrutura em exposição de gabarito.

## Controles negativos

- `GET /api/training-fgv/check`: HTTP 405;
- tentativa ausente/inválida: rejeitada;
- questão fora da tentativa: rejeitada;
- alternativa inválida: rejeitada;
- catálogo privado no bundle web: não encontrado.
