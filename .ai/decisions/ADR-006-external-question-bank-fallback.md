# ADR-006 — Bancos externos como fonte operacional de questões

## Contexto

O catálogo privado nem sempre oferece quantidade suficiente de questões FGV para cumprir uma bateria prescrita. O usuário possui assinatura do Qconcursos e do Estratégia Questões.

## Decisão

O SDE continua decidindo assunto, tempo e quantidade. Plataformas externas entram apenas como fontes operacionais:

- obrigatórias quando não existe bateria local mapeada ou aderente à banca;
- opcionais quando já existe material FGV local, mas é necessário volume adicional ou uma amostra inédita.

A recomendação deve informar filtros de banca, disciplina, assunto, subassunto e exclusão de anuladas.

## Consequências positivas

- maior disponibilidade de exercícios;
- preservação da decisão central do SDE;
- redução da busca manual;
- independência de conteúdo licenciado no repositório.

## Consequências negativas

- resultados dependem da classificação das plataformas;
- não existe integração automática com contas ou APIs;
- o usuário ainda precisa registrar as tentativas.
