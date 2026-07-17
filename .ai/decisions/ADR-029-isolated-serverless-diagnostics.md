# ADR-029 — Diagnósticos serverless isolados e tolerantes à configuração

**Status:** aceito  
**Data:** 2026-07-17  
**Versão:** 3.31.1

## Contexto

A produção 3.31.0 apresentou HTTP 500 em `/api/runtime-config` e no teste `/api/ai-health`. O endpoint de configuração importava a aplicação Express completa, que também construía o cliente Supabase durante a inicialização do módulo. Assim, qualquer valor incompleto, malformado ou entre aspas podia impedir até mesmo o diagnóstico público de explicar o problema.

A mesma implantação também dependia de imagens estáticas de marca que não existiam no pacote produzido.

## Decisão

1. `/api/runtime-config` passa a ser uma função Web API independente, sem importar Express, Supabase ou Gemini.
2. `/api/ai-health` passa a ter entrada serverless independente, com autenticação Supabase e SDK Gemini carregados de forma lazy somente durante a requisição.
3. Variáveis de ambiente são normalizadas, inclusive remoção conservadora de aspas externas.
4. O par `SUPABASE_URL`/`SUPABASE_ANON_KEY` só é aceito com URL HTTP válida; caso contrário, um par VITE válido pode ser usado como compatibilidade.
5. O cliente Supabase da aplicação Express deixa de ser construído na carga do módulo e passa a ser inicializado sob demanda com tratamento de erro.
6. Falhas do provedor Gemini retornam JSON controlado 502/429; ausência de configuração retorna 503, sem vazar a chave.
7. A marca visual passa a ser SVG React embutido no bundle, eliminando dependência de arquivos `/brand/*` ausentes.

## Consequências

- O endpoint de configuração deve continuar respondendo mesmo quando uma variável Supabase estiver inválida.
- O diagnóstico do Gemini diferencia ausência de chave de falha real do provedor.
- A autenticação da API continua obrigatória em produção.
- A chave Gemini e dados privados continuam restritos ao backend.
- Não há alteração no SDE, em prioridades, incidência histórica ou políticas pedagógicas.
