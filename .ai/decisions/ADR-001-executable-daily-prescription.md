# ADR-001 — Prescrição Diária Executável

## Contexto

O SDE gerava prioridade e o planner gerava blocos, mas o usuário ainda precisava decidir material, páginas, quantidade de questões e modo de execução.

## Decisão

Criar `DailyStudyPrescription` no core. A entidade liga ação estratégica, sessão operacional, material privado, intervalo de páginas, protocolo, meta de questões e evidência de conclusão.

A meta de questões usa a mediana observada no recorte mais específico com amostra mínima. Sem amostra, usa a cadência bruta oficial da prova com baixa confiança e explicação explícita.

## Alternativas consideradas

- Montar a prescrição diretamente no componente React.
- Pedir ao LLM para criar a sessão.
- Manter material e questões como cartões independentes.

## Consequências

Positivas:

- uma única fonte de verdade para a sessão;
- rastreabilidade completa;
- menor fadiga decisória;
- lógica pura e testável.

Negativas:

- exige adaptar registros legados;
- fallback oficial de ritmo é provisório e precisa ser substituído por evidência do candidato.
