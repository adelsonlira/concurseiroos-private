# ADR-024 — Acesso privado por convite e diagnóstico antes da teoria

Status: aceito em 2026-07-16

## Contexto

O deploy podia operar com autenticação opcional e renderizar a aplicação completa antes do login. Em um endereço público, isso não revelava automaticamente o snapshot de outro dispositivo quando as políticas RLS estavam corretas, mas permitia uso local anônimo e ampliava o risco de consumo indevido das rotas de IA. Criar um sistema próprio de aprovação administrativa por e-mail adicionaria credenciais privilegiadas, filas, telas e novos modos de falha sem benefício proporcional para um produto privado de um único usuário.

O SDE também bloqueava questões em subassuntos inéditos. Assim, conhecimento prévio real não podia ser demonstrado antes da teoria. A confiança declarada nas respostas era registrada, mas não participava de uma decisão conservadora de dispensa da teoria integral.

## Decisão

### Acesso

- em produção, autenticação passa a ser obrigatória por padrão quando o Supabase está configurado;
- a interface de estudo não é renderizada antes de uma sessão autenticada;
- cadastro público permanece desativado por padrão;
- novas contas devem ser criadas ou convidadas pelo administrador no Supabase;
- não será construído fluxo próprio de aprovação, e-mail administrativo ou gestão de usuários nesta fase;
- um botão específico permite sair e limpar o estado local do dispositivo público depois de sincronizar;
- RLS, bucket privado e políticas por `auth.uid()` continuam sendo a barreira de isolamento dos dados remotos;
- `service_role` nunca entra no navegador.

### Diagnóstico antes da teoria

- subassunto sem evidência começa por uma bateria diagnóstica curta;
- são exigidas pelo menos 10 questões;
- a teoria integral só pode ser adiada com pelo menos 85% de acerto, nenhuma consulta, nenhuma questão em branco e confiança média ou alta em todos os acertos usados;
- acerto inseguro não conta para a dispensa;
- amostra insuficiente mantém o diagnóstico aberto;
- resultado insuficiente libera teoria e bloqueia prática normal até a construção da base;
- resultado apto não declara domínio nem conclui teoria: agenda revisão e prática para confirmar retenção;
- regressão posterior pode reabrir teoria.

### Interface

- remover da rotina normal o importador de novo edital, pois o foco continua exclusivamente DATAPREV;
- retirar o botão redundante de atualização manual do Dashboard, pois o recálculo já é automático;
- mover testes técnicos do Gemini para seção recolhida;
- manter somente controles com função operacional, de recuperação, segurança ou proteção de dados.

## Consequências

- um visitante remoto sem conta não abre plano, histórico, materiais ou Coach;
- uma sessão deixada aberta em computador público ainda exige disciplina operacional; o novo encerramento seguro reduz esse risco, mas não substitui bloqueio físico do dispositivo;
- a criação e revogação de contas dependem do painel ou API administrativa do Supabase, sem código privilegiado no aplicativo;
- conhecimento prévio demonstrado pode economizar teoria sem depender de palpite;
- o limiar de 85% é uma política conservadora inicial e não uma probabilidade calibrada de domínio;
- incidência histórica permanece fora da decisão diagnóstica.
