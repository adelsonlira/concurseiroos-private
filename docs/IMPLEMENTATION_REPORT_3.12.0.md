# ConcurseiroOS 3.12.0 — Corpus oficial FGV auditável

Data: 2026-07-16

## Escopo

Implementação das Sprints 3.11.0 e 3.12.0 para individualizar questões oficiais, interpretar gabaritos, preservar anuladas, deduplicar o corpus e criar portões de revisão. O SDE e sua ordenação não foram conectados aos novos sinais.

## Entregas principais

- `scripts/official_fgv_extraction_core.py`: núcleo estável de leitura de layout PDF;
- `scripts/buildOfficialFgvCorpus.py`: pipeline canônico e determinístico;
- `scripts/validateOfficialFgvCorpus.mjs`: auditoria streaming integrada ao `npm run validate`;
- `scripts/requirements-knowledge.txt`: versões reprodutíveis de PyMuPDF e RapidFuzz;
- `src/core/knowledge/officialCorpus.ts`: contrato de domínio e prontidão;
- `data/knowledge/official-*`: manifesto, seções de gabarito, corpus, fila e qualidade;
- ADRs 016 e 017, protocolo de revisão e memória institucional atualizada;
- configuração DATAPREV de gabaritos e prontidão migrada para `official-corpus-quality.json`;
- remoção de enunciados integrais e caminhos temporários dos derivados legados.

## Resultado

Foram extraídas 6.462 questões de 93 provas objetivas ou mistas. O parser interpretou 1.344 seções em 48 gabaritos. Quarenta e quatro provas receberam vínculo automático de alta confiança, resultando em 2.840 respostas definitivas ligadas. A deduplicação produziu 5.324 questões canônicas e 646 tarefas agrupadas de revisão.

## Segurança decisória

- incidência histórica não entra no SDE;
- alta confiança automática não é apresentada como validação humana;
- materiais pedagógicos não participam da incidência;
- extrações incompletas permanecem incompletas;
- o pipeline bloqueia proveniência inválida, conteúdo integral e escape do shadow mode.

## Validação final

- 312 testes aprovados em 43 arquivos;
- TypeScript aprovado;
- builds web, Express e serverless aprovados;
- SDE auditado com 117 ações e 49 parâmetros;
- `npm audit --omit=dev` sem vulnerabilidades conhecidas;
- aplicação e endpoints públicos responderam HTTP 200;
- extração oficial repetida com hashes idênticos.

## Pendências

- revisar fila de 646 itens;
- resolver a extração parcial do TJBA 2014;
- classificar questões no edital de origem;
- mapear equivalências com DATAPREV 2026;
- validar o pipeline no runtime Node.js 24.x e no ambiente real autenticado.
