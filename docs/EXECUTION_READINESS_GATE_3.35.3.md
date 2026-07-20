# executionReadinessGate — v3.35.3

## Posição arquitetural

O gate roda depois do ranking e do planner. Ele não modifica score, ordem ou prioridade. Recebe o candidato selecionado e verifica:

1. conteúdo exato;
2. método;
3. material e correspondência;
4. ambiente;
5. duração;
6. critério de conclusão;
7. captura do resultado.

## Estados

- `READY`: existe pacote executável completo;
- `BLOCKED_NO_EXECUTABLE_PATH`: nenhum caminho seguro foi encontrado.

## Fallback

Quando NotebookLM não está disponível, o gate pode manter o assunto e trocar para material interno exato. Quando Treino FGV não cobre o assunto, pode usar QConcursos com filtros estruturados. Toda troca registra o método solicitado, o método efetivo e a justificativa.

Quando não existe notebook, fonte aprovada, material compatível ou forma de registrar o resultado, o candidato fica bloqueado. A prescrição percorre os candidatos já produzidos pelo planner e escolhe o próximo executável, sem reordenar ou recalcular o ranking.

## Correspondência de material

Ordem:

1. `EXACT_SUBTOPIC`;
2. `EXACT_TOPIC`;
3. material amplo somente após validação explícita;
4. ambiente alternativo;
5. próximo candidato executável.

O caso interpretação × Noções Iniciais de Ortografia resulta em `INCOMPATIBLE` e não gera pacote.

## Contextos

O mesmo gate é utilizado em:

- prescrição obrigatória;
- domingo opcional;
- extra após plano concluído;
- escolha manual.
