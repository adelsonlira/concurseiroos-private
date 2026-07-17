# Sprint 3.31.2 — Resolução ESM das funções serverless

**Data:** 2026-07-17  
**Linha de base:** 3.31.1  
**Tipo:** patch corretivo

## Evidência recebida

O probe autenticado em produção registrou:

- `ERR_MODULE_NOT_FOUND` para `/var/task/src/server/runtimeEnvironment`;
- falha durante a carga de `/api/ai-health.js`;
- zero chamadas externas ao Gemini;
- processo Node encerrado antes de ler ou validar a chave no provedor.

## Causa confirmada

As funções serverless eram emitidas como ESM, mas os imports relativos TypeScript não declaravam extensão. O Node tentou resolver literalmente `runtimeEnvironment`, sem encontrar `runtimeEnvironment.js` no runtime da Vercel.

O mesmo risco existia em `/api/runtime-config`, nos entrypoints que importam `httpApp` e nos imports relativos alcançáveis pelo app compartilhado.

## Implementado

- Extensão `.js` explícita em todos os imports relativos do grafo serverless.
- Atributo `with { type: "json" }` no relatório JSON carregado pelo app HTTP.
- Teste estático que impede novos imports relativos sem extensão nesse grafo.
- Teste de regressão que:
  - transpila os entrypoints sem bundle;
  - preserva a árvore de arquivos;
  - carrega os módulos emitidos com resolução ESM nativa do Node;
  - confirma HTTP 200 no runtime config;
  - confirma erro JSON controlado quando Gemini está ausente;
  - confirma carga do app Express compartilhado.

## Guardrails preservados

- Nenhuma chave ou variável foi alterada.
- Nenhum dado real de produção foi modificado.
- SDE, pesos, prioridades e incidência histórica não foram tocados.
- Gemini continua sem poder alterar o plano ou criar cronograma paralelo.
- Materiais privados permanecem fora do backend de IA.

## Validação necessária após deploy

1. `/api/runtime-config` retorna HTTP 200.
2. `/api/ai-health` alcança a etapa de autenticação e o provedor.
3. A interface deixa de exibir “Servidor de configuração indisponível”.
4. Qualquer falha restante deve retornar JSON controlado, não `ERR_MODULE_NOT_FOUND`.
