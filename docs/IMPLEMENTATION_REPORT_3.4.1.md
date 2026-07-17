# ConcurseiroOS 3.4.1 — Correção de compatibilidade Windows

## Problema

`npm run test:run` falhava no Windows porque o teste arquitetural procurava `"/tests/"` em caminhos que usavam `\`. Como consequência, seis arquivos de teste eram classificados incorretamente como consumidores de produção do pacote DATAPREV.

## Correção

- caminhos convertidos para formato portátil antes das verificações;
- regras aplicadas sobre caminho relativo a `src`;
- diretórios de teste e consumidores autorizados identificados de forma determinística;
- regressão explícita para separadores Windows.

## Validação

- 274/274 testes;
- TypeScript aprovado;
- builds web, servidor e serverless aprovados.

Nenhuma funcionalidade do coach ou do SDE foi alterada.
