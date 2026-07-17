# ADR-008 — Registro agregado de baterias de questões

Data: 2026-07-15
Status: Aceito

## Contexto

O registro individual preserva tempo, confiança e causa de erro por questão, mas exige dezenas de lançamentos para baterias executadas no Qconcursos, Estratégia Questões ou PDFs. Isso contraria o princípio de reduzir carga operacional do candidato.

## Decisão

Oferecer dois modos de registro:

1. **Resumo da bateria**, padrão após uma sessão prescrita de questões.
2. **Questão individual**, opcional para erros relevantes ou quando o candidato deseja granularidade completa.

O resumo registra total, acertos, erros calculados, itens em branco, tempo total, fonte e confiança geral.

Para manter compatibilidade com o SDE atual, o lote é expandido em tentativas internas marcadas explicitamente como agregadas. O tempo individual é a média estimada do tempo total, e a causa dos erros permanece `DESCONHECIDA`. O sistema não inventa causas individuais.

## Consequências positivas

- uma bateria de 50 questões pode ser registrada em um único formulário;
- estatísticas, metas e acurácia permanecem utilizáveis pelo SDE;
- o histórico distingue dado observado individualmente de dado agregado;
- o modo individual continua disponível para análise de erros importantes.

## Consequências negativas e limites

- o tempo por questão de um lote é estimado, não observado;
- o lote não permite associar causas diferentes a cada erro;
- análises futuras de distribuição de tempo devem excluir ou identificar tentativas com `tempoRespostaEstimado=true`.

## Regra de interpretação

Tentativas agregadas podem informar volume e acurácia. Não devem ser tratadas como evidência de tempo individual preciso nem como classificação causal dos erros.
