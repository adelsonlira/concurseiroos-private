# Constituição do ConcurseiroOS

## Missão

Aumentar a eficiência da preparação para concursos públicos por meio de decisões explicáveis, orientadas pelo edital, pela banca, pelo cargo e pelas evidências reais do candidato.

## Produto

O ConcurseiroOS é um sistema de apoio à decisão e um coach operacional. Não é apenas um gerenciador de estudos, uma coleção de dashboards ou um chat genérico.

A pergunta primária do produto é:

> Qual ação executável oferece agora o melhor uso do tempo disponível do candidato?

## Princípios invioláveis

1. Aprovação é o objetivo final; nenhuma funcionalidade deve existir apenas por aparência ou engajamento.
2. O sistema deve reduzir fadiga decisória, não transferi-la ao candidato.
3. A orientação principal deve dizer o que estudar, por quanto tempo, com qual material, quais páginas, quantas questões e como registrar o resultado.
4. Toda recomendação deve ser explicável e distinguir fatos, inferências, hipóteses e dados ausentes.
5. Nunca prometer aprovação nem apresentar heurística como ciência validada.
6. Dados privados de materiais podem localizar conteúdo, mas não alterar prioridade estratégica sem política explícita.
7. Dados históricos da banca só podem influenciar decisões depois de validação, versionamento e controle de qualidade.
8. Ausência de evidência não equivale a desempenho ruim.
9. Evidência futura, inválida ou inconsistente deve ser rejeitada, não normalizada silenciosamente.
10. O núcleo decisório deve permanecer puro, determinístico, auditável e independente de React, Zustand, Express e LLMs.
11. A IA generativa explica, contextualiza e auxilia; não substitui regras determinísticas nem cria cronogramas paralelos ao SDE.
12. Toda sessão concluída deve produzir evidência e invalidar a decisão anterior para permitir nova orientação.

## Hierarquia de produto

1. Segurança, integridade e regras eliminatórias.
2. Prescrição diária executável.
3. Registro confiável da execução.
4. Recalibração da próxima decisão.
5. Explicação e análise.
6. Administração, exploração e relatórios.

## Regra de desenvolvimento

Antes de concluir uma mudança:

- entender o impacto sobre a decisão do candidato;
- preservar contratos e rastreabilidade;
- implementar a menor solução coerente;
- adicionar ou atualizar testes;
- executar typecheck, testes e build;
- registrar decisões arquiteturais relevantes.
