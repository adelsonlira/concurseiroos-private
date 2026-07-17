# ADR-013 — Catálogo canônico do Knowledge Engine em shadow mode

Status: aceito  
Data: 2026-07-16

## Contexto

O corpus FGV possui documentos oficiais deduplicados, mas ainda não possui extração e revisão confiável no nível da questão. Ligar sinais históricos ao SDE neste estágio criaria falsa precisão.

## Decisão

Criar um domínio canônico independente em `src/core/knowledge/` para concurso, edital, prova, caderno, questão, alternativa, gabarito, alterações, anulações, classificação, fonte e confiança.

Importar apenas metadados oficiais do catálogo para `data/knowledge/`. Material pedagógico permanece fonte de execução e nunca altera incidência. Vínculos prova–edital–gabarito são registrados com confiança e `shadowMode: true`. Mesmo vínculos documentalmente aptos não são conectados ao ranking do SDE.

A deduplicação documental usa o catálogo canônico por SHA-256. A deduplicação de questões usa impressão digital de conteúdo normalizado, mas só produzirá estatísticas depois da extração e revisão.

## Consequências

- O corpus passa a ter contrato auditável e testes de integridade.
- Ausência de questão extraída permanece explícita.
- A ativação futura exigirá nova decisão arquitetural e validação matemática.
