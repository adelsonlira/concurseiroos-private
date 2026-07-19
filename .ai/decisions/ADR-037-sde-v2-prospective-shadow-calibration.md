# ADR-037 — Calibração prospectiva do SDE v2 em shadow mode

## Status

Aceito em 2026-07-19 para a versão 3.34.1.

## Contexto

O SDE v2 da versão 3.34.0 implementou o novo adaptador de evidências, pesos hierárquicos, grafo, regras duras, score e método explicável. Esses componentes ainda não possuem série prospectiva suficiente com resultados reais do usuário para substituir a prescrição consolidada do SDE v1.

## Decisão

Manter `activeSdeVersion = v1`. Para cada decisão real, executar o SDE v2 em paralelo com `executionMode = shadow` e `affectsPrescription = false`, usando a mesma fotografia objetiva. Entregar somente a prescrição do v1 e registrar a comparação v1 × v2 em `sdeCalibrationLedger` append-only.

A comparação registra divergências de disciplina, assunto, subassunto, método, duração, critério de avanço, pré-requisito e score, além de fallback, evidências e incidência histórica shadow. Um fingerprint determinístico impede duplicação por recarregamento sem mudança de inputs.

## Consequências

- o SDE v2 é observado sem risco de alterar a orientação atual;
- o SDE v1 permanece a única fonte da prescrição exibida e executada;
- pesos, grafo, score e adaptador v2 não são modificados;
- backup e sincronização recebem o ledger por migração aditiva;
- promoção futura exige decisão humana e relatório prospectivo; nenhum limiar promove automaticamente o v2.
