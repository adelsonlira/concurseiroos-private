# ADR-016 — Corpus oficial FGV minimizado e auditável

Data: 2026-07-16
Status: aceito

## Contexto

O catálogo documental da Sprint 3.8 permitia saber quais provas, editais e gabaritos existiam, mas não oferecia uma unidade canônica de questão com origem, página, integridade e estado de revisão. Usar experimentos anteriores diretamente criaria dependência de caminhos temporários, classificações não revisadas e conteúdo maior do que o necessário.

## Decisão

O corpus oficial será gerado deterministicamente a partir dos PDFs canônicos e do catálogo de hashes. Cada questão armazena somente:

- identificadores estáveis de concurso, prova, caderno e questão;
- número e página de origem;
- hash do documento e fingerprint normalizado do conteúdo;
- trecho curto de até 280 caracteres Unicode;
- marcadores das alternativas, sem texto integral;
- estados explícitos de extração, gabarito, deduplicação e classificação;
- `shadowMode: true` e `incidenceEligible: false` invariáveis.

Provas exclusivamente discursivas são registradas e excluídas do corpus objetivo. Extrações parciais não são completadas por inferência.

## Consequências

O projeto ganha rastreabilidade questão–PDF sem incorporar os PDFs nem reproduzir integralmente conteúdo protegido. A revisão humana continua obrigatória antes de qualquer estatística histórica. O pipeline falha se um registro escapar do shadow mode, perder proveniência, contiver hash inválido ou armazenar enunciado/alternativas integrais.
