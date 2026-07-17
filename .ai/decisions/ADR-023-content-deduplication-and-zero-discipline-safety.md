# ADR-023 — Deduplicação por conteúdo e proteção preventiva contra zerar disciplina

Status: aceito em 2026-07-16

## Contexto

O cofre privado criava caminhos com timestamp. Assim, `upsert: false` não impedia o reenvio do mesmo PDF, pois cada tentativa recebia um caminho diferente. No SDE, a regra oficial de eliminação ao zerar disciplina existia no pacote DATAPREV, mas a ordenação inicial podia concentrar as primeiras ações em conhecimentos específicos antes de formar qualquer evidência mínima nas disciplinas menores.

## Decisão

### Cofre privado

- calcular SHA-256 no navegador antes do upload;
- tratar igualdade de hash como duplicata exata, mesmo quando o arquivo foi renomeado;
- não reenviar cópia idêntica;
- usar nome e tamanho apenas como fallback conservador para objetos legados sem hash;
- permitir mesmo nome quando o conteúdo conhecido é diferente;
- nunca apagar automaticamente duplicatas históricas, pois isso exige confirmação de vínculo e uso.

### Segurança contra zero

Quando o edital possui eliminação por zero em disciplina:

- classificar disciplina sem tentativa, sem acerto ou com amostra mínima como frente de segurança;
- reservar deterministicamente uma ação elegível por disciplina insegura antes da concentração normal por score;
- manter score, pesos oficiais e incidência histórica separados dessa restrição;
- liberar concentração integral somente após evidência mínima de segurança, sem afirmar que isso elimina o risco real da prova.

## Consequências

- novos uploads idênticos deixam de gerar cópias redundantes no fluxo normal;
- arquivos já duplicados permanecem até uma limpeza auditável futura;
- o Coach não deixa uma disciplina oficial sem exposição diagnóstica por causa do peso maior de outra;
- a regra não cria probabilidades de aprovação nem autoriza ignorar assuntos com base em incidência ainda não validada;
- retorno esperado em pontos por hora continua indisponível até existir evidência prospectiva suficiente.
