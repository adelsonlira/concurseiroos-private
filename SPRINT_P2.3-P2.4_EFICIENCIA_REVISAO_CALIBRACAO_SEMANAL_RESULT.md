# Sprint P2.3–P2.4 — Eficiência observada de revisão e calibração semanal

Data de validação: 2026-07-13

## Objetivo

Evoluir a política `HYBRID_ADAPTIVE_REVIEW_V2` sem engessar o plano de estudos:

1. registrar o tempo real gasto em cada protocolo de revisão;
2. comparar retenção observada e custo temporal sem criar “pontos por hora”;
3. contabilizar revisão como tempo real de estudo e descontá-la da disponibilidade diária;
4. oferecer uma leitura semanal objetiva de execução, questões, revisões, avanço e dados ausentes;
5. manter a proteção de avanço em conteúdo novo.

## P2.3 — Cronometragem e eficiência dos métodos

### Fluxo de revisão

A tela `Revisões & Erros` passou a exigir o início explícito da recuperação antes de registrar o resultado. O cronômetro:

- mede o tempo decorrido em segundos;
- permanece ativo ao navegar entre telas na mesma aba por meio de `sessionStorage`;
- é removido ao concluir ou cancelar;
- permite apenas uma revisão ativa por aba;
- não transforma duração em evidência de acerto.

Ao concluir, o usuário registra um dos resultados já existentes:

- `HARD`: não recuperou ou precisou consultar;
- `MEDIUM`: recuperou independentemente com esforço;
- `EASY`: recuperou independentemente com fluência.

### Persistência

Cada entrada de histórico pode armazenar:

- `tempoGastoSegundos`;
- `duracaoFonte` (`TIMER`, `MANUAL` ou `LEGACY_UNKNOWN`);
- protocolo aplicado;
- resultado;
- intervalo até a recuperação posterior.

Revisões antigas sem duração continuam válidas, mas são excluídas da análise de eficiência.

### Contabilização do estudo

Uma revisão cronometrada agora cria uma `SessaoEstudo` real com:

- `atividadeEstudo: revisao`;
- duração medida;
- data local;
- vínculo com disciplina, assunto e subassunto;
- `contabilizaNaDisponibilidade: true`.

O tempo passa a:

- reduzir o saldo diário do Planner;
- atualizar o tempo geral;
- atualizar o tempo da disciplina e do assunto;
- aparecer na calibração semanal.

### Comparação de métodos

A retenção continua sendo o critério dominante. A preferência por retenção só ocorre quando os intervalos de Wilson de 95% não se sobrepõem, após o gate mínimo já existente.

Quando a retenção não separa os métodos, a eficiência pode atuar apenas como desempate conservador entre `ADAPTIVE_RETRIEVAL` e `INTERLEAVED_RETRIEVAL`.

Gate de eficiência por método:

- 12 resultados tardios cronometrados;
- 4 subassuntos distintos;
- 30 minutos totais registrados.

O desempate exige:

- taxa observada de recuperação não inferior;
- pelo menos 30% mais recuperações independentes tardias por 10 minutos registrados.

O estado resultante é `OBSERVED_EFFICIENCY_PREFERENCE`. Ele permanece observacional, reversível e sujeito à exploração controlada. Não equivale a causalidade, pontos por hora ou garantia de retenção futura.

## P2.4 — Calibração semanal

Foi criada a tela `Calibração Semanal`, acessível pelo menu e pelo atalho `G W`.

A janela usa semana ISO de segunda a domingo e mostra:

- disponibilidade configurada;
- tempo real contabilizado;
- dias com estudo;
- distribuição real por teoria, questões, revisão, flashcards e simulado;
- questões registradas e taxa observada, quando houver;
- revisões concluídas, cronometradas e falhas de recuperação;
- subassuntos com conclusão de teoria explicitamente confirmada;
- planejado versus executado apenas para sessões com rastreabilidade do SDE;
- lacunas de qualidade dos registros.

Não existe nota de produtividade, semáforo moral ou previsão de aprovação.

### Proteção de avanço

Quando há estudo registrado na semana, nenhum avanço de teoria confirmado e ainda existem subassuntos incompletos, o relatório ativa o sinal:

`protectNewContentNextWeek: true`

Esse sinal informa ao Coach que o guardrail de conteúdo novo deve continuar. Ele não remove revisões, não ignora risco eliminatório e não impõe percentual fixo do dia.

## Coach

O contexto estruturado agora inclui:

- tempo e eficiência observada por método;
- base da preferência (`RETENTION` ou `EFFICIENCY`);
- relatório semanal completo;
- lacunas de rastreabilidade;
- proteção de avanço.

O prompt do servidor proíbe:

- transformar recuperações por minuto em pontos por hora;
- tratar diferença planejado/executado como julgamento de produtividade;
- declarar causalidade ou método universalmente superior;
- retirar a sessão protegida de conteúdo novo.

## Validação

- 18 arquivos de testes aprovados;
- 217 testes aprovados;
- TypeScript/lint aprovado;
- build de produção aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- maior chunk JavaScript: aproximadamente 497,32 kB, sem aviso de limite;
- nenhum PDF, ZIP, RAR ou DOCX privado incluído;
- nenhum padrão de CPF encontrado;
- nenhuma chave secreta real encontrada.

## Limitações honestas

- A eficiência depende de dados futuros e de o usuário iniciar o cronômetro corretamente.
- Uma aba diferente pode manter outro cronômetro; o controle é por aba, não global entre dispositivos.
- O limiar de 30% é um guardrail operacional conservador, não uma constante científica universal.
- A calibração semanal descreve registros; ausência de registro não prova ausência de estudo.
- O relatório não reconstrói planos antigos quando a sessão não preservou o contexto do SDE.
- A implantação Supabase/Google AI Studio ainda depende da configuração externa do usuário.
