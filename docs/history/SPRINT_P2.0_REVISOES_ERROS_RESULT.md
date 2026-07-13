# Sprint P2.0 — Revisões adaptativas operacionais e caderno de erros

## Objetivo

Avançar o ConcurseiroOS sem depender da implantação em nuvem, criando um fluxo local-first que transforme teoria concluída, erros reais e acertos com baixa confiança em ações de recuperação rastreáveis pelo SDE e pelo Planner.

## Escopo implementado

### 1. Núcleo puro de revisões

Foi criado `src/core/review/`, com funções puras, determinísticas e sem mutação para:

- criar ou reforçar ciclos de revisão;
- concluir uma revisão e calcular o próximo vencimento;
- listar revisões vencidas;
- agrupar erros reais por subassunto;
- medir apenas evidência observada de recuperação após o último erro.

Política operacional inicial:

```text
1 → 3 → 7 → 14 → 30 → 60 dias
```

Versão: `FIXED_1_3_7_14_30_60_V1`.

A política é declarada como padrão operacional inicial. Ela não afirma ser o intervalo individual ótimo, não calcula curva de esquecimento e não estima probabilidade de retenção.

A progressão usa a autoavaliação da revisão apenas para agenda:

- `Difícil`: reinicia no passo de 1 dia;
- `Médio`: avança um passo;
- `Fácil`: avança dois passos.

A autoavaliação não cria tentativa de questão e não é tratada como evidência de acerto.

### 2. Gatilhos rastreáveis

Uma revisão é criada ou reforçada somente após evento registrado:

- `TEORIA_CONCLUIDA`;
- `ERRO_QUESTAO`;
- `ACERTO_BAIXA_CONFIANCA`;
- `MANUAL`.

Erros e acertos de baixa confiança reiniciam o ciclo no primeiro passo. Uma teoria concluída preserva um vencimento anterior mais urgente quando já houver ciclo ativo.

### 3. Registro granular de questões externas

O formulário de tentativa externa passou a aceitar:

- acerto ou erro;
- tempo de resposta;
- confiança declarada: baixa, média ou alta;
- causa declarada do erro;
- nota privada sobre o erro;
- fonte externa opcional.

Causas disponíveis:

- lacuna de conteúdo;
- interpretação;
- aplicação do conceito;
- memória;
- distração;
- pressão de tempo;
- causa não identificada.

O sistema não tenta inferir a causa. Quando o usuário não a informa, registra `DESCONHECIDA`, que significa ausência de diagnóstico.

### 4. Caderno de erros

Foi criada a tela `Revisões & Erros`, com:

- fila de revisões vencidas;
- ciclos futuros;
- pausa e reativação de ciclos;
- agendamento manual;
- quantidade de erros por subassunto;
- causas declaradas;
- últimas notas privadas;
- contagem de acertos posteriores ao último erro.

Estados de recuperação:

- `SEM_ACERTO_POSTERIOR`;
- `UM_ACERTO_POSTERIOR`;
- `DOIS_OU_MAIS_ACERTOS_POSTERIORES`.

O último estado é apresentado como recuperação repetida observada, nunca como domínio permanente.

### 5. Integração com SDE e Planner

O snapshot canônico do SDE agora recebe a revisão programada mais próxima de cada subassunto:

- data do próximo vencimento;
- se está vencida;
- gatilho de origem.

Uma revisão vencida pode tornar a atividade elegível por `SCHEDULED_REVIEW_DUE`, desde que exista evidência real anterior, como teoria concluída, tentativa de questão ou outra evidência registrada.

A revisão vencida entra na camada `PROTECAO_MEMORIA`. Isso representa uma obrigação operacional de agenda, não uma probabilidade calculada de esquecimento.

O Planner continua subordinado às prioridades e restrições do SDE.

### 6. Integração com o Coach

O contexto estruturado do Coach passou a incluir:

- revisões vencidas;
- versão da política de revisão;
- tópicos com erro;
- tópicos sem acerto após o último erro;
- tópicos com recuperação inicial ou repetida;
- causas declaradas agregadas.

As notas privadas dos erros não são enviadas ao Coach. O prompt de sistema proíbe:

- inferir causas não declaradas;
- transformar autoavaliação de revisão em acerto;
- chamar recuperação observada de domínio;
- apresentar os intervalos fixos como ótimos para o usuário;
- inventar curva de retenção ou ganho esperado.

### 7. Persistência

Tentativas, causas declaradas, confiança e cronogramas de revisão usam a store existente. Portanto:

- funcionam localmente sem Supabase;
- entram no backup seguro do estado do usuário;
- serão sincronizados quando a nuvem for configurada;
- não armazenam o conteúdo dos PDFs privados.

## Arquivos principais

- `src/core/review/types.ts`
- `src/core/review/reviewEngine.ts`
- `src/core/review/tests/reviewEngine.test.ts`
- `src/components/ReviewAndErrorsView.tsx`
- `src/components/ExternalAttemptRecorder.tsx`
- `src/integrations/sde/storeEvidenceAdapter.ts`
- `src/integrations/coach/coachContext.ts`
- `src/store.ts`
- `src/types.ts`
- `server.ts`

## Validação executada

```text
npm run test:run  → 200/200 testes aprovados em 17 arquivos
npm run lint      → aprovado
npm run build     → aprovado
npm audit --omit=dev → 0 vulnerabilidades
```

O maior chunk do frontend ficou em aproximadamente 475,42 kB, sem o aviso anterior de chunk acima de 500 kB.

## Auditoria de privacidade do pacote

Foram pesquisados e excluídos do artefato distribuível:

- PDFs;
- ZIP/RAR/7z;
- DOCX;
- `node_modules`;
- `dist`;
- padrões de CPF.

Nenhum material privado da assinatura do usuário foi incluído.

## Limitações declaradas

- os intervalos ainda não são calibrados pelo histórico individual;
- confiança e causa são autorrelatos;
- duas respostas corretas posteriores não provam retenção de longo prazo;
- não existe ainda teste ativo obrigatório dentro da revisão;
- sem a implantação do Supabase, os dados permanecem somente no dispositivo e no backup manual;
- o sistema não calcula probabilidade de aprovação nem ganho causal em pontos.

## Próxima evolução sem dependência da nuvem

O próximo bloco recomendado é um relatório semanal de execução e calibração, baseado exclusivamente em:

- tempo realmente estudado;
- plano executado versus planejado;
- volume e resultado de tentativas;
- revisões vencidas e concluídas;
- evolução observada após erros;
- dados ausentes que impedem decisões melhores.

Esse relatório não deverá criar nota de produtividade nem previsão de aprovação.
