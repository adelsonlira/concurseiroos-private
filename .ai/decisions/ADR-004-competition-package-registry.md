# ADR-004 — Registro de Pacotes de Concurso

Data: 2026-07-15
Status: ACEITO

## Contexto

A DATAPREV 2026 — Perfil 3 é o alvo atual, mas o núcleo do ConcurseiroOS deve ser reutilizável em futuros concursos. Imports diretos do pacote DATAPREV no store, SDE, roadmap, Coach e componentes tornariam cada troca de alvo uma refatoração transversal.

## Decisão

Criar um `CompetitionRuntimeDefinition` registrado em `src/config/concursos/registry.ts`.

Cada pacote instalado fornece:

- configuração oficial e políticas do SDE;
- construtor do seed da aplicação;
- catálogo privado de materiais;
- identidade operacional do Coach.

Consumidores passam a resolver o pacote por `concursoAlvoId`. O pacote DATAPREV continua específico, mas o store, o adaptador decisório, o roadmap, o Coach e a UI deixam de importá-lo diretamente.

## Consequências positivas

- adicionar um concurso exige registrar um novo pacote, sem reescrever o SDE;
- evidências, pesos e regras permanecem isolados por concurso;
- materiais são roteados pelo concurso ativo;
- concursos importados sem pacote decisório não são tratados como se possuíssem inteligência validada.

## Consequências negativas

- ainda será necessário construir e validar um pacote para cada novo edital;
- a migração cognitiva entre taxonomias de concursos futuros exigirá um módulo explícito de equivalência;
- o seletor visual de pacotes será implementado somente quando houver um segundo pacote real.
