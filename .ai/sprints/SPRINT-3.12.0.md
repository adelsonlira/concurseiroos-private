# Sprint 3.12.0 — Gabaritos, deduplicação e portões de revisão

Data: 2026-07-16

## Objetivo

Criar vínculos conservadores entre cadernos e gabaritos, deduplicar questões e produzir uma fila de revisão acionável sem contaminar o SDE.

## Implementado

- parser determinístico de 48 PDFs de gabarito e 1.344 seções;
- estados explícitos para vínculo inequívoco, candidato, ambíguo, não resolvido e não aplicável;
- 44 vínculos automáticos de alta confiança, ainda pendentes de revisão humana;
- 2.840 questões ligadas a respostas definitivas;
- preservação de respostas anuladas, incluindo a questão 13 da DATAPREV 2024 — Desenvolvimento de Software;
- deduplicação exata e aproximada com questão canônica por grupo;
- fila agrupada de 646 itens de revisão, evitando tarefas repetidas por cópia;
- relatório de qualidade integrado ao catálogo do Knowledge Engine;
- validador streaming no pipeline, com cenário dourado DATAPREV e bloqueio de conteúdo integral;
- versões Python do pipeline fixadas em `scripts/requirements-knowledge.txt`.

## Validado

- 6.462 registros e 1.344 seções validados;
- 596 grupos de duplicação;
- 1.670 registros exatos e 64 aproximados dentro dos grupos;
- 5.324 questões canônicas únicas;
- corpus oficial com SHA-256 `138d03d3632d0db6c839b4c07a2c36558898c0929485baf2bc396b44c0479210`;
- 312 testes em 43 arquivos e TypeScript aprovados;
- builds web, Express e serverless aprovados;
- smoke test HTTP com três respostas 200;
- zero vulnerabilidades conhecidas nas dependências de produção;
- configuração DATAPREV migrada dos resumos experimentais para o catálogo canônico;
- dados legados minimizados e protegidos por teste de higiene.

## Limites mantidos

- alta confiança automática não equivale a revisão humana;
- 36 vínculos são ambíguos, 2 candidatos e 11 não resolvidos;
- classificação temática e equivalência com o edital DATAPREV 2026 ainda não foram revisadas;
- incidência histórica continua incondicionalmente desligada do SDE.
