# CONSTITUIÇÃO DO CONCURSEIROOS
## Versão 1.0 — Documento de Referência Máxima de Arquitetura e Produto

---

## INTRODUÇÃO E ESCOPO

Este documento constitui a **Constituição Oficial do ConcurseiroOS**. Toda decisão de arquitetura de software, design de dados, priorização de backlog de produto, engenharia de inteligência e interfaces deve submeter-se e alinhar-se estritamente aos princípios, leis e diretrizes aqui estabelecidos. 

O foco de otimização inicial da plataforma é o concurso **DATAPREV (Cargo: Perfil 3 — Engenharia de Software / Tecnologia da Informação)** sob a organização da banca **Fundação Getulio Vargas (FGV)**. No entanto, os modelos matemáticos, as estruturas de dados e a arquitetura do **Strategic Decision Engine (SDE)** devem ser concebidos de forma agnóstica e escalável, permitindo a ingestão de novos editais, cargos e bancas sem a necessidade de reescrever o núcleo cognitivo do sistema.

---

## 1. MISSÃO

A missão primordial do **ConcurseiroOS** é atuar como um **Sistema Inteligente de Apoio à Decisão (Decision Support System - DSS)** que maximiza, de forma mensurável e baseada em evidências científicas, a probabilidade de aprovação do usuário em concursos públicos de alta complexidade.

### O Problema que o SDE Resolve:
Estudar para concursos de elite envolve uma sobrecarga de decisão paralisante (*choice overload*). O candidato desperdiça recursos cognitivos escassos tentando decidir:
1. O que estudar hoje entre dezenas de matérias.
2. Quando revisar para não esquecer matérias antigas sem travar o avanço do edital.
3. Como balancear o tempo entre teoria, questões e simulados.
4. Como diagnosticar e corrigir falhas invisíveis de rendimento antes do dia da prova.

O SDE elimina o "custo de decisão" (*decision-making fatigue*). Ao invés de o usuário gerenciar planilhas e cronogramas manuais, o sistema assume o papel de estrategista-chefe, fornecendo diariamente recomendações de micro-ações de alto impacto operacional que aproximam o candidato da aprovação.

### O que significa "aproximar da aprovação"?
Significa converter o tempo de estudo investido no maior ganho possível de pontuação líquida esperada no dia da prova, mitigando simultaneamente o risco de eliminação por cláusulas de barreira ou mínimos por disciplina.

---

## 2. VISÃO (HORIZONTE DE 5 ANOS)

Em 5 anos, o ConcurseiroOS será a plataforma de inteligência de aprendizagem de referência na América Latina, reconhecida por transformar dados brutos de interação em roteiros preditivos de aprovação. 

O sistema terá evoluído de um recomendador reativo local para um **Soberano Motor de Otimização Preditiva**, capaz de simular dinamicamente o comportamento de concorrência e prever a nota de desempenho de um candidato com margem de erro inferior a 3% com base em curvas de proficiência calibradas via Teoria de Resposta ao Item (TRI) e modelos de aprendizado adaptativo profundo.

---

## 3. VALORES FUNDAMENTAIS

O desenvolvimento e comportamento do ConcurseiroOS são regidos pelos seguintes valores invioláveis:

*   **Honestidade Intelectual**: A inteligência artificial e as estatísticas do sistema devem refletir a dura realidade do rendimento do candidato. O ConcurseiroOS nunca deve "suavizar" diagnósticos ruins para motivar artificialmente o usuário. A verdade estatística é o único caminho para a aprovação.
*   **Explicabilidade (XAI)**: Nenhuma recomendação do SDE será tratada como caixa-preta (*black box*). O usuário tem o direito constitucional de saber exatamente quais variáveis matemáticas, pesos de edital e dados históricos fundamentaram a decisão do sistema de sugerir determinada atividade.
*   **Transparência**: O sistema deve expor seus limites de precisão de forma explícita. Se houver poucos dados coletados sobre uma matéria, a recomendação deve vir acompanhada do correspondente grau de incerteza.
*   **Decisão Baseada em Evidências**: Intuições, palpites ou preferências subjetivas de estudo do usuário são subordinados aos dados objetivos de taxa de acerto, tempo de retenção, relevância estatística da banca e probabilidade de incidência.
*   **Simplicidade Operacional**: A complexidade matemática deve residir inteiramente no backend (SDE). Para o usuário final, a interface deve traduzir modelos probabilísticos densos em direcionamentos claros, minimalistas e acionáveis.
*   **Melhoria Contínua (Kaisen)**: O motor reavalia continuamente a eficácia de suas próprias diretrizes. Se o SDE recomendou um plano de ataque para uma fraqueza em Banco de Dados e, após 15 dias, as métricas de simulados não evoluíram, o SDE deve recalibrar sua estratégia para aquele perfil de usuário.

