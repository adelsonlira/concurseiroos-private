# Sprint 3.8.0 — Fundação do Knowledge Engine FGV

Data: 2026-07-16

## Objetivo

Criar a fundação canônica e auditável do corpus FGV sem ativar incidência histórica no SDE.

## Implementado

- domínio canônico para concurso, edital, prova, caderno, questão, alternativa, gabarito, alteração, anulação, assunto, subassunto, classificação, fonte e confiança;
- política explícita de confiança e estados confirmado, inferido e insuficiente;
- importação dos catálogos oficiais deduplicados para `data/knowledge/`;
- geração reproduzível de vínculos prova–edital–gabarito;
- validação de IDs, SHA-256, tamanhos e duplicidade de hashes canônicos;
- deduplicação de questões por conteúdo normalizado, pronta para a fase de extração;
- relatório de qualidade legível por máquina;
- shadow mode obrigatório, sem integração com o SDE.

## Resultado do corpus

- 181 documentos canônicos;
- 54 concursos;
- 20 duplicatas lógicas declaradas;
- 95 vínculos de prova;
- 77 vínculos confirmados em nível de pacote;
- 9 vínculos inferidos;
- 9 vínculos com evidência insuficiente;
- 0 questões extraídas, corretamente marcadas como pendentes.

## Limites

A confiança confirmada refere-se apenas à presença documental no pacote organizado. Não afirma correspondência de caderno, numeração de questão ou resposta individual. Incidência histórica permanece desativada.
