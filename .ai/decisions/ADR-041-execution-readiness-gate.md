# ADR-041 — Gate pós-ranking para prescrição executável

**Status:** Aceito  
**Data:** 2026-07-19  
**Versão:** 3.35.3

## Contexto

O SDE v1 podia selecionar corretamente disciplina, assunto e método, mas a última milha da prescrição ainda aceitava ambiente inexistente ou material apenas associado à disciplina. Em produção, interpretação de textos foi apresentada com material de ortografia e NotebookLM de Português não configurado.

## Decisão

- o ranking e a decisão do SDE permanecem intocados;
- um `studyExecutionRegistry` versionado declara capacidades reais por disciplina e assunto;
- o `executionReadinessGate` é aplicado depois do ranking e antes da apresentação ou aceite;
- materiais são aceitos apenas com correspondência exata de subassunto, exata de assunto ou validação explícita de material amplo;
- NotebookLM só é executável quando o notebook, as fontes e as instruções estiverem cadastrados;
- indisponibilidade do método permite trocar apenas o método/ambiente, mantendo o assunto, quando houver caminho válido;
- ausência total de caminho bloqueia o candidato e avança para o próximo candidato executável sem reescrever o ranking;
- toda atividade mostrada possui um `studyExecutionPacket` completo com conteúdo, ambiente, material, páginas, instruções, critério e captura do resultado;
- o mesmo gate atende prescrição obrigatória, domingo opcional, extra após o plano e escolha manual.

## Consequências

Uma prioridade estratégica pode permanecer bloqueada operacionalmente sem desaparecer do ranking. O usuário recebe apenas atividades executáveis. Banco de Dados pode usar o notebook cadastrado; Português e demais disciplinas não podem usar NotebookLM até registro explícito. O SDE v1 continua efetivo e o SDE v2 permanece somente em shadow mode.