---

## 4. LEIS FUNDAMENTAIS (CONSTITUCIONAIS)

As seguintes leis são imutáveis e sobrepõem-se a qualquer recurso ou solicitação de funcionalidade:

*   **Art. 1º** — Toda recomendação de estudo gerada pelo SDE deve vir acompanhada de uma justificativa lógica baseada em dados objetivos. Recomendações sem justificativa explícita e auditável são nulas por direito de design.
*   **Art. 2º** — O ConcurseiroOS está proibido de desperdiçar o tempo de estudo do usuário. Qualquer funcionalidade que induza o usuário a realizar tarefas puramente burocráticas, de digitação redundante ou de preenchimento desnecessário de dados deve ser sumariamente eliminada.
*   **Art. 3º** — O sistema nunca recomendará o estudo focado de um tópico sem antes avaliar o seu Custo de Oportunidade (peso no edital vs. tempo necessário para domínio vs. taxa de acerto atual).
*   **Art. 4º** — O SDE deve expor explicitamente as incertezas estatísticas. É vedado ao sistema dar diagnósticos de "domínio de assunto" com base em amostras estatísticas irrelevantes (ex: afirmar que o usuário domina *Java Multithreading* tendo respondido apenas 3 questões).
*   **Art. 5º** — O bem-estar cognitivo e a saúde mental do candidato são ativos estratégicos de aprovação. O sistema monitorará sinais de estafa mental (*burnout*) e fadiga cognitiva, recomendando ativamente pausas ou desacelerações táticas quando o rendimento marginal do tempo investido for decrescente.

---

## 5. HIERARQUIA DAS DECISÕES (ALGORITMO DE PRIORIZAÇÃO)

Quando o SDE computa a ação recomendada do dia, ele deve aplicar rigorosamente a seguinte árvore hierárquica de decisão estruturada:

```
                  [1. EVITAR RISCO DE ELIMINAÇÃO]
                   (Mínimos exigidos por matéria)
                                 │
                                 ▼
                  [2. CORRIGIR LACUNAS EM PESOS ALTOS]
                  (Matérias de alta relevância/baixo acerto)
                                 │
                                 ▼
                  [3. MAXIMIZAR RETORNO ESPERADO (ALAVANCAGEM)]
                   (Tópicos de médio domínio e alto peso)
                                 │
                                 ▼
                  [4. PROTEGER A MEMÓRIA (REVISÕES ATIVAS)]
                   (Risco iminente de esquecimento/decay)
                                 │
                                 ▼
                  [5. EXPANSÃO DE EDITAL (NOVOS CONTEÚDOS)]
                     (Tópicos não estudados, em ordem de peso)
                                 │
                                 ▼
                  [6. MANUTENÇÃO DE EXCELÊNCIA]
                      (Blindagem de notas > 90%)
```

### Detalhamento e Justificativa Científica:

