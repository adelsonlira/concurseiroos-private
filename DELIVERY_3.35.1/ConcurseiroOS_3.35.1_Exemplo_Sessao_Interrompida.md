# Exemplo — sessão opcional interrompida

Uma prática técnica é interrompida após 13 minutos. O sistema:

- registra 13 minutos uma única vez no total global, disciplina e assunto;
- cria histórico coerente com o método;
- marca `concluidaComSucesso = false`;
- não cria evidência negativa, penalidade ou resultado inexistente;
- rejeita nova conclusão da mesma sessão terminal.
