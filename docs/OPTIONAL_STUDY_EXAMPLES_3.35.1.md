# Exemplos auditáveis — v3.35.1

## Fallback do SDE v2

```json
{
  "decisionContext": "optional_study",
  "activeSdeVersion": "v1",
  "executionMode": "shadow",
  "affectsPrescription": false,
  "v2Decision": null,
  "fallbackUsed": true,
  "fallbackReason": "OPTIONAL_STUDY_CONTEXT_NOT_SUPPORTED_BY_SDE_V2"
}
```

## Comparação real v1 × v2

O v1 recomenda teoria de 30 minutos. O adaptador executa o núcleo v2 com a mesma fotografia e recebe um `DecisionRecord` real que sugere diagnóstico curto de 25 minutos. A interface mostra somente a opção v1; o ledger registra a divergência e o identificador `decision-v2-*`.

## Lote QConcursos FGV

```text
origem = qconcursos
banca = FGV
total = 10
acertos = 7
erros = 2
brancos = 1
consulta = no
```

É criado um único evento agregado.

## Lote de outra banca

```text
origem = outra
banca = CESPE
total = 5
acertos = 3
erros = 2
brancos = 0
```

A banca informada é preservada; FGV não é atribuída automaticamente.

## Teoria sem conclusão automática

O usuário registra 25 minutos, páginas 10–18 e recuperação ativa. O evento é preservado, mas `subassunto.completado` e mastery não são alterados apenas por esses campos.

## Sessão interrompida

Uma prática técnica é interrompida após 13 minutos. O tempo é somado uma única vez ao total global, disciplina e assunto; a sessão termina com `concluidaComSucesso = false`, sem evidência negativa ou penalidade.