1.  **Evitar Risco de Eliminação**: Editais modernos de elite (como DATAPREV e concursos da FGV) frequentemente possuem cláusulas de barreira (ex: mínimo de 40% em conhecimentos básicos ou não zerar nenhuma matéria específica). De nada adianta o candidato ter proficiência de 95% em Engenharia de Software se ele zerar Língua Portuguesa. O SDE identifica imediatamente desvios em relação à zona de segurança mínima e força o redirecionamento de energia de estudo para lá.
2.  **Corrigir Lacunas em Pesos Altos**: O foco é o ganho de pontuação absoluta. Uma disciplina com Peso 3 onde o candidato tem 50% de acerto oferece uma margem de crescimento de pontos líquidos muito superior a uma matéria de Peso 1 onde ele tem 80%.
3.  **Maximizar Retorno Esperado (Alavancagem de Notas)**: É estatisticamente muito mais rápido e energeticamente eficiente elevar o rendimento de um tópico de 65% para 85% (zona de proficiência média para avançada) do que arrastar um tópico de 85% para 95% (zona de rendimentos decrescentes e extrema especificidade). O SDE prioriza essa "zona de alavancagem rápida" para gerar saltos ágeis de pontuação no simulado.
4.  **Proteger a Memória (Revisões Ativas e Espaçadas)**: Baseado na Curva de Esquecimento de Ebbinghaus e na teoria de Desejáveis Dificuldades de Bjork. A retenção a longo prazo exige revisões ativas no momento em que a força da memória começa a declinar. Se o SDE detectar que um assunto de alto peso está prestes a sofrer decaimento drástico de retenção, ele suspende o ganho de novas matérias para consolidar a base existente.
5.  **Expansão de Edital (Avanço de Tópicos Inéditos)**: Somente quando a fundação de segurança está protegida e revisada, o SDE recomenda o avanço na teoria e em exercícios de novos tópicos do edital da DATAPREV Perfil 3, sempre em ordem decrescente de peso estatístico na prova.
6.  **Manutenção de Excelência**: Revisão leve e exercícios de manutenção para assuntos já dominados (taxa de acerto histórica estável superior a 90% com amostra estatística representativa). O SDE busca apenas blindar a nota do candidato nesses tópicos consumindo o mínimo de tempo de estudo possível.

---

## 6. FONTES DE VERDADE E RESOLUÇÃO DE CONFLITOS

O SDE operará com uma matriz rígida de confiabilidade e importância das informações de entrada:

| Fonte de Dados | Grau de Confiança (Estrelas) | Frequência de Atualização | Descrição / Papel no Motor |
| :--- | :---: | :---: | :--- |
| **Edital Oficial (DATAPREV Perfil 3)** | ★★★★★ | Estática / Por Retificação | Define os pesos absolutos, disciplinas obrigatórias, regras de eliminação e escopo de conteúdos. |
| **Métricas Reais de Questões** | ★★★★★ | Em Tempo Real | Histórico de acertos, erros e velocidade de resposta do usuário em questões reais do estilo da banca. |
| **Simulados Globais / Integrados** | ★★★★☆ | Semanal | Avaliação integrativa de tempo, resistência física, controle de ansiedade e rendimento sob pressão multimatéria. |
| **Estatísticas Históricas da Banca** | ★★★★☆ | Mensal | Análise estatística de incidência de assuntos da FGV nos últimos 5 anos para cargos similares de TI. |
| **Interações com Flashcards** | ★★★☆☆ | Diário | Indica o estado microscópico de retenção de fatos, prazos, mnemônicos e sintaxes literais da memória ativa. |
| **Biblioteca de Materiais de Estudo** | ★★☆☆☆ | Sob Demanda | Mapeia as fontes de conteúdo consultadas (PDFs, videoaulas), ajudando a isolar materiais ineficazes. |
| **Autoavaliação Subjectiva** | ★☆☆☆☆ | Periódica | Percepção de confiança informada pelo usuário sobre cada assunto do edital (usada apenas como tiebreaker ou calibrador inicial). |

### Resolução de Conflitos de Dados:
*   **Conflito: Autoavaliação vs. Desempenho Real em Questões**
    *   *Cenário*: O usuário se autoavalia como "Avançado" em Banco de Dados SQL, mas suas métricas reais nas últimas 30 questões da FGV indicam 52% de acerto.
    *   *Resolução*: O SDE ignora completamente a autoavaliação do usuário para fins de priorização de ciclo, sinaliza o viés de superestimação na Central de Inteligência e impõe exercícios corretivos imediatos.
