# Sprint 3.30.0 — Correção de erros com evidência

## Objetivo

Fechar o ciclo erro → causa confirmada → correção → nova tentativa → recuperação provisória → estabilização, sem inferir causa nem alterar o ranking estratégico.

## Implementado

- Casos append-only de recuperação por subassunto.
- Sete protocolos operacionais específicos para causas declaradas.
- Correção e regra preventiva obrigatórias antes de validar recuperação.
- Acerto independente definido como sem consulta e com confiança média ou alta.
- Duas verificações independentes para estabilização provisória.
- Reabertura automática após erro posterior.
- Bateria agregada tratada como um único episódio de verificação.
- Migração conservadora de erros legados.
- Persistência local, backup 2.1 e sincronização do novo estado.
- Painel operacional no Caderno de Erros e na revisão prioritária.
- Coach recebe status de recuperação sem receber o texto privado da correção.
- Auditoria reproduzível `error-recovery-contract.json`.

## Guardrails

- A causa é sempre confirmada pelo estudante.
- Consulta ou confiança baixa não confirma recuperação.
- Correção textual não é validada semanticamente pela IA.
- Duas verificações não significam domínio permanente.
- Nenhum parâmetro estratégico do SDE foi alterado.
- Incidência histórica permanece fora do ranking.

## Validação

- Contrato com sete causas e dois episódios independentes auditado.
- Testes de abertura, correção, verificação, reabertura, migração e integração com o store.
- Pipeline completo, TypeScript, builds e segurança executados na entrega.
