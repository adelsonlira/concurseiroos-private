# Resultados estruturados do estudo opcional — v3.35.1

## Questões e simulações

São registrados origem, banca quando informada ou derivada de contrato compatível, total, acertos, erros, brancos, duração, consulta, condições, referência do lote e causa principal de erro. Um lote gera uma única evidência agregada; nenhuma tentativa individual sintética é criada.

## Teoria

São registrados material, páginas ou seção, recuperação ativa declarada, critério informado e dúvidas restantes. Esses campos são declarativos: não marcam automaticamente o subassunto como concluído e não concedem mastery.

## Revisão

São registrados desempenho difícil/intermediário/fluente, conteúdo lembrado, erros persistentes e necessidade de nova revisão. Quando existe cronograma canônico compatível, ele é atualizado pelas regras de revisão já existentes.

## Prática técnica

São registrados tarefa, resultado observável, conclusão, dificuldade, necessidade de ajuda e descrição do artefato.

## Organização leve

É registrada como atividade operacional. Não cria evidência cognitiva nem mastery.

## Persistência

O resultado integral permanece no evento append-only `result_recorded`, além da sessão e do histórico correspondentes. Backup 2.5.0, restauração e sincronização preservam os eventos e identificadores.
