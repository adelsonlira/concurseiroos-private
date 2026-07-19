# ADR-036 — SDE v2 explicável orientado por evidências

## Status

Aceito em 2026-07-19 para a versão 3.34.0.

## Contexto

O SDE v1 não consumia lotes agregados do ledger e não possuía grafo de pré-requisitos, distribuição hierárquica explícita de peso nem ledger persistente de decisões. O produto precisava evoluir sem apagar decisões anteriores, fabricar tentativas ou permitir que IA substituísse o motor determinístico.

## Decisão

Adicionar um SDE v2 puro e configurável que normaliza evidências reais, calcula estado de conhecimento, distribui pesos oficiais, aplica grafo versionado, regras duras, score 0–100 e seleção explícita do método. Toda decisão v2 gera registro append-only. O SDE v1 permanece disponível e é usado quando os portões do v2 falham.

Eventos objetivos novos do `externalEvidenceLedger` podem ser elegíveis após validação determinística. Registros antigos não são promovidos. Observações livres, Treino FGV e Diagnóstico Piloto não alteram o score. A incidência histórica é calculada somente em shadow mode com peso zero.

## Consequências

- decisões passam a indicar assunto, método, sequência, material, critério de avanço e plano reduzido;
- divergências v1 × v2 são registradas;
- backup e sincronização incluem `sdeDecisionLedger` por migração aditiva;
- IA pode explicar o registro determinístico, mas não reescrevê-lo;
- novas relações e coeficientes exigem mudança versionada e regressão.
