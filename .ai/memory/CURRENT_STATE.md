# Estado Atual

Data: 2026-07-18
Versão: 3.32.0

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Deve reduzir fadiga decisória, entregar uma sessão executável e recalcular a próxima ação com evidências reais. Nenhum módulo promete aprovação, inventa incidência ou converte ausência de dados em certeza.

## Fase atual

A versão 3.32.0 entrega o **Treino FGV Essencial** como fluxo manual, experimental e isolado para questões FGV de Banco de Dados. A fonte exclusiva é `CUR-BD-BANCO-OPERACIONAL-FGV-DATAPREV-v2`; o catálogo público derivado contém 664 questões elegíveis calculadas a partir dos 797 registros e usa 301 assets íntegros.

A correção de navegação do diagnóstico piloto da 3.31.4 permanece preservada. Diagnóstico e Treino FGV usam domínios, rotas e persistências independentes.

## Implementado

- SDE puro, determinístico, explicável e independente da interface, sem alteração nesta versão.
- Treino FGV com estados explícitos:
  - `landing` em `#/treino-fgv`;
  - `active_training` em `#/treino-fgv/tentativa`;
  - `finalized_training` em `#/treino-fgv/resultado/:attemptId`.
- Menu `Treino FGV` sempre abre a landing, sem abrir automaticamente tentativa ou resultado.
- Filtros por `selection_area`, item primário do edital, aderência e quantidade 5/10/15/20.
- Seleção aleatória sem repetição, com seed, ordem imutável e filtros persistidos.
- Conferência segura por POST, sem gabarito no catálogo público ou payload inicial.
- Questões conferidas ficam bloqueadas; não conferidas continuam editáveis.
- Retomada após F5 com posição, respostas, conferências, revisão, cronômetro, seed e ordem.
- Cancelamento remove somente o treino ativo e não cria histórico.
- Finalização aceita brancos e gera resultado por área, item primário e aderência.
- Histórico local essencial, append-only e imutável.
- Marcadores obrigatórios em tentativas: `trainingType: thematic_fgv`, `affectsSde: false` e `countsAsOfficialSimulation: false`.
- Fonte operacional preservada sem modificação, catálogo derivado reproduzível e manifestado.

## Validado

- 797 registros de origem preservados.
- 664 questões elegíveis calculadas pelos critérios operacionais; referência duplicada 648 e 11 irrecuperáveis excluídas.
- 301 assets validados por hash e tamanho contra o manifesto.
- Catálogo público sem resposta operacional, origem do gabarito, ordinal do corpus, ID da plataforma ou fingerprints privados.
- Diagnóstico piloto continua com 24 questões, seis assets, navegação corrigida e persistência própria.
- Store principal, SDE, mastery, prioridades, sessões e simulados oficiais permanecem inalterados.
- Testes focados do Treino FGV e endpoints aprovados antes da regressão integral.

## Problemas conhecidos

- Treinos são armazenados localmente e não sincronizam entre dispositivos nesta versão.
- A conferência e a finalização dependem do endpoint autenticado; indisponibilidade de rede preserva a tentativa ativa para nova tentativa.
- Não há filtro de questões não vistas, erradas anteriormente, estatísticas acumuladas complexas ou recomendações; esses recursos estão reservados para versão futura.
- A origem operacional preserva classificações históricas; `selection_area` é agrupamento derivado e reproduzível para navegação e relatório, sem alterar a curadoria fonte.
- Dados locais gerais ainda não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- O runtime-alvo é Node.js 24.x; o ambiente automatizado disponível executa Node 22.x.
- O probe Gemini precisa ser reconfirmado no runtime real da Vercel.
- Nenhum software ou plano garante aprovação.

## Próxima tarefa

Publicar a 3.32.0 e validar em produção: landing pelo menu, filtros, início, conferência, bloqueio, F5, cancelamento, finalização, histórico, resultado específico e disponibilidade dos 301 assets. Não iniciar a 3.32.1 sem ordem da Control Tower.
