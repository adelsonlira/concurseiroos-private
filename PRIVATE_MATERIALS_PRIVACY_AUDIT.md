# Auditoria de privacidade — materiais privados do Estratégia Concursos

Data: 2026-07-13
Concurso: DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software

## Escopo recebido

Foram processados seis arquivos compactados de materiais de estudo e um arquivo de gabaritos. A extração local identificou 97 PDFs de material didático, com 9.782 páginas no total, distribuídos entre Atualidades, Banco de Dados, Desenvolvimento, Engenharia de Software, Gestão e Governança, Inglês, Legislação/IA, Português e Segurança da Informação.

A pasta prevista para Raciocínio Lógico não continha PDF no conjunto recebido.

## Regra de retenção

Os PDFs privados não foram copiados para o repositório do aplicativo nem para o pacote de entrega. O projeto conserva somente:

- identificador derivado do material;
- título de exibição;
- disciplina, assunto e subassunto candidatos;
- aula e nome do arquivo na cópia do usuário;
- quantidade de páginas;
- intervalos de páginas localizados pelo sumário;
- tipo pedagógico da seção;
- confiança e estado do mapeamento;
- regras explícitas de uso privado.

Não foram incorporados texto integral, imagens, páginas, alternativas de exercícios, comentários de professores ou outros trechos protegidos.

## Proteções implementadas

1. Todo material possui a classificação `PRIVATE_LICENSED_USER_COPY`.
2. Compartilhamento e exportação de conteúdo são bloqueados por contrato de tipos.
3. O backup remove texto extraído, Markdown e mapas mentais anexados a entradas privadas, preservando somente o localizador.
4. O Coach recebe apenas título, seção e páginas, nunca o catálogo bruto ou o PDF.
5. Materiais privados têm uso `PEDAGOGICAL_ROUTING_ONLY` e não podem alterar prioridade, duração, confiança ou incidência.
6. A biblioteca mostra o item como privado e não simula a presença do PDF dentro do aplicativo.
7. Entradas estáticas privadas não são removidas acidentalmente pela interface.
8. Nenhum nome, CPF ou identificador pessoal detectado nos PDFs foi incluído nos artefatos derivados.

## Cobertura pedagógica derivada

- 97 materiais;
- 583 seções catalogadas;
- 410 seções com mapeamento automático de alta confiança;
- 74 seções revisáveis;
- 91 seções mapeadas somente no nível de assunto;
- 8 seções ainda requerem revisão;
- 57 de 94 subassuntos oficiais possuem ao menos um localizador exato;
- 51 subassuntos possuem localizador de teoria;
- 49 possuem localizador de prática de questões;
- 37 não possuem localizador exato no catálogo atual.

A ausência de localizador exato não prova ausência de cobertura na apostila. Pode significar que o sumário usa uma seção mais ampla ou que o mapeamento precisa de revisão manual.

## Resultado

O pacote do ConcurseiroOS contém somente código e metadados derivados. Nenhum PDF privado ou conteúdo reproduzível da assinatura do usuário está presente.
