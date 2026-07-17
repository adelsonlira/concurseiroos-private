# ADR-021 — Sincronização em três vias e restauração segura do dispositivo

Status: aceito em 2026-07-16

## Contexto

O usuário espera que notebook, celular e tablet recebam automaticamente o progresso mais recente. A política anterior tratava a simples existência de uma cópia remota ou uma revisão remota mais nova como conflito, mesmo quando apenas um lado havia mudado. Além disso, restaurar os dados locais enquanto a conta permanecia conectada poderia enviar o estado inicial para a nuvem.

## Decisão

A sincronização compara três referências: snapshot local atual, fingerprint da última sincronização bem-sucedida e revisão remota.

- dispositivo limpo recebe a nuvem automaticamente;
- alteração somente remota restaura a nuvem automaticamente;
- alteração somente local é enviada automaticamente;
- conflito exige escolha apenas quando local e remoto mudaram desde a mesma base;
- metadados voláteis de exportação não participam do fingerprint;
- restauração inicial é local ao dispositivo: baixa backup, desconecta a conta, preserva a nuvem, redefine metadados de sincronização e remove somente vínculos locais com PDFs.

## Consequências

- reduz interrupções desnecessárias;
- aproxima o comportamento da expectativa de sincronização automática;
- impede que um reset local vazio substitua silenciosamente a nuvem;
- mantém escolha humana somente para divergência verdadeira;
- não implementa merge campo a campo de alterações concorrentes.
