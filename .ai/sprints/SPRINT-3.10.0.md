# Sprint 3.10.0 — Confiabilidade da prescrição e do Super Coach

Data: 2026-07-16

## Objetivo

Transformar a decisão validada em uma instrução diária executável, transparente e resistente à falta de recursos.

## Implementado

- contrato de confiabilidade da prescrição;
- prontidão `READY` ou `READY_WITH_FALLBACK` com recurso faltante explícito;
- ressalva automática de shadow mode quando incidência histórica não é usada;
- instrução obrigatória sobre registro e recálculo da próxima ação;
- prévia da sessão seguinte quando já planejada;
- auditoria estrutural da prescrição, duração, passos, objetivos, alvo de questões e consistência de prontidão;
- Dashboard e Sessão Guiada atualizados com prontidão e próxima ação;
- Coach IA recebe confiabilidade, prontidão, evidências de conclusão e próxima ação;
- relatório reproduzível em `data/quality/sde-reliability-report.json` integrado ao pipeline.

## Validação

- 307 testes aprovados em 42 arquivos;
- TypeScript aprovado;
- auditoria DATAPREV aprovada com 117 ações e 49 parâmetros catalogados;
- builds web, Express e serverless aprovados;
- aplicação, `/api/health` e `/api/runtime-config` responderam HTTP 200;
- zero vulnerabilidades conhecidas em dependências de produção.

## Limites mantidos

- incidência FGV continua em shadow mode;
- risco global não participa do ranking;
- pontos por hora não são estimados sem episódios causais reais;
- paridade de runtime requer Node.js 24.x no ambiente de produção.
