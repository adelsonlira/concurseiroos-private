# Sprint P3.0 — Navegação responsiva e acesso rápido

Versão: 3.0.0  
Data: 2026-07-13

## Objetivo

Corrigir a perda de itens do menu em monitores com pouca altura, liberar espaço útil em celulares e reduzir o tempo para localizar módulos e funções do ConcurseiroOS.

## Implementado

### Sidebar com rolagem independente

- cabeçalho, busca e rodapé permanecem acessíveis;
- somente a área de navegação rola verticalmente;
- `min-height: 0`, `overflow-y: auto` e `overscroll` evitam que os últimos itens desapareçam;
- barras de rolagem discretas foram configuradas para Chromium/WebKit e Firefox.

### Navegação móvel

- em telas menores que `lg`, a sidebar passa a ser um drawer fora do fluxo;
- botão de menu no cabeçalho móvel;
- fechamento por botão, clique no backdrop, escolha de módulo ou tecla `Esc`;
- título do módulo atual permanece visível no topo;
- o conteúdo principal recebe toda a largura quando o drawer está fechado.

### Recolhimento no desktop

- botão para alternar entre sidebar completa e trilho compacto;
- preferência salva em `localStorage`;
- ícones e títulos continuam acessíveis por tooltip no modo compacto.

### Busca de menus e funções

- pesquisa sem diferenciação de maiúsculas/minúsculas ou acentos;
- indexação de nomes, palavras-chave e subitens de cada módulo;
- contexto do subitem correspondente exibido no resultado;
- atalho global `Ctrl+K`/`Cmd+K` abre e focaliza a busca;
- estado vazio explícito e ação para limpar a consulta.

### Ordem operacional

A ordem deixou de seguir a sequência histórica de criação e passou a refletir o fluxo de uso:

1. Dashboard;
2. Desk de Foco;
3. Rota Estratégica;
4. Revisões & Erros;
5. Banco de Questões;
6. Flashcards Ativos;
7. Calibração Semanal;
8. Coach IA Mentoria;
9. Edital Inteligente;
10. Edital Verticalizado;
11. Biblioteca Inteligente;
12. Conta & Nuvem;
13. Ajustes & Backup.

Os itens foram separados nos grupos `Estudo de hoje`, `Planejamento e inteligência` e `Conta e sistema`. Essa ordem é apenas de navegação e não altera prioridades acadêmicas do SDE.

### Acessibilidade e robustez

- `aria-label`, `aria-expanded` e `aria-current` na navegação;
- foco explícito na busca;
- suporte a `prefers-reduced-motion`;
- `100dvh` para reduzir problemas de viewport em navegadores móveis;
- documentação local corrigida para usar `.env`, de acordo com `dotenv.config()`.

## Testes adicionados

Criado `src/navigation/tests/navigationModel.test.ts` com cobertura para:

- ordem operacional;
- normalização de acentos;
- busca por palavra-chave;
- busca por subitem;
- consulta vazia;
- resolução do título do módulo.

## Validação técnica

- 24 arquivos de teste aprovados;
- 242/242 testes aprovados;
- TypeScript/lint aprovado;
- build de produção aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- backend de produção iniciado;
- `/api/health`: HTTP 200;
- `/`: HTTP 200;
- nenhum bundle JavaScript acima de 500 kB.

## Limitação da validação

O ambiente de execução não permitiu concluir captura automatizada por Chromium headless. A responsividade foi validada por estrutura de layout, classes de breakpoint, compilação e testes do modelo de navegação. A confirmação visual final deve ser feita no navegador do usuário antes da publicação.

## Segurança e persistência

O sprint não alterou:

- esquema do Supabase;
- políticas RLS;
- sincronização de snapshots;
- autenticação;
- cofre privado;
- SDE, Planner ou regras de evidência.
