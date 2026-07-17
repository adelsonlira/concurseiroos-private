# Sprint 3.5.0 — Registro de baterias e clareza operacional

Data: 2026-07-15

## Objetivo

Eliminar atrito no fechamento de baterias grandes e substituir termos de interface que exigiam interpretação desnecessária.

## Entregas

- registro agregado de baterias com total, acertos, erros, itens em branco, tempo total, fonte e confiança;
- modo individual preservado como opção para granularidade completa;
- tentativas de lote identificadas como agregadas, com tempo médio explicitamente estimado;
- uma única atualização atômica de estatísticas e uma única programação de revisão por lote;
- roteiro de teoria reescrito em linguagem operacional;
- `Rota Estratégica` renomeada para `Plano e Progresso`;
- identidade fictícia `Concurseiro Lendário` removida;
- rodapé passa a mostrar e-mail autenticado ou `Perfil de estudos`, com estado `salvo neste navegador` quando a nuvem não está configurada;
- guia `docs/ENV_SETUP.md` com configuração mínima e completa do `.env`.

## Decisões

- ADR-008 documenta a semântica e os limites do registro agregado.
- O resumo da bateria é o modo padrão quando a sessão foi prescrita pelo coach.
- Causas individuais nunca são inventadas a partir de um resumo.

## Validação esperada

- TypeScript;
- suíte completa de testes;
- builds web, Express e serverless;
- validação da memória institucional;
- smoke test HTTP local.
