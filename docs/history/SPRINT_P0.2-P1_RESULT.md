# ConcurseiroOS — Sprint P0.2 / P1

## Status

Configuração oficial DATAPREV 2026 — Perfil 3 e primeira integração operacional do SDE concluídas e verificadas por execução local.

## Objetivo desta entrega

Transformar o núcleo matemático e o planner já auditados em um fluxo utilizável, preservando três regras:

1. dados ausentes não viram rendimento zero;
2. nenhuma estimativa de aprovação, ganho de pontos ou incidência é inventada;
3. a interface e o Coach apenas consomem decisões estruturadas do SDE.

## Implementado

### Pacote oficial DATAPREV 2026 — Perfil 3

- Concurso, edital, módulos, disciplinas, assuntos e subassuntos estruturados.
- Prova, pontuação, pesos e critérios eliminatórios cadastrados a partir do edital.
- Local de prova e lotação configurados como Natal/RN.
- Vagas de Natal/RN preservadas como dados oficiais.
- Conhecimentos específicos do Perfil 3 estruturados.
- Knowledge Graph inicialmente vazio para não inventar pré-requisitos.
- Pesos internos neutros identificados explicitamente como política, não como regra oficial.
- Incidência histórica por tópico marcada como indisponível.

### Disponibilidade variável

- Configuração semanal de sete dias.
- Perfil inicial de 180 minutos, de segunda a sábado, e domingo de descanso.
- Exceções por data.
- Desconto das sessões concluídas do saldo diário.
- O planner recebe somente o saldo real restante.

### Integração Zustand → SDE → Planner

- Snapshot imutável dos dados brutos.
- Evidências canônicas formadas apenas por tentativas e sessões reais.
- Decisão do SDE mantida como estado efêmero, fora do backup.
- Reexecução por data.
- Erros e limitações preservados na saída.

### Dashboard baseado em dados reais

- Saldo diário real.
- Tempo registrado.
- Tentativas granulares e taxa observada somente quando calculável.
- Próxima ação do SDE.
- Plano diário do planner.
- Dados ausentes e limitações declaradas.
- Ausência de gráficos ou métricas preenchidos com valores de demonstração.

### Coach IA controlado pelo SDE

- Contexto estruturado com decisão, evidências e plano reais.
- Estratégia subordinada ao SDE.
- Proibição explícita de inventar pesos, incidências, ganhos, probabilidades ou tendências.
- Modo sem decisão segura impede aconselhamento estratégico autônomo.
- Empates estratégicos são informados ao Coach como desempate operacional.

### Sessões de foco

- A recomendação atual pode preencher a sessão.
- Tipo cognitivo da atividade é registrado separadamente do cronômetro.
- Origem da decisão SDE é preservada.
- Teoria só é marcada como concluída mediante confirmação explícita do usuário.
- A conclusão de teoria nunca é inferida apenas pelo tempo decorrido.

### Questões externas

- Registro manual de acerto/erro de questões resolvidas em outra fonte.
- Seleção obrigatória de disciplina, assunto e subassunto.
- Tempo de resposta e fonte opcional.
- Nenhum enunciado externo é copiado.
- Nenhuma bateria agregada é convertida artificialmente em tentativas individuais.
- Hierarquias contraditórias são rejeitadas.

### Transparência de empates

- Ações com mesma camada constitucional e mesmo score recebem `RankingContext`.
- A ordem determinística é identificada como desempate operacional.
- A interface e o Coach não apresentam a primeira ação empatada como evidencialmente superior.

## Validação executada

- `npm run test:run`: 145/145 testes aprovados.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- 9 arquivos de teste executados.

O build mantém um aviso não bloqueador de bundle JavaScript superior a 500 kB.

## Limitações preservadas honestamente

- Não existe base empírica cadastrada de incidência FGV por tópico.
- Não existe banco de questões licenciado/importado no pacote inicial.
- Não existe probabilidade calculada de aprovação.
- Não existe retorno marginal causal em pontos por hora.
- O custo de oportunidade operacional depende de duração conhecida e ações comparáveis.
- O Knowledge Graph não contém dependências enquanto elas não forem curadas com evidência.
- No início, várias ações podem empatar por ausência de histórico; o sistema informa isso.
- Os dados agregados legados permanecem para compatibilidade visual, mas o SDE usa tentativas granulares.

## Próximo bloqueio de produto

Para integrar conteúdo completo de questões ao aplicativo é necessário definir uma fonte legal e tecnicamente importável. Até essa decisão, o fluxo seguro é:

1. estudar pelo Desk de Foco;
2. confirmar explicitamente a cobertura teórica;
3. resolver questões em fonte externa;
4. registrar cada resultado real no aplicativo;
5. recalcular o SDE.
