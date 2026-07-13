# Sprint P2.2 — Revisão híbrida auto-calibrada e proteção de avanço

Data de validação: 2026-07-13

## Objetivo

Substituir a escolha estática de um único método de revisão por uma política híbrida que:

1. aplique protocolos diferentes conforme o contexto;
2. compare resultados tardios do próprio usuário;
3. passe a favorecer o método flexível com melhor evidência observada;
4. evite lock-in mantendo exploração controlada;
5. impeça que o acúmulo de revisões paralise o avanço em conteúdos ainda não estudados.

## Política implementada

Versão: `HYBRID_ADAPTIVE_REVIEW_V2`

### Métodos operacionais

- `SUCCESSIVE_RELEARNING`: consolidação inicial de conteúdo novo.
- `ADAPTIVE_RETRIEVAL`: recuperação ativa com intervalo ajustado pelo desempenho observado.
- `INTERLEAVED_RETRIEVAL`: discriminação entre tópicos já suficientemente recuperados.
- `ERROR_FOCUSED_RELEARNING`: correção obrigatória após erro ou falha de recuperação.

Os métodos de erro e consolidação inicial são salvaguardas contextuais. Eles não são substituídos por um método global supostamente “melhor”. A comparação automática ocorre apenas entre métodos flexíveis realmente intercambiáveis: recuperação adaptativa e prática intercalada.

## Aprendizado do método padrão

O sistema atribui o resultado de uma recuperação posterior ao método executado na sessão anterior do mesmo subassunto. Assim, uma resposta dada imediatamente após consultar o material não é usada como evidência tardia.

Para cada método são calculados:

- quantidade de resultados tardios;
- recuperações independentes;
- recuperações fluentes;
- falhas;
- quantidade de subassuntos distintos;
- mediana do intervalo bem-sucedido;
- taxa observada de recuperação independente;
- intervalo de Wilson de 95%.

### Gate para preferência

Um método somente entra na comparação quando possuir, no mínimo:

- 8 resultados tardios;
- 3 subassuntos distintos.

Uma preferência é declarada apenas quando o intervalo de confiança de recuperação independente de um método fica inteiramente acima do outro. Caso contrário, o estado permanece `INSUFFICIENT_DATA` ou `INCONCLUSIVE`.

A preferência é explicitamente observacional, reversível e não é apresentada como prova causal ou superioridade universal.

### Exploração controlada

Mesmo após surgir uma preferência observada, aproximadamente 1 em cada 5 oportunidades flexíveis usa deterministicamente o método alternativo. Isso:

- evita engessamento;
- permite detectar mudança no desempenho;
- impede que uma conclusão antiga permaneça para sempre;
- mantém resultados reproduzíveis, sem sorteio oculto.

## Proteção contra paralisação do edital

Foi adicionado um guardrail ao Planner:

- quando existe ação validada de teoria ainda não estudada;
- e a janela diária comporta uma sessão executável;
- o Planner reserva uma sessão mínima de 25 minutos para conteúdo novo.

A reserva nunca remove o mínimo operacional de uma ação de prioridade superior nem inventa tempo inexistente. Quando a janela não comporta a proteção, isso é registrado por ajuste estruturado, em vez de forçar um plano impossível.

O mecanismo não usa percentual fixo de teoria ou revisão. Ele protege apenas uma sessão mínima e deixa o restante do dia seguir as prioridades calculadas pelo SDE.

## Migração

Cronogramas das políticas anteriores são mantidos. No próximo evento de revisão:

- histórico e datas são preservados;
- o método legado é inferido de forma transparente;
- a política passa para `HYBRID_ADAPTIVE_REVIEW_V2`;
- a origem da migração permanece registrada.

## Interface

A tela Revisões & Erros agora exibe:

- método indicado para a próxima revisão;
- quantidade de resultados tardios por método;
- subassuntos usados na comparação;
- taxa observada de recuperação independente;
- status da comparação;
- preferência observada, quando o gate é atendido;
- aviso de proteção de avanço do edital.

## Coach

O contexto estruturado do Coach passou a incluir:

- comparação dos métodos;
- status de suficiência;
- preferência observada;
- seleção exploratória;
- motivo da seleção do método;
- proteções de avanço aplicadas pelo Planner.

O prompt proíbe o Coach de declarar vencedor com dados insuficientes ou transformar preferência observacional em verdade causal.

## Validação

- 17 arquivos de testes aprovados.
- 212 testes aprovados.
- TypeScript/lint aprovado.
- Build de produção aprovado.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Nenhum PDF, ZIP, RAR ou DOCX privado incluído no projeto.
- Bundle principal abaixo de 500 kB.

## Limitações honestas

- A comparação depende de registros reais futuros do usuário.
- A autoavaliação ainda é uma entrada do usuário e pode conter ruído.
- Preferência observada não prova causalidade.
- O sistema ainda não compara custo em minutos porque a duração granular de cada revisão não é obrigatória no fluxo atual.
- O guardrail de 25 minutos é uma política operacional configurável, não um valor universal comprovado.
