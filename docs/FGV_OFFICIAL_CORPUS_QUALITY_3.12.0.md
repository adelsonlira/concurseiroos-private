# Qualidade do corpus oficial FGV — versão 3.12.0

Data: 2026-07-16
Política: `OFFICIAL_CORPUS_SHADOW_ONLY`

## Resultado executivo

O corpus documental foi convertido em uma base canônica por questão com integridade de origem, minimização de conteúdo, vínculos conservadores de gabarito e deduplicação. A base está apta para curadoria e classificação, mas não para alterar prioridades do SDE.

## Cobertura

| Métrica | Resultado |
|---|---:|
| Provas catalogadas | 95 |
| Provas objetivas ou mistas extraídas | 93 |
| Provas com sequência completa | 92 |
| Provas com extração parcial | 1 |
| Cadernos exclusivamente discursivos excluídos | 2 |
| Questões extraídas | 6.462 |
| Questões canônicas únicas | 5.324 |
| PDFs de gabarito interpretados | 48 |
| Seções de gabarito | 1.344 |
| Vínculos automáticos de alta confiança | 44 |
| Questões com gabarito definitivo ligado | 2.840 |
| Itens agrupados na fila de revisão | 646 |

## Exceções relevantes

- `tjba_2014/provas/01_analista-judiciario-tecnologia-da-informacao-tipo-1.pdf`: 30 de 60 questões detectadas; estado `PARTIAL_REVIEW_REQUIRED`.
- Dois cadernos vespertinos do TCE-PI 2024 contêm apenas prova discursiva e foram marcados `EXCLUDED_DISCURSIVE_ONLY`.
- 36 provas possuem vínculo de gabarito ambíguo, 2 possuem candidato a confirmar e 11 permanecem sem candidato compatível.

## Deduplicação

Foram formados 596 grupos. Eles contêm 1.670 registros marcados como cópias exatas e 64 registros aproximados. A recorrência de questões gerais em cadernos de cargos diferentes é esperada; por isso, todo grupo continua pendente de confirmação antes de formar denominadores históricos.

## Cenário dourado

A prova DATAPREV 2024 — Desenvolvimento de Software contém 70 questões ligadas ao gabarito definitivo de alta confiança. A questão 13 permanece marcada como anulada. Esse cenário detecta regressões estruturais do parser, mas não substitui revisão documental.

## Integridade e privacidade

- hashes das fontes conferidos contra `documentos.json`;
- nenhum caminho absoluto da máquina nos artefatos;
- nenhum enunciado ou alternativa integral armazenado;
- trecho de auditoria limitado a 280 caracteres Unicode;
- PDF oficial obrigatório para revisão autoritativa;
- todos os registros mantêm `shadowMode: true` e `incidenceEligible: false`.

## Bloqueios para incidência

1. revisar extrações e vínculos de gabarito;
2. confirmar grupos de duplicação;
3. classificar cada questão no edital de origem;
4. revisar equivalência com a taxonomia DATAPREV 2026;
5. auditar denominadores, anuladas e alterações;
6. comparar decisões em shadow mode antes de qualquer ativação.
