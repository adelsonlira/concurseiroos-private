# Sprint 3.35.3 — Prescrição Executável e Gate de Ambientes

## Objetivo

Fechar a última milha entre a prioridade determinada pelo Coach e uma atividade realmente executável, sem alterar ranking, pesos, grafo, mastery ou motores do SDE.

## Entregue

- `studyExecutionRegistry` versionado;
- Banco de Dados registrado como `READY_WITH_FGV_EVIDENCE` no notebook `DATAPREV 2026 — Banco de Dados — Tutor FGV`;
- Português e demais disciplinas em `NOT_CONFIGURED`, salvo ambiente explicitamente disponível;
- correspondência assunto × material com bloqueio de incompatibilidade;
- `executionReadinessGate` pós-ranking;
- fallback de método/ambiente sem reescrever o ranking;
- avanço para o próximo candidato executável quando não existe caminho;
- `studyExecutionPacket` completo para obrigatório, domingo, extra e escolha manual;
- prompt operacional específico do NotebookLM;
- filtros estruturados do QConcursos, sem tratar origem como banca;
- interface com linguagem legível, prompt copiável e retorno para registro.

## Guardrails

- SDE v1 permanece efetivo;
- SDE v2 permanece em shadow e sem efeito prescritivo;
- incidência histórica continua com peso zero;
- disponibilidade permanece em 120 minutos;
- backup permanece em 2.5.0;
- corpus, taxonomia, Treino FGV, Diagnóstico Piloto e simulados não são alterados.
