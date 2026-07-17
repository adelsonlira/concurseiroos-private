# ADR-017 — Portões de confiança para vínculo prova–gabarito

Data: 2026-07-16
Status: aceito

## Contexto

Um mesmo PDF de gabarito pode conter diversas áreas, cargos, turnos e tipos de caderno. Vincular apenas por concurso ou quantidade de questões produz falsos positivos e poderia contaminar anuladas, respostas e futura incidência.

## Decisão

O vínculo automático exige combinação conservadora de concurso, quantidade, variante, similaridade de título, status do gabarito e margem sobre o segundo candidato. O resultado é sempre um dos estados:

- `AUTO_LINKED_HIGH_CONFIDENCE`;
- `CANDIDATE_REVIEW_REQUIRED`;
- `AMBIGUOUS_REVIEW_REQUIRED`;
- `UNRESOLVED`;
- `NOT_APPLICABLE`.

Mesmo o vínculo de alta confiança permanece `reviewStatus: PENDING`. Somente ele pode preencher respostas no corpus automático, preservando `definitivo`, `preliminar` e anulação. Nenhum estado habilita incidência histórica.

## Consequências

A cobertura automática é deliberadamente menor que a cobertura possível, mas reduz o risco de atribuir um gabarito incorreto. Casos ambíguos entram em uma fila auditável e agrupada. A DATAPREV 2024 — Desenvolvimento de Software funciona como cenário dourado estrutural: 70 respostas definitivas e questão 13 anulada.
