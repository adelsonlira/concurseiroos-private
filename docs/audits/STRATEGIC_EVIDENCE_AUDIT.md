# Auditoria de evidências estratégicas — FGV / DATAPREV 2026 — Perfil 3

## Veredito

Os materiais são relevantes, mas possuem papéis diferentes e não podem ser misturados:

1. **Edital oficial:** autoridade para escopo, regras, pesos, datas e critérios eliminatórios.
2. **Questões FGV:** evidência empírica primária para estilo e possível incidência, após curadoria.
3. **Estudo de terceiros:** hipótese secundária; os percentuais ainda não são reproduzíveis.
4. **NotebookLM:** síntese de hipóteses; não é uma fonte independente.
5. **Vídeos de especialistas:** opinião qualitativa; exigem transcrição e rastreabilidade das afirmações.

## Auditoria objetiva dos PDFs

Foram extraídos 3.352 blocos de questões e 3.348 IDs externos únicos dos seis PDFs de 2021 a 2026.
O corpus é heterogêneo: reúne desenvolvimento, dados, segurança, redes, infraestrutura, informática
básica, perícia e diversas linguagens. Por isso, contar diretamente todas as questões produziria uma
matriz enviesada para o Perfil 3.

A triagem automática gerou apenas candidatos à revisão. Ela não está ativada no SDE.

## Avaliação do relatório NotebookLM

### Hipóteses plausíveis

- separar informática básica, redes de baixo nível, perícia e administração de servidores;
- priorizar interpretação de código, situações-problema e distinção entre conceitos próximos;
- investigar com atenção SQL, segurança de aplicações, engenharia de software, padrões, Java e
  frameworks;
- tratar o estilo da banca como dado diferente da frequência por tópico.

### Afirmações que ainda não podem ser tratadas como fato

- “20% do edital trará 80% dos pontos”;
- percentuais exatos de incidência;
- tópicos “nunca cobrados” sem lista auditável de questões elegíveis;
- descarte integral de uma tecnologia apenas porque apareceu em cargos diferentes;
- qualquer prioridade baseada somente em opinião de professor ou síntese de IA.

## Avaliação do estudo de terceiros

O documento declara aproximadamente 800 questões em 20 provas de 2023 a 2026 e apresenta
contagens estimadas. Porém, não inclui:

- lista das 20 provas;
- IDs das questões por categoria;
- critérios reproduzíveis de inclusão/exclusão;
- tratamento de questões multidisciplinares;
- deduplicação;
- revisão de classificação;
- intervalo de confiança ou análise de sensibilidade.

Logo, os números foram registrados como `UNVERIFIED_EXTERNAL_ESTIMATE` e não afetam o SDE.

## Decisão de arquitetura

Foi criada uma camada de evidências estratégicas separada do SDE. O motor continua usando prior
neutro e registra a incidência como indisponível. Uma política de ativação impede que corpus bruto,
IA, estudo secundário ou vídeo alterem a prioridade.

## Próximo trabalho de curadoria

1. revisar primeiro as questões diretamente associadas a DATAPREV e cargos de desenvolvimento;
2. revisar os tópicos de maior convergência entre as fontes: banco de dados, segurança de aplicações,
   engenharia/requisitos, Java/Spring, arquitetura e BI;
3. marcar cada questão como aderente, não aderente ou ambígua;
4. permitir múltiplos tópicos, mas escolher um tópico principal para estatística;
5. calcular incidência somente após deduplicação e revisão mínima por tópico;
6. testar a sensibilidade do ranking antes de ativar a matriz.
