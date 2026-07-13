# P1.3 — Primeira onda de segmentação e classificação do corpus FGV

## Escopo

- Provas A1/A2 processadas: **15**.
- Questões extraídas em sequência contínua: **1090**.
- Questões únicas após deduplicação: **1090**.
- Duplicações exatas/próximas detectadas: **0**.
- Questões revisadas ou excluídas manualmente: **91**.
- Candidatas aderentes antes da exclusão da fila REVIEW_REQUIRED: **370**.
- Base experimental (manual + alta confiança): **186**.

A matriz produzida é experimental e permanece bloqueada para o SDE.

## Integridade da extração

| Prova | Extraídas | Faixa | Sequência |
|---|---:|---|---|
| analista_de_tecnologia_da_informacao_desenvolvimento_de_software.pdf | 70 | A1 - referência primária | completa |
| auditor_de_controle_externo_informatica_analista_de_sistemas.pdf | 100 | A2 - muito alta | completa |
| analista_legislativo_desenvolvedor_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| analista_judiciario_area_apoio_especializado_especialidade_analise_de_sistemas_de_informacao.pdf | 80 | A2 - muito alta | completa |
| analista_judiciario_apoio_especializado_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf | 80 | A2 - muito alta | completa |
| analista_do_mpu_desenvolvimento_de_sistemas.pdf | 80 | A2 - muito alta | completa |
| analista_em_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf | 60 | A2 - muito alta | completa |
| analista_previdenciario_especialidade_analista_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| analista_judiciario_desenvolvimento_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| analista_cvm_perfil_8_ti_sistemas_e_desenvolvimento_tarde.pdf | 70 | A2 - muito alta | completa |
| DPERS - analista_area_de_apoio_especializado_tecnologia_da_informacao_desenvolvimento_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| analista_judiciario_tecnologia_de_informacao_analise_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| 2025 DPE RO - analista_de_sistemas_classe_b.pdf | 70 | A2 - muito alta | completa |
| analista_judiciario_tecnologia_da_informacao_analista_de_sistemas.pdf | 70 | A2 - muito alta | completa |
| analista_judiciario_analise_de_sistemas (1).pdf | 60 | A2 - muito alta | completa |

## Estado das classificações únicas

| Estado | Quantidade |
|---|---:|
| UNCLASSIFIED | 701 |
| AUTO_CLASSIFIED_REVIEW_REQUIRED | 184 |
| AUTO_CLASSIFIED_HIGH_CONFIDENCE | 97 |
| MANUALLY_REVIEWED | 89 |
| AUTO_EXCLUDED_OUT_OF_SCOPE | 17 |
| MANUALLY_EXCLUDED | 2 |

## Distribuição experimental por grande bloco

| Tópico oficial | Questões | Participação no corpus aderente | Revisadas manualmente |
|---|---:|---:|---:|
| `dp26-p3-esp-desenvolvimento-sistemas` | 97 | 52.2% | 52 |
| `dp26-p3-esp-seguranca` | 28 | 15.1% | 14 |
| `dp26-p3-esp-banco-dados` | 21 | 11.3% | 15 |
| `dp26-p3-esp-gestao-governanca` | 16 | 8.6% | 1 |
| `dp26-p3-leg-lgpd` | 11 | 5.9% | 0 |
| `dp26-p3-esp-bi` | 10 | 5.4% | 6 |
| `dp26-p3-leg-lai` | 2 | 1.1% | 1 |
| `dp26-p3-leg-marco-civil` | 1 | 0.5% | 0 |

## Limites

- A classificação automática é uma triagem reproduzível, não revisão humana.
- Itens AUTO_CLASSIFIED_REVIEW_REQUIRED não entram no denominador experimental.
- Percentuais são participação no corpus filtrado, não previsão de questões na DATAPREV.
- A ausência de gabaritos não impede incidência temática, mas impede análise de anulações e distratores.
- A próxima etapa é revisar a fila de ambiguidades e medir precisão por tópico antes de qualquer ativação.