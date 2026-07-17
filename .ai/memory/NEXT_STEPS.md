# Próximos Passos — após 3.26.0

## Prioridade imediata

1. Substituir a 3.25.0 pela 3.26.0 sem apagar a cópia existente na nuvem.
2. Entrar na mesma conta e escolher “Usar dados da nuvem neste dispositivo”.
3. Confirmar a mensagem de migração segura e a presença do histórico anterior.
4. Não usar “Substituir a nuvem pelos dados locais” enquanto a cópia remota não estiver confirmada.
5. Conferir que `/api/runtime-config` e `/api/readiness` distinguem configuração presente de smoke test ainda pendente.
6. Abrir a prescrição diagnóstica de Avaliação de modelos de dados e confirmar que a fonte principal é lista de questões sem comentários ou banco externo.
7. Confirmar que teoria e páginas aparecem explicitamente no bloco “se a evidência for insuficiente”.
8. Validar as pastas recolhíveis do cofre por disciplina.
9. Executar uma bateria real de 10 questões sem consulta, registrando acertos seguros e incertezas honestamente.
10. Observar se o Coach agenda prática/revisão ao ultrapassar o portão ou teoria ao ficar abaixo dele.

## Sequência de produto após o smoke real

1. Teste autenticado notebook → celular → notebook.
2. Teste de recuperação de senha e encerramento em dispositivo público.
3. Smoke real do Gemini pela seção técnica.
4. Cobertura dos 32 subassuntos sem localizador pedagógico direto.
5. Simulação global do plano até a prova com disponibilidade real.
6. Aprimoramento de simulados, correção de erros e reaprendizagem.
7. Curadoria dos 43 grupos P0 para DATAPREV, mantendo shadow mode.

## Portões que permanecem fechados

- migração de snapshot não pode inventar evidência;
- cadastro público permanece desligado por padrão;
- diagnóstico não declara domínio nem elimina revisão;
- questões objetivas não são inventadas pela IA;
- corpus histórico não vira banco operacional sem curadoria e interface próprias;
- incidência histórica não altera o SDE sem revisão humana e validação shadow;
- material privado nunca altera incidência;
- falha externa deve acionar fallback, nunca bloquear o Coach determinístico.
