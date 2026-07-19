# Status de produção — v3.35.0

Status registrado na abertura da v3.35.1:

`BLOQUEADA_PARA_PRODUCAO — COMPARACAO_SHADOW_FICTICIA_E_INTEGRIDADE_INCOMPLETA_DOS_RESULTADOS`

## Motivos

1. Uma alternativa do motor opcional efetivo era reutilizada como se tivesse sido produzida pelo SDE v2.
2. Fonte e banca de atividades externas podiam receber FGV sem comprovação suficiente.
3. Teoria opcional podia promover conclusão do subassunto por checkbox declarativo.
4. O histórico não diferenciava corretamente todos os métodos.
5. Sessões interrompidas não possuíam contabilização completa por disciplina, assunto e histórico.

A v3.35.1 substitui esses comportamentos sem reescrever os eventos append-only anteriores.
