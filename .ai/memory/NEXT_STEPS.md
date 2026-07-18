# Próximos Passos — após 3.31.3

## Validação operacional imediata

1. Publicar a versão 3.31.3 pelo fluxo normal da Vercel.
2. Abrir `Diagnóstico piloto` em desktop e celular.
3. Confirmar que as seis imagens carregam pelas URLs emitidas no build.
4. Validar uma tentativa parcial: responder, marcar revisão, recarregar e retomar na mesma posição.
5. Cancelar uma tentativa e confirmar ausência de resultado.
6. Finalizar outra tentativa com questões em branco e confirmar:
   - resumo prévio;
   - confirmação explícita;
   - total, erros, brancos, percentual e tempo;
   - agregação por área;
   - cobertura principal e complementar;
   - correção sem explicações sintéticas.
7. Confirmar que o resultado não altera dashboard, SDE, mastery, prioridades, sessões ou simulados.
8. Confirmar HTTP 200 em `/api/runtime-config` e executar o probe autenticado do Gemini.

## Trabalho autônomo seguinte

- Observar atrito real do diagnóstico sem recalibrar nota, duração, seleção ou prioridades.
- Fechar os 37 localizadores teóricos pendentes com metadados exatos.
- Validar prospectivamente simulados e sessões reais.
- Revisar grupos P0 mantendo ledger append-only e shadow mode.

## Portões fechados

- Não criar explicações por IA para o diagnóstico nesta etapa.
- Não gerar plano automático ou cronograma paralelo.
- Não sincronizar o diagnóstico com mastery, SDE, roadmap ou simulados.
- Não alterar o gabarito operacional ou a curadoria recebida.
- Não usar `subject` ou `subsubject` como dimensão principal do relatório.
- Não ativar incidência histórica.
