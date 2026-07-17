# ConcurseiroOS 3.3.0 — Pacotes de Concurso e Materiais Complementares

Data: 2026-07-15

## Objetivo

Preservar o foco atual na DATAPREV 2026 — Perfil 3 sem fixar o produto a esse concurso e ampliar a capacidade do coach de localizar material útil com uma hierarquia explícita de fontes.

## Implementado

- registro genérico de pacotes de concurso;
- SDE, roadmap, store, Coach e componentes resolvendo o pacote ativo por `concursoAlvoId`;
- wrappers de compatibilidade para APIs DATAPREV existentes;
- catálogo do Estratégia regenerado com RLM;
- correção de falso positivo lexical entre “geometria espacial” e “SPA”;
- 109 materiais do Estratégia, 10.676 páginas;
- 17 materiais válidos do TI Total, 438 páginas e 66 seções/localizadores;
- quatro fontes corrompidas registradas e bloqueadas;
- fonte principal versus fonte complementar na interface;
- fallback de questões por assunto quando não há mapeamento exato de subassunto;
- scripts reproduzíveis para gerar ambos os catálogos sem incorporar PDFs.

## Segurança de conteúdo

O release contém apenas hashes, títulos, páginas, seções, taxonomia e política de uso. Nenhum PDF licenciado, texto integral ou marca d'água pessoal foi incluído.

## Validação

- TypeScript aprovado;
- 268 testes aprovados em 33 arquivos;
- build web, servidor e serverless aprovado;
- 0 vulnerabilidades conhecidas em dependências de produção.
