# ADR-003 — IA contextual em três papéis

Data: 2026-07-15
Status: Aceito

## Contexto

A interface apresentava doze personagens de IA que compartilhavam o mesmo endpoint e variavam principalmente em tom de prompt. Isso criava expectativa de múltiplos agentes capazes de agir, aumentava a navegação e não deixava claro que o SDE era a única autoridade estratégica.

## Decisão

A camada generativa passa a ter três papéis explícitos:

1. **Coach Estratégico** — explica a decisão estruturada do SDE.
2. **Tutor do Tópico Atual** — ensina o conteúdo da prescrição sem alterar o plano.
3. **Analista de Erros** — organiza evidências e propõe protocolo de correção sem diagnosticar além dos registros.

Ações operacionais permanecem determinísticas e exigem comando explícito da interface. A IA não inicia sessões, não altera prioridades, não registra evidências e não ativa tendências de banca.

## Consequências positivas

- menor carga cognitiva;
- promessa de produto compatível com a capacidade real;
- separação clara entre decisão, explicação e ensino;
- menos risco de alucinação estratégica;
- integração direta com a prescrição atual.

## Consequências negativas

- especializações por disciplina deixam de aparecer como personagens separados;
- a qualidade didática ainda depende do modelo e do contexto enviado;
- ações futuras exigirão contratos explícitos, confirmação e testes próprios.
