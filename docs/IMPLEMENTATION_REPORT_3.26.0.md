# Relatório de implementação — ConcurseiroOS 3.26.0

Data: 2026-07-17

## Problemas analisados

A validação do usuário expôs quatro problemas distintos:

1. snapshot remoto antigo recusado porque não continha a coleção `evidenciasAprendizagemGuiada`;
2. relatório estático de prontidão contradizendo a configuração efetiva mostrada por `/api/runtime-config`;
3. sessão diagnóstica apresentando questões comentadas e instruções abstratas, com risco de consulta prematura;
4. cofre extenso mesmo depois do agrupamento por disciplina.

## Correção de compatibilidade

Foi introduzida uma etapa de preparação transacional do backup:

- valida origem e bloco de dados;
- verifica o checksum original antes de alterar o objeto;
- adiciona somente coleções explicitamente reconhecidas como aditivas e seguras;
- inicializa `evidenciasAprendizagemGuiada` como `[]` em snapshots anteriores à funcionalidade;
- recalcula checksum, versão e tamanho depois da migração;
- executa a validação estrutural e referencial completa;
- só então substitui o estado do dispositivo.

A sincronização grava como base o fingerprint do estado realmente importado. Isso evita que a migração seja interpretada como nova alteração local e produza outro conflito artificial.

## Fonte das questões

O aplicativo não passa a inventar questões. A política agora é explícita:

1. usar lista local de questões sem solução, quando catalogada;
2. usar simulado local adequado;
3. usar Qconcursos ou Estratégia Questões como fonte principal quando a cópia local expõe comentários/soluções;
4. usar seção comentada somente na correção posterior;
5. manter o corpus oficial minimizado fora do fluxo operacional até curadoria e interface próprias.

Para o material de Normalização catalogado, a teoria permanece nas páginas 3–32, o resumo em 33–39, as questões comentadas em 40–65 e a lista de questões em 66–84. A bateria diagnóstica deve apontar a lista sem comentários, não as páginas comentadas mostradas na versão anterior.

## Rotina explicada na interface

A sessão diagnóstica passou a declarar:

- que se trata de triagem inicial, não de toda a rotina;
- onde obter as questões;
- que teoria, comentário e gabarito não devem ser consultados antes;
- os critérios para adiar teoria;
- o material e as páginas que serão prescritos se a evidência for insuficiente;
- que aprovação no diagnóstico conduz a prática/revisão, não a domínio definitivo.

As frases vagas foram substituídas por ações observáveis. Depois da correção, o aluno deve fechar a solução e reconstruir o raciocínio; se já memorizou a resposta, deve explicar por que as alternativas erradas estão erradas ou resolver uma questão equivalente.

## Prontidão de runtime

O relatório JSON continua reproduzível e reflete o ambiente que o gerou. O endpoint `/api/readiness` agora combina os checks externos e a versão real do Node.js com o processo atual:

- Supabase presente: configuração reconhecida, login real ainda pendente;
- Gemini presente: chave reconhecida, chamada real ainda pendente;
- ausência real: `NOT_TESTED` com motivo correspondente.

Isso elimina a contradição sem transformar presença de variável em validação de integração.

## Organização do cofre

Cada disciplina virou uma pasta recolhível, fechada por padrão. A alteração é visual e não move nem duplica objetos no bucket.

## Alterações deliberadamente não realizadas

- geração de questões por IA;
- ativação do corpus FGV como banco operacional;
- incidência histórica no ranking;
- mesclagem automática de conflitos concorrentes;
- alteração do limiar diagnóstico;
- mudança em score, pesos ou prioridades do SDE.

## Resultado

A versão corrige o bloqueio de restauração, torna a bateria diagnóstica executável sem revelar respostas e explica claramente quando teoria, questões, correção e revisão entram na rotina.


## Validação final

- 383 testes aprovados em 63 arquivos;
- TypeScript aprovado;
- auditoria do SDE PASS com 117 ações e 50 parâmetros;
- builds web, Express e serverless aprovados;
- zero vulnerabilidades conhecidas nas dependências de produção;
- HTTP 200 para aplicação, health, runtime-config e readiness;
- HTTP 401 na rota de IA sem token em produção autenticada;
- lockfile sem URLs internas.
