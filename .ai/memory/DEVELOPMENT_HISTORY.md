# Histórico de Desenvolvimento

Este documento é cumulativo. Ele registra o que foi implementado, validado, decidido e deixado pendente em cada etapa relevante. Não substitui os ADRs nem o estado atual.

## Fundação do projeto — anterior à versão 3.2.0

### Implementado

- Constituição do produto e princípios de decisão.
- Núcleo SDE separado de React, Zustand e Express.
- Priority Score, custo de oportunidade, restrições constitucionais e explicabilidade.
- Planner estratégico com blocos, revisões e proteção de carga cognitiva.
- Frontend React, store Zustand, backend Express e integração com Gemini.

### Limitação reconhecida

A compilação demonstrava consistência de software, mas não validava a qualidade matemática das decisões. Pesos, propriedades monotônicas, calibração e cenários reais permaneceram pendentes.

## Sprint 3.2.0 — Coach operacional

### Implementado

- Prescrição Diária Executável.
- Dashboard com ordem principal “Faça agora”.
- Sessão guiada ligada à decisão do SDE.
- Material, seção e páginas na prescrição.
- Meta de questões baseada em ritmo observado ou ritmo bruto oficial.
- Fechamento de bateria, registro de tentativas e recálculo.
- Revisões reorganizadas como fila operacional.
- IA contextual reduzida a Coach Estratégico, Tutor e Analista de Erros.
- Pipeline bloqueado por TypeScript e testes.

### Validado

- 262 testes.
- Build web, servidor e serverless.
- Aplicação e endpoint de saúde.

## Sprint 3.3.0 — Multi-concurso e materiais privados

### Implementado

- Registro genérico de pacotes de concurso.
- DATAPREV transformada no primeiro pacote instalado, não em dependência fixa do núcleo.
- Adaptadores genéricos de decisão e roadmap.
- Proteção arquitetural contra novos imports diretos da DATAPREV.
- Catálogo Estratégia corrigido para 109 materiais e 10.676 páginas, incluindo RLM.
- Catálogo TI Total complementar com 17 materiais válidos, 438 páginas e 66 localizadores.
- Hierarquia de fontes: Estratégia principal, TI Total complementar.
- Fallback controlado por assunto para baterias FGV amplas.

### Validado

- 268 testes.
- TypeScript e builds aprovados.

## Sprint 3.4.0 — Bancos externos e memória institucional

### Implementado

- Qconcursos e Estratégia Questões registrados como fontes externas disponíveis por assinatura do usuário.
- Plano determinístico de fonte de questões por prescrição.
- Banco externo obrigatório quando não existe bateria local mapeada ou aderente à FGV.
- Banco externo opcional quando o material local FGV não alcança o volume necessário ou é desejada uma amostra inédita.
- Filtros prescritos por banca, disciplina, assunto, subassunto e exclusão de anuladas.
- Recomendações exibidas no Dashboard, Sessão Guiada e Coach IA.
- Fonte efetivamente escolhida para a bateria registrada na sessão e no histórico.
- Coach IA recebe a mesma prescrição e o mesmo plano de fontes do SDE.
- Memória institucional com ordem de leitura, protocolo de fechamento e histórico cumulativo.
- Validação automatizada de sincronização entre versão do código e memória da sprint.
- Contextos de domínio, UX, knowledge graph e agentes especializados preenchidos e validados como não vazios.
- Identidade HTML corrigida para ConcurseiroOS e idioma `pt-BR`.

### Validado

- 273 testes em 34 arquivos.
- TypeScript, frontend, servidor e serverless.
- HTTP 200 na aplicação e no endpoint de saúde.
- zero vulnerabilidades conhecidas em dependências de produção.

### Limitações mantidas

- Não existe integração autenticada com APIs do Qconcursos ou Estratégia Questões.
- O sistema não copia enunciados nem respostas dessas plataformas.
- A escolha externa permanece uma orientação operacional; os resultados devem ser registrados pelo usuário.


