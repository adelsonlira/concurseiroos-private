# Resultados de validação — ConcurseiroOS 3.24.0

Data: 2026-07-16
Runtime local disponível: Node.js 22.16.0
Runtime-alvo declarado: Node.js 24.x

## Pipeline integrado

- memória institucional: PASS;
- corpus oficial: PASS;
- catálogo do Knowledge Engine: PASS;
- taxonomia DATAPREV: PASS;
- backlog de curadoria: PASS;
- propostas de classificação: PASS;
- auditoria do SDE: PASS;
- auditoria de prontidão: READY_WITH_LIMITATIONS;
- TypeScript: PASS;
- testes: 356 aprovados em 58 arquivos.

## SDE

- 117 ações auditadas;
- 50 parâmetros catalogados;
- frente contra zero auditada em concurso com eliminação por disciplina;
- uma ação inicial por disciplina insegura no cenário DATAPREV sem histórico;
- ordenação por score preservada fora da frente de segurança;
- nenhuma incidência histórica conectada ao ranking;
- nenhuma probabilidade de aprovação ou retorno causal por hora criada.

## Cofre privado

- SHA-256 determinístico: PASS;
- conteúdo idêntico com nome diferente: identificado como duplicata;
- mesmo nome com conteúdo diferente: permitido quando os hashes conhecidos divergem;
- fallback legado por nome e tamanho: PASS;
- metadados de hash preservados na Biblioteca;
- nenhuma remoção automática de duplicatas históricas.

## Knowledge Engine

- 181 documentos;
- 95 provas;
- 6.462 questões extraídas;
- 5.324 questões canônicas;
- 2.840 vínculos definitivos de gabarito;
- 646 itens na fila de revisão;
- 656 propostas automáticas;
- zero classificações humanas aprovadas;
- zero classificações elegíveis para incidência.

## Builds e segurança

- build web: PASS;
- build Express: PASS;
- build serverless: PASS;
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.

## Smoke de produção local

Executado com `NODE_ENV=production`, `AUTH_MODE=disabled` e porta isolada.

- aplicação: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- `/api/readiness`: HTTP 200;
- prontidão: `READY_WITH_LIMITATIONS`, confiança `MEDIUM`.

## Limitações não validadas neste ambiente

- execução da suíte no Node.js 24.x;
- Supabase autenticado real;
- upload concorrente físico entre dois dispositivos;
- limpeza auditável das duplicatas históricas;
- Gemini com chave real.
