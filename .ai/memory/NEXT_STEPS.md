# Próximos Passos — após 3.32.0

1. Publicar a versão 3.32.0 pelo fluxo normal da Vercel.
2. Executar smoke real do Treino FGV com conta autenticada:
   - abrir landing pelo menu;
   - aplicar cada filtro;
   - iniciar e retomar;
   - conferir resposta e confirmar bloqueio;
   - recarregar tentativa;
   - cancelar sem histórico;
   - finalizar com e sem brancos;
   - abrir resultados específicos do histórico;
   - confirmar HTTP 200 dos assets usados.
3. Confirmar que o Diagnóstico Piloto continua abrindo sempre na landing e preserva suas tentativas.
4. Verificar o pacote no runtime Node 24.x da Vercel.
5. Manter para a 3.32.1, somente mediante ordem:
   - filtro de não vistas;
   - filtro de erradas anteriormente;
   - estatísticas acumuladas;
   - recomendações baseadas no histórico.

## Guardrails

- Não alimentar SDE, mastery, prioridade ou incidência histórica com o Treino FGV.
- Não converter treino em simulado oficial ou sessão planejada.
- Não expor respostas no catálogo público ou listagem.
- Não refazer curadoria, OCR, classificação ou recuperação de assets.
- Não alterar o banco operacional v2.
