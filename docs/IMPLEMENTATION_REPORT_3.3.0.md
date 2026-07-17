# ConcurseiroOS 3.3.0 — Relatório de Implementação

## Resumo executivo

A versão 3.3.0 transforma a DATAPREV no primeiro pacote instalado do produto, em vez de uma dependência transversal. A mesma mudança prepara o coach para combinar materiais privados sem poluir a prescrição.

## Arquitetura multi-concurso

Foi introduzido `src/config/concursos/registry.ts`, responsável por resolver:

- pacote oficial;
- seed da aplicação;
- catálogo privado de materiais;
- título operacional do Coach.

Foram generalizados:

- execução diária do SDE;
- cobertura de evidências;
- roadmap semanal;
- hidratação e reset do store;
- contexto do Coach;
- localização de materiais nos componentes.

Os nomes antigos DATAPREV foram mantidos como wrappers temporários para compatibilidade de testes e integrações.

## Catálogo Estratégia

O erro de nome de pasta `RLM - F` versus `RLM - C` foi corrigido.

Resultado:

- antes: 97 materiais e 9.782 páginas;
- agora: 109 materiais e 10.676 páginas;
- ganho: 12 materiais e 894 páginas de RLM.

Também foi introduzida correspondência lexical segura para termos curtos. Isso removeu o falso mapeamento de “geometria espacial” para o subassunto de frontend SPA.

## Catálogo TI Total

Foram processados 21 arquivos informados pelo usuário:

- 17 PDFs válidos;
- 4 arquivos XML `NoSuchKey` com extensão PDF, bloqueados;
- 438 páginas válidas;
- 66 localizadores derivados;
- intervalos de questões FGV extraídos dos sumários quando disponíveis.

Cobertura complementar:

- Análise de Pontos de Função;
- Padrões de Projeto;
- Gerenciamento de Identidade e Acesso;
- Desenvolvimento Seguro/OWASP;
- questões FGV de Banco de Dados, BI e Data Mining.

## Política de roteamento

Ordem de decisão:

1. tipo de conteúdo adequado à atividade;
2. mapeamento exato de subassunto antes do fallback por assunto;
3. banco FGV em atividades de questões;
4. fonte principal antes da complementar quando os demais critérios empatam;
5. confiança e desempate determinístico.

O material continua impedido de influenciar o ranking estratégico.

## Arquivos relevantes

- `src/config/concursos/registry.ts`
- `src/integrations/sde/competitionDecisionAdapter.ts`
- `src/integrations/sde/competitionRoadmapAdapter.ts`
- wrappers de compatibilidade `dataprev*Adapter.ts`
- `src/core/materials/materialPolicy.ts`
- `src/core/materials/materialPresentation.ts`
- `scripts/build_private_strategy_material_catalog.py`
- `scripts/build_private_titotal_material_catalog.py`
- `data/evidence/dataprev-2026-perfil-3/private-study-materials/`

## Pendente

- criar um segundo pacote real para validar a troca ponta a ponta;
- desenvolver equivalência cognitiva entre taxonomias de concursos;
- validar e versionar a matriz histórica FGV antes de ativá-la no SDE;
- realizar análise de sensibilidade dos parâmetros heurísticos.
