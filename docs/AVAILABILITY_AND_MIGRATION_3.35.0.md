# Disponibilidade e migração — v3.35.0

## Configuração canônica

- valor anterior: 180 minutos por dia ativo;
- valor novo: 120 minutos;
- segunda a sábado: 120 minutos;
- domingo: indisponível;
- total semanal: 720 minutos;
- fuso: `America/Fortaleza`;
- pausas incluídas.

`disponibilidadeEstudo` é a fonte de verdade. `metaHorariaDiariaMinutos` permanece resumo de compatibilidade.

## Migração conservadora

A migração só ocorre quando o perfil corresponde exatamente ao padrão legado: domingo zero, segunda a sábado ativos com 180 minutos, resumo 180, fuso Fortaleza, pausas incluídas e nenhum override. Qualquer divergência é tratada como personalização e preservada.

A operação é determinística e idempotente. Backups migrados recebem `LEGACY_DEFAULT_AVAILABILITY_MIGRATED_180_TO_120`. O formato do backup é `2.5.0`.
