# P1.3 — Auditoria censitária da faixa de alta confiança da Onda A1/A2

## Escopo

- Questões revisadas: **98/98**.
- Mantidas sem correção: **94**.
- Remapeadas/corrigidas: **4**.
- Excluídas por falso positivo: **0**.
- Precisão temática automática observada antes das correções: **94/98 = 95.92%**.

**Denominador:** 98 questões originalmente classificadas como alta confiança na Onda A1/A2.

## Correções realizadas

1. O objeto explícito é Data Mining/KDD; aprendizado de máquina aparece como técnica de apoio, não como conteúdo principal de IA.
2. A questão relaciona frameworks de teste (JUnit, Mockito, Selenium e Jest); as linguagens são contexto secundário.
3. O objeto é classificação/engenharia de requisitos; JSON e XML aparecem apenas na descrição da solução.
4. TDD é o objeto principal; XP e metodologias ágeis constituem o contexto.

## Limites

- O censo cobre apenas a faixa originalmente marcada como alta confiança.
- Os 184 itens REVIEW_REQUIRED e os 701 UNCLASSIFIED não foram validados por este censo.
- A revisão foi usada para corrigir regras; portanto, não é um holdout independente.
- O holdout independente de 22 questões permanece documentado separadamente.
- Gabaritos, distratores e anulações não foram analisados.

Esta auditoria não autoriza o uso do corpus como `SDE_HISTORICAL_INCIDENCE`.