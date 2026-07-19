# Próximos Passos — após 3.35.2

1. Publicar o commit validado em checkout limpo.
2. Confirmar no GitHub Actions que `npm run validate` encerra naturalmente.
3. Confirmar que `npm run training:smoke-serverless` encerra naturalmente no runner remoto.
4. Manter o watchdog como gate de falha e investigar qualquer novo handle antes de promover a versão.

## Guardrails

- não usar `process.exit(0)` ou timeout como sucesso;
- não reduzir testes ou cobertura;
- não alterar funcionalidades do produto;
- manter Node.js 24.x no CI;
- preservar os bytes canônicos do corpus.
