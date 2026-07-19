# Testes, TypeScript e builds — ConcurseiroOS v3.34.0

## Testes

Comando final:

```bash
npm run validate
```

Resultado:

```text
Test Files  87 passed (87)
Tests       584 passed (584)
```

A baseline v3.33.1 possuía 530 testes em 83 arquivos. Foram adicionados 54 testes líquidos em quatro novos arquivos de teste:

- 10 do adaptador de evidências;
- 16 de estado de conhecimento, pesos e grafo;
- 15 de método, regras duras, score e shadow mode;
- 12 de integração SDE v2/fallback/ledger;
- 1 verificação adicional do grounding explicável do Coach.

Também continuaram passando os contratos preexistentes do SDE v1, Ledger de Evidências Externas, Treino FGV, Diagnóstico Piloto, simulados, backup, sincronização, autenticação e corpus.

## TypeScript

```bash
npm run typecheck
```

Resultado: PASS, sem erros.

## Build web

```bash
npm run build:web
```

Resultado:

- 2.274 módulos transformados;
- build concluído;
- 6 assets do Diagnóstico Piloto emitidos;
- 301 assets do Treino FGV emitidos;
- bundle público amostrado sem metadados privados do gabarito.

Aviso não bloqueante: o chunk `study-engine` ficou com aproximadamente 1.082 kB minificado e 253 kB gzip. A divisão adicional do chunk não foi feita porque não integra o escopo decisório desta versão.

## Build Express

```bash
npm run build:server
```

Resultado: PASS; `dist/server.cjs` gerado.

## Build serverless

```bash
npm run build:serverless
```

Resultado: PASS; foram gerados:

- `dist/http-app.mjs`;
- `dist/serverless-api/training-fgv/check.js`;
- `dist/serverless-api/training-fgv/finalize.js`.
