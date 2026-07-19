# Exemplo — fallback explícito do SDE v2

```json
{
  "decisionContext": "optional_study",
  "activeSdeVersion": "v1",
  "executionMode": "shadow",
  "affectsPrescription": false,
  "v2Decision": null,
  "fallbackUsed": true,
  "fallbackReason": "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2"
}
```

A recomendação do v1 permanece a única exibida e executada.
