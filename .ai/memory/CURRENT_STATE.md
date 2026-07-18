# Estado Atual

Data: 2026-07-18
Versão: 3.31.3

## Projeto

ConcurseiroOS — alvo ativo: DATAPREV 2026, Analista de Tecnologia da Informação, Perfil 3 — Desenvolvimento de Software.

O produto é um sistema de apoio à decisão orientado à aprovação. Deve reduzir fadiga decisória, entregar uma sessão executável e recalcular a próxima ação com evidências reais. Nenhum módulo promete aprovação, inventa incidência ou converte ausência de dados em certeza.

## Fase atual

A versão 3.31.3 integra o `DIAGNÓSTICO PILOTO FGV–DATAPREV — BANCO DE DADOS — v1` como fluxo experimental isolado. A baseline funcional continua sendo a arquitetura validada da 3.31.2; banco operacional, SDE, prioridades, mastery, sessões e simulados oficiais não foram alterados. O diagnóstico possui catálogo público sanitizado, correção no backend, persistência local própria e marcador `affectsSde: false`.

A correção ESM da 3.31.2 permanece incorporada. O probe real do Gemini ainda precisa ser reconfirmado após publicação no runtime da Vercel.

## Implementado

- SDE puro, determinístico, explicável e independente da interface.
- Prescrição diária com atividade, duração, material, páginas, questões, protocolo, evidências, fallback e próxima ação.
- Proteção contra zerar disciplina e projeção conservadora de capacidade até 11/10/2026.
- Ciclo teoria/recuperação/questões/correção/revisão com evidência antes e depois.
- Login privado, sincronização em três vias, backup transacional, persistência local atômica e cofre deduplicado por SHA-256.
- Taxonomia oficial com 123 nós e 94 subassuntos.
- Corpus FGV com 6.462 questões, 5.324 canônicas e 2.840 vínculos definitivos, integralmente em shadow mode.
- Curadoria append-only e 656 propostas automáticas sem qualquer incidência ativa.
- Roteamento pedagógico exato, recuperação de erros baseada em evidência e simulados oficiais com fonte identificada.
- Diagnósticos `/api/runtime-config` e `/api/ai-health` isolados do boot Express, com especificadores ESM explícitos.
- Diagnóstico piloto `diag-fgv-dataprev-bd-v1`, versão 1:
  - 24 questões em ordem fixa;
  - duração sugerida de 50 minutos;
  - seis assets relativos validados;
  - estados respondida, não respondida e revisão;
  - início, resposta, navegação, retomada, cancelamento e finalização explícita;
  - bloqueio de segunda tentativa enquanto outra estiver ativa;
  - catálogo público sem gabarito ou metadados internos;
  - correção operacional somente após finalização;
  - resultado total e por `selection_area`;
  - cobertura principal de 20 questões e complementar de 4, sem ajuste de nota;
  - tentativa finalizada append-only com rastreabilidade dos 24 registros por fingerprint;
  - armazenamento próprio, fora do store principal, mastery, SDE, roadmap, prescrição e simulados.

## Validado

- Pacote fonte do diagnóstico: 24 questões únicas, 20 aderentes diretas, 4 parciais, 6 assets e controles 14 e 53.
- Checksum do banco operacional recebido coincide com o manifesto do diagnóstico; o banco não foi alterado.
- Catálogo público não contém `answer_key`, ordinal, ID de plataforma, origem do gabarito, assunto, subassunto ou item do edital.
- Cancelamento não cria resultado; recarregamento preserva tentativa ativa; tentativa finalizada rejeita sobrescrita.
- Agregação principal usa exclusivamente `selection_area`.
- Resultado do piloto não altera SDE, mastery, prioridades ou simulados.
- 436 testes aprovados em 74 arquivos, incluindo 17 testes novos do diagnóstico.
- TypeScript aprovado.
- Auditoria estática do diagnóstico aprovada.
- Incidência histórica e materiais privados continuam neutros no ranking.

## Problemas conhecidos

- A correção do diagnóstico depende do endpoint autenticado; indisponibilidade de rede impede a finalização até nova tentativa, preservando o estado ativo local.
- Tentativas diagnósticas são locais e não sincronizam entre dispositivos nesta versão.
- Dados locais gerais ainda não são namespaceados para múltiplos usuários no mesmo perfil de navegador.
- 37 subassuntos ainda não possuem localizador teórico exato.
- 42 subassuntos dependem de Qconcursos ou Estratégia Questões para diagnóstico seguro.
- As 656 classificações históricas continuam automáticas; há zero classificações humanas aprovadas e zero incidência elegível.
- O runtime-alvo é Node.js 24.x; o ambiente automatizado executa Node 22.x.
- O probe Gemini precisa ser reconfirmado no runtime real da Vercel.
- Nenhum software ou plano garante aprovação.

## Próxima tarefa

Publicar a 3.31.3 e validar em produção: abertura dos seis assets, início, resposta, recarregamento, cancelamento, retomada, confirmação de encerramento, correção e imutabilidade do resultado. Em paralelo, confirmar `/api/runtime-config` e o probe autenticado do Gemini, sem alterar chave ou modelo antes de observar o runtime.