## Sprint 3.4.1 — Compatibilidade arquitetural com Windows

### Corrigido

- Teste de isolamento de pacotes de concurso passou a normalizar separadores de caminho antes de aplicar as regras.
- Arquivos sob diretórios `tests` são excluídos de forma consistente em Windows, Linux e macOS.
- A regra passou a analisar caminhos relativos portáveis, evitando falsos positivos contra os próprios testes de arquitetura e integração.
- Incluído teste de regressão explícito para caminhos com `\`.

### Validado

- 274 testes em 34 arquivos.
- TypeScript e builds web, Express e serverless aprovados.
- Memória institucional sincronizada com a versão 3.4.1.

### Sem mudança funcional

- Nenhuma regra do SDE, planner, coach, materiais ou bancos externos foi alterada.

## Sprint 3.5.0 — Registro de baterias e clareza operacional

### Implementado

- Registro de baterias externas em um único resumo com total, acertos, erros, brancos, tempo total, fonte e confiança.
- Modo individual mantido para granularidade por questão.
- Marcação explícita de tentativas agregadas e de tempo individual estimado.
- Roteiro de teoria reescrito em instruções concretas.
- `Rota Estratégica` renomeada para `Plano e Progresso`.
- Remoção do rótulo fictício `Concurseiro Lendário`; o rodapé usa perfil real ou perfil local.
- Guia completo para criação e preenchimento do `.env`.

### Decisão

- ADR-008 define que lotes informam volume e acurácia, mas não tempo individual preciso nem causa de erro.

### Validado

- 276 testes em 34 arquivos.
- TypeScript e builds web, Express e serverless.
- Memória institucional sincronizada com a versão 3.5.0.


## Sprint 3.6.0 — Coach guiado e serviços diagnosticáveis

### Implementado

- Perguntas-guia, pontos de atenção e critérios de conclusão definidos pelo coach.
- Modos de primeiro contato, remediação e reativação.
- Sinais descritivos de prova de referência com fonte e limitações explícitas.
- Dashboard, Sessão Guiada e Tutor ligados ao mesmo guia.
- Configuração Supabase carregada do servidor em runtime.
- Endpoint de diagnóstico público sem segredo e teste real autenticável do Gemini.
- Login restaurado quando Supabase é detectado no deploy.
- Governança do importador: prioridade ausente passa a `NAO_INFORMADA`.
- Governança da biblioteca: sugestão de material não cria tópico oficial.
- Auditoria e guias operacionais das treze telas.
- Documentação local/remota do `.env`.

### Validado

- 283 testes em 37 arquivos.
- TypeScript e builds web, Express e serverless aprovados.
- aplicação e `/api/health` retornando HTTP 200.
- runtime config validada com serviços presentes e ausentes.
- ausência de chave Gemini retornando HTTP 503 e autenticação obrigatória retornando HTTP 401.
- zero vulnerabilidades conhecidas nas dependências de produção.

### Limitações mantidas

- Matriz FGV histórica ainda em shadow mode.
- Guia não deve ser interpretado como frequência histórica ampla.
- Componentes legados ainda requerem decomposição.

## Sprint 3.6.1 — Abertura direta de PDFs privados

### Implementado

- Vínculo local de cada material prescrito com a cópia privada do usuário.
- Abertura em nova aba diretamente na primeira página indicada pelo Coach.
- Persistência do `FileSystemFileHandle` em IndexedDB quando o navegador oferece suporte.
- Fallback de seleção temporária sem armazenar o PDF.
- Validação do nome do arquivo, troca de vínculo e tratamento de permissões/arquivo movido.
- Botão disponível no Dashboard e na Sessão Guiada.

### Privacidade

- Nenhum conteúdo binário foi adicionado ao estado, Supabase, backups ou distribuição.
- O vínculo permanece somente no navegador e não é enviado ao Coach.

### Validado

- 286 testes em 38 arquivos.
- TypeScript e builds web, Express e serverless aprovados.
- Memória institucional sincronizada com a versão 3.6.1.


## Sprint 3.7.0 — Cofre híbrido e materiais incrementais

### Implementado

- Prescrição integrada ao bucket privado Supabase com abertura na página indicada.
- Cópia local mantida como fallback e opção de privacidade máxima.
- Upload ao cofre disponível na própria prescrição.
- Biblioteca com indexação local de PDF, hash, total de páginas e sumário derivado.
- Somente metadados derivados podem ser usados pela IA para classificar o material.
- Novos materiais classificados entram no catálogo complementar do concurso ativo.
- Questões-guia reformuladas para 5 a 8 perguntas objetivas em estilo de prova.
- Tela de conta passou a explicar autenticação, snapshot e cofre privado.

### Decisão

- ADR-012 estabelece o modelo híbrido local + Supabase e proíbe conteúdo integral do PDF em snapshot ou prompt de IA.

### Validação

- Testes adicionados para parser de sumário, catálogo dinâmico, privacidade e guia objetivo.
- TypeScript e builds web, Express e serverless executados na entrega.


## 3.8.0 — 2026-07-16

Fundação do Knowledge Engine FGV: entidades canônicas, importação do catálogo de 181 documentos, vínculos auditáveis de 95 provas, validação de integridade, deduplicação documental e infraestrutura de deduplicação de questões. Todo sinal histórico permanece em shadow mode e desconectado do SDE.

## 3.9.0 — 2026-07-16

Hardening matemático do SDE: neutralidade integral de incidência indisponível, correção de deadlock cognitivo, proveniência obrigatória, parâmetros centralizados, breakdown recomponível e auditorias de propriedades e ordenação.

## 3.10.0 — 2026-07-16

Contrato de confiabilidade da prescrição: prontidão e fallback explícitos, próxima ação, ressalvas de shadow mode, auditoria estrutural, interface e Coach IA ligados ao mesmo contrato, além de relatório reproduzível no pipeline.

## 3.11.0 — 2026-07-16

Corpus oficial FGV por questão: verificação de hashes, extração determinística de 6.462 questões em 93 cadernos objetivos ou mistos, exclusão explícita de dois cadernos discursivos, registro de uma prova parcial e minimização de conteúdo com proveniência por página. Nenhum sinal foi conectado ao SDE.

## 3.12.0 — 2026-07-16

Gabaritos, deduplicação e revisão: 1.344 seções interpretadas em 48 PDFs, 44 vínculos automáticos de alta confiança, 2.840 respostas definitivas ligadas, 596 grupos de duplicação, 5.324 questões canônicas e fila agrupada de 646 itens. Validador streaming, cenário dourado DATAPREV 2024, requisitos Python fixados e shadow mode invariável.
## 3.13.0 a 3.21.0 — 2026-07-16

Consolidação do Super Coach confiável: ledger append-only de curadoria, taxonomia oficial DATAPREV, propostas conservadoras de classificação, shadow analytics isolado, ciclo de aprendizagem fechado, comando operacional único, estabilidade do ranking, prontidão explícita e onboarding com padrões seguros. A versão final 3.21.0 mantém zero classificações humanas aprovadas e zero incidência histórica ativa.

## 3.22.0 — Resiliência de dados e prontidão de produção

- Introduzido backup 2.0 com checksum canônico e importação transacional.
- Rejeição de corrupção, referências quebradas e IDs duplicados antes de alterar o estado.
- Persistência local atômica e recuperação automática do último snapshot parseável.
- Mantida a neutralidade do Knowledge Engine e das integrações externas não testadas.


## 3.23.0 — 2026-07-16

Clareza operacional e sincronização conservadora: reconciliação em três vias com conflito apenas em divergência real, reset seguro restrito ao dispositivo, cofre agrupado por disciplina, respostas textuais antes/depois nas perguntas-guia e nomenclatura explícita dos comandos de atualização. O cadastro de novos concursos permanece deliberadamente adiado para preservar o foco DATAPREV.

## 3.24.0 — 2026-07-16

Deduplicação por conteúdo no cofre privado e segurança estratégica contra zero: SHA-256 antes do upload, reaproveitamento de cópia existente, caminho content-addressed, frente inicial de uma ação por disciplina insegura, XAI e auditoria específicos. Incidência histórica, probabilidade de aprovação e pontos por hora permanecem desativados.


## 3.25.0 — 2026-07-16

Acesso privado e diagnóstico de entrada: gate de autenticação antes da interface, cadastro público desativado por padrão, produção fail-closed, encerramento seguro para dispositivo público e guardas estáticos de RLS. Conteúdo inédito passa por bateria diagnóstica mínima; apenas 85% ou mais, sem consulta, sem branco e com acertos seguros pode adiar teoria integral. O resultado não declara domínio e permanece sujeito a revisão e regressão. Importador de edital e controles redundantes foram retirados da rotina DATAPREV.

## 3.26.0 — 2026-07-17

Compatibilidade de nuvem e rotina diagnóstica clara: snapshots anteriores à evidência guiada passam por migração aditiva somente após verificação do conteúdo original, mantendo corrupção e inconsistência bloqueadas. O diagnóstico prioriza listas sem solução ou bancos externos, distingue fonte, correção e teoria, declara a consequência do resultado e elimina instruções abstratas. Cofre recolhível por disciplina e prontidão de runtime coerente com a configuração efetiva completam a entrega, sem alterar score, pesos ou incidência do SDE.


## 3.27.0
- UX e identidade visual consolidadas.
- Cofre reconciliado com catálogo auditado e agrupado por matéria.
- Pipeline Vercel enxuto, com validação completa no CI.
- Videoaulas externas corrigidas e Coach incluído no menu.


## 3.28.0 — 2026-07-17

Capacidade viável até a prova: novo horizonte descritivo calcula dias ativos, horas restantes, pressão de cobertura e segurança por disciplina usando apenas calendário e evidências reais. A projeção não distribui prioridade por assunto, não estima aprovação e não modifica o SDE.

## 3.29.0 — 2026-07-17

Roteamento pedagógico seguro: páginas passaram a exigir vínculo exato com o subassunto ou fallback amplo explicitamente aprovado. `TOPIC_ONLY` isolado deixou de autorizar prescrição; teoria e questões comentadas foram excluídas da primeira tentativa diagnóstica. Foi criado relatório para os 94 subassuntos, com zero fallback entre irmãos e zero alvo sem fonte diagnóstica executável. O PDF da Lei nº 12.527/2011 foi corrigido para LAI por metadado de origem auditado. Login obrigatório, sincronização entre dispositivos e Gemini foram registrados como confirmados pelo usuário no ambiente real.


## 3.30.0 — 2026-07-17

Correção de erros com evidência: cada subassunto com erro passa a ter caso append-only, protocolo por causa confirmada, correção e regra preventiva. Acertos só confirmam recuperação sem consulta e com confiança média/alta; duas verificações estabilizam provisoriamente e novo erro reabre o caso. Backups antigos migram sem promover acertos históricos a domínio. O contrato não altera o SDE.

## 3.31.0 — 2026-07-17

Simulados parciais e completos com composição oficial e fonte identificada: o fluxo legado aleatório foi substituído por blueprint determinístico, cotas e pontos do edital, controle de tempo e brancos, alerta de zero, análise pós-simulado e comparação entre composições equivalentes. Questões locais exigem documento e gabarito identificados; fontes externas não copiam conteúdo. Resultados agregados não criam evidência temática nem alteram o SDE.

## 3.31.1 — 2026-07-17

Patch de recuperação operacional: logos deixam de depender de assets inexistentes; configuração de runtime e probe Gemini ganham funções serverless independentes, normalização de variáveis e falhas JSON controladas; o cliente Supabase deixa de ser construído no boot do módulo. Simulados podem ser cancelados sem exclusão destrutiva, saindo da fila recente e permanecendo nos backups. Nenhum parâmetro do SDE ou sinal histórico foi alterado.

## 3.31.2 — 2026-07-17

Patch de resolução ESM em produção: o log da Vercel comprovou que `/api/ai-health` falhava com `ERR_MODULE_NOT_FOUND` antes de qualquer chamada ao Gemini. Todos os imports relativos do grafo serverless passaram a usar extensão explícita `.js`, o JSON de prontidão recebeu atributo de importação e foi criada regressão que transpila sem bundle e carrega os entrypoints com a resolução nativa do Node. Nenhum segredo, parâmetro do SDE, prioridade ou sinal histórico foi alterado.

## 3.31.3 — 2026-07-18

Diagnóstico piloto FGV-DATAPREV de Banco de Dados integrado como fluxo experimental isolado: 24 questões fixas, seis assets, retomada local, cancelamento sem resultado, finalização explícita e tentativa append-only. O cliente recebe apenas catálogo sanitizado; gabarito e rastreabilidade fonte permanecem no backend até a correção. O relatório usa exclusivamente `selection_area`, separa cobertura principal e complementar sem alterar nota e registra `affectsSde: false`. Nenhuma estrutura do store principal, SDE, mastery, prioridade, sessão, simulado oficial ou incidência histórica foi alterada.

## 3.31.4 — 2026-07-18

Hotfix de navegação do diagnóstico piloto: removida a seleção automática da última tentativa finalizada durante a hidratação. O módulo passou a separar explicitamente `landing`, `active_attempt` e `finalized_result`, usando fragmentos de rota compatíveis com o shell atual e F5. O menu lateral sempre retorna à landing, cada resultado abre pelo `attemptId` exato, cancelamento não cria resultado e o histórico permanece append-only. Nenhum conteúdo, gabarito, asset, cálculo, storage, SDE, mastery, prioridade, sessão ou simulado oficial foi alterado.

## 3.32.0 — 2026-07-18

- Entregue o Treino FGV Essencial, separado do Diagnóstico Piloto, Simulados, Sessão Guiada e atividade prescrita pelo SDE.
- Importados e preservados 797 registros do banco operacional v2, com catálogo derivado reproduzível de 664 questões elegíveis.
- Validados 301 assets por hash e tamanho; nenhuma recuperação, OCR, reclassificação ou busca externa foi executada.
- Criados catálogo público sanitizado e catálogo privado server-side para correção após ação explícita.
- Implementados filtros por área, item, aderência e quantidades 5/10/15/20.
- Implementada seleção aleatória com seed, ordem imutável, ausência de repetição e persistência local isolada.
- Implementados estados `landing`, `active_training` e `finalized_training`, preservando a regressão de navegação corrigida na 3.31.4.
- Implementados conferência por questão, bloqueio após conferência, finalização com brancos, agregações e histórico básico imutável.
- Mantidos `affectsSde: false`, `countsAsOfficialSimulation: false` e `trainingType: thematic_fgv`.
- SDE, mastery, prioridades, roadmap, sessões, simulados oficiais, diagnóstico, autenticação e sincronização permaneceram sem alteração funcional.

## 3.32.1 — 2026-07-18

Hotfix crítico do Treino FGV: a causa da falha de conferência em produção foi a ausência de entry points correspondentes no diretório `api/` da Vercel, embora as rotas existissem no Express local. Foram adicionados handlers explícitos para `check` e `finalize`, com inclusão estática e validação do catálogo privado no bundle serverless. A conferência passou a validar tentativa, ordem e pertencimento da questão. Mensagens transitórias foram separadas por tela e deixaram de vazar para landing ou resultado. O módulo recebeu rolagem vertical única e imagens responsivas, e o filtro de aderência passou a iniciar em `DIRECT`. Nenhuma questão, asset, resposta operacional, histórico, SDE, mastery, prioridade, sessão, simulado, diagnóstico ou store principal foi alterado.
