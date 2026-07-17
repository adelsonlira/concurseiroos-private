# Estado Atual

Data: 2026-07-17
Versão: 3.26.0

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Seu compromisso é reduzir fadiga decisória, tornar a sessão imediatamente executável e recalcular a próxima ação com evidências reais. Nenhum componente promete aprovação ou converte incerteza em certeza.

## Fase atual

Validação privada no ambiente real, agora com retrocompatibilidade de snapshots, diagnóstico por fonte identificada e rotina pedagógica explicitada. A sincronização permanece conservadora, o ciclo de aprendizagem está fechado e toda análise histórica continua em shadow mode.

## Implementado

- Migração segura de snapshots antigos que não continham `evidenciasAprendizagemGuiada`.
- Checksum do conteúdo original verificado antes de qualquer migração; corrupção continua bloqueada.
- Migrações limitadas a coleções aditivas explicitamente permitidas, sem criação de evidência de estudo.
- Fingerprint de sincronização calculado a partir do estado realmente importado após migração.
- Diagnóstico prioriza listas de questões sem solução; questões comentadas são material de correção posterior.
- Qconcursos e Estratégia Questões tornam-se fonte primária quando a fonte local revela comentários ou não possui bateria segura.
- Prescrição explica que o diagnóstico é triagem inicial e mostra o que ocorre ao atingir ou não o portão.
- Teoria de recuperação inclui material, seção e páginas exatas quando mapeadas.
- Instruções operacionais explicitam seleção de questões inéditas, proibição de consulta, correção, fechamento da solução e nova tentativa.
- Cofre privado agrupado por disciplina com pastas recolhidas por padrão.
- `/api/readiness` combina auditoria estática e configuração efetivamente carregada, sem declarar credenciais ausentes quando estão presentes.
- Gate privado antes da interface quando autenticação é obrigatória.
- Produção promove autenticação opcional para obrigatória por padrão; `disabled` exige configuração explícita.
- Cadastro público desativado por padrão e bloqueado também no store.
- Login, recuperação de senha e encerramento seguro em computador público.
- Diagnóstico inicial por questões em conteúdo sem evidência, com amostra mínima de 10, 85% de acerto, nenhuma consulta, nenhum branco e confiança média/alta nos acertos.
- Deduplicação do cofre por SHA-256 calculado no navegador.
- Frente constitucional de segurança com uma ação por disciplina sem evidência mínima quando o edital elimina por zero.
- Sincronização em três vias, reset restrito ao dispositivo, backup 2.0 e persistência local atômica.
- SDE puro, determinístico, explicável e independente da interface.
- Prescrição diária com atividade, duração, material, páginas, questões, protocolo, evidências, fallback e próxima ação.
- Fechamento guiado de teoria e revisão com respostas antes/depois, consulta, dúvidas e fadiga.
- Taxonomia oficial DATAPREV 2026 com 123 nós e 94 subassuntos.
- Ledger append-only de curadoria, 656 propostas conservadoras e matriz histórica exclusivamente em shadow mode.
- Corpus oficial minimizado com 6.462 questões, 5.324 canônicas e 2.840 vínculos definitivos de gabarito.

## Validado

- Pipeline integrado de memória, corpus, catálogos, taxonomia, curadoria, classificação, SDE, prontidão, TypeScript e testes.
- Migração de snapshot legado sem `evidenciasAprendizagemGuiada` testada no validador e no store real.
- Snapshot com checksum inválido permanece rejeitado antes da migração.
- Roteamento de material testado para teoria, prática normal e diagnóstico.
- Banco externo testado como fonte primária quando o PDF local contém soluções comentadas.
- Prescrição testada com fonte de questões e plano pós-diagnóstico.
- Endpoint de prontidão testado com relatório estático sem credenciais e runtime configurado.
- Pastas recolhíveis do cofre protegidas por teste de governança.
- Política de acesso, RLS versionada, deduplicação, diagnóstico e integração store/SDE permanecem cobertos.
- 383 testes aprovados em 63 arquivos.
- Auditoria do SDE aprovada com 117 ações e 50 parâmetros catalogados.
- Builds web, Express e serverless aprovados.
- `npm audit --omit=dev` sem vulnerabilidades conhecidas.
- Smoke HTTP 200 para aplicação, `/api/health`, `/api/runtime-config` e `/api/readiness`; `/api/ai-health` sem token retorna 401.
- Produção promove `AUTH_MODE=optional` para `required`, e o endpoint de prontidão reconhece Supabase/Gemini presentes sem alegar smoke test concluído.
- Neutralidade integral de toda evidência histórica não revisada.

Os números finais de testes, builds, segurança e smoke tests ficam registrados em `docs/VALIDATION_RESULTS_3.26.0.md` e no relatório da sprint.

## Problemas conhecidos

- A cópia da nuvem do usuário precisa ser restaurada novamente na 3.26.0 para confirmar a migração real do snapshot legado.
- O conflito exibido não deve ser resolvido substituindo a nuvem pelos dados locais antes dessa validação.
- As políticas RLS foram verificadas no script versionado, mas ainda precisam ser confirmadas no projeto Supabase implantado.
- Login, recuperação, sincronização notebook–celular e encerramento seguro precisam de smoke test autenticado no domínio real.
- `AUTH_MODE=optional` é aceitável somente no servidor local; a Vercel deve usar `required`.
- O relatório estático de prontidão não executa integrações externas; o endpoint de runtime agora informa a configuração presente, mas login e Gemini real ainda precisam de smoke test.
- Dados locais não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- O limiar diagnóstico de 85% é uma política conservadora inicial, não uma medida calibrada de domínio.
- O corpus oficial FGV ainda não é um banco de questões operacional; permanece minimizado e em shadow mode.
- Duplicatas históricas já existentes no bucket não são apagadas automaticamente.
- As 656 classificações são propostas automáticas; existem zero classificações humanas aprovadas e zero itens elegíveis para incidência.
- A taxonomia possui 32 subassuntos sem localizador pedagógico direto.
- Node.js 24.x é o runtime-alvo; o pacote foi também validado pelo usuário em Node 24, mas a execução automatizada deste ambiente usa Node 22.x.
- Nenhum software ou plano pode garantir aprovação; o produto reduz erros e organiza esforço com rastreabilidade.

## Próxima tarefa

Instalar e publicar a 3.26.0, manter a nuvem preservada e repetir “Usar dados da nuvem neste dispositivo”. Confirmar a migração do snapshot, a fonte diagnóstica correta para Avaliação de modelos de dados, as pastas recolhíveis do cofre e a coerência entre `/api/runtime-config` e `/api/readiness`. Em seguida executar a primeira bateria diagnóstica real e validar a transição automática para teoria ou prática/revisão.
