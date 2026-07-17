# Resultados de validação — ConcurseiroOS 3.29.0

Data: 2026-07-17

## Resultado executivo

Status: **PASS com limitação de paridade local de runtime**.

A Sprint 3.29.0 corrigiu o roteamento pedagógico para impedir que páginas de um subassunto irmão sejam apresentadas como material do alvo prescrito. A ausência de localizador exato permanece explícita e nunca é preenchida por similaridade ampla ou por IA.

## Pipeline

- memória institucional: PASS;
- corpus oficial FGV: PASS;
- catálogo de conhecimento: PASS;
- taxonomia DATAPREV: PASS;
- backlog de curadoria: PASS;
- propostas de classificação: PASS;
- auditoria de roteamento pedagógico: PASS;
- auditoria do SDE: PASS;
- prontidão do produto: PASS com uma advertência local;
- TypeScript: PASS;
- testes: **392 aprovados em 66 arquivos**;
- build web: PASS;
- build Express: PASS;
- build serverless: PASS;
- `npm audit --omit=dev`: **0 vulnerabilidades conhecidas**.

## Roteamento pedagógico

- subassuntos auditados: 94;
- teoria local exata: 57;
- fallback amplo explicitamente aprovado: 0;
- localizador teórico manual necessário: 37;
- bateria diagnóstica local exata: 52;
- fallback diagnóstico em Qconcursos ou Estratégia Questões: 42;
- subassuntos sem fonte diagnóstica executável: 0;
- fallbacks inseguros entre subassuntos irmãos: 0.

## SDE

- status: PASS;
- ações executáveis auditadas: 117;
- parâmetros catalogados: 50;
- incidência histórica no ranking: desativada;
- materiais privados na prioridade estratégica: desativados.

## Ambiente real informado pelo usuário

Com proveniência `USER_CONFIRMED_REAL_ENVIRONMENT_SMOKE`:

- login obrigatório: PASS;
- sincronização notebook–celular: PASS;
- Gemini com chave da Vercel: PASS.

Essa evidência é uma confirmação operacional do usuário, e não monitoramento sintético contínuo.

## Smoke test do pacote local

Executado sobre o build Express:

- `/`: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- `/api/readiness`: HTTP 200.

O processo local não recebeu credenciais reais, portanto Supabase e Gemini foram corretamente apresentados como não configurados nesse processo específico.

## Limitação conhecida

O ambiente automatizado local executou Node.js 22.16.0, enquanto o projeto declara Node.js 24.x. O usuário já confirmou funcionamento do ambiente real de produção, mas a limitação local permanece documentada.
