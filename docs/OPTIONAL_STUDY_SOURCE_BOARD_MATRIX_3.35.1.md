# Matriz origem × banca × método — v3.35.1

| Método/ambiente | Origem | Banca | Regra |
|---|---|---|---|
| `fgv_questions` no QConcursos | `qconcursos` | FGV, salvo alteração explícita compatível | O método declara recorte FGV e a plataforma suporta filtro de banca. |
| lote curto/cronometrado no QConcursos | `qconcursos` | informada pelo usuário/filtro ou ausente | QConcursos nunca é tratado como banca. |
| `treino_fgv` | `treino_fgv` | FGV | Contrato interno do catálogo FGV validado. |
| simulado externo | `simulado_externo` | informada ou ausente | Nenhuma banca é inventada. |
| escolha manual/outro ambiente | `outra` ou origem escolhida | informada ou ausente | Preserva bancas diferentes da FGV. |

A origem é obrigatória para salvar resultado de questões ou simulação. A banca pode permanecer não informada quando não houver dado seguro.
