# Sprint 3.25.0 — Acesso privado e diagnóstico de entrada

## Objetivo

Reduzir a superfície pública do deploy, impedir que o fluxo de estudo seja aberto antes da autenticação e usar questões diagnósticas confiáveis para evitar teoria desnecessária, sem criar um sistema administrativo próprio nem transformar acertos inseguros em domínio.

## Implementado

- gate de acesso antes de renderizar a aplicação em ambientes com autenticação obrigatória;
- fail-closed quando o ambiente exige login mas o Supabase está ausente ou indeterminado;
- promoção automática de `AUTH_MODE=optional` para `required` em produção, exceto quando o administrador desativa autenticação explicitamente;
- cadastro público oculto e bloqueado por padrão com `AUTH_ALLOW_SELF_SIGNUP=false`;
- login, recuperação de senha e mensagem de acesso por convite em tela inicial simples;
- encerramento seguro para computador público: sincronizar, sair, limpar estado local e preservar nuvem/PDFs originais;
- teste estático das políticas RLS e isolamento do bucket por usuário;
- diagnóstico inicial por questões antes da teoria;
- amostra mínima de 10 questões e limiar de 85%;
- consulta, branco ou acerto com baixa confiança impedem dispensa da teoria;
- bateria diagnóstica registra quantidade de acertos seguros;
- resultado apto agenda revisão/prática sem marcar teoria como concluída;
- resultado insuficiente libera teoria;
- importador de edital removido da navegação e do atalho normal;
- atualização manual redundante retirada do Dashboard;
- diagnóstico técnico do Gemini recolhido na tela de conta.

## Não implementado

- fluxo próprio de aprovação de cadastro por e-mail;
- painel administrativo de usuários dentro do ConcurseiroOS;
- cadastro público por padrão;
- teoria dispensada por menos de 10 itens, consulta, chute ou confiança baixa;
- declaração automática de domínio;
- cadastro de novo concurso;
- incidência histórica no diagnóstico ou ranking.

## Segurança decisória

O diagnóstico utiliza apenas respostas reais do estudante e metadados explícitos de consulta, branco e confiança. O limiar é um portão pedagógico conservador, não um modelo probabilístico de aprovação. A teoria permanece recuperável se a prática posterior revelar fragilidade.

## Validação prevista

- política de acesso em inicialização, login obrigatório, modo local e erro de configuração;
- configuração de runtime e promoção segura em produção;
- presença das políticas RLS, revogação de `anon` e isolamento do bucket;
- cenários diagnósticos apto, insuficiente, consulta, confiança baixa e amostra curta;
- integração store → SDE → revisão;
- memória, corpus, catálogos, TypeScript, testes, builds, segurança e smoke HTTP.
