# Sprint 3.4.0 — Bancos externos e memória institucional

Data: 2026-07-15

## Objetivo

Permitir que o coach prescreva Qconcursos ou Estratégia Questões quando o catálogo local não tiver bateria FGV suficiente e criar memória confiável para continuidade por outras IAs.

## Entregas

- fontes externas registradas no runtime do concurso;
- plano determinístico de fonte de questões;
- filtros de busca prescritos;
- exibição no Dashboard, Sessão Guiada e Coach IA;
- seleção guiada da fonte quando o banco externo é necessário;
- rastreabilidade da plataforma efetivamente usada;
- contexto da IA alinhado à prescrição;
- histórico cumulativo e protocolo de onboarding;
- validação automática da memória da versão.
- preenchimento dos contextos de domínio, UX, grafo e papéis especializados.

## Validação

- 273 testes em 34 arquivos;
- TypeScript aprovado;
- builds web, Express e serverless aprovados;
- smoke test HTTP 200;
- zero vulnerabilidades conhecidas em produção.

## Fora de escopo

- login ou integração por API com plataformas externas;
- importação de enunciados;
- automação de respostas;
- mudança da matemática de priorização.
