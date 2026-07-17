# UX — Coach First

## Pergunta principal

Ao abrir o sistema, o candidato deve responder apenas: **“posso iniciar a sessão indicada?”**

O sistema resolve prioridade, conteúdo, duração, material, páginas, questões, protocolo, registro e próxima ação. Quando faltar uma informação realmente indispensável, deve pedir somente essa informação.

## Hierarquia visual

1. Comando operacional e botão principal.
2. Prescrição atual completa.
3. Fechamento pedagógico da sessão.
4. Próximas ações limitadas.
5. Explicação “por que agora?” e diagnósticos em camadas secundárias.

## Estados operacionais

- iniciar agora;
- retomar sessão;
- recuperar interrupção;
- usar fallback;
- aguardar prescrição válida.

Cada estado possui uma única ação primária e não transfere ao estudante a decisão estratégica.

## Fechamento obrigatório de teoria e revisão

- registrar respostas antes e depois;
- informar uso de consulta na recuperação final;
- registrar dúvidas remanescentes;
- informar fadiga;
- receber automaticamente a próxima ação.

## Regras de simplicidade

- não expor conceitos internos do SDE sem necessidade;
- não repetir a mesma decisão em cards concorrentes;
- usar padrões seguros no onboarding;
- mostrar gaps e baixa confiança com linguagem acionável;
- manter fallback recolhido quando a fonte principal funciona;
- preservar resumo agregado para baterias grandes;
- não usar linguagem de garantia de aprovação.

## Cobertura do edital

A interface mostra quantos subassuntos possuem localizador pedagógico, evidência humana de questões ou gap. Cobertura não significa domínio e proposta automática não significa revisão concluída.
## Roteamento pedagógico seguro

- Nunca apresentar páginas de um subassunto irmão como fallback do alvo atual.
- `TOPIC_ONLY` é metadado insuficiente para prescrição; fallback amplo exige revisão explícita.
- Quando não houver localizador exato, mostrar a lacuna, orientar busca pelo nome oficial e pedir o registro do trecho realmente utilizado.
- Diagnóstico inicial usa lista sem solução, simulado ou banco externo; comentários e teoria ficam para a correção posterior.



## Recuperação de erros

A interface não deve aceitar “recuperei” como encerramento de um erro sem causa confirmada e correção explícita. O usuário vê uma ação por vez: classificar, corrigir, verificar e estabilizar. Textos privados não são enviados automaticamente ao Coach.

## Simulados

- Mostrar fonte, composição oficial, pontos, duração e regra de zero antes de iniciar.
- Registrar acertos, erros, brancos e tempo por disciplina.
- Não declarar corte global em simulado parcial.
- Apresentar correção como sequência do episódio, nunca como cronograma paralelo ao SDE.
- Explicar que resultado agregado só afeta a estratégia depois de o usuário identificar os subassuntos reais dos erros.

## Cancelamento de simulados

- Um simulado ainda não concluído deve oferecer ação explícita de cancelamento.
- O cancelamento exige confirmação, remove o item da fila recente e preserva um registro `CANCELADO` no snapshot para evitar perda silenciosa.
- Simulados concluídos não podem ser cancelados.

## Identidade visual resiliente

Elementos essenciais de marca usados no gate de acesso e navegação devem estar no bundle da aplicação ou possuir teste de existência; a interface não pode depender de assets estáticos ausentes no deploy.

