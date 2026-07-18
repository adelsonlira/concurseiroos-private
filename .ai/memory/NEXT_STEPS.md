# Próximos Passos — após 3.32.1

1. Publicar a versão 3.32.1 pelo fluxo normal da Vercel.
2. No domínio real e com sessão autenticada, registrar no DevTools:
   - `POST /api/training-fgv/check`;
   - HTTP 200;
   - payload de correção somente após a ação explícita;
   - ausência de resposta operacional no carregamento inicial.
3. Repetir o fluxo mínimo de cinco questões: selecionar, conferir, F5, bloquear resposta, cancelar e finalizar.
4. Validar texto longo, imagem de página, alternativas em imagem e código em 840×550, mobile e zoom 150%.
5. Confirmar que menu, histórico e Diagnóstico Piloto mantêm as regressões de navegação.

## Guardrails

- Não alimentar SDE, mastery, prioridade ou incidência histórica com o Treino FGV.
- Não converter treino em simulado oficial ou sessão planejada.
- Não expor respostas no catálogo público, HTML inicial ou bundle web.
- Não alterar o banco operacional, as 664 questões ou os 301 assets.
- Não implementar filtros históricos, recomendações ou explicações sem ordem explícita.
