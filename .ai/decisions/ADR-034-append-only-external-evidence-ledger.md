# ADR-034 — Ledger append-only de evidências externas

## Status

Aceito em 2026-07-18 para a versão 3.33.0.

## Contexto

A tela legada de registro externo gravava tentativas individuais e baterias em estruturas que podiam alimentar estatísticas, revisões e decisões existentes. Resultados externos agregados, como uma bateria de 20 questões no QConcursos, não possuem identidade, ordem, tempo ou causa por questão suficientes para serem convertidos com segurança em vinte tentativas sintéticas.

O produto precisa preservar esses resultados para uso futuro pelo SDE v2, sem alterar o algoritmo atual e sem perder compatibilidade com registros legados, backup ou sincronização.

## Decisão

Adicionar `externalEvidenceLedger` ao store e ao schema de backup como coleção append-only versionada. Uma bateria agregada produz exatamente um evento. Correções e anulações são novos eventos que referenciam registros anteriores; nenhum evento é editado ou fisicamente excluído pelo fluxo comum.

Todo evento novo recebe `decisionStatus = shadow`, `affectsSde = false` e metadados derivados de qualidade determinísticos. O ledger é persistido e sincronizado pela infraestrutura já existente, sem nuvem paralela. O recurso reutiliza a tela e a rota de registro, renomeadas para `Registrar resultado`, mantendo aliases de compatibilidade.

## Consequências

- Evidências agregadas preservam apenas o que foi realmente informado.
- Tentativas legadas continuam intactas e com o comportamento histórico.
- Backup e sincronização passam a transportar os IDs e relações append-only.
- Resumos descritivos consideram somente a cadeia ativa: eventos anulados são ignorados e substituições prevalecem sobre o original.
- O SDE atual não consulta o ledger; sua eventual elegibilidade dependerá de uma decisão arquitetural futura.
- Correções dependem de referência a um evento ativo anterior, e a validação de backup exige relações apenas com eventos precedentes.
