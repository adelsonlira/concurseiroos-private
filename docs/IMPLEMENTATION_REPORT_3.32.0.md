# Relatório de implementação — ConcurseiroOS 3.32.0

## Escopo

Implementação do **Treino FGV Essencial** como fluxo manual, temático e isolado para questões FGV de Banco de Dados. A baseline de código foi a v3.31.4 e a fonte exclusiva de questões foi `CUR-BD-BANCO-OPERACIONAL-FGV-DATAPREV-v2`.

## Importação reproduzível

- 797 registros JSONL preservados sem alteração.
- 301 assets operacionais preservados e validados por hash e tamanho.
- Catálogo derivado calculado pelos dados, sem quantidade elegível hardcoded.
- 664 questões elegíveis.
- 133 registros excluídos por uma ou mais regras operacionais.
- 1 referência duplicada excluída do catálogo: ordinal 648.
- 11 questões irrecuperáveis excluídas: 198, 236, 394, 423, 509, 660, 669, 690, 695, 752 e 753.
- Catálogos público e privado versionados e reproduzíveis.

Os motivos de exclusão podem se sobrepor; por isso, a soma das contagens por motivo não representa a quantidade de registros únicos excluídos.

## Segurança das respostas

O catálogo público contém somente identificador interno, enunciado, alternativas, assets relativos, `selection_area`, item primário e aderência. Resposta operacional, origem do gabarito, ordinal, ID da plataforma e rastreabilidade privada permanecem no backend.

A correção é obtida exclusivamente após `POST /api/training-fgv/check`. O endpoint por `GET` retorna 405. A finalização segura usa `POST /api/training-fgv/finalize`.

O módulo privado do servidor é carregado de forma tardia somente quando os endpoints do treino são acionados, preservando os entrypoints de runtime e evitando carregar o catálogo privado em rotas não relacionadas.

## Fluxo e navegação

Foram implementados estados explícitos e separados:

- `landing` — `#/treino-fgv`;
- `active_training` — `#/treino-fgv/tentativa`;
- `finalized_training` — `#/treino-fgv/resultado/:attemptId`.

O item lateral sempre abre a landing. Tentativa ativa e resultado finalizado são abertos somente por ação explícita, pós-finalização ou recarregamento da rota correspondente. O padrão preserva a correção de navegação do Diagnóstico Piloto da v3.31.4.

## Funcionalidades entregues

- filtros por `selection_area`, item primário e aderência;
- quantidades 5, 10, 15 e 20, com redução informada quando o conjunto filtrado for menor;
- seleção aleatória sem repetição, com seed, ordem e filtros persistidos;
- início, retomada após F5, cancelamento sem histórico e finalização com brancos;
- navegação anterior/próxima e marcação para revisão;
- conferência segura por questão;
- bloqueio de alteração após conferência;
- resultado por área, item primário e aderência;
- correção final e histórico básico imutável.

## Isolamento

Toda tentativa registra:

- `trainingType = thematic_fgv`;
- `affectsSde = false`;
- `countsAsOfficialSimulation = false`.

O Treino FGV possui domínio e persistência próprios. Não atualiza SDE, mastery, prioridades, roadmap, sessões planejadas, simulados oficiais, diagnóstico piloto, incidência histórica ou store principal.

## Arquivos centrais

- `src/features/fgvTraining/` — catálogo, engine, persistência, store, navegação, API e testes;
- `src/components/FgvTrainingView.tsx` — interface do treino;
- `src/server/training/fgvTrainingServer.ts` — correção e finalização privadas;
- `data/training-fgv/source/` — fonte operacional preservada;
- `data/training-fgv/derived/` — relatório e manifesto derivados;
- `static/fgv-training/assets/` — 301 assets de produção;
- `scripts/buildFgvTrainingCatalog.mjs` — geração reproduzível;
- `scripts/validateFgvTrainingCatalog.mjs` — auditoria de origem e catálogo;
- `scripts/validateBuiltFgvTrainingAssets.mjs` — auditoria pós-build.
