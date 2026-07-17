# ADR-018 — Ledger append-only de curadoria

Status: aceito em 2026-07-16

## Contexto

Correções de extração, gabarito, duplicata e classificação não podem sobrescrever silenciosamente o corpus gerado.

## Decisão

Toda decisão de curadoria será registrada como evento imutável com sequência, alvo, autor, data, fontes, justificativa, confiança, patch e hash encadeado. O estado corrente é obtido por replay. O hash é um mecanismo determinístico de integridade e detecção de alteração, não uma assinatura criptográfica de identidade.

## Consequências

- preserva histórico e permite auditoria;
- rejeita eventos incompletos ou fora de ordem;
- facilita reconstrução e rollback lógico;
- exige armazenamento persistente externo antes de curadoria multiusuário.
