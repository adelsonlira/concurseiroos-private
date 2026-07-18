# Próximos Passos — após 3.33.0

1. Publicar a versão 3.33.0 pelo fluxo normal da Vercel.
2. Validar em dois dispositivos autenticados que um evento do ledger sincroniza com o mesmo `evidenceId` e mantém as relações de substituição/anulação.
3. Registrar uma bateria QConcursos vinculada a uma prescrição e confirmar que somente o vínculo correto recebe progresso descritivo.
4. Exportar, restaurar e reconciliar um backup com eventos ativos, substituídos e anulados.
5. Especificar separadamente o contrato do SDE v2 para eventual consumo de evidências externas elegíveis.

## Guardrails

- Não alterar o SDE atual, mastery, prioridades ou prescrição com a 3.33.0.
- Não converter lotes em tentativas sintéticas.
- Não editar ou excluir fisicamente eventos do ledger.
- Não armazenar credenciais, cookies, tokens, HTML externo ou conteúdo integral de questões protegidas.
- Não implementar scraping, integração automática ou recomendações sem ordem explícita.
