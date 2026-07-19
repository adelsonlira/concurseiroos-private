# Testes, TypeScript, builds e smokes

## Testes

- 96 arquivos de teste.
- **716 testes aprovados**.
- 710 testes funcionais anteriores preservados.
- 6 testes técnicos adicionados para teardown e encerramento.

## TypeScript

`tsc --noEmit` foi executado dentro de `npm run validate`, que retornou código zero.

## Builds

- Web: código 0, 8.628 s.
- Express: código 0, 0.459 s.
- Serverless: código 0, 0.699 s.

## Smokes

- Serverless funcional: código 0, 0.878 s, conferência e finalização HTTP 200, zero sockets finais.
- HTTP compilado: código 0 no auditor, duração 0.460 s; `/api/runtime-config` 200, `/api/readiness` 200 e GET `/api/training-fgv/check` 405.

O servidor Express do smoke compilado é um processo de serviço persistente e foi encerrado controladamente por SIGTERM depois das verificações; nenhum filho permaneceu ativo.

## Auditorias

- `npm audit`: 0 vulnerabilidades.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- CSVs canônicos e blobs Git: PASS.
- Arquivos protegidos do corpus/catálogos: 311/311 inalterados.
