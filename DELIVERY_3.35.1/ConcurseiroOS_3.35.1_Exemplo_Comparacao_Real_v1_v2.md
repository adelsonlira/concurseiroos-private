# Exemplo — comparação real v1 × v2

Fotografia controlada:

- o v1 recomenda teoria de 30 minutos;
- o adaptador monta o input real do SDE v2 com a mesma fotografia;
- `runSdeV2Decision` devolve um `DecisionRecord` real para diagnóstico curto de 25 minutos;
- a opção v2 recebe `origin = sde_v2_real`, `sdeVersion = 2.0` e o identificador da decisão fonte;
- a interface continua mostrando somente a recomendação v1;
- a divergência é registrada no ledger, com `affectsPrescription = false`.
