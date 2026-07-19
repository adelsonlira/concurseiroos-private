# SDE v2 — Grafo de conhecimento DATAPREV

**Arquivo canônico:** `src/core/sde-v2/config/dataprev-knowledge-graph-v1.json`  
**Versão:** `dataprev-2026-profile-3-kg-v1`

## Estrutura

O arquivo contém 26 nós conceituais e 20 relações versionadas:

- `required_prerequisite`;
- `recommended_prerequisite`;
- `transfer`.

As relações iniciais cobrem os blocos aprovados de Banco de Dados e Desenvolvimento, incluindo modelagem, integridade, normalização, SQL, ACID, modelagem dimensional, Java, JPA, HTTP, REST, APIs, microsserviços e API Gateway.

## Segurança

- somente relações presentes no arquivo são carregadas;
- nenhum vínculo é gerado por IA;
- nós e taxonomia são validados;
- força deve estar entre 0 e 1;
- toda relação exige justificativa;
- ciclos em pré-requisitos obrigatórios são rejeitados;
- ciclos de transferência somente podem existir se declarados no arquivo;
- nós sem relação continuam válidos.

Quando dois conceitos do grafo compartilham o mesmo nó da taxonomia oficial, a relação é registrada para explicabilidade, mas não cria autobloqueio. Bloqueios só ocorrem quando o pré-requisito possui nó taxonômico distinguível e estado inadequado.

## Sem expansão automática

A infraestrutura aceita a taxonomia completa, porém apenas as 20 relações aprovadas estão ativas. Novas relações exigem alteração versionada, justificativa e testes de ciclo.
