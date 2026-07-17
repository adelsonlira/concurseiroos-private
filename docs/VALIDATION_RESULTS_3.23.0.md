# Resultados de validação — ConcurseiroOS 3.23.0

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
- testes: 351 aprovados em 58 arquivos.

## SDE

- 117 ações auditadas;
- 49 parâmetros catalogados;
- nenhuma incidência histórica conectada ao ranking;
- nenhuma mudança de peso ou fórmula na Sprint 3.23.0.

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

## Cobertura nova

- fingerprint ignora metadados voláteis;
- dispositivo limpo recebe nuvem automaticamente;
- mudança somente remota restaura automaticamente;
- mudança somente local envia automaticamente;
- mudança concorrente gera conflito;
- resposta `ainda não sei` é válida;
- recuperação declarada exige resposta escrita;
- limpeza dos vínculos privados é segura em navegador sem suporte persistente;
- categorização das limitações metodológicas.

## Limitações não validadas neste ambiente

- execução da suíte no Node.js 24.x;
- Supabase autenticado real;
- sincronização física entre dois dispositivos;
- cofre privado real no bucket;
- Gemini com chave real.
