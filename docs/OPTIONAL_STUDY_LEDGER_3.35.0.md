# optionalStudyLedger — v3.35.0

Ledger append-only com eventos:

- `recommendation_generated`;
- `alternatives_requested`;
- `rest_kept`;
- `hidden_for_today`;
- `accepted`;
- `session_started`;
- `session_paused`;
- `session_resumed`;
- `session_completed`;
- `session_interrupted`;
- `result_recorded`.

Todo evento contém `isOptional = true`, `mandatory = false` e `affectsPlanCompliance = false`. O fingerprint usa data local, contexto, fotografia objetiva e versão do mecanismo. Reload sem mudança dos inputs reutiliza a recomendação existente. Pedido explícito de nova sugestão cria um evento controlado.

O ledger integra armazenamento local, backup 2.5.0, restauração, fingerprint de sincronização e reconciliação existente.
