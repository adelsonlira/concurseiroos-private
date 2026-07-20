# Auditoria individual das sete falhas

| Arquivo | Teste | Cenário | Método | Ambiente anterior | Motivo | Expectativa correta v3.35.3 | Ação | Justificativa |
|---|---|---|---|---|---|---|---|---|
| optionalStudyStoreIntegration.test.ts | records review results as a real session | Persistência/classificação de revisão | active_recall | herdado da recomendação | caminho implícito e potencialmente incompatível | usar sessão guiada explícita, sem material fictício | UPDATE_LEGACY_TEST | O teste mede registro, não seleção de ambiente. |
| optionalStudyStoreIntegration.test.ts | records technical practice results | Persistência de prática | technical_practice | herdado da recomendação | caminho implícito | usar sessão guiada explícita com tarefa observável | UPDATE_LEGACY_TEST | Prática legítima continua permitida com objeto concreto. |
| optionalStudyStoreIntegrity351.test.ts | preserves a non-FGV bank in a manual batch | Lote de questões de outra banca | short_question_batch | manual genérico | NO_APPROVED_SOURCE | QConcursos como origem e CESPE como banca explícita | UPDATE_LEGACY_TEST | QConcursos é ambiente real; banca permanece diferente de FGV. |
| optionalStudyStoreIntegrity351.test.ts | theory remains structured... | Teoria estruturada | theory_notebooklm | Português sem notebook | NO_CONFIGURED_NOTEBOOK, NO_APPROVED_SOURCE, NO_MATCHING_MATERIAL | Banco de Dados com notebook e material aprovados | UPDATE_LEGACY_TEST | O objetivo é testar integridade do resultado, não inventar capacidade de Português. |
| optionalStudyStoreIntegrity351.test.ts | self-perception and time... | Mastery não alterado | theory_notebooklm | Português sem notebook | NO_CONFIGURED_NOTEBOOK, NO_APPROVED_SOURCE, NO_MATCHING_MATERIAL | Banco de Dados executável; comparar estado antes/depois | UPDATE_LEGACY_TEST | Mantém a intenção probatória sem burlar o gate. |
| optionalStudyStoreIntegrity351.test.ts | classifies theory... | Classificação histórica | vários | teoria inexequível | NO_CONFIGURED_NOTEBOOK, NO_APPROVED_SOURCE, NO_MATCHING_MATERIAL | fixture executável por método | SPLIT_TEST_CASE | Cada método é validado com ambiente real correspondente. |
| optionalStudyStoreIntegrity351.test.ts | classifies theory history correctly | Histórico de teoria | theory_notebooklm | Português sem notebook | NO_CONFIGURED_NOTEBOOK, NO_APPROVED_SOURCE, NO_MATCHING_MATERIAL | Banco de Dados no notebook cadastrado | UPDATE_LEGACY_TEST | Não se cadastra notebook fictício nem material incompatível. |

## Conclusão

- `UPDATE_LEGACY_TEST`: 6
- `SPLIT_TEST_CASE`: 1
- `FIX_NARROW_REGRESSION`: 0

O `executionReadinessGate` não foi enfraquecido. Nenhum notebook, fonte ou material fictício foi cadastrado.
