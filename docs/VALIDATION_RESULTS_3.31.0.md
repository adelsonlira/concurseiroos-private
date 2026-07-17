# Resultados de validação — ConcurseiroOS 3.31.0

Data: 2026-07-17

## Resultado executivo

A versão 3.31.0 foi validada sobre a linha de base 3.30.0. O pipeline integral, os três builds, a auditoria de dependências e o smoke HTTP foram aprovados. A única divergência do ambiente de entrega é o Node.js 22.16.0; o alvo declarado e recomendado para produção permanece Node.js 24.x.

## Linha de base anterior

Antes da implementação:

- `npm ci`: concluído;
- `npm run validate` na 3.30.0: 398 testes aprovados em 67 arquivos;
- TypeScript, memória, corpus, taxonomia, roteamento, recuperação de erros, SDE e prontidão: aprovados.

## Pipeline 3.31.0

`npm run validate` concluiu com:

- memória institucional sincronizada com 3.31.0;
- corpus oficial: 95 provas, 6.462 questões e 646 grupos na fila de revisão;
- Knowledge Engine: 5.324 questões canônicas, 2.840 vínculos definitivos e incidência histórica em shadow mode;
- taxonomia DATAPREV: 123 nós e 94 subassuntos;
- curadoria: 646 grupos, incluindo 43 P0;
- classificação: 656 propostas automáticas, zero aprovações humanas e zero elegíveis para o SDE;
- roteamento: 57 teorias exatas, 37 localizadores manuais pendentes, 52 diagnósticos locais, 42 externos e zero rotas inseguras entre irmãos;
- recuperação de erros: 7 causas e 2 verificações independentes;
- auditoria de simulados: PASS;
- auditoria do SDE: 117 ações e 50 parâmetros;
- prontidão: `READY_WITH_LIMITATIONS`, confiança `MEDIUM`;
- TypeScript: aprovado;
- Vitest: 407 testes aprovados em 69 arquivos.

## Contrato de simulados

A auditoria `simulation:audit` confirmou:

- política `OFFICIAL_BLUEPRINT_IDENTIFIED_SOURCES_V1`;
- composição completa: 6 disciplinas, 70 questões, 115 pontos e 240 minutos;
- corte global de 57,5 pontos e eliminação por zero em disciplina;
- fonte identificada obrigatória;
- geração de questões e gabaritos proibida;
- brancos registrados separadamente;
- parcial sem avaliação do corte global;
- incidência histórica inalterada;
- resultado agregado sem alteração direta do ranking do SDE.

## Builds

- web/Vite: 2.226 módulos transformados; build aprovado em 6,14 s;
- chunk lazy de `SimulationsView`: 18,02 kB, gzip 4,94 kB;
- Express: `dist/server.cjs` gerado;
- serverless: `dist/http-app.mjs` gerado.

## Segurança e higiene

- `npm audit --omit=dev`: 0 vulnerabilidades conhecidas;
- lockfile sem caminhos temporários, hosts locais ou URLs internas;
- testes de higiene do repositório aprovados;
- pacote distribuível exclui `.env`, credenciais, `node_modules`, builds locais e PDFs privados.

## Smoke HTTP local

Executado com `NODE_ENV=production`, `AUTH_MODE=disabled` e porta isolada apenas para validar o binário local:

- `/`: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- `/api/readiness`: HTTP 200, `READY_WITH_LIMITATIONS`.

Supabase e Gemini não foram configurados neste processo local. Isso não revoga as validações já fornecidas pelo usuário em produção para login, sincronização e Gemini.

## Riscos e limitações conhecidas

- o ambiente automatizado executou Node.js 22.16.0; produção deve permanecer em Node.js 24.x;
- fontes externas dependem da aplicação correta dos filtros pelo usuário;
- resultado agregado por disciplina não identifica automaticamente o subassunto causador;
- duração proporcional dos simulados parciais precisa de validação prospectiva;
- 37 localizadores teóricos exatos continuam pendentes;
- incidência histórica continua bloqueada e com contribuição zero.

## Evidências reproduzíveis

- `artifacts/baseline-3.30.0/npm-run-validate.log`;
- `artifacts/validation-3.31.0/npm-run-validate.log`;
- `artifacts/validation-3.31.0/builds.log`;
- `artifacts/validation-3.31.0/npm-audit-production.json`;
- `artifacts/validation-3.31.0/http-smoke-results.txt`;
- `data/quality/simulation-contract.json`.
