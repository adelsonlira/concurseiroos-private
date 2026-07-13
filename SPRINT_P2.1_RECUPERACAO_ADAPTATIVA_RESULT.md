# Sprint P2.1 — Recuperação Adaptativa Orientada à Prova

Data: 2026-07-13

## Decisão adotada

A sequência fixa `1 → 3 → 7 → 14 → 30 → 60` deixou de ser a política ativa. O sistema passou a usar a política versionada:

`ADAPTIVE_EXAM_RETRIEVAL_V1`

A abordagem combina:

1. recuperação ativa sem consulta;
2. feedback corretivo e nova tentativa quando a recuperação falha;
3. successive relearning em sessões separadas;
4. crescimento conservador do intervalo baseado no desempenho observado;
5. proteção especial para erros reais e acertos de baixa confiança;
6. limitação do intervalo pelo tempo restante até a prova;
7. prática intercalada apenas após evidência mínima de recuperação.

O sistema não declara ter estimado uma curva individual de esquecimento.

## Semântica do registro de revisão

Os valores persistidos foram mantidos para compatibilidade, mas receberam semântica observável:

- `HARD`: não recuperou sem consulta ou precisou consultar;
- `MEDIUM`: recuperou sem consulta, porém com esforço;
- `EASY`: recuperou sem consulta e com fluência.

Uma autoavaliação de revisão não é convertida em acerto de questão nem em domínio permanente.

## Algoritmo adaptativo

### Falha de recuperação

- reinicia a sequência de recuperações independentes;
- exige correção e nova tentativa na mesma sessão;
- agenda novo contato em curto prazo;
- registra a falha, o modo seguinte e a justificativa.

### Recuperação independente com esforço

- expande o intervalo de modo conservador;
- preserva contato curto quando o ciclo nasceu de erro ou baixa confiança;
- migra para prática intercalada somente após recuperações repetidas.

### Recuperação independente fluente

- permite expansão maior do intervalo;
- não remove definitivamente o item da agenda;
- continua limitada pelo horizonte da prova.

### Horizonte da prova

O intervalo é limitado progressivamente quando faltam até 90, 45, 21 ou 7 dias. Nenhuma revisão relevante é programada para depois da prova.

## Migração segura

Cronogramas antigos com a política `FIXED_1_3_7_14_30_60_V1` são migrados no primeiro novo evento sem perder:

- histórico de revisões;
- gatilho de origem;
- datas existentes;
- relação com disciplina, assunto e subassunto.

A origem da migração fica registrada em `politicaMigradaDe`.

## Interface

A tela **Revisões & Erros** agora apresenta:

- explicação da política adaptativa;
- protocolo explícito de recuperação sem consulta;
- botões `Não recuperei`, `Recuperei com esforço` e `Recuperei com fluência`;
- modo da próxima sessão;
- intervalo realmente decidido;
- bloco intercalado determinístico de até seis itens;
- prioridade para erros sem recuperação posterior;
- alternância de assuntos quando possível.

## Coach

O contexto estruturado do Coach passou a receber, para cada revisão vencida:

- próximo modo;
- intervalo decidido;
- necessidade de reaprendizagem imediata;
- justificativas do intervalo;
- versão da política.

Isso permite explicar a agenda sem inventar mecanismos de memória ou precisão inexistente.

## Validações

- 206/206 testes aprovados;
- 17 arquivos de teste aprovados;
- TypeScript/lint aprovado;
- build de produção aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- nenhum PDF, ZIP, RAR ou DOCX privado incluído no pacote;
- nenhum material privado da assinatura incorporado ao código.

## Limitações declaradas

- a política ainda é heurística e conservadora;
- não existe estimativa individual de retenção;
- a qualidade depende de o usuário registrar honestamente se recuperou sem consulta;
- intervalos futuros deverão ser calibrados com desempenho real e reincidência de erros;
- o interleaving depende de haver mais de um tópico vencido e já minimamente compreendido.
