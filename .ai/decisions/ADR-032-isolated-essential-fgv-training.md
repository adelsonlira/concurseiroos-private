# ADR-032 — Treino FGV Essencial isolado

## Status

Aceito na versão 3.32.0.

## Contexto

O usuário precisa praticar questões FGV de Banco de Dados sem transformar desempenho manual em evidência estratégica, mastery, prioridade ou simulado oficial. O banco operacional contém respostas e metadados que não podem ser entregues no payload inicial.

## Decisão

- Criar domínio e persistência próprios para `thematic_fgv`.
- Manter `affectsSde = false` e `countsAsOfficialSimulation = false` em tentativas ativas e finalizadas.
- Derivar catálogo público reproduzível somente com conteúdo necessário à interface.
- Manter resposta operacional e rastreabilidade privada no backend.
- Liberar correção apenas por ação explícita `Conferir resposta` ou pela finalização.
- Usar rotas independentes `landing`, `active_training` e `finalized_training`.
- Selecionar por filtros e seed, sem frequência histórica.

## Consequências

- O treino não altera o store principal nem os motores estratégicos.
- A correção depende de rede e autenticação, enquanto a tentativa ativa permanece local.
- Histórico e tentativa não sincronizam entre dispositivos nesta versão.
- Recursos históricos avançados ficam adiados para versão posterior.
