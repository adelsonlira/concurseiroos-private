# Auditoria de UX — ConcurseiroOS 3.6.0

Data: 2026-07-16
Alvo: DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software

## Critério de auditoria

Cada tela foi avaliada por quatro perguntas:

1. Qual decisão do candidato ela elimina?
2. Qual evidência ela coleta ou apresenta?
3. O que o usuário deve fazer ao sair dela?
4. Ela aproxima o candidato da execução ou aumenta carga mental?

## 1. Hoje — Seu Coach

**Função:** apresentar uma única ação prioritária executável.

**Mantido:** duração, conteúdo, material, páginas, meta de questões, fonte e justificativa.

**Melhorado:** sessões de teoria e revisão recebem perguntas-guia, pontos de atenção e critérios de conclusão definidos pelo coach. Foi incluído acesso contextual ao Tutor.

**Próximo refinamento:** medir tempo entre abertura e início da sessão; reduzir métricas secundárias se não apoiarem ação.

## 2. Sessão guiada

**Função:** executar a prescrição sem reconstruí-la manualmente.

**Melhorado:** o guia de foco aparece antes do roteiro. Em primeiro contato, “ainda não sei” é aceito antes da leitura, mas a resposta deve ser refeita sem consulta. Há botão contextual para tirar dúvida.

**Risco remanescente:** componente grande; precisa ser decomposto sem mudar o fluxo.

## 3. Revisões e erros

**Função:** executar a revisão vencida e fechar lacunas observadas.

**Estado:** coerente com recuperação ativa e evidência posterior.

**Próximo refinamento:** unir visualmente revisão, erro de origem e critério de saída; evitar filas que pareçam uma segunda agenda concorrente.

## 4. Registrar questões

**Função:** transformar baterias em evidência para o SDE.

**Melhorado:** orientação explícita para resumo agregado em baterias grandes e detalhe individual somente para erros relevantes. O título deixa claro que a tela serve para registrar e corrigir, não apenas navegar num banco.

**Próximo refinamento:** separar melhor “resolver questão interna” de “registrar bateria externa”.

## 5. Plano e Progresso

**Função:** mostrar direção provável, mapa de evidências e próximos passos recalculáveis.

**Estado:** não substitui a prescrição diária.

**Próximo refinamento:** destacar quais itens são previsão e quais são compromisso já iniciado; evitar aparência de cronograma rígido.

## 6. Edital e cobertura

**Função:** consultar o conteúdo oficial e as evidências existentes.

**Melhorado:** linguagem operacional: peso oficial, prioridade do edital, questões, acerto observado e cobertura teórica. “Feito” foi substituído por “Registrada”, evitando confundir marcação com domínio.

**Próximo refinamento:** reduzir colunas em telas estreitas e oferecer filtros por lacuna relevante.

## 7. Materiais e páginas

**Função:** organizar e localizar recursos; o coach continua responsável pela escolha operacional.

**Melhorado:** materiais não podem criar assuntos oficiais nem atribuir prioridade média automaticamente. Sugestões da IA ficam como observação não validada. O edital não é alterado.

**Risco remanescente:** `LibraryView` é um monólito e mistura catálogo, leitura, mapas, questões e flashcards.

## 8. Flashcards prescritos

**Função:** revisar cartões vencidos ou prescritos.

**Melhorado:** a tela informa que flashcard não é obrigação diária nem substituto universal de teoria e questões.

**Próximo refinamento:** criação de cartão deve ser recomendada apenas quando o tipo de conteúdo justificar recuperação atômica.

## 9. Revisão da semana

**Função:** comparar planejado e executado e revelar falhas operacionais.

**Estado:** descritivo; não deve moralizar presença nem inferir aprovação.

**Próximo refinamento:** converter achados em no máximo uma alteração operacional para a semana seguinte.

## 10. Perguntar ao Coach

**Função:** explicar a decisão, ensinar o tópico atual e analisar erros.

**Melhorado:** o Tutor pode explicar exatamente as perguntas-guia da prescrição. O backend o proíbe de inventar padrões FGV ou trocar o plano.

**Próximo refinamento:** manter o chat contextual dentro da sessão e reduzir dependência de uma tela isolada.

## 11. Importar novo edital

**Função:** ferramenta administrativa para criar um rascunho de pacote de concurso.

**Melhorado:** formatos anunciados agora correspondem ao processamento disponível. A IA não estima incidência ou prioridade ausente; retorna `NAO_INFORMADA` e peso neutro quando o documento não declara valor.

**Próximo refinamento:** fluxo obrigatório de revisão humana antes de ativar um pacote.

## 12. Conta e sincronização

**Função:** diagnosticar serviços, fazer login, sincronizar e gerenciar cofre privado.

**Melhorado:** configuração Supabase pode vir do servidor em runtime. A tela mostra origem da configuração, modo de autenticação, estado do Gemini e oferece teste real. O perfil no rodapé abre esta tela.

**Próximo refinamento:** exibir instruções específicas da hospedagem apenas quando detectável, sem vincular o produto a um fornecedor.

## 13. Configurações e backup

**Função:** alterar parâmetros operacionais e proteger dados.

**Melhorado:** aviso para não ajustar durações diariamente sem evidência. Backup continua separado de sincronização.

**Próximo refinamento:** assistente de configuração inicial para disponibilidade e duração, evitando parâmetros técnicos expostos cedo demais.

## Conclusão

A experiência central agora responde melhor às perguntas:

- o que fazer;
- o que preciso conseguir responder;
- onde estudar;
- quanto executar;
- o que registrar;
- como o resultado muda a próxima ação.

Os maiores riscos restantes são estruturais, não conceituais: componentes grandes, ausência de matriz histórica validada e falta de calibração matemática do retorno esperado.
