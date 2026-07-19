# Shadow real do estudo opcional — v3.35.1

## Regra

A recomendação exibida continua sendo produzida pelo SDE v1 ou pela camada opcional determinística subordinada à decisão válida do v1.

O `optionalStudySdeV2ShadowAdapter` recebe uma entrada do núcleo SDE v2 construída a partir da mesma fotografia do store: data, disponibilidade opcional, evidências, sessões, revisões, taxonomia, materiais, decisões recentes e sinais históricos aprovados. O adaptador chama o motor real `runSdeV2Decision`; não lê nem reaproveita a lista de alternativas v1.

Uma opção só recebe:

```text
origin = sde_v2_real
sdeVersion = 2.0
```

quando existe `DecisionRecord` real do SDE v2, saída `SUCCESS`, score finito e material executável.

## Fallback

Quando o contexto não pode ser preparado ou o SDE v2 não produz saída opcional utilizável:

```text
v2Decision = null
fallbackUsed = true
fallbackReason = OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2
```

Saídas inválidas usam razões explícitas `SDE_V2_OUTPUT_INVALID` ou `SDE_V2_OUTPUT_UNAVAILABLE`.

## Isolamento

A opção v2:

- não integra a lista exibida de recomendação principal e alternativas;
- não altera assunto, método, duração ou material do v1;
- não cria sessão;
- não altera plano, prioridade, mastery ou revisões;
- é registrada apenas no `sdeCalibrationLedger`, com `decisionContext = optional_study`, `activeSdeVersion = v1`, `executionMode = shadow` e `affectsPrescription = false`.

A incidência histórica permanece com `decisionWeight = 0`.
