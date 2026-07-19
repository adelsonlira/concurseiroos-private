# Sprint 3.35.2 — Encerramento Determinístico da Validação

## Objetivo

Eliminar recursos HTTP e processos residuais que podiam impedir o encerramento natural do Vitest e do smoke serverless, sem alterar funcionalidades do produto.

## Entregue

- harness HTTP com rastreamento e fechamento explícito de sockets;
- migração dos testes HTTP do servidor para cliente sem keep-alive;
- teardown determinístico no smoke serverless;
- auditor de saída natural para suíte e smoke;
- diagnóstico `hanging-process` preservado como comando explícito;
- documentação e evidências de duração, códigos de saída e ausência de descendentes.

## Guardrails

- zero `process.exit(0)`;
- watchdog é falha, nunca sucesso;
- 710 testes funcionais preservados;
- somente testes técnicos de encerramento adicionados;
- nenhuma alteração em disponibilidade, estudo opcional, SDE, corpus, Treino FGV ou Diagnóstico Piloto.
