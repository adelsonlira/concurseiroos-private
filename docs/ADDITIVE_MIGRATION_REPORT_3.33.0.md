# ConcurseiroOS v3.33.0 — Relatório de migração aditiva

## Escopo

A atualização adiciona `externalEvidenceLedger` ao estado persistido e ao schema de backup. Não existe transformação de tentativas, revisões, casos de erro ou outros registros históricos.

## Store local

Na hidratação:

```ts
externalEvidenceLedger: Array.isArray(parsed.externalEvidenceLedger)
  ? parsed.externalEvidenceLedger
  : []
```

Snapshots locais antigos recebem lista vazia. Nenhum outro campo é regravado por causa da migração.

## Backup

O formato exportado passa de 2.1.0 para 2.2.0. O importador segue esta ordem:

1. valida origem e bloco de dados;
2. verifica o checksum do snapshot exatamente como recebido;
3. somente depois adiciona a coleção ausente como `[]`;
4. atualiza versão e checksum da cópia migrada;
5. executa a validação integral e importa de forma transacional.

## Integridade do ledger

A validação de backup exige:

- `evidenceId` único;
- disciplina, assunto e subassunto existentes;
- `affectsSde = false`;
- relações de substituição e anulação apontando apenas para eventos anteriores;
- ausência de credenciais, cookies, tokens ou HTML completo nos campos livres.

## Sincronização

O ledger participa do mesmo snapshot usado pela sincronização existente. A impressão digital do snapshot muda quando o ledger muda, e um ledger não vazio é considerado progresso local significativo.

Não foi criada uma segunda infraestrutura de nuvem.

## Compatibilidade comprovada

- backups antigos sem ledger são migrados para lista vazia;
- IDs de tentativas legadas permanecem intactos;
- restauração preserva `evidenceId`, `supersedesEvidenceId` e `voidsEvidenceId`;
- nenhuma tentativa sintética é inserida em `tentativasQuestoes`;
- coleções de diagnóstico, Treino FGV, simulado e sessão não são modificadas.
