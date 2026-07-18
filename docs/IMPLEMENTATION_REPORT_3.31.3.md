# Relatório de Implementação — ConcurseiroOS 3.31.3

**Data:** 18/07/2026  
**Baseline:** ConcurseiroOS 3.31.2  
**Ordem:** integração do `DIAGNÓSTICO PILOTO FGV–DATAPREV — BANCO DE DADOS — v1`

## Resumo

A versão 3.31.3 adiciona um fluxo experimental isolado para o diagnóstico `diag-fgv-dataprev-bd-v1`, com 24 questões em ordem fixa e duração sugerida de 50 minutos. A integração não reutiliza as estruturas de questões, tentativas, mastery, SDE, roadmap, prescrição, sessões ou simulados oficiais.

O banco operacional recebido foi utilizado somente para confirmar o checksum declarado no manifesto. Nenhum arquivo do banco operacional foi incorporado ou alterado.

## Entradas

- Baseline completa 3.31.2.
- `CUR-BD-DIAGNOSTICO-PILOTO-v1-IMPORT.json`.
- Seis assets PNG.
- Manifesto e relatório de validação do piloto.
- PDF e HTML do candidato, mantidos somente em `docs/reference/`.
- Banco operacional v2, usado apenas para confirmação de integridade.

## Arquitetura implementada

### Catálogo público

`src/features/pilotDiagnostic/data/diagnosticPublicCatalog.json` contém somente:

- posição;
- identificador técnico da questão;
- enunciado;
- alternativas A–E;
- referências relativas dos assets.

O catálogo público não contém gabarito, rastreabilidade fonte, ordinal, ID de plataforma, origem do gabarito, assunto, subassunto ou item do edital.

### Correção no backend

`src/server/diagnostics/pilotDiagnosticServer.ts` carrega o import interno fora do bundle web e:

- valida 24 questões e ordem fixa;
- rejeita caminhos absolutos ou traversal;
- confirma seis assets e controles 14/53;
- corrige somente após POST explícito;
- calcula acertos, erros, brancos, percentual e duração;
- agrega exclusivamente por `question.traceability.selection_area`;
- separa 20 aderentes diretas e 4 parciais sem ajustar a nota;
- gera fingerprint SHA-256 para rastreabilidade dos 24 registros.

### Persistência isolada

A tentativa ativa e os resultados finalizados usam chaves exclusivas de `localStorage`:

- `concurseiroos.diagnostics.diag-fgv-dataprev-bd-v1.active.v1`;
- `concurseiroos.diagnostics.diag-fgv-dataprev-bd-v1.finalized.v1`.

Essas estruturas não integram o store principal nem o backup que alimenta mastery, SDE, roadmap, prescrição diária, histórico de simulados ou sessões.

### Imutabilidade e cancelamento

- Uma segunda tentativa é rejeitada enquanto outra estiver ativa.
- Cancelamento remove somente a tentativa ativa e não registra resultado.
- Resultado finalizado é append-only e não pode ser sobrescrito pelo mesmo `attemptId`.
- Tentativas ativas e finalizadas contêm `affectsSde: false`.

### Interface

Nova tela `Diagnóstico piloto` com:

- posição 1–24;
- enunciados e alternativas;
- seis assets;
- navegação anterior/próxima;
- mapa das questões;
- estados respondida, não respondida e marcada para revisão;
- resumo de respondidas e brancos antes do envio;
- confirmação explícita de encerramento;
- resultado total, tempo, áreas, cobertura e correção operacional;
- nenhuma explicação por IA.

## Arquivos principais

- `src/components/PilotDiagnosticView.tsx`
- `src/features/pilotDiagnostic/types.ts`
- `src/features/pilotDiagnostic/catalog.ts`
- `src/features/pilotDiagnostic/assetRegistry.ts`
- `src/features/pilotDiagnostic/engine.ts`
- `src/features/pilotDiagnostic/storage.ts`
- `src/features/pilotDiagnostic/store.ts`
- `src/features/pilotDiagnostic/api.ts`
- `src/server/diagnostics/pilotDiagnosticServer.ts`
- `api/diagnostic-finalize.ts`
- `scripts/validatePilotDiagnostic.mjs`
- `scripts/validateBuiltDiagnosticAssets.mjs`
- `data/diagnostics/diag-fgv-dataprev-bd-v1/`
- `docs/reference/diagnostics/diag-fgv-dataprev-bd-v1/`

## Guardrails preservados

- SDE sem alteração.
- Mastery sem alteração.
- Prioridades sem alteração.
- Banco operacional sem alteração.
- Incidência histórica em shadow mode.
- Materiais privados sem poder estratégico.
- Gemini sem poder de alterar plano ou criar cronograma paralelo.
- Simulados oficiais e sessões planejadas sem alteração.

## Fora do escopo

- Explicações por IA.
- Plano de estudo automático.
- Cronograma paralelo.
- Segundo diagnóstico.
- Sincronização em nuvem das tentativas diagnósticas.
- Reclassificação temática ou alteração do gabarito.