*   **Conflito: Desempenho em Simulados vs. Desempenho em Treinos Isolados**
    *   *Cenário*: O usuário mantém 85% de acertos fazendo blocos isolados de questões de Engenharia de Software no terminal de exercícios, mas cai para 55% de acerto nos blocos de Engenharia de Software nos Simulados integrados.
    *   *Resolução*: O SDE interpreta o rendimento do Simulado como mais confiável para modelar o dia da prova. Ele diagnostica que o usuário sofre de fadiga de contexto (perda de rendimento ao alternar disciplinas rapidamente) e prioriza exercícios multimatérias interfolhados ao invés de blocos homogêneos.

---

## 7. CRITÉRIOS CIENTÍFICOS PARA RECOMENDAR ATIVIDADES

O SDE utiliza regras de gatilho baseadas na intersecção entre a complexidade do assunto, relevância da banca (FGV), e proficiência e retenção atuais do usuário para emitir recomendações:

### A. Quando Recomendar TEORIA:
*   **Gatilho**: Assunto inédito no edital (0 questões respondidas) ou assunto com rendimento crítico persistente (inferior a 50% após mais de 40 questões respondidas) que indica vácuo conceitual básico.
*   **Fundamento de Aprendizagem**: *Overlearning* prematuro de questões sem base de dados conceitual gera frustração e memorização inútil do gabarito de questões específicas ao invés de consolidação de esquemas mentais.

### B. Quando Recomendar QUESTÕES DA BANCA (FGV):
*   **Gatilho**: O usuário possui base teórica prévia (sinalizada por leitura concluída ou autoavaliação), mas volume de questões é baixo (<100 por subassunto) ou a taxa de acerto está oscilando na faixa de 60% a 80%.
*   **Fundamento de Aprendizagem**: Prática Espaçada (*Spaced Practice*) e Efeito de Testagem (*Testing Effect*). Responder questões de múltipla escolha ou certo/errado força o cérebro a recuperar ativamente a informação, o que consolida caminhos sinápticos de retenção com mais força do que ler a teoria passivamente.

### C. Quando Recomendar REVISÃO SISTÊMICA (Leitura ativa de resumos ou mapas):
*   **Gatilho**: Identificação de queda sistemática na taxa de acertos de um bloco de matérias avançado que caiu de >80% para <70% nos simulados nos últimos 20 dias.
*   **Fundamento de Aprendizagem**: Manutenção de esquemas de alto nível estrutural. Impede o desmoronamento de conceitos interconectados.

### D. Quando Recomendar FLASHCARDS:
*   **Gatilho**: Tópicos com alta densidade de detalhes arbitrários de decoreba obrigatória (exemplos no Perfil 3 da DATAPREV: portas de serviços de redes, comandos e flags de Linux, sintaxe de herança de Java, códigos de erro HTTP, prazos de auditoria de segurança da informação).
*   **Fundamento de Aprendizagem**: Recordação Ativa (*Active Recall*) extrema com Sistema de Leitner ou algoritmo SM-2. Ideal para converter fatos isolados de memória de curto prazo para memória de longo prazo, reduzindo o tempo de consulta a zero.

### E. Quando Recomendar SIMULADOS COMPLETOS:
*   **Gatilho**: Candidato atinge mais de 65% de cobertura ponderada do edital programático. Realizado idealmente em intervalos semanais (sábados ou domingos).
*   **Fundamento de Aprendizagem**: Treinamento de resistência biológica, velocidade de processamento de prova e habituação ao estresse térmico/cognitivo do ambiente real de exame (*contextual desensitization*).

### F. Quando Recomendar DESCANSO INTEGRAL:
*   **Gatilho**: Taxa de acerto em declínio contínuo em todas as disciplinas nas últimas 48 horas, acompanhada de tempo de resposta por questão excessivamente alto (indicativo de fadiga mental profunda) ou sequência de estudos ininterrupta superior a 14 dias sem folga.
*   **Fundamento de Aprendizagem**: Consolidação de memória dependente do sono e restauração do foco atencional (Teoria de Restauração de Atenção de Kaplan).

