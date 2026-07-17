# ADR-015 — Contrato de prontidão da prescrição executável

Data: 2026-07-16
Status: aceito

## Contexto

Uma prioridade correta ainda pode falhar na prática quando falta material, fonte de questões, clareza sobre a confiança ou instrução sobre o que ocorre após o registro.

## Decisão

Toda prescrição executável deve declarar:

- confiabilidade e modo da decisão;
- se incidência histórica foi utilizada;
- dados ausentes e ressalvas;
- prontidão `READY` ou `READY_WITH_FALLBACK`;
- recurso faltante, quando houver;
- evidências a registrar;
- próxima ação após a conclusão e prévia da sessão seguinte quando conhecida.

O Coach IA recebe exatamente o mesmo contrato. A interface não deve ocultar fallback nem representar shadow mode como evidência histórica ativa.

## Consequências

O usuário pode iniciar a sessão com menos decisões operacionais. A prescrição continua executável mesmo quando um recurso não está catalogado, mas o fallback é explícito e auditável.
