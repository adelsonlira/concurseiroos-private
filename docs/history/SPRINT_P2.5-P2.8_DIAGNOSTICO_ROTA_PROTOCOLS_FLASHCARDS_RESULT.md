# Sprint P2.5–P2.8 — Diagnóstico contínuo, rota estratégica, protocolos ativos e flashcards adaptativos

## Objetivo

Avançar tudo o que poderia ser implementado sem configuração do Supabase, publicação on-line, novos gabaritos ou dados reais adicionais do candidato. O foco foi transformar ausência de evidência em uma fila segura de coleta e avanço, sem inferir baixo desempenho, e eliminar a última política rígida de revisão ainda presente nos flashcards.

## P2.5 — Mapa contínuo de evidências

Foi criado `src/core/diagnostic/` com um motor puro, determinístico e imutável que classifica cada subassunto em estados descritivos:

- sem evidência de aprendizagem;
- teoria confirmada sem recuperação;
- recuperação inicial ou repetida;
- evidência inicial ou repetida de questões;
- erro ativo;
- recuperação inicial ou repetida após erro.

O relatório apresenta contagens por disciplina e uma fila limitada de avanço, coleta diagnóstica e recuperação. Ausência de tentativas mantém a acurácia como `null`, nunca como zero. Os limiares de repetição são operacionais e explicitamente não são apresentados como lei científica ou domínio.

## P2.6 — Rota Estratégica e prévia semanal

Foi adicionada a tela **Rota Estratégica** (`G E`) com:

- mapa de cobertura das evidências;
- itens prioritários de avanço e coleta;
- visão por disciplina;
- prévia recalculável de sete dias;
- dias de descanso ou sem saldo preservados sem atividades inventadas;
- diversificação de conteúdo novo quando há alternativas equivalentes;
- permissão para revisões realmente vencidas reaparecerem em dias consecutivos.

A prévia não é persistida como compromisso rígido. A decisão diária recalculada pelo SDE sempre prevalece.

## P2.7 — Protocolos executáveis e Coach

O Planner passou a fornecer passos ativos específicos para:

- teoria: ativação prévia, estudo seletivo, recuperação sem consulta e verificação;
- questões diagnósticas: pequena amostra, correção, causa declarada e tentativa contrastiva;
- questões regulares: resolução, correção e nova aplicação;
- revisão: recuperação–feedback–recuperação;
- flashcards: resposta antes da revelação;
- simulados: execução e registro de tempo, gabarito, erros e omissões.

As durações dos passos fecham exatamente a duração da sessão. O Coach recebe um resumo estruturado do mapa de evidências, sem notas privadas e sem transformar cobertura em domínio ou probabilidade de aprovação.

## P2.8 — Flashcards híbridos e adaptativos

O SM-2 legado foi removido do agendamento operacional e substituído por `HYBRID_ADAPTIVE_FLASHCARD_V1`.

O usuário registra somente resultados observáveis:

- `FAILED`: não recuperou antes de consultar;
- `EFFORTFUL`: recuperação independente com esforço;
- `FLUENT`: recuperação independente e fluente.

A política:

- exige correção e nova tentativa após falha;
- mantém contato curto depois de lapsos até recuperações independentes posteriores;
- expande intervalos de forma conservadora a partir do histórico observado;
- limita intervalos pelo horizonte da prova;
- nunca agenda revisão depois da data do exame;
- migra cartões antigos no próximo uso;
- preserva o campo de facilidade apenas para compatibilidade de backups, sem utilizá-lo no cálculo;
- registra a justificativa de cada intervalo.

As telas **Flashcards** e **Biblioteca** foram atualizadas para usar os três resultados de recuperação. Foram removidas alegações de “cronograma científico” e notas de facilidade tratadas como medida de aprendizagem.

## Outras correções

- versão atualizada para `2.8.0`;
- divisão de chunks próprios para configuração DATAPREV e motor de estudos, eliminando o alerta de bundle acima de 500 kB;
- criado `.env.example` sem credenciais reais;
- documentação de arquitetura e UX atualizada;
- linguagem do Planner corrigida de “necessidade comprovada” para necessidade identificada pelas evidências.

## Validação final

Executado no estado final do repositório:

- `npm run lint`: aprovado;
- `npm run test:run`: **236/236 testes**, 23 arquivos;
- `npm run build`: aprovado;
- `npm audit --omit=dev`: **0 vulnerabilidades**;
- inicialização do backend: aprovada;
- `HEAD /`: HTTP 200;
- maior chunk próprio: configuração DATAPREV com aproximadamente 345 kB; sem alerta de 500 kB;
- nenhum PDF, ZIP, RAR ou DOCX privado no pacote;
- nenhum CPF válido ou padrão de chave secreta encontrado na auditoria estática.

O aviso local sobre ausência de `GEMINI_API_KEY` é esperado enquanto a chave e a implantação real não forem configuradas.

## Limitações honestas

- não foi executado teste visual automatizado em navegador real nesta etapa;
- sincronização Supabase e autenticação ainda precisam de teste contra um projeto real;
- a preferência entre métodos de revisão depende de resultados reais acumulados;
- incidência histórica continua bloqueada até a curadoria necessária e gabaritos definitivos aplicáveis;
- a prévia semanal é operacional, não previsão de desempenho.

## Próximos bloqueios externos

O próximo salto confiável depende de pelo menos um destes insumos externos:

1. configuração real do Supabase e escolha da hospedagem disponível;
2. uso do sistema para produzir evidências pessoais de estudo e recuperação;
3. gabaritos definitivos oficiais das provas prioritárias.

Nenhum desses bloqueios justifica inventar dados ou calibrar o sistema artificialmente.
