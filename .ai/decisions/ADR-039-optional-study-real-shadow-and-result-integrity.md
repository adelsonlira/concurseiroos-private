# ADR-039 — Shadow real e integridade dos resultados opcionais

**Status:** aceito  
**Data:** 2026-07-19  
**Versão:** 3.35.1

## Contexto

A v3.35.0 identificava uma alternativa do mesmo motor opcional v1 como versão 2.0 e possuía lacunas na proveniência de banca, conclusão teórica, classificação histórica e interrupção.

## Decisão

1. Toda saída opcional identificada como SDE v2 deve nascer de `runSdeV2Decision` por `optionalStudySdeV2ShadowAdapter`.
2. Ausência de suporte produz `v2Decision = null` e fallback explícito.
3. A recomendação v1 é construída sem depender da saída shadow v2.
4. Fonte e banca seguem contratos separados; QConcursos é fonte, nunca banca.
5. Teoria, autopercepção e tempo não promovem conclusão ou mastery automaticamente.
6. Resultados usam classes canônicas de histórico e payload estruturado por método.
7. Interrupções contabilizam apenas tempo efetivo, uma vez, sem evidência negativa.

## Consequências

O ledger anterior permanece append-only. Comparações corrigidas recebem identificador com a versão do motor opcional para não sobrescrever registros antigos. O SDE v1 continua efetivo e o v2 continua sem efeito prescritivo.
