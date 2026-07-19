# Sprint 3.34.1 — Calibração do SDE v2 em Shadow Mode

**Data:** 2026-07-19  
**Linha de base:** 3.34.0

## Escopo entregue

- SDE v1 restaurado como decisão efetiva e única prescrição exibida.
- SDE v2 executado em paralelo com os mesmos inputs objetivos.
- `executionMode = shadow` e `affectsPrescription = false` registrados.
- Comparação tipada de disciplina, assunto, subassunto, método, duração, critério de avanço, pré-requisito e score.
- `sdeCalibrationLedger` append-only, persistido, sincronizado e incluído no backup.
- Fingerprint determinístico para impedir duplicação por reload sem mudança de inputs.
- Área de auditoria recolhida sem segunda prescrição concorrente.
- Relatório de critérios futuros de promoção, sem ativação automática.

## Guardrails

- adaptador, pesos, grafo e score do SDE v2 preservados;
- SDE v1 não reescrito;
- incidência histórica continua com peso decisório zero;
- evidências não são copiadas ou transformadas em tentativas sintéticas;
- nenhum efeito em prioridade, sessão, roadmap, mastery ou revisão;
- Treino FGV, Diagnóstico Piloto, simulados, backup e sincronização preservados.
