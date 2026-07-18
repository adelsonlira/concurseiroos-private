# Domínio do ConcurseiroOS

## Objetivo do domínio

Representar, sem misturar fatos e inferências, a relação entre concurso, edital, banca, conteúdo, materiais, ações de estudo e evidências reais do candidato.

## Entidades principais

### Competition Package

Pacote versionado de um concurso-alvo. Contém regras oficiais, taxonomia, políticas do SDE, evidências estratégicas permitidas e configurações do planner. A DATAPREV 2026 Perfil 3 é o primeiro pacote instalado.

### Disciplina, Assunto e Subassunto

Hierarquia canônica do edital. O subassunto é o menor recorte operacional para teoria, questões, revisão e rastreamento de evidência.

### Strategic Action

Ação produzida pelo SDE. Define tipo de atividade, conteúdo, prioridade, score, razão constitucional, confiança, dados usados e ausentes.

### Study Session

Alocação operacional do Planner: duração, ordem, protocolo e carga cognitiva.

### Daily Study Prescription

Entidade central do produto. Une ação estratégica, sessão, material, páginas, quantidade de questões, fonte de execução e evidências a registrar.

### Evidence

Registro observado: tentativa de questão, sessão concluída, recuperação, revisão, flashcard ou confirmação explícita de teoria. Ausência de evidência não equivale a baixo desempenho.

### Material Locator

Metadado que aponta material, seção e páginas. Material privado serve somente para roteamento pedagógico e nunca altera o score estratégico.

### External Question Bank

Plataforma assinada pelo usuário usada para executar baterias prescritas. O sistema informa filtros e quantidade, mas não copia conteúdo nem controla a conta externa.

### Review Schedule

Fila adaptativa de recuperação. Intervalos são decisões operacionais baseadas em histórico; não representam uma curva individual comprovada.

### Simulation Plan

Composição versionada derivada do edital, com disciplina, quantidade, pontuação, duração e fonte identificada. Pode ser parcial ou completa. Resultado agregado permanece no domínio de simulado e não se transforma em evidência temática sem subassunto real.

## Invariantes

- edital oficial define o universo válido do concurso;
- banca histórica só influencia prioridade após validação;
- cada tentativa pertence a disciplina, assunto e subassunto válidos;
- evidência futura em relação à data de decisão é inválida;
- LLM não cria prioridade, cronograma ou evidência;
- material e plataforma de questões não alteram incidência;
- troca de concurso preserva conhecimento quando houver equivalência validada, mas recalcula pesos, regras e banca.

## Tentativa temática FGV

Entidade isolada com `trainingType = thematic_fgv`, seed, ordem, filtros, respostas, conferências e revisão. Tentativas finalizadas são imutáveis e carregam `affectsSde = false` e `countsAsOfficialSimulation = false`.
