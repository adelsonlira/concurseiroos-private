# ConcurseiroOS

Coach de estudos orientado por evidências para a **DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software — Natal/RN**.

O produto transforma edital, regras oficiais, disponibilidade, histórico real e materiais do candidato em uma **prescrição diária executável**. Ausência de dados nunca é convertida automaticamente em desempenho ruim, domínio ou probabilidade de aprovação.

## Fluxo principal

1. O SDE decide a ação prioritária.
2. O Planner organiza a sessão.
3. A Prescrição Diária informa atividade, duração, material, páginas, meta de questões, roteiro e evidência de conclusão.
4. A Sessão Guiada registra a execução.
5. Questões, revisões e confirmações explícitas alimentam a próxima decisão.

A interface principal prioriza uma única pergunta: **o que devo fazer agora?** Diagnósticos e ferramentas avançadas permanecem disponíveis sem competir com o fluxo de estudo.

## Execução local

Pré-requisito recomendado: Node.js 24.

```bash
npm ci
cp .env.example .env
npm run dev
```

A chave `GEMINI_API_KEY` permanece somente no processo Node. Em produção, use `AUTH_MODE=required` e `AUTH_ALLOW_SELF_SIGNUP=false`. A aplicação exige login antes de renderizar plano, histórico, materiais ou Coach; contas novas são administradas pelo Supabase.

Configuração detalhada do arquivo: `docs/ENV_SETUP.md`.

## Validação e build

```bash
npm run typecheck
npm run test:run
npm run validate
npm run build
npm audit --omit=dev
```

`npm run build` continua sendo o comando local completo. No GitHub Actions, `npm run validate` é executado uma única vez e os builds web, Express e serverless são chamados separadamente para evitar repetir toda a regressão; o CI também verifica os blobs canônicos do corpus. `npm run vercel-build` executa apenas o build web para evitar repetição do pipeline dentro da Vercel.

## Integridade do corpus operacional 3.33.1

Os CSVs aprovados do Treino FGV são artefatos binários do ponto de vista do Git: seus bytes CRLF participam do tamanho e do SHA-256 declarados no manifesto. A raiz contém regras específicas em `.gitattributes`, e o comando abaixo confere arquivo de trabalho e blob de `HEAD` quando executado dentro de um repositório Git:

```bash
npm run training:audit-git -- --require-git
```

Não normalize esses CSVs nem substitua a validação bruta por comparação textual.

## Prescrição de questões

A quantidade de questões é calculada pela mediana do próprio candidato no recorte mais específico disponível. Até existir amostra mínima, o sistema usa a cadência bruta da prova oficial e declara baixa confiança.

Após uma sessão de questões, a tela de registro:

- recupera a bateria prescrita;
- fixa disciplina, assunto e subassunto;
- mostra progresso contra meta e extensão opcional;
- vincula cada tentativa à prescrição de origem;
- aceita questões externas sem copiar enunciados protegidos.

Quando o catálogo privado não oferece uma bateria FGV suficiente, a prescrição pode indicar **Qconcursos** ou **Estratégia Questões**. O sistema mantém a decisão central — assunto, quantidade e tempo — e fornece os filtros de banca, disciplina, assunto, subassunto e exclusão de anuladas. Não há automação de login, cópia de questões ou coleta de respostas dessas plataformas.

## Diagnóstico piloto 3.31.4

A versão 3.31.4 corrige exclusivamente a navegação do **Diagnóstico Piloto FGV-DATAPREV — Banco de Dados**. O menu lateral sempre abre a landing page; tentativa ativa e resultado finalizado são acessados por rotas transitórias próprias, preservadas no F5. Conteúdo, gabarito, persistência, cálculo e isolamento estratégico permanecem idênticos à 3.31.3.

Consulte `.ai/sprints/SPRINT-3.31.4.md`, `.ai/decisions/ADR-031-isolated-pilot-diagnostic.md`, `docs/IMPLEMENTATION_REPORT_3.31.4.md` e `docs/VALIDATION_RESULTS_3.31.4.md`.

## Super Coach 3.31.0

A versão 3.31.0 adiciona simulados parciais e completos derivados da composição oficial da DATAPREV 2026: 70 questões, 240 minutos e 115 pontos no completo; no parcial, cotas oficiais das disciplinas escolhidas e duração proporcional declarada. O fluxo exige fonte identificada, registra acertos, erros, brancos e tempo por disciplina, sinaliza risco de zero e organiza a correção sem gerar questões, alternativas ou gabaritos.

Questões locais só podem compor o simulado quando possuem documento de origem, gabarito oficial e quantidade suficiente para a cota. A seleção é determinística. Qconcursos e Estratégia Questões funcionam como fontes externas identificadas: o sistema fornece filtros e não copia conteúdo nem inventa IDs. O resultado agregado do simulado não cria domínio por subassunto, não ativa incidência histórica e não altera silenciosamente o ranking do SDE.

O ciclo de recuperação de erros da 3.30.0 permanece: causa confirmada, correção explícita, regra preventiva e duas verificações independentes antes da estabilização provisória. Login obrigatório, sincronização notebook–celular e Gemini foram confirmados pelo usuário em produção. Consulte `.ai/sprints/SPRINT-3.31.0.md`, `docs/IMPLEMENTATION_REPORT_3.31.0.md`, `docs/VALIDATION_RESULTS_3.31.0.md` e `.ai/decisions/ADR-028-evidence-gated-simulations.md`.

## Corpus oficial FGV

A versão 3.31.0 contém um corpus **metadado e minimizado** de 6.462 questões oficiais. O repositório não armazena enunciados ou alternativas integrais; conserva hashes, localizadores de página, trecho curto, estado de revisão e vínculo auditável com gabaritos. Todo o corpus permanece em shadow mode e não altera o SDE.

