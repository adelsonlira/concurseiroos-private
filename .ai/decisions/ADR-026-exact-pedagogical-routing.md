# ADR-026 — Roteamento pedagógico exato e fallback explicitamente aprovado

Data: 2026-07-17
Status: aceito

## Contexto

O catálogo privado contém seções exatas, seções amplas e seções ainda não classificadas. A regra anterior permitia usar qualquer seção do mesmo assunto como fallback. Isso podia indicar páginas de um subassunto irmão sem evidência suficiente, como páginas de BI ou repositórios para DDL apenas porque todos pertencem a Banco de Dados.

## Decisão

1. Localizadores exatos exigem que a seção declare o `subtopicId` solicitado.
2. Uma seção mapeada para outro subassunto nunca pode servir como fallback.
3. `TOPIC_ONLY` não autoriza prescrição por si só. Fallback amplo exige o marcador auditado `AUDITED_TOPIC_WIDE` nos metadados derivados.
4. Diagnóstico inicial aceita somente `QUESTION_LIST` ou `SIMULATION`; teoria e questões comentadas não podem ser a primeira tentativa.
5. Na ausência de bateria local segura, Qconcursos ou Estratégia Questões são prescritos com filtros explícitos.
6. Na ausência de teoria exata, o Coach declara a lacuna, orienta busca pelo nome oficial e exige registro do material e das páginas realmente usados.
7. Material privado continua incapaz de alterar prioridade, peso ou incidência do SDE.

## Consequências

- O número de localizadores imediatamente utilizáveis pode diminuir, mas a confiabilidade aumenta.
- Lacunas são apresentadas como lacunas, sem páginas arbitrárias.
- Fallbacks amplos futuros exigem revisão explícita e deixam aviso visível na prescrição.
- O pipeline gera um relatório reproduzível e falha se detectar fonte diagnóstica inexistente ou fallback inseguro.