---

## 8. CRITÉRIOS PARA NÃO RECOMENDAR ALGO (VETOS E BLOQUEIOS)

O sistema de inteligência de estudos de elite deve saber dizer "NÃO" com tanta precisão quanto diz "SIM".

O SDE bloqueará ativamente recomendações nas seguintes situações:

*   **Veto de Inutilidade da Banca (Baixa Relevância)**: Não recomendar o estudo de teorias profundas ou o treino de assuntos que possuem peso zero ou incidência estatística histórica nula pela FGV nos últimos 5 anos de provas de TI (ex: tópicos obscuros e ultrapassados de arquiteturas de computadores legadas), a menos que o edital DATAPREV exija explicitamente de forma isolada.
*   **Veto de Desperdício Energético (Custo de Oportunidade Crítico)**: Não recomendar tópicos extensos e complexos com peso baixo se a prova estiver a menos de 15 dias (ex: tentar dominar toda a especificação de especificação formal em Engenharia de Software se o assunto representa apenas 1% dos pontos e o usuário está com apenas 50% de acerto em Banco de Dados que vale 15% da prova).
*   **Veto de Inversão de Pré-requisito (Dependência Conceitual)**: Não recomendar que o usuário faça questões avançadas de desenvolvimento Java Spring Boot com JPA se suas estatísticas mostram que ele ainda possui um rendimento abaixo de 50% nos conceitos fundamentais de Orientação a Objetos (POO) em Java. O SDE trava o avanço até que o pré-requisito conceitual seja estabilizado.

---

## 9. GESTÃO DA INCERTEZA E GRAUS DE CONFIANÇA

Para proteger a integridade diagnóstica e evitar falsas percepções de prontidão, o ConcurseiroOS diferencia rigorosamente as informações que manipula e calcula o **Nível de Confiança da Recomendação**:

### A. Diferenciação Operacional:
*   **Fatos (Confiança 100%)**: Dados imutáveis explícitos do edital (pesos, regras) e respostas reais validadas do usuário no sistema.
*   **Inferências (Confiança Probabilística)**: Estimativa da taxa de acerto real do usuário baseada em amostras pequenas ou extrapolação estatística de subassuntos correlacionados (ex: inferir que o usuário entende bem o conceito de herança porque obteve bom desempenho em polimorfismo).
*   **Hipóteses (Confiança de Testagem)**: Suposição de que o rendimento em simulados caiu porque o usuário mudou o horário de estudos ou porque houve fadiga cognitiva no final da prova. Deve ser validada por testes subsequentes monitorados pelo SDE.

### B. Cálculo do Nível de Confiança da Recomendação (NCR):

O NCR de cada relatório diagnóstico ou plano estratégico diário é classificado em três níveis baseado em duas variáveis: **Tamanho de Amostra Estatística (N)** e **Recência dos Dados (R)**.

```
NCR = f(Volume de Questões (N) , Idade dos Dados em Dias (R))
```

*   **ALTA CONFIANÇA**: 
    *   *Critério*: Mais de 100 questões respondidas do assunto em menos de 15 dias, ou histórico consistente em Simulados recentes.
    *   *Ação do SDE*: Prescreve planos cirúrgicos de precisão cirúrgica de alavancagem de notas.
*   **MÉDIA CONFIANÇA**:
    *   *Critério*: Entre 20 e 99 questões respondidas, ou dados coletados há mais de 30 dias.
    *   *Ação do SDE*: Recomenda uma mescla rápida de questões de validação diagnóstica antes de propor uma intervenção teórica profunda.
*   **BAIXA CONFIANÇA**:
    *   *Critério*: Menos de 20 questões respondidas, ou dados desatualizados baseados apenas em autoavaliações passadas.
    *   *Ação do SDE*: Emite o alerta: *"Dados insuficientes para diagnóstico preciso"*. O sistema suspende temporariamente decisões estruturais de longo prazo e prescreve um "Roteiro de Coleta de Evidências" (uma sequência de 15 a 20 questões mistas cronometradas da banca sobre os tópicos cinzentos).

