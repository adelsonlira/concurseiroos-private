# Sprint 3.18.0 — Super Coach operacional

Data: 2026-07-16
Status: concluída

## Objetivo

Super Coach operacional com contratos determinísticos, auditáveis e subordinados ao objetivo de orientar o estudo sem fabricar evidência.

## Implementado

- comando único para iniciar, retomar, recuperar, usar fallback ou aguardar.
- CTA e instrução derivados da prescrição.
- Dashboard alinhado ao mesmo contrato.

## Validado

- TypeScript e testes específicos da camada.
- Integração ao pipeline da versão 3.21.0 quando aplicável.
- Separação entre evidência oficial, material pedagógico, proposta automática e revisão humana.

## Limites preservados

- decisionRequiredFromStudent permanece falso para decisões operacionais.
