# Sprint 3.13.0 — Curadoria auditável

Data: 2026-07-16
Status: concluída

## Objetivo

Curadoria auditável com contratos determinísticos, auditáveis e subordinados ao objetivo de orientar o estudo sem fabricar evidência.

## Implementado

- ledger append-only com replay e integridade.
- fila de revisão agrupada e priorizada por proximidade com DATAPREV.
- estados explícitos de aprovação, correção, rejeição e evidência insuficiente.

## Validado

- TypeScript e testes específicos da camada.
- Integração ao pipeline da versão 3.21.0 quando aplicável.
- Separação entre evidência oficial, material pedagógico, proposta automática e revisão humana.

## Limites preservados

- nenhum evento automático é tratado como revisão humana.