---

## 10. EXPLICABILIDADE DA INTELIGÊNCIA (XAI)

Nenhuma recomendação de estudo ou plano de ação do SDE será exibido sem uma estrutura de justificação analítica composta obrigatoriamente por 4 pilares:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      RECOMENDAÇÃO OPERACIONAL                          │
│     "Estudar 45 min de 'Banco de Dados NoSQL' seguido de questões FGV" │
├────────────────────────────────────────────────────────────────────────┤
│ 1. POR QUÊ?                                                            │
│    "Seu rendimento real é de 55% e o peso histórico deste tópico       │
│     no perfil 3 da DATAPREV/FGV é classificado como MUITO ALTO."       │
│                                                                        │
│ 2. BASE DE DADOS UTILIZADA                                             │
│    "Análise de 18 questões respondidas nos últimos 10 dias e           │
│     relação de pesos contidos no edital oficial."                      │
│                                                                        │
│ 3. BENEFÍCIO ESPERADO (ALAVANCAGEM)                                    │
│    "Elevar este assunto para a zona segura de 75% injetará             │
│     aproximadamente +1.8 pontos líquidos na sua nota de prova."        │
│                                                                        │
│ 4. CUSTO DE IGNORAR (RISCO)                                            │
│    "Você continuará vulnerável a 3 questões certas na prova,           │
│     mantendo o risco de exclusão pelo mínimo de específicas abaixo."   │
└────────────────────────────────────────────────────────────────────────┘
```

A interface e as APIs devem ser construídas de forma que este modelo de justificação em 4 quadrantes seja nativamente suportado e exibido de maneira limpa, intuitiva e sem termos vazios.

---

## 11. SISTEMA DE APRENDIZADO CONTÍNUO (FEEDBACK LOOP)

O Strategic Decision Engine não é um sistema estático de regras condicionais simples (`if/else`). Ele implementa um ciclo contínuo de adaptação baseado estritamente nas interações reais do usuário:

```
             ┌─────────────────────────────────────────┐
             │       RECOMENDAÇÃO DO SDE EMITIDA       │
             └────────────────────┬────────────────────┘
                                  │
                                  ▼
             ┌─────────────────────────────────────────┐
             │     AÇÃO DO USUÁRIO (Aceitar/Rejeitar)  │
             └────────────────────┬────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
   [ACEITOU E EXECUTOU]                            [REJEITOU OU ADIOU]
         │                                                 │
         ▼                                                 ▼
┌────────────────────────────────┐                ┌────────────────────────────────┐
│ Coleta métricas de rendimento  │                │ Avalia o motivo (Excesso tempo,│
│ (Se houve acertos, erros, etc.)│                │ complexidade, indisposição).   │
└────────────────┬───────────────┘                └────────────────┬───────────────┘
                 │                                                 │
                 └────────────────────────┬────────────────────────┘
                                          │
                                          ▼
             ┌─────────────────────────────────────────┐
             │       RECALIBRAÇÃO DOS INDICADORES      │
             │ (Ajusta velocidade média, taxa de decay │
             │   da curva e sensibilidade à fadiga)    │
             └─────────────────────────────────────────┘
