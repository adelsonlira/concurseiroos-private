# ADR-038 — Disponibilidade real e estudo opcional sem obrigação

**Status:** Aceito  
**Data:** 2026-07-19  
**Versão:** 3.35.0

## Decisão

O perfil DATAPREV usa 120 minutos de segunda a sábado e domingo indisponível. Somente o perfil legado exato de 180 minutos é migrado; qualquer personalização bloqueia a migração automática.

O estudo voluntário é representado por `optionalStudyLedger` append-only. Recomendações ignoradas não criam sessão, evidência negativa, atraso ou saldo devido. Uma sessão nasce somente após aceite explícito e, quando realizada, registra apenas tempo e resultados efetivamente produzidos.

O SDE v1 continua efetivo. O SDE v2 produz somente uma alternativa shadow com `affectsPrescription = false`.

## Consequências

- backup passa a 2.5.0;
- sincronização e restauração incluem o novo ledger por migração aditiva;
- nenhuma tentativa sintética é criada;
- tempo não concede domínio sem critério objetivo;
- domingo permanece descanso mesmo quando há atividade real voluntária.
