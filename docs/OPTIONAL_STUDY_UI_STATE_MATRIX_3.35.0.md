# Matriz de estados da interface — estudo opcional

| Estado | Exibição | Ação persistida |
|---|---|---|
| descanso sem sugestão | mensagem de descanso | nenhuma sessão |
| carregando | indicador recuperável | nenhuma evidência |
| recomendação indisponível | escolha neutra/manual | nenhuma obrigação |
| recomendação principal | motivo, método, material e duração | evento deduplicado |
| alternativas | até quatro métodos diversos | somente ao solicitar |
| duração | 15–120 ou personalizada | apenas no aceite |
| seleção manual | disciplina, assunto, método, ambiente e material | apenas no aceite |
| confirmação/aceite | cria sessão opcional | `accepted` + `session_started` |
| sessão pausada | botão retomar | `session_paused` |
| sessão concluída | resultado efetivo | sessão + resultado/evidência válida |
| sessão interrompida | sem penalidade | apenas tempo/resultado real |
| ocultada/descanso mantido | mensagem neutra | evento de interface sem SDE |
