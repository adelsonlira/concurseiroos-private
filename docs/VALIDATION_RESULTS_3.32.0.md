# Resultados de validação — ConcurseiroOS 3.32.0

## Dados e segurança

- 797 registros de origem preservados.
- 664 questões elegíveis calculadas.
- 301 assets validados por hash e tamanho e emitidos no build.
- Caminhos absolutos rejeitados.
- Cinco alternativas A–E verificadas em todas as questões elegíveis.
- Identificadores e referências do catálogo verificados como únicos.
- Catálogo público sanitizado.
- Correção indisponível por GET e disponível somente após POST explícito.
- Bundle web auditado sem os metadados privados amostrados.

## Testes

- Testes específicos do Treino FGV: 28 aprovados, sendo 26 de domínio/interface e 2 de endpoint.
- Regressão completa: 480 testes aprovados em 76 arquivos.
- Falhas finais: 0.
- Diagnóstico Piloto: 32 testes preservados.
- Regressão de navegação da v3.31.4: preservada.
- Auditoria do SDE: 117 ações e 50 parâmetros, PASS.

## TypeScript e builds

- `tsc --noEmit`: PASS.
- Build web: PASS — 2.252 módulos transformados.
- Auditoria dos seis assets do diagnóstico: PASS.
- Auditoria dos 301 assets do treino: PASS.
- Build Express: PASS.
- Build serverless ESM: PASS.

O build web registra aviso não bloqueante para o chunk do catálogo/tela do Treino FGV, com aproximadamente 854 kB minificado e 184 kB gzip. A divisão adicional desse chunk permanece uma otimização futura e não altera a funcionalidade da v3.32.0.

## Smoke HTTP do runtime compilado

Executado com `NODE_ENV=production`, `AUTH_MODE=disabled` e `node dist/server.cjs`:

- `/`: HTTP 200;
- `/api/health`: HTTP 200;
- `/api/runtime-config`: HTTP 200;
- asset de alternativa do Treino FGV: HTTP 200;
- `GET /api/training-fgv/check`: HTTP 405;
- `POST /api/training-fgv/check`: HTTP 200;
- `POST /api/training-fgv/finalize`: HTTP 200;
- finalização com quatro brancos: PASS;
- resultado contém `affectsSde = false` e `countsAsOfficialSimulation = false`.

## Dependências

- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm audit`: 0 vulnerabilidades.

## Ambiente

O runtime declarado permanece Node.js 24.x. A execução local disponível ocorreu em Node.js 22.16.0. O smoke deve ser repetido após a publicação real na Vercel com Node 24.x e autenticação do ambiente de produção.
