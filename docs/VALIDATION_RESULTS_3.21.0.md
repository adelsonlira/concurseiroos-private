# Resultados de validação — ConcurseiroOS 3.21.0

Data: 2026-07-16
Ambiente local: Node.js 22.16.0
Runtime-alvo: Node.js 24.x

## Pipeline integrado

- memória institucional: PASS;
- corpus oficial: PASS;
- Knowledge Catalog: PASS;
- taxonomia DATAPREV: PASS;
- backlog de curadoria: PASS;
- propostas de classificação: PASS;
- auditoria do SDE: PASS;
- auditoria de prontidão: READY_WITH_LIMITATIONS;
- TypeScript: PASS;
- testes: 334 aprovados em 54 arquivos.

## Knowledge Engine

- 95 provas;
- 6.462 questões extraídas;
- 5.324 questões canônicas;
- 1.344 seções de gabarito;
- 2.840 vínculos definitivos;
- 646 itens agrupados de revisão;
- 656 propostas de classificação;
- zero classificações humanas aprovadas;
- zero classificações elegíveis para incidência.

## SDE

- 117 ações auditadas;
- 49 parâmetros catalogados;
- estabilidade do ranking testada;
- incidência histórica fora do ranking.

## Builds e segurança

- build web: PASS;
- build Express: PASS;
- build serverless: PASS;
- `npm audit --omit=dev`: 0 vulnerabilidades conhecidas;
- smoke HTTP: aplicação, `/api/health`, `/api/runtime-config` e `/api/readiness` retornaram 200.

## Prontidão

Status: `READY_WITH_LIMITATIONS`, confiança `MEDIUM`, sem bloqueios obrigatórios para uso local diário.

Warnings:

1. validação em Node.js 22.16.0, não no alvo 24.x;
2. Supabase autenticado não testado sem credenciais;
3. Gemini real não testado sem chave.

O Coach determinístico, a persistência local, o backup e o SDE não dependem desses serviços para funcionar localmente.
