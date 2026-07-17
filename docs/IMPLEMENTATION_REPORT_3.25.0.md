# Relatório de implementação — ConcurseiroOS 3.25.0

Data: 2026-07-16

## Escopo analisado

Foram revisados criticamente o risco do link público, o modelo de autenticação, as políticas Supabase, a sessão em computador público, o fluxo de diagnóstico antes da teoria e os controles visíveis nas telas principais.

## Decisão sobre autenticação

Um endereço Vercel público não deveria abrir a experiência de estudo de um produto privado. RLS protege o dado remoto, mas não justifica renderizar a aplicação anonimamente nem permitir consumo das rotas de IA. Foi adotado acesso por convite administrado no Supabase, sem criar um subsistema próprio de aprovação por e-mail.

Implementado:

- gate antes da aplicação;
- autenticação obrigatória por padrão em produção;
- cadastro público desligado por padrão;
- login e recuperação de senha;
- erro fechado quando autenticação exigida não está configurada;
- encerramento com sincronização e limpeza local para dispositivo público;
- testes estáticos da migração RLS.

## Decisão sobre diagnóstico

A hipótese do usuário é válida: quem já domina Scrum ou outro assunto não deve consumir teoria integral por protocolo cego. Porém, percentual bruto sem tamanho de amostra, consulta e confiança seria vulnerável a sorte.

Política adotada:

- 10 questões no mínimo;
- 85% ou mais de acerto;
- nenhuma consulta;
- nenhuma questão em branco;
- todos os acertos usados devem ser declarados com confiança média ou alta;
- teoria é apenas adiada, não concluída;
- revisão e prática posteriores confirmam ou revogam a decisão.

## Revisão de interface

Removido ou ocultado:

- importador de novo edital da navegação DATAPREV;
- atalho de teclado correspondente;
- botão manual redundante de atualização da recomendação;
- teste real do Gemini como ação proeminente.

Mantido por possuir função necessária:

- sincronização manual como fallback e diagnóstico;
- backup, recuperação e zona crítica segura;
- logout simples e logout com limpeza de dispositivo público;
- ações de cofre, sessão, questões, revisão e registro.

## Itens deliberadamente não implementados

- painel administrativo próprio;
- aprovação por e-mail dentro do aplicativo;
- multiusuário;
- cadastro de novo concurso;
- dispensa da teoria por chute ou amostra pequena;
- incidência histórica no diagnóstico.

## Riscos residuais

- RLS precisa ser confirmada no projeto remoto, não apenas no SQL versionado;
- computador público exige uso correto do encerramento seguro;
- limiar diagnóstico deve ser validado prospectivamente;
- dados locais não são separados por usuário no mesmo perfil de navegador.

## Validação final

- 376 testes aprovados em 61 arquivos;
- TypeScript aprovado;
- auditoria SDE PASS com 117 ações e 50 parâmetros;
- builds web, Express e serverless aprovados;
- nove verificações no relatório de prontidão;
- zero vulnerabilidades conhecidas nas dependências de produção;
- HTTP 200 na aplicação, health, runtime-config e readiness;
- HTTP 401 na rota de IA sem token quando Supabase está configurado;
- autenticação opcional promovida para obrigatória em produção;
- ausência de Supabase em produção falha fechada com HTTP 503 nas rotas protegidas.
