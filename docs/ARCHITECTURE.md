# ConcurseiroOS — Arquitetura vigente

## 1. Objetivo

O ConcurseiroOS é um sistema de apoio à decisão para preparação de concursos. Ele não promete aprovação e não substitui ausência de dados por números plausíveis. A arquitetura privilegia rastreabilidade, determinismo, privacidade e recalibração contínua.

## 2. Camadas

```text
Interface React
    ↓
Zustand local-first
    ↓ snapshot imutável
Adaptadores de evidência
    ↓
SDE de priorização
    ↓
Planner diário / prévia semanal
    ↓
Protocolos de execução e Coach explicativo
```

### 2.1 Configuração oficial

`src/config/concursos/dataprev-2026-perfil-3/`

Contém regras do edital, árvore de disciplinas, assuntos e subassuntos, localidade, pesos oficiais, fontes e metadados de proveniência. Valores neutros e dados indisponíveis são identificados explicitamente.

### 2.2 Evidências do candidato

As fontes válidas incluem:

- tentativas granulares de questões;
- sessões reais cronometradas;
- conclusão teórica confirmada pelo usuário;
- recuperações programadas;
- flashcards e simulados quando efetivamente executados.

Resumos agregados não substituem registros granulares.

### 2.3 SDE

`src/core/sde/`

O SDE produz ações estratégicas explicáveis. A ordem constitucional trata risco eliminatório, lacunas relevantes, proteção da memória, expansão do edital e manutenção. Custo de oportunidade e retorno marginal permanecem indisponíveis quando faltam dados suficientes.

### 2.4 Planner

`src/core/sde/planner/`

O Planner recebe a ordem do SDE e a janela diária real. Ele:

- desconta estudo já realizado;
- respeita limites operacionais de sessão;
- insere pausas somente entre sessões;
- não cria atividades de fallback;
- protege conteúdo novo quando possível;
- relata minutos não alocados;
- entrega protocolo ativo de execução.

### 2.5 Revisão híbrida

`src/core/review/`

A política `HYBRID_ADAPTIVE_REVIEW_V2` compara resultados tardios de métodos diferentes. Retenção tem prioridade e eficiência atua apenas como desempate conservador. A escolha continua exploratória e reversível.

### 2.6 Flashcards adaptativos

`src/core/flashcards/`

A política `HYBRID_ADAPTIVE_FLASHCARD_V1` usa resultados observáveis de recuperação, histórico do cartão e horizonte da prova. O campo legado de facilidade permanece apenas para compatibilidade de backups e não participa do agendamento.

### 2.7 Diagnóstico contínuo

`src/core/diagnostic/`

O mapa de evidências classifica cobertura observável, não conhecimento interno. Os estados distinguem ausência de evidência, teoria sem recuperação, amostra inicial, evidência repetida, erro ativo e recuperação pós-erro.

Limiar operacional de repetição não é apresentado como lei científica.

### 2.8 Rota semanal

`src/core/roadmap/`

A prévia de sete dias é derivada e recalculável. Ações de expansão são diversificadas quando há alternativas, enquanto revisões vencidas podem permanecer consecutivas. O plano diário do momento da execução sempre prevalece.

### 2.9 Coach

`src/integrations/coach/`

O Coach recebe contexto estruturado com evidências, lacunas, decisões do SDE, mapa de cobertura, revisão e calibração semanal. Ele explica e orienta a execução, mas não pode alterar prioridade, inventar incidência, declarar domínio ou transformar tempo em pontos por hora.

### 2.10 Nuvem e materiais privados

`src/integrations/cloud/` e `supabase/`

A arquitetura prevista usa Supabase com autenticação, RLS, snapshots versionados e bucket privado. PDFs licenciados ficam fora do repositório e não são enviados ao modelo de IA. O pacote público conserva somente localizadores e metadados seguros.

## 3. Persistência

O modo atual usa Zustand com persistência local e exportação de backup sanitizada. A sincronização on-line é opcional e permanece desativada até configuração real do Supabase.

Decisões derivadas do SDE não são tratadas como fonte persistente; são recalculadas a partir das evidências.

## 4. Qualidade

As alterações devem passar por:

```bash
npm run test:run
npm run lint
npm run build
npm audit --omit=dev
```

Testes cobrem configuração oficial, evidências, SDE, planner, revisão, flashcards adaptativos, disponibilidade, materiais, nuvem, integração do store, Coach, diagnóstico e roteiro semanal.

## Pacotes de concurso

O núcleo não importa configurações específicas de concursos. `src/config/concursos/registry.ts` resolve um `CompetitionRuntimeDefinition` por `concursoAlvoId`.

Cada pacote instalado reúne configuração oficial, políticas do SDE, seed operacional, evidências e catálogo privado de materiais. A DATAPREV 2026 — Perfil 3 é o pacote padrão inicial. Um novo concurso deve ser adicionado como pacote isolado e registrado, sem alterar os algoritmos do SDE.

Concursos importados sem pacote registrado podem permanecer no cadastro, mas não recebem decisões estratégicas como se estivessem validados.
