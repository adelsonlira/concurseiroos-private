# Próximos Passos — após 3.31.1

## Validação operacional imediata

1. Publicar a versão 3.31.1 pelo fluxo normal da Vercel.
2. Confirmar HTTP 200 e JSON em `/api/runtime-config`.
3. Executar o teste autenticado do Gemini e registrar o código/detalhe apenas se ainda houver falha.
4. Confirmar que a barra lateral e o gate de login não solicitam mais `/brand/*`.
5. Criar e cancelar um simulado, verificando que ele sai do histórico recente sem ser apagado do backup.

## Trabalho autônomo seguinte

1. Fechar os 37 localizadores teóricos ainda pendentes:
   - priorizar metadados exatos, sumários e títulos auditáveis;
   - manter `TOPIC_ONLY` sem poder prescritivo;
   - solicitar aprovação somente para fallback amplo real.
2. Validar prospectivamente simulados e sessões reais:
   - observar duração, brancos, risco de zero e atrito de registro;
   - registrar subassuntos reais dos erros antes de permitir recalibração temática;
   - comparar apenas composições equivalentes.
3. Revisar os 43 grupos P0 DATAPREV na curadoria histórica, mantendo ledger append-only e shadow mode.
4. Comparar matriz histórica simulada contra decisões atuais, sem ativar incidência.
5. Preparar estratégia de reta final, última semana e véspera depois de existir evidência operacional suficiente.

## Confirmações de ambiente já concluídas

- login obrigatório: confirmado;
- sincronização notebook–celular: confirmada;
- Gemini pela Vercel: confirmado antes da regressão; reconfirmação pendente após deploy 3.31.1.

## Portões fechados

- simulados usam composição oficial e fonte identificada;
- questão local exige documento e gabarito identificados e não pode ser customizada;
- Gemini não cria questões, gabaritos ou cronograma de correção;
- resultado agregado por disciplina não altera o SDE;
- páginas de subassunto irmão nunca são fallback;
- ausência de localizador não é preenchida por IA;
- incidência histórica não altera o SDE;
- material privado não altera prioridade estratégica;
- recuperação de erro exige correção explícita e verificações independentes.
