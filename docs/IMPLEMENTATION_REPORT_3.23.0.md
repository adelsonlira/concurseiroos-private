# Relatório de implementação — ConcurseiroOS 3.23.0

Data: 2026-07-16

## Escopo

Revisão orientada por uso real de nove pontos das telas do Super Coach. O objetivo foi esclarecer comandos, corrigir riscos de sincronização e reset e tornar as perguntas-guia uma evidência executável, sem alterar a lógica de prioridade do SDE.

## Mudanças

### Atualização da recomendação

O comando do Dashboard passou de `Recalcular` para `Atualizar recomendação`. Ele executa novamente o SDE puro com a data e as evidências persistidas atuais. Não cria desempenho, não apaga histórico e não muda pesos.

### Reset seguro do dispositivo

A zona crítica agora:

1. baixa um backup;
2. desconecta a conta;
3. preserva a cópia remota;
4. redefine metadados locais de sincronização;
5. remove associações locais com PDFs sem apagar os arquivos;
6. restaura somente o navegador atual para a semente DATAPREV.

### Cofre organizado

Materiais privados são apresentados por disciplina e, quando disponível, por assunto. O agrupamento é visual e baseado nos metadados já existentes; nenhum arquivo é movido no bucket.

### Perguntas-guia executáveis

O estudante registra a tentativa inicial antes do cronômetro e uma tentativa final após a leitura ou revisão. Respostas diferentes de `ainda não sei` exigem texto. As duas tentativas são persistidas e o SDE só recalcula após o fechamento pedagógico.

Perguntas-guia não viraram múltipla escolha automática porque isso exigiria inventar distratores e gabaritos. Questões objetivas continuam sendo prescritas como atividade própria, usando fontes oficiais, materiais privados ou plataformas externas.

### Sincronização automática

Foi implantada reconciliação em três vias:

- dispositivo limpo + nuvem existente: recebe automaticamente;
- somente nuvem mudou: recebe automaticamente;
- somente local mudou: envia automaticamente;
- ambos mudaram: interrompe e pede escolha.

O botão manual foi renomeado para `Verificar agora`; ele é fallback e diagnóstico, não requisito da rotina normal.

### Clareza das telas

- `Limitações e dados ainda ausentes` passou a `Limites e observações metodológicas · não bloqueiam o estudo`.
- Cada aviso recebe uma categoria.
- O botão circular de Plano e Progresso passou a mostrar `Hoje`; ele apenas retorna a data de referência para hoje.
- O cadastro de outro concurso permanece deliberadamente fora da interface.

## Segurança decisória

Nenhuma mudança foi feita nos pesos, parâmetros, fórmulas, incidência ou ranking do SDE. A matriz histórica permanece em shadow mode e os materiais pedagógicos continuam incapazes de alterar prioridade estratégica.
