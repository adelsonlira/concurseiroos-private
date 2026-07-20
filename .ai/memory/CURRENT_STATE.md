# Estado Atual

Data: 2026-07-19
Versão: 3.35.3

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

## Fase atual

A versão 3.35.3 fecha a última milha da prescrição. O SDE v1 continua determinando o ranking e a prioridade; um gate pós-ranking impede que ambiente inexistente, material incompatível ou instrução incompleta sejam apresentados como atividade pronta.

## Implementado

- `studyExecutionRegistry` versionado com notebooks, fontes, ambientes, política de material e rotas de captura;
- Banco de Dados como `READY_WITH_FGV_EVIDENCE` no notebook cadastrado;
- Português e demais disciplinas como `NOT_CONFIGURED` para NotebookLM, salvo cadastro explícito futuro;
- correspondência semântica e taxonômica entre assunto, subassunto e material;
- `executionReadinessGate` aplicado à prescrição obrigatória, estudo opcional, extra após plano e escolha manual;
- fallback de método/ambiente sem alterar o ranking;
- bloqueio auditável e avanço ao próximo candidato executável quando não existe caminho;
- `studyExecutionPacket` com conteúdo, ambiente, material, páginas, instruções, prompt, critério e retorno;
- prompt NotebookLM específico, fontes ativas/desativadas e limites de afirmações sobre a FGV;
- filtros estruturados do QConcursos sem confundir origem com banca;
- interface com linguagem compreensível, cópia de prompt e atalho para registrar resultado.

## Validado

- bloqueio de Noções Iniciais de Ortografia para interpretação de textos;
- ausência de NotebookLM em Português;
- uso válido do NotebookLM em Banco de Dados;
- preferência por material exato e rejeição de material amplo não validado;
- fallback para material interno e próximo candidato executável;
- pacote completo e retorno por método;
- preservação do SDE v1, shadow do SDE v2, disponibilidade de 120 minutos e domingo de descanso.

## Problemas conhecidos

- somente Banco de Dados possui NotebookLM aprovado no registro inicial;
- URLs de notebooks não são inventadas e permanecem ausentes até cadastro explícito;
- materiais amplos de disciplina continuam bloqueados até validação humana de utilidade temática;
- o aviso não bloqueante de tamanho do chunk web permanece;
- nenhum sistema garante aprovação.

## Preservado

Pesos, ranking, grafo, regras duras, estado de conhecimento, mastery, incidência histórica, SDE v1 efetivo, SDE v2 shadow real, disponibilidade de 120 minutos, estudo opcional, `optionalStudyLedger`, backup 2.5.0, corpus, taxonomia, Treino FGV, Diagnóstico Piloto, simulados e dados canônicos.

## Próxima tarefa

Publicar a v3.35.3 e executar o roteiro de smoke funcional de domingo e segunda-feira no domínio real, cadastrando novos notebooks somente após confirmação explícita de nome, fontes e cobertura.