```

### Mecânica de Ajuste:
1.  **Calibração da Velocidade de Avanço**: O SDE rastreia o tempo médio que o usuário leva para concluir a teoria de uma página de edital. Se o usuário avança mais rápido que a média com taxas de acertos subsequentes estáveis (>80%), o SDE reduz o tempo sugerido para teoria e acelera a liberação de novos subassuntos.
2.  **Ajuste Personalizado da Curva de Esquecimento**: Se o SDE agenda uma revisão de flashcards para 7 dias após o estudo inicial e o usuário apresenta uma taxa de recordação de apenas 40%, o SDE aprende que o tempo de retenção desse candidato para aquela matéria é mais curto. Ele encurta automaticamente a janela de revisão do próximo ciclo para 4 dias, buscando o ponto ideal de consolidação sináptica.
3.  **Análise de Desvio de Eficácia**: O motor armazena o histórico de todas as recomendações de intervenção feitas. Se as recomendações do tipo "Rever Flashcards" sistematicamente geram melhor evolução de simulado do que "Ler Resumos em PDF" para o usuário em tópicos de TI, o algoritmo prioriza o acionamento de flashcards nos próximos ciclos corretivos daquela área temática.

---

## 12. INDICADORES REAIS DE EVOLUÇÃO (MÉTRICAS DE ELITE)

O ConcurseiroOS rejeita a vaidade de contabilizar apenas "Horas Brutas de Estudo" (*vanity metrics*). O SDE calculará e baseará suas decisões nos seguintes indicadores reais:

### I. Taxa de Cobertura Ponderada do Edital (CPE)
*   **O que mede**: A porcentagem do edital oficial que o usuário realmente domina de forma segura, ponderado pela relevância de cada assunto para a nota final.
*   **Como influencia**: Se a CPE estiver baixa a poucos dias da prova, o SDE para de recomendar qualquer aprofundamento teórico em disciplinas marginais de baixo peso e foca exclusivamente em blindar os 80% mais prováveis de cobrança.

### II. Risco de Eliminação (RE)
*   **O que mede**: A probabilidade estatística de o candidato não atingir a pontuação mínima exigida por bloco de disciplinas no edital da DATAPREV Perfil 3, considerando o desvio padrão histórico de seu rendimento em questões FGV.
*   **Como influencia**: Sempre que o RE for superior a 15%, o painel principal ativa um alerta crítico de segurança e força o SDE a priorizar o estudo da matéria vulnerável, ignorando outras estratégias de expansão de edital.

### III. Retorno Marginal do Estudo (RME)
*   **O que mede**: A estimativa de quantos décimos de ponto líquido na prova do concurso o usuário adicionará para cada hora de estudo dedicada a um assunto específico.
*   **Como influencia**: É o fator primário de desempate de priorização. Entre estudar "Arquitetura de Computadores" e "Metodologias Ágeis", o SDE escolherá o que apresentar o maior RME calculado para o dia.

### IV. Consistência e Ritmo de Memória (CRM)
*   **O que mede**: A regularidade com que o usuário realiza sessões de recordação ativa (exercícios e flashcards) sem quebras de streak que provoquem desmoronamento acumulado de curvas de retenção.
*   **Como influencia**: Se a CRM estiver em queda, o SDE prioriza micro-tarefas rápidas de 10 minutos de revisão atenta na tela para reestabelecer o hábito e estancar a perda de memória de curto prazo.

---

## 13. LIMITES ÉTICOS E DE RESPONSABILIDADE (IA RESPONSÁVEL)

O ConcurseiroOS é uma ferramenta científica e de suporte, não uma oráculo místico ou promessa comercial de aprovação. O SDE deve respeitar os seguintes limites rígidos:

*   **Não Prometer Aprovação**: O sistema é expressamente proibido de exibir frases como *"Sua aprovação está garantida!"* ou de estimar probabilidade de aprovação de 100%. A aprovação depende de inúmeras variáveis imprevisíveis de ambiente de prova, controle emocional e modificações de banca.
*   **Não Inventar Dados de Nota de Corte**: O sistema não inventará estimativas fictícias de notas de corte baseando-se em achismos. Se estimativas forem fornecidas, elas devem vir acompanhadas de fontes históricas de concursos anteriores da DATAPREV/FGV ou relatórios oficiais da banca com dados de desvio padrão.
*   **Veto a Alucinações de Incidência**: O SDE não afirmará que determinado assunto *"vai cair com certeza absoluta"* se não houver correlação estatística robusta na base de dados de provas passadas da FGV.
*   **Proteção à Saúde Mental do Candidato**: O SDE identificará padrões autodestrutivos de estudo (ex: sessões de estudo que degradam o rendimento drasticamente após as primeiras 6 horas diárias de forma persistente, ou streaks insanos de privação de sono). O sistema emitirá recomendações explícitas de desaceleração protetiva: *"Seu cérebro atingiu o limite de saturação para o dia de hoje. Continuar estudando agora apresenta um ganho marginal nulo e degradará suas curvas de memória."*
*   **Sem Manipulação Emocional**: O sistema não utilizará técnicas de marketing agressivo, gatilhos de medo artificiais ou notificações de pânico para forçar o engajamento do usuário. O engajamento deve vir da percepção clara de progresso estatístico e redução de fadiga operacional.

---

## 14. ESCALABILIDADE ARQUITETURAL (AGNOSTICISMO DE PROVA)

Embora a instância primária seja calibrada para o ecossistema **DATAPREV (Perfil 3 — Banca FGV)**, a arquitetura do banco de dados e do motor SDE deve ser estritamente genérica.

### Mecânica de Portabilidade:
O sistema deve ser estruturado de forma que a transição para qualquer outro edital de concurso (ex: Polícia Federal - CESPE, ou Caixa Econômica Federal - CESGRANRIO) seja efetuada exclusivamente através da injeção de uma **Matriz de Configuração JSON de Metadados de Edital**, contendo:

1.  **Estrutura de Conteúdo**: Árvore hierárquica de Disciplinas, Assuntos e Subassuntos.
2.  **Pesos e Mínimos**: Definição de pesos das questões por bloco, número de questões por matéria, regras de fator de correção (como Cebraspe Certo/Errado) e cláusulas de corte.
3.  **Vetor de Incidência da Banca**: Coeficientes de relevância histórica de incidência de assuntos da nova banca informada.

Qualquer acoplamento forte (*hardcoding*) de regras específicas da FGV ou da DATAPREV fora dessa estrutura JSON isolada de parametrização é estritamente proibido no codebase da aplicação.

---

## 15. CRITÉRIOS CONSTITUCIONAIS DE APROVAÇÃO DE NOVAS FUNCIONALIDADES

Para garantir que o ConcurseiroOS permaneça fiel à sua missão e livre de inchaço de recursos inúteis (*feature creep* ou "AI slop" decorativo), qualquer nova funcionalidade ou tela candidata ao backlog de desenvolvimento deve passar obrigatoriamente por um crivo avaliativo composto pelas seguintes perguntas eliminatórias:

1.  **Aumenta diretamente a probabilidade de aprovação do candidato?**
    *   *Critério*: Deve haver uma conexão óbvia baseada em Ciência da Aprendizagem ou Análise de Dados que demonstre como essa tela ajuda o candidato a acertar mais questões na prova real. Se for apenas para "visualização bonitinha" de dados estáticos, deve ser rejeitada ou colocada em baixa prioridade.
2.  **Reduz o tempo de tomada de decisão do usuário sobre sua rotina?**
    *   *Critério*: Deve automatizar ou simplificar o processo de escolha, tirando o peso de agendamento de revisões ou escolha de temas das costas do usuário.
3.  **Melhora qualitativamente a precisão ou explicabilidade das recomendações geradas pelo SDE?**
    *   *Critério*: Deve fornecer ao SDE dados mais limpos, confiáveis e granulares de rendimento real do usuário (ex: cronometria de resposta de questões, detalhamento de erros por tipo - distração vs. falta de teoria).
4.  **Respeita estritamente os limites de agnosticismo arquitetural, explicabilidade e segurança mental previstos nesta constituição?**
    *   *Critério*: O design da funcionalidade não pode violar os valores de verdade estatística, ausência de caixa-preta de IA, ou induzir o usuário a rotinas nocivas à saúde mental.

Se a funcionalidade proposta receber uma resposta "NÃO" para qualquer um dos 3 primeiros critérios, ou um "NÃO" para o 4º critério, ela está **constitucionalmente vetada** de entrar no ecossistema ConcurseiroOS.

---

Aprovado de forma unânime e instituído como Documento de Referência Máxima do **ConcurseiroOS** em 11 de Julho de 2026.
