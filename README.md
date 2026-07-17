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

`npm run build` executa toda a validação local. O workflow versionado em `.github/workflows/ci.yml` bloqueia a integração quando TypeScript, testes, auditorias ou builds falham; `npm run vercel-build` executa apenas o build web para evitar repetição do pipeline dentro da Vercel.

## Prescrição de questões

A quantidade de questões é calculada pela mediana do próprio candidato no recorte mais específico disponível. Até existir amostra mínima, o sistema usa a cadência bruta da prova oficial e declara baixa confiança.

Após uma sessão de questões, a tela de registro:

- recupera a bateria prescrita;
- fixa disciplina, assunto e subassunto;
- mostra progresso contra meta e extensão opcional;
- vincula cada tentativa à prescrição de origem;
- aceita questões externas sem copiar enunciados protegidos.

Quando o catálogo privado não oferece uma bateria FGV suficiente, a prescrição pode indicar **Qconcursos** ou **Estratégia Questões**. O sistema mantém a decisão central — assunto, quantidade e tempo — e fornece os filtros de banca, disciplina, assunto, subassunto e exclusão de anuladas. Não há automação de login, cópia de questões ou coleta de respostas dessas plataformas.

## Super Coach 3.30.0

Erros relevantes agora exigem causa confirmada, correção explícita e duas verificações independentes antes da estabilização provisória. Um novo erro reabre automaticamente o ciclo.

A sessão diária possui uma única ação operacional e um fechamento pedagógico baseado em recuperação. Conteúdo inédito começa com bateria diagnóstica obtida de lista local sem solução ou de banco externo identificado; a teoria integral só pode ser adiada com pelo menos 10 questões, 85% de acerto, nenhuma consulta, nenhum branco e acertos seguros. Isso não declara domínio e mantém revisão/prática obrigatórias. O roteamento de materiais exige vínculo exato com o subassunto ou fallback amplo explicitamente revisado; páginas de subassuntos irmãos nunca são prescritas como substitutas. Snapshots anteriores são migrados de forma aditiva e transacional, sem inventar evidência.

O deploy privado usa login antes da interface, cadastro público desligado por padrão e encerramento seguro para computadores públicos. Consulte `docs/PRIVATE_ACCESS_GUIDE.md`, `docs/GUIDED_LEARNING_PROTOCOL.md`, `.ai/sprints/SPRINT-3.30.0.md`, `docs/ERROR_RECOVERY_PROTOCOL.md` e `docs/VALIDATION_RESULTS_3.30.0.md`.

## Corpus oficial FGV

A versão 3.30.0 contém um corpus **metadado e minimizado** de 6.462 questões oficiais. O repositório não armazena enunciados ou alternativas integrais; conserva hashes, localizadores de página, trecho curto, estado de revisão e vínculo auditável com gabaritos. Todo o corpus permanece em shadow mode e não altera o SDE.

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
