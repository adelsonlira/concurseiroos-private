# ADR-007 — Memória institucional como contrato de build

## Contexto

O projeto pode ser retomado futuramente por outras IAs. Documentação desatualizada cria risco de decisões incompatíveis com a Constituição, arquitetura e estado real do código.

## Decisão

A versão do aplicativo deve aparecer em `CURRENT_STATE.md` e `DEVELOPMENT_HISTORY.md`. O pipeline valida essa sincronização antes de testes e build.

Cada sprint deve atualizar estado atual, próximos passos, histórico e relatório de sprint.

## Consequências positivas

- retomada mais segura por outra IA;
- menor perda de contexto;
- rastreabilidade de decisões e limitações;
- documentação passa a acompanhar releases.

## Consequências negativas

- fechamento de sprint exige disciplina documental;
- alteração de versão sem memória correspondente bloqueia o pipeline.
