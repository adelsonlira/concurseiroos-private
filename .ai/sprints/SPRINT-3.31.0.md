# Sprint 3.31.0 — Simulados com fontes identificadas

Data: 2026-07-17  
Status: concluída

## Objetivo

Implementar simulados parciais e completos para a DATAPREV 2026 usando somente composição oficial e fontes identificadas, sem gerar questões, alternativas ou gabaritos e sem permitir que o resultado agregado altere silenciosamente o SDE.

## Implementado

- núcleo puro `src/core/simulations/` com blueprint oficial, composição, análise e comparação;
- prova completa com 70 questões, 240 minutos e 115 pontos;
- parcial com cotas oficiais das disciplinas selecionadas e duração proporcional;
- fontes externas identificadas para Qconcursos e Estratégia Questões;
- portão para questões locais: documento de origem, gabarito oficial e item não customizado;
- seleção local determinística, sem `Math.random()`;
- registro de acertos, erros, brancos e tempo por disciplina;
- pontuação oficial, corte global somente no completo e alerta de zero por disciplina;
- plano automático de correção sem cronograma paralelo;
- comparação apenas entre composições equivalentes;
- nova tela `Simulados`, histórico e cronômetro;
- contrato reproduzível em `data/quality/simulation-contract.json`;
- compatibilidade de leitura com simulados antigos.

## Guardrails

- nenhuma questão, alternativa ou resposta é gerada pelo app ou Gemini;
- fonte externa não cria IDs de questões locais;
- simulado parcial não declara atendimento ao corte global;
- resultado agregado não cria classificação por subassunto;
- incidência histórica permanece em shadow mode;
- material privado e Gemini continuam sem autoridade estratégica;
- o plano de correção não altera o ranking do SDE.

## Validação

- 407 testes aprovados em 69 arquivos, incluindo 9 testes novos de simulados;
- TypeScript aprovado;
- auditorias de memória, corpus, taxonomia, curadoria, classificação, roteamento, recuperação de erros, simulados, SDE e prontidão aprovadas;
- builds web, Express e serverless aprovados;
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas;
- smoke HTTP local: `/`, `/api/health`, `/api/runtime-config` e `/api/readiness` com HTTP 200;
- runtime de validação Node.js 22.16.0, abaixo do alvo obrigatório 24.x para produção.
