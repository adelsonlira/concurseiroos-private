# Sprint 3.11.0 — Corpus oficial FGV por questão

Data: 2026-07-16

## Objetivo

Transformar os PDFs oficiais catalogados em unidades canônicas de prova, caderno e questão, preservando proveniência e bloqueando qualquer uso estratégico prematuro.

## Implementado

- núcleo estável de extração de cadernos objetivos em PDF;
- verificação de SHA-256 contra o catálogo antes da extração;
- manifesto de 95 provas com tipo, sequência, cobertura e problemas;
- 6.462 questões extraídas de 93 cadernos objetivos ou mistos;
- exclusão explícita de dois cadernos exclusivamente discursivos;
- registro de uma extração parcial do TJBA 2014, sem preenchimento inferido;
- armazenamento minimizado: localizador, hashes, marcadores de alternativas e trecho curto;
- artefatos determinísticos e independentes de caminhos absolutos da máquina;
- contrato TypeScript e testes de segurança do corpus.

## Validado

- 95 fontes conferidas por hash;
- 92 provas com sequência completa, uma parcial e duas discursivas excluídas;
- repetição integral da extração com hashes idênticos;
- cenário DATAPREV 2024 preservado com 70 questões.

## Limites mantidos

- toda extração permanece aguardando revisão;
- o PDF oficial é a fonte autoritativa;
- texto integral e alternativas não são incluídos no repositório;
- nenhuma classificação ou incidência é ativada no SDE.
