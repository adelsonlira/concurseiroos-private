# ADR-005 — Hierarquia de Fontes Privadas de Estudo

Data: 2026-07-15
Status: ACEITO

## Contexto

O candidato possui materiais do Estratégia Concursos e do TI Total. Tratar todos os materiais como equivalentes criaria recomendações duplicadas, páginas excessivas e troca desnecessária de fonte.

## Decisão

Classificar materiais privados por provedor, papel e prioridade:

- Estratégia Concursos: `PRIMARY`, prioridade 100;
- TI Total: `COMPLEMENTARY`, prioridade 60.

A ordenação respeita primeiro o tipo de atividade e a aderência temática, depois a banca, a hierarquia da fonte e a confiança. Uma bateria de questões FGV em nível de assunto pode servir como fallback quando não houver localizador exato do subassunto.

Materiais privados nunca alteram a prioridade matemática do SDE; servem apenas para roteamento pedagógico.

## Consequências

- o coach mantém uma fonte principal estável;
- o TI Total fecha lacunas e oferece questões FGV adicionais;
- o usuário vê claramente se a recomendação é principal ou complementar;
- PDFs e texto integral permanecem fora do repositório e do modelo de IA.
