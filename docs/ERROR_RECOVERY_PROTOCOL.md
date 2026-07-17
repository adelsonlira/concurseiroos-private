# Protocolo de recuperação de erros

1. Registrar o erro e a causa realmente observada.
2. Comparar o raciocínio com a solução sem pedir que a IA invente a causa.
3. Registrar o conceito ou passo corrigido.
4. Registrar uma regra curta para evitar a repetição.
5. Resolver outra questão equivalente sem consulta.
6. Informar confiança média ou alta somente quando a resposta foi realmente segura.
7. Obter uma segunda verificação independente em outro episódio.
8. Manter revisão adaptativa; recuperação repetida não é domínio permanente.

## Critérios

- Acerto com consulta: não confirma recuperação.
- Acerto com confiança baixa: não confirma recuperação.
- Bateria inteira correta: conta como um episódio, não como várias confirmações.
- Erro posterior: reabre o caso e zera as confirmações do episódio atual.
- Causa desconhecida: exige classificação pelo estudante antes da correção.

Os textos privados de correção permanecem no snapshot do usuário e não são enviados automaticamente ao Gemini.
