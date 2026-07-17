# Resultados de validação — ConcurseiroOS 3.25.0

Data: 2026-07-16
Ambiente local: Node.js 22.16.0; runtime-alvo declarado: Node.js 24.x.

## Pipeline integrado

`npm run validate` aprovado:

- memória institucional sincronizada;
- corpus oficial: 95 provas, 6.462 questões, 1.344 seções de gabarito e 646 itens de revisão;
- catálogo: 181 documentos, 54 concursos e 95 vínculos;
- taxonomia: 123 nós, 94 subassuntos e 32 gaps;
- curadoria: 646 grupos, sendo 43 P0;
- classificação: 656 propostas, zero aprovações humanas e zero incidência elegível;
- auditoria do SDE: PASS, 117 ações e 50 parâmetros;
- prontidão: `READY_WITH_LIMITATIONS`, confiança `MEDIUM`;
- TypeScript: aprovado;
- testes: **376 aprovados em 61 arquivos**.

## Cobertura nova

- política do gate de acesso: 6 testes;
- configuração de runtime e proteção de produção;
- RLS versionada: 3 testes estáticos;
- diagnóstico de entrada: 5 testes de política;
- integração store/SDE/revisão com diagnóstico apto, fraco e amostra curta;
- navegação sem importador de edital.

## Builds

- web: aprovado, 2.220 módulos transformados;
- Express: aprovado;
- serverless: aprovado.

## Segurança de dependências

`npm audit --omit=dev`: **zero vulnerabilidades conhecidas**.

## Smoke HTTP de produção

Com Supabase público de teste e `AUTH_MODE=optional`:

- aplicação: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- `/api/readiness`: HTTP 200;
- `/api/ai-health` sem token: HTTP 401;
- runtime efetivo: `auth.mode = required` e `allowSelfSignup = false`.

Sem configuração Supabase em produção:

- runtime continua declarando autenticação obrigatória;
- rota protegida retorna HTTP 503;
- a política do frontend apresenta erro fechado em vez de abrir dados.

## Limitações não validadas neste ambiente

- login real, convite, revogação e recuperação de senha no projeto Supabase do usuário;
- políticas RLS aplicadas no projeto remoto;
- sincronização real entre notebook e celular;
- Gemini com chave e cota reais;
- execução em Node.js 24.x;
- inspeção manual em navegador do deploy final.
