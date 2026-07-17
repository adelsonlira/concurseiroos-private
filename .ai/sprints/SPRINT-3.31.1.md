# Sprint 3.31.1 — Recuperação operacional de produção

**Data:** 2026-07-17  
**Linha de base:** 3.31.0  
**Tipo:** patch corretivo

## Evidência recebida

O usuário registrou em produção:

- logos quebradas por 404 em `/brand/concurseiroos-mark.png`;
- HTTP 500 em `/api/runtime-config`;
- teste técnico do Gemini com HTTP 500 e chave não confirmada, apesar das variáveis na Vercel;
- ausência de cancelamento para simulados criados e adiados.

## Diagnóstico técnico

- O pacote não continha os arquivos estáticos referenciados pela interface.
- `runtime-config` e `ai-health` dependiam do boot do app Express completo.
- O cliente Supabase era criado na inicialização do módulo, ampliando a superfície de falha antes da resposta diagnóstica.
- Variáveis com aspas, URL inválida ou par principal incompleto não eram normalizadas nem admitiam fallback seguro.
- O domínio de simulados não possuía estado cancelado.

## Implementado

- `BrandMark` em SVG embutido, usado no login e na barra lateral.
- Entradas serverless independentes para configuração de runtime e probe do Gemini.
- Normalização e validação de variáveis; fallback conservador para o par VITE válido.
- Autenticação e SDKs carregados sob demanda nos diagnósticos.
- Erros do Gemini retornados em JSON controlado, com detalhes sem segredo.
- Estado `CANCELADO`, timestamp, ação de cancelamento e proteção contra retomada/conclusão.
- Simulados cancelados deixam a fila e o histórico recente, mas permanecem no snapshot e backup.
- Confirmação explícita antes do cancelamento.

## Guardrails preservados

- SDE puro e determinístico, sem alteração.
- Incidência histórica permanece em shadow mode.
- Resultado agregado de simulado não altera ranking.
- Gemini não cria plano, questão ou gabarito.
- Materiais privados continuam fora do Gemini e da prioridade.
- Nenhum dado real de produção foi alterado durante a implementação.

## Validação necessária após deploy

- confirmar ausência de requisições `/brand/*` no console;
- confirmar HTTP 200 em `/api/runtime-config`;
- executar probe autenticado do Gemini;
- criar e cancelar um simulado, verificando a remoção da fila recente;
- consultar logs da Vercel somente se o probe ainda falhar, usando o código JSON retornado.
