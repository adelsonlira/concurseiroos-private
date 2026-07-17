# ADR-025 — Snapshots retrocompatíveis e fonte segura para diagnóstico

Status: aceito em 2026-07-17

## Contexto

Um snapshot de nuvem produzido antes da introdução de `evidenciasAprendizagemGuiada` era estruturalmente válido para a versão que o criou, mas a versão atual o rejeitava com a mensagem “evidenciasAprendizagemGuiada deve ser uma lista”. A falha impedia o usuário de restaurar a cópia da nuvem e criava risco de escolha precipitada entre dados locais e remotos.

A prescrição diagnóstica também apresentava uma seção de questões comentadas como “material indicado”, o que podia induzir a leitura da solução antes da tentativa. As instruções “definir uma pequena amostra” e “responder questão contrastiva” eram tecnicamente interpretáveis, porém pouco acionáveis para o estudante.

O relatório estático de prontidão, gerado sem credenciais no ambiente de build, podia ainda contradizer a configuração efetiva do servidor, mesmo quando `/api/runtime-config` confirmava Supabase e Gemini presentes.

## Decisão

### Migração segura de snapshots

- verificar a origem e o checksum do snapshot exatamente como recebido antes de qualquer transformação;
- aceitar migrações apenas para coleções aditivas cuja ausência represente inequivocamente “nenhum registro”, nunca ausência de conhecimento;
- inicializar `evidenciasAprendizagemGuiada` como lista vazia quando o campo não existia no schema antigo;
- recalcular metadados de integridade após a migração;
- executar toda validação estrutural e referencial antes de substituir o estado atual;
- registrar explicitamente que houve migração e calcular a base de sincronização a partir do estado realmente importado;
- não inventar respostas, tentativas, sessões ou evidências pedagógicas.

### Fonte do diagnóstico

- para diagnóstico, priorizar `QUESTION_LIST` e `SIMULATION` antes de `COMMENTED_QUESTIONS`;
- quando somente questões comentadas estiverem disponíveis, preferir Qconcursos ou Estratégia Questões como fonte primária;
- apresentar o PDF comentado apenas como material de correção posterior;
- nunca gerar questões objetivas automaticamente com IA para decidir dispensa de teoria;
- manter o corpus oficial FGV em shadow mode, sem transformá-lo em banco executável antes da curadoria e da interface próprias.

### Comunicação da rotina

- substituir instruções abstratas por comandos observáveis: abrir a fonte, separar questões não respondidas, não consultar teoria/gabarito, corrigir, fechar a solução e refazer o raciocínio;
- explicar na própria prescrição que o diagnóstico é somente a primeira etapa;
- mostrar as consequências de aprovação e insuficiência, incluindo as páginas exatas de teoria quando disponíveis;
- distinguir fonte das questões, material de correção e material teórico;
- recolher as disciplinas do cofre por padrão para reduzir rolagem.

### Prontidão de runtime

- preservar o relatório estático para auditoria reproduzível;
- no endpoint `/api/readiness`, combinar o relatório com a configuração efetivamente carregada pelo processo do servidor;
- configuração presente gera `WARN`, não `PASS`, até existir smoke test autenticado ou chamada real ao modelo;
- o check de Node.js usa a versão do processo atual, não a versão registrada no artefato estático;
- nunca declarar ausência de credencial quando o processo atual confirma sua presença.

## Consequências

- snapshots anteriores passam a ser restaurados sem perda e sem criação artificial de evidência;
- corrupção protegida por checksum continua sendo rejeitada antes da migração;
- o estudante não é orientado a abrir comentários ou teoria antes do diagnóstico;
- a rotina teoria–prática–correção–revisão fica explícita sem alterar a matemática do SDE;
- o endpoint de prontidão deixa de apresentar contradição com o runtime, mas mantém honestamente integrações reais como pendentes de smoke test;
- futuras mudanças de schema deverão declarar migrações aditivas permitidas em lista explícita e coberta por testes.
