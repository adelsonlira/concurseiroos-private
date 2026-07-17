# Estado Atual

Data: 2026-07-17
Versão: 3.31.0

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Deve reduzir fadiga decisória, entregar uma sessão executável e recalcular a próxima ação com evidências reais. Nenhum módulo promete aprovação, inventa incidência ou converte ausência de dados em certeza.

## Fase atual

Uso privado no ambiente real com login obrigatório, sincronização notebook–celular e Gemini confirmados pelo usuário. A prioridade técnica atual é validar o uso real dos simulados oficiais recém-implementados e fechar os 37 localizadores pedagógicos ainda pendentes, preservando o SDE e o Knowledge Engine em shadow mode.

## Implementado

- SDE puro, determinístico, explicável e independente da interface.
- Prescrição diária com atividade, duração, material, páginas, questões, protocolo, evidências, fallback e próxima ação.
- Diagnóstico inicial por questões com amostra mínima, acerto, ausência de consulta/branco e confiança dos acertos.
- Proteção contra zerar disciplina e projeção conservadora de capacidade até 11/10/2026.
- Ciclo teoria/recuperação/questões/correção/revisão com evidência antes e depois.
- Login privado, sincronização em três vias, backup transacional, persistência local atômica e cofre deduplicado por SHA-256.
- Taxonomia oficial com 123 nós e 94 subassuntos.
- Corpus FGV com 6.462 questões, 5.324 canônicas e 2.840 vínculos definitivos, integralmente em shadow mode.
- Curadoria append-only e 656 propostas automáticas sem qualquer incidência ativa.
- Roteamento pedagógico exato: seção de subassunto irmão nunca é fallback.
- Casos append-only de recuperação de erros, com causa confirmada, correção, prevenção, verificação independente e reabertura automática.
- `TOPIC_ONLY` exige o marcador revisado `AUDITED_TOPIC_WIDE` antes de autorizar páginas amplas.
- Diagnóstico local aceita somente lista de questões ou simulado; teoria e comentários não servem como primeira tentativa.
- Relatório reproduzível de roteamento para os 94 subassuntos.
- Correção auditada do PDF da Lei nº 12.527/2011 para o tópico e subassunto oficiais de LAI.
- Plano e Progresso distingue teoria exata, fallback amplo aprovado e necessidade de localização manual.
- Confirmações de login, sincronização e Gemini registradas com proveniência operacional do usuário.
- Simulados parciais e completos com composição oficial, fonte identificada, tempo, brancos, pontuação e risco de zero.
- Seleção local determinística limitada a questões com documento de origem e gabarito oficial; fontes externas não incorporam conteúdo.
- Análise pós-simulado e plano de correção sem cronograma paralelo ou alteração direta do ranking.
- Comparação descritiva somente entre simulados com mesma composição.

## Validado

- Login obrigatório, sincronização notebook–celular e Gemini confirmados pelo usuário no domínio de produção.
- Auditoria de roteamento: 57 teorias exatas, 0 fallbacks amplos ativos sem aprovação, 37 localizadores manuais pendentes, 52 baterias diagnósticas locais e 42 fallbacks por plataforma externa.
- Zero subassuntos sem fonte diagnóstica executável.
- Zero fallbacks entre subassuntos irmãos.
- LAI abre o PDF auditado correto nas páginas 1–31.
- Pipeline de memória, corpus, taxonomia, curadoria, classificação, roteamento, SDE, prontidão, TypeScript e testes.
- Auditoria do SDE com 117 ações e 50 parâmetros catalogados.
- Contrato de recuperação com 7 causas, 2 verificações independentes e contribuição zero ao ranking.
- Linha de base 3.30.0 confirmada com 398 testes em 67 arquivos antes da alteração. A 3.31.0 foi validada com 407 testes em 69 arquivos, TypeScript, builds web/Express/serverless, auditoria de simulados, segurança e smoke HTTP aprovados.
- Incidência histórica e materiais privados continuam neutros no ranking.

## Problemas conhecidos

- 37 subassuntos ainda não possuem localizador teórico exato para a atividade; o Coach deve declarar a lacuna e orientar busca manual, sem inventar páginas.
- 42 subassuntos dependem de Qconcursos ou Estratégia Questões para diagnóstico seguro.
- Nenhum fallback amplo está ativo até existir revisão explícita com o marcador `AUDITED_TOPIC_WIDE`.
- As 656 classificações históricas continuam automáticas; há zero classificações humanas aprovadas e zero incidência elegível.
- Duplicatas antigas no bucket não são removidas automaticamente.
- Dados locais ainda não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- O limiar diagnóstico de 85% é conservador e só poderá ser recalibrado com resultados reais suficientes.
- O runtime-alvo é Node.js 24.x; este ambiente automatizado executa Node 22.x.
- Nenhum software ou plano garante aprovação; o produto reduz erro decisório e organiza esforço com rastreabilidade.

## Próxima tarefa

Fechar os 37 localizadores teóricos pendentes por metadados auditáveis e validar prospectivamente o fluxo de simulados em sessões reais. Depois, revisar os 43 grupos P0 DATAPREV e comparar a matriz histórica em shadow mode.
