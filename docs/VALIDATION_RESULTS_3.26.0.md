# Resultados de validação — ConcurseiroOS 3.26.0

Data: 2026-07-17
Ambiente automatizado: Node.js 22.16.0; runtime-alvo declarado: Node.js 24.x.

## Pipeline integrado

`npm run validate` aprovado:

- memória institucional sincronizada com 3.26.0;
- corpus oficial: 95 provas, 6.462 questões, 1.344 seções de gabarito e 646 itens de revisão;
- catálogo: 181 documentos, 54 concursos e 95 vínculos;
- taxonomia: 123 nós, 94 subassuntos e 32 gaps;
- curadoria: 646 grupos, sendo 43 P0;
- classificação: 656 propostas, zero aprovações humanas e zero incidência elegível;
- auditoria do SDE: PASS, 117 ações e 50 parâmetros;
- prontidão estática: `READY_WITH_LIMITATIONS`, confiança `MEDIUM`;
- TypeScript: aprovado;
- testes: **383 aprovados em 63 arquivos**.

## Cobertura nova

- snapshot legado sem `evidenciasAprendizagemGuiada` é migrado para lista vazia;
- checksum do snapshot original é verificado antes da migração;
- snapshot corrompido continua recusado;
- importação transacional do store preserva estado até a validação;
- diagnóstico escolhe `QUESTION_LIST` antes de questões comentadas;
- questão comentada aciona banco externo como fonte principal segura;
- prescrição contém plano explícito de aprovação/insuficiência e teoria exata;
- prontidão do endpoint reflete a configuração do processo sem confundi-la com smoke test;
- pastas recolhíveis do cofre protegidas por teste de governança;
- instruções diagnósticas e de correção sem jargão cobertas por regressão.

## Builds

- web: aprovado, 2.220 módulos transformados;
- Express: aprovado;
- serverless: aprovado.

## Segurança de dependências

`npm audit --omit=dev`: **zero vulnerabilidades conhecidas**.

O lockfile foi inspecionado e não contém URLs do gateway interno de empacotamento.

## Smoke HTTP de produção

Com configuração pública Supabase, chave Gemini de teste, `AUTH_MODE=optional` e `NODE_ENV=production`:

- aplicação: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- `/api/readiness`: HTTP 200;
- `/api/ai-health` sem token: HTTP 401;
- runtime efetivo: `auth.mode = required` e `allowSelfSignup = false`;
- Supabase e Gemini foram reconhecidos como configurados;
- `runtime.nodeVersion` e o check de paridade refletiram o processo realmente executado;
- checks externos ficaram em `WARN`, pois presença de variável não equivale a login autenticado ou resposta real do modelo.

## Limitações não validadas neste ambiente

- restauração da cópia de nuvem específica do usuário;
- login, recuperação, RLS e sincronização no projeto Supabase remoto;
- Gemini com chave, cota e modelo reais;
- jornada notebook–celular;
- inspeção visual final no deploy;
- execução automatizada completa deste pacote em Node.js 24.x.
