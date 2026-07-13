# SPRINT P1.3–P1.5 — Curadoria técnica do corpus de 37 provas FGV

Data de validação: 13/07/2026

## Objetivo

Processar integralmente o arquivo com 37 provas FGV, preservar rastreabilidade por questão, deduplicar o corpus, classificar candidatos temáticos contra o edital DATAPREV 2026 — Perfil 3 e impedir que evidência ainda não validada altere o Strategic Decision Engine.

## Implementado

### Corpus integral

- 37 provas processadas.
- 2.522 registros brutos de questões.
- 2.363 questões únicas entre as três ondas.
- 30 registros duplicados dentro da Onda C/D.
- 129 registros duplicados da Onda C/D contra as ondas anteriores.
- Todas as provas foram extraídas com sequência de questões contínua.
- OCR não foi necessário.

### Ondas de proximidade

- Onda A1/A2: 15 provas, 1.090 questões únicas.
- Onda B: 13 provas, 860 questões únicas.
- Ondas C/D: 9 provas, 572 registros e 413 questões únicas em relação ao corpus completo.

### Auditoria do classificador

- Onda A1/A2 — censo da faixa originalmente automática de alta confiança: 98/98 revisadas, 94 mantidas e quatro corrigidas.
- Onda B — censo: 73/73 revisadas, 71 mantidas, uma remapeada e uma excluída.
- Ondas C/D — censo das questões únicas de alta confiança: 15/15 mantidas.
- Holdout independente da Onda A1/A2: 22/22 classificações corretas; limite inferior de Wilson de 95% igual a 85,1%.
- 19 testes de regressão protegem regras contra falsos positivos conhecidos.

### Correções temáticas relevantes

- Data Mining explícito prevalece sobre menções incidentais a IA.
- Frameworks de teste são classificados em Testes, e não em Linguagens/Frameworks.
- Engenharia de Requisitos prevalece sobre JSON/XML incidentais.
- TDD é classificado como Testes quando constitui o objeto da questão.
- Sintaxe pura de Python ou R não listado é excluída quando a linguagem é o objeto da questão.
- Segurança em bancos de dados é classificada pelo objeto segurança, não pelo termo NoSQL isolado.
- Termos como Redis/redistribuição, normalização ISO/normalização de banco, HTTPS em URL e `solid` de CSS possuem filtros contextuais.

### Governança da evidência

- Todas as três ondas permanecem `RAW_UNCURATED`.
- Todas proíbem `SDE_HISTORICAL_INCIDENCE` e `OFFICIAL_FACTS`.
- A versão do pacote de evidências foi atualizada para 1.5.0.
- A Onda C/D foi adicionada à configuração oficial como fonte complementar/controle negativo.
- A matriz experimental da Onda A1/A2 continua fora do SDE.

## Matriz experimental — não ativa

A base experimental A1/A2 contém 186 questões classificadas: 89 revisadas manualmente e 97 automáticas de alta confiança. Ela descreve a participação dos temas no corpus filtrado, e não a probabilidade de cobrança na DATAPREV.

- Desenvolvimento de Sistemas: 97/186.
- Segurança da Informação: 28/186.
- Banco de Dados: 21/186.
- Gestão e Governança: 16/186.
- LGPD: 11/186.
- Business Intelligence: 10/186.
- LAI: 2/186.
- Marco Civil: 1/186.

Nenhum desses números altera prioridade de estudo.

## Pendências objetivas

### Curadoria temática

Há 383 questões únicas em `REVIEW_REQUIRED`:

- 184 na Onda A1/A2;
- 127 na Onda B;
- 72 nas Ondas C/D.

A fila combinada foi gerada em ordem operacional de curadoria. Essa ordem não é prioridade de estudo.

### Gabaritos

A ausência de gabaritos não impede incidência temática, mas bloqueia:

- validação da alternativa correta;
- estudo de distratores;
- detecção de anulações/retificações;
- montagem segura de simulados internos;
- análise de padrões de erro induzido pela FGV.

Foi criado um manifesto priorizado. Não é necessário procurar todos de uma vez: a prova DATAPREV e as cinco provas A2 de maior proximidade formam o primeiro lote recomendado.

## Validação técnica

- Testes Python do classificador: 19/19 aprovados.
- Testes Vitest do aplicativo: 162/162 aprovados.
- TypeScript/lint: aprovado.
- Build de produção: aprovado.
- Aviso não bloqueador: chunk JavaScript de aproximadamente 652 kB após minificação.

## Status

- Extração das 37 provas: VALIDADA.
- Deduplicação conservadora: IMPLEMENTADA E VALIDADA POR TESTES/RELATÓRIOS.
- Censo das faixas de alta confiança: CONCLUÍDO.
- Incidência histórica utilizável pelo SDE: BLOQUEADA.
- Análise de alternativas/gabaritos: PENDENTE.
- Curadoria das questões ambíguas: PENDENTE.

## Próxima decisão

Há três caminhos possíveis:

1. Continuar imediatamente a revisão temática das 184 questões A1/A2, sem gabaritos.
2. Priorizar a obtenção dos seis primeiros gabaritos antes de avançar.
3. Caminho híbrido recomendado: continuar a revisão temática A1/A2 e, paralelamente, obter os seis gabaritos prioritários para liberar análise de distratores e simulados.