Para reproduzir a extração a partir do acervo oficial organizado:

```bash
python -m pip install -r scripts/requirements-knowledge.txt
npm run knowledge:extract-official -- --source-root /caminho/FGV_Acervo_Organizado_2026-07-16
npm run knowledge:validate-official
```

A revisão deve seguir `docs/OFFICIAL_CORPUS_REVIEW_PROTOCOL.md`. O diagnóstico completo está em `docs/FGV_OFFICIAL_CORPUS_QUALITY_3.12.0.md`. Vínculo automático de alta confiança ainda é candidato pendente de confirmação humana.

## Materiais privados

Os PDFs da assinatura do usuário não fazem parte deste repositório nem do ZIP distribuível. O pacote contém somente metadados derivados e localizadores pedagógicos.

Quando o usuário envia um PDF pelo **Cofre privado**:

- o navegador calcula SHA-256 e evita reenviar conteúdo idêntico, mesmo se o arquivo foi renomeado;
- o arquivo vai diretamente para o bucket privado;
- o conteúdo não é enviado ao Coach nem à Gemini;
- cada objeto fica isolado pelo ID do usuário;
- o backup sincronizado conserva somente metadados seguros;
- uma futura edição pública pode ser gerada sem os materiais individuais.

## Modo on-line

A fundação on-line utiliza Supabase para autenticação, sincronização local-first, controle de conflito e cofre privado de PDFs. Em um deploy privado, a interface inteira permanece bloqueada até o login e o cadastro público deve ficar desativado.

Execute `supabase/001_online_foundation.sql` no projeto Supabase e configure as variáveis descritas em `.env.example`.

Guias: `docs/PRIVATE_ACCESS_GUIDE.md` e `docs/ONLINE_DEPLOYMENT_FREE.md`.

Índice da documentação: `docs/README.md`.

## Governança do SDE

O SDE é determinístico, conservador e explicável. Ele ainda deve ser tratado como um priorizador constitucional heurístico, não como um modelo calibrado de probabilidade de aprovação.

- incidência histórica FGV permanece bloqueada até validação;
- material privado localiza conteúdo, mas não altera prioridade;
- confiança declarada não prova domínio;
- evidência futura ou inconsistente é rejeitada;
- LLMs não substituem o motor nem criam cronogramas paralelos.

## Revisão e aprendizagem

A política de revisão usa recuperação ativa, correção, nova tentativa, intervalos adaptativos e prática intercalada quando há evidência suficiente. Flashcards exigem tentativa antes da revelação.

Não existe sequência universal fixa, curva individual inventada ou declaração automática de domínio.

## Continuidade por outras IAs

A pasta `.ai/` é a memória institucional do projeto. Comece por `.ai/README.md` e siga a ordem de leitura indicada. Cada release deve atualizar o estado atual, próximos passos, histórico cumulativo, ADRs relevantes e relatório de sprint.

O comando `npm run validate:memory` bloqueia o pipeline quando a versão do código não está sincronizada com essa memória.


## Configuração de ambiente

Consulte [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md).

## Materiais privados: local ou cofre

A Biblioteca Inteligente indexa PDFs no navegador e salva somente metadados derivados. Ao adicionar uma aula, escolha:

- **Cofre Supabase:** o PDF fica no bucket privado da conta e pode ser aberto em outros dispositivos autenticados;
- **Somente local:** o PDF permanece no dispositivo e precisa ser vinculado naquele navegador.

Durante a sessão, o Coach abre a cópia disponível diretamente na página prescrita. Consulte `docs/PRIVATE_MATERIAL_WORKFLOW.md`.

## Treino FGV Essencial 3.32.0

A versão 3.32.0 adiciona um fluxo manual e isolado para questões FGV de Banco de Dados. O catálogo derivado contém 664 questões elegíveis dos 797 registros preservados e utiliza 301 assets validados. Conferência e finalização ocorrem no backend; o catálogo público não contém gabarito ou metadados privados. O recurso não altera SDE, mastery, prioridades, sessões, simulados oficiais ou o Diagnóstico Piloto.

Consulte `.ai/sprints/SPRINT-3.32.0.md`, `.ai/decisions/ADR-032-isolated-essential-fgv-training.md` e os relatórios da versão em `docs/`.


## Hotfix Treino FGV 3.32.1

A versão 3.32.1 adiciona entry points serverless explícitos para conferência e finalização, mantém o catálogo privado fora do bundle web, corrige o ciclo de vida de erros, garante rolagem integral em viewports estreitos e define aderência direta como padrão. As 664 questões, os 301 assets e todos os guardrails estratégicos permanecem inalterados.

Consulte `.ai/sprints/SPRINT-3.32.1.md`, `.ai/decisions/ADR-033-explicit-fgv-training-serverless-entrypoints.md` e os relatórios da versão em `docs/`.

## Ledger de Evidências Externas 3.33.0

A versão 3.33.0 transforma o registro manual em um ledger append-only para resultados externos. Uma bateria do QConcursos gera um único evento agregado; correções e anulações são novos eventos que preservam o original. O formulário reutiliza a taxonomia, integra-se a prescrição e sessão, participa do backup e da sincronização existentes e apresenta histórico e resumo descritivo.

As novas evidências permanecem em `shadow` com `affectsSde: false`. Elas não alteram mastery, prioridades, roadmap, sessões ou a prescrição diária nesta versão.

Consulte `.ai/sprints/SPRINT-3.33.0.md`, `.ai/decisions/ADR-034-append-only-external-evidence-ledger.md` e os relatórios da versão em `docs/`.
