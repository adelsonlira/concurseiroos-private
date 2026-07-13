# ConcurseiroOS

Coach de estudos orientado por evidências para a **DATAPREV 2026 — Perfil 3 — Desenvolvimento de Software — Natal/RN**.

O aplicativo separa regras oficiais, evidências do candidato, hipóteses estratégicas e materiais pedagógicos. Ausência de dados nunca é convertida automaticamente em desempenho ruim, domínio ou probabilidade de aprovação.

## Execução local

Pré-requisito: Node.js.

```bash
npm install
cp .env.example .env.local
npm run dev
```

A chave `GEMINI_API_KEY` permanece somente no processo Node. Em produção, use `AUTH_MODE=required` para impedir acesso anônimo às rotas de IA.

## Modo on-line

A fundação on-line utiliza Supabase para:

- autenticação individual;
- sincronização local-first entre dispositivos;
- controle de conflito por revisão;
- cofre privado de PDFs;
- URLs temporárias para abertura de documentos.

Execute `supabase/001_online_foundation.sql` no projeto Supabase e configure as variáveis descritas em `.env.example`.

Guia completo: `docs/ONLINE_DEPLOYMENT_FREE.md`.

## Materiais privados

Os PDFs da assinatura do usuário não fazem parte deste repositório nem do ZIP distribuível. O pacote contém apenas metadados derivados e localizadores pedagógicos.

Quando o usuário envia um PDF pelo **Cofre privado**:

- o arquivo vai diretamente para o bucket privado;
- o conteúdo não é enviado ao Coach nem à Gemini;
- cada objeto fica isolado pelo ID do usuário;
- o backup sincronizado conserva somente metadados seguros;
- uma futura edição pública pode ser gerada sem os materiais individuais.

## Decisão, planejamento e revisão

O SDE prioriza ações usando dados oficiais e evidências granulares. O Planner preserva ações de risco superior e protege avanço em conteúdo novo quando a janela comporta.

A política de revisão ativa é `HYBRID_ADAPTIVE_REVIEW_V2`:

- recuperação sucessiva para consolidação inicial;
- recuperação adaptativa conforme resultados tardios;
- prática intercalada quando há base suficiente;
- reaprendizagem orientada a erros reais;
- exploração controlada para evitar escolha prematura de um único método;
- comparação de retenção e eficiência somente quando há dados mínimos.

Não existe sequência universal fixa, curva individual inventada ou declaração automática de domínio.

Os flashcards usam `HYBRID_ADAPTIVE_FLASHCARD_V1`. O usuário registra falha, recuperação com esforço ou recuperação fluente. O agendamento preserva contatos próximos após falhas, migra cartões legados sem usar fator de facilidade e nunca agenda uma revisão para depois da prova.

## Rota estratégica

A tela **Rota Estratégica** reúne:

- mapa de cobertura das evidências por subassunto;
- separação entre conteúdo não estudado, teoria sem recuperação, amostra inicial, erro ativo e recuperação repetida;
- roteiro limitado de avanço, diagnóstico e recuperação;
- prévia recalculável dos próximos sete dias;
- diversificação de expansão sem suprimir revisões vencidas ou riscos observados.

Os estados são descritivos. Não representam nota prevista ou probabilidade de aprovação.

## Protocolos de sessão

O Planner entrega passos executáveis para cada atividade:

- teoria com ativação, estudo seletivo, recuperação sem consulta e verificação;
- questões com resolução, correção, causa declarada e nova tentativa contrastiva;
- revisão no ciclo recuperação–feedback–recuperação;
- flashcards com tentativa antes da revelação;
- simulados com registro de tempo, gabarito, erros e omissões.

## Qualidade

```bash
npm run test:run
npm run lint
npm run build
npm audit --omit=dev
```

O núcleo SDE, Planner, revisão, diagnóstico e roteiro semanal é determinístico e não usa o tamanho dos materiais privados como evidência de incidência ou peso estratégico.
