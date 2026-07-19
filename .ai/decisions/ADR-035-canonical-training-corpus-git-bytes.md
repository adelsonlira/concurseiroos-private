# ADR-035 — Bytes canônicos do corpus de treino no Git

**Status:** aceito  
**Data:** 2026-07-18  
**Versão:** 3.33.1

## Contexto

Os quatro CSVs aprovados do banco operacional FGV–DATAPREV usam finais de linha CRLF e são validados por tamanho bruto e SHA-256 bruto. A classificação automática desses arquivos como texto pelo Git pode converter CRLF em LF no blob ou no checkout, invalidando o manifesto sem que o conteúdo lógico aparente mudar.

## Decisão

- Declarar `data/training-fgv/source/*.csv -text` em `.gitattributes`.
- Proteger também, por caminho específico, JSONL, JSON e Markdown do pacote operacional, pois alguns deles também são validados por hash bruto.
- Declarar os XLSX operacionais e os assets do treino como binários somente nos caminhos específicos.
- Reintroduzir os quatro CSVs diretamente do pacote aprovado depois que a regra estiver ativa.
- Manter `buildFgvTrainingCatalog.mjs` validando bytes brutos, sem normalização de texto.
- Verificar separadamente arquivo de trabalho e blob de `HEAD` no CI.
- Executar `npm run validate` uma única vez no GitHub Actions e chamar individualmente os builds web, Express e serverless.

## Consequências

- O checkout preserva os bytes canônicos independentemente da configuração de conversão de texto do cliente Git.
- Alterações reais nos CSVs continuam sendo detectadas pelo manifesto.
- Não há renormalização global do repositório.
- Nenhum contrato funcional do produto é alterado.
