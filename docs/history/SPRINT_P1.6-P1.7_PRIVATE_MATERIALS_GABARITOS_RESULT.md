# Sprint P1.6–P1.7 — materiais privados, gabaritos e gates do banco de questões

Data: 2026-07-13

## Objetivo

Incorporar os materiais privados do curso e os gabaritos ao fluxo do ConcurseiroOS sem compartilhar conteúdo licenciado, sem transformar ênfase didática em incidência e sem liberar questões incompletas.

## Implementado

### Catálogo privado

- 97 PDFs e 9.782 páginas inventariados;
- 583 seções derivadas de metadados e sumários;
- catálogo por disciplina, assunto, subassunto, aula e páginas;
- 97 entradas metadata-only adicionadas à biblioteca;
- migração que adiciona novos localizadores sem sobrescrever alterações do usuário;
- indicação visual `PRIVADO`;
- bloqueio de preview falso e de exclusão acidental;
- nenhum PDF privado presente no repositório ou pacote.

### Roteamento pedagógico

- Dashboard mostra onde executar a ação prioritária no material privado;
- Desk de Foco mostra material, seção e páginas conforme a atividade selecionada;
- Coach recebe o mesmo localizador na ação estruturada;
- teoria, questões, revisão, flashcards e simulado usam preferências de material diferentes;
- questões priorizam seções comentadas/listas FGV quando há correspondência exata;
- localizador nunca altera o ranking do SDE.

### Backup e privacidade

- entradas privadas são exportadas apenas como metadados;
- texto extraído, Markdown e mapas mentais associados à fonte privada são removidos do backup;
- importação de backup aplica a mesma higienização;
- nenhum identificador pessoal foi preservado nos artefatos derivados.

### Gabaritos e banco de questões

- 12 gabaritos associados exatamente às provas e cadernos;
- 890 registros receberam opção de gabarito e status da fonte;
- anuladas preservadas como anuladas;
- preliminares preservados como provisórios;
- manifesto de solicitação atualizado para `RECEIVED_EXACT_*`;
- gate separado para análise auditada e para questão resolvível;
- 88 questões liberadas somente para análise descritiva;
- 0 liberadas para quiz interno enquanto faltarem enunciado e alternativas completos.

### Interface e Coach

- biblioteca privada não oferece link externo inexistente;
- Dashboard declara cobertura e limitações dos gabaritos;
- prompt do Coach proíbe reprodução, transcrição extensa ou compartilhamento do material privado;
- mensagens operacionais do Desk de Foco deixaram de alegar métricas ou fundamentos não calculados.

## Cobertura do material

- 57/94 subassuntos oficiais com localizador exato;
- 51 com teoria localizada;
- 49 com prática de questões localizada;
- 37 sem localizador exato;
- Raciocínio Lógico sem PDF no conjunto recebido.

Esses números medem localizadores de metadados, não qualidade, completude ou importância estratégica.

## Validação

- 13 arquivos de teste aprovados;
- 179/179 testes aprovados;
- TypeScript/lint aprovado;
- build de produção aprovado;
- permanece aviso não bloqueador de bundle JavaScript acima de 500 kB.

## Limitações deliberadas

- PDFs privados permanecem fora do aplicativo;
- ainda não há abertura com um clique da cópia local;
- gabaritos preliminares podem mudar;
- os arquivos de gabarito são espelhos, não fontes baixadas diretamente do domínio oficial;
- o corpus atual não contém a questão completa para uso interno;
- matriz histórica continua bloqueada para o SDE.

## Próxima decisão arquitetural

Para permitir que o Coach abra exatamente a aula e a página sem copiar o material para servidores, é necessário escolher o mecanismo de acesso local:

1. permissão a uma pasta local descompactada, usando File System Access API;
2. importação dos PDFs para armazenamento privado do navegador, com maior consumo de espaço;
3. manter apenas o localizador e abrir os PDFs manualmente.

A recomendação técnica é a opção 1, com armazenamento apenas do identificador da pasta e permissão revogável pelo navegador.
