# ConcurseiroOS 3.10.0 — Hardening do SDE e do Super Coach

Data: 2026-07-16

## Escopo

Revisão ampla da linha de base 3.8.0 e implementação das Sprints 3.9.0 e 3.10.0, priorizando correção decisória, transparência e execução diária para DATAPREV 2026.

## Defeitos corrigidos

1. Incidência histórica com origem `UNAVAILABLE` podia influenciar a camada constitucional por meio do prior neutro, apesar de o componente do score estar zerado.
2. Baixo desempenho com amostra intermediária podia vetar teoria e questões simultaneamente, criando deadlock cognitivo.
3. Ausência de metadados de proveniência era interpretável por fallback permissivo.
4. Ajustes do score não eram integralmente expostos para recomposição.
5. A prescrição não declarava prontidão, fallback, confiabilidade e próxima ação de forma estruturada.

## Resultado

- incidência histórica continua integralmente em shadow mode;
- metadados de proveniência tornaram-se obrigatórios;
- parâmetros centrais foram catalogados;
- decisão e prescrição ganharam auditorias reproduzíveis;
- Dashboard, Sessão Guiada e Coach IA compartilham o mesmo contrato de execução;
- pipeline falha quando a auditoria de confiabilidade encontra inconsistência.

## Limites

Não foi criada falsa garantia de 100%. Incidência histórica, risco global e pontos por hora permanecem desativados ou indisponíveis até validação adequada.

## Validação executada

- 307 testes em 42 arquivos;
- TypeScript;
- catálogo do Knowledge Engine: 181 documentos, 54 concursos e 95 vínculos, integridade aprovada;
- auditoria do SDE: 117 ações, 49 parâmetros, status PASS;
- builds web, Express e serverless;
- smoke test HTTP da aplicação e endpoints públicos;
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.

## Riscos operacionais remanescentes

- runtime local Node.js 22.16.0 difere do alvo Node.js 24.x;
- componentes grandes permanecem risco de manutenção futura;
- integrações externas reais dependem das credenciais do ambiente de produção;
- o corpus oficial ainda não foi individualizado no nível da questão.
