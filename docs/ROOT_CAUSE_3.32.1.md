# ConcurseiroOS v3.32.1 — Causa-raiz do endpoint do Treino FGV

## Requisição investigada

- URL efetivamente construída pelo navegador: `/api/training-fgv/check` na mesma origem da aplicação;
- método: `POST`;
- cabeçalho: `Content-Type: application/json`;
- corpo: tentativa, catálogo, versão, ordem da tentativa, questão e alternativa selecionada.

## Limite da evidência de produção

Não foi fornecido URL do deployment, HAR, log da função ou corpo bruto devolvido pela Vercel. Portanto, o status e o corpo **exatos observados naquele deployment** não podem ser afirmados como captura direta.

A mensagem visível — `Não foi possível conferir a resposta.` — era o fallback do cliente da v3.32.0. Ela apagava o status e o corpo sempre que a resposta não fosse JSON com campo `error`.

## Causa-raiz confirmada por comparação do pacote publicado

Na v3.32.0:

- as rotas existiam apenas dentro de `src/server/httpApp.ts`;
- o build local Express as atendia;
- o build serverless produzia apenas `dist/http-app.mjs`;
- não existiam `api/training-fgv/check.ts` nem `api/training-fgv/finalize.ts`;
- `vercel.json` usa o roteamento de funções por arquivos do diretório `api/`.

Consequentemente, na topologia da Vercel a requisição não alcançava o Express compartilhado: não havia função publicada para a URL. O resultado equivalente é uma falha de resolução anterior ao aplicativo, normalmente HTTP 404 com resposta `NOT_FOUND` gerada pela plataforma. O corpo exato do deployment original permanece não capturado.

## Diferença entre local e Vercel

| Ambiente | v3.32.0 |
|---|---|
| Express local/compilado | `httpApp.ts` era montado pelo servidor e a rota funcionava |
| Vercel | somente arquivos físicos em `api/` viravam funções; a rota aninhada não existia |

Isso explica por que o smoke local anterior passava enquanto a função principal falhava em produção.

## Verificações adicionais

- autenticação: o endpoint continua passando pelo app compartilhado e pelo middleware já existente;
- parsing JSON: `express.json` continua ativo e os testes validam corpos válidos e inválidos;
- tentativa: `attemptId` é obrigatório e validado;
- questão: precisa pertencer à ordem imutável recebida;
- alternativa: somente A–E;
- catálogo privado: importado estaticamente pelos entrypoints serverless e validado no backend;
- Linux/capitalização: caminhos e imports usam exatamente `api/training-fgv`, `trainingPrivateCatalog.json` e nomes existentes;
- pacote publicado: o build gera `dist/serverless-api/training-fgv/check.js` e `finalize.js`;
- catálogo público: permanece sem resposta operacional.

## Correção aplicada

1. criação dos dois entrypoints serverless aninhados;
2. inclusão explícita do catálogo privado no bundle de cada função;
3. ampliação do build serverless para compilar os entrypoints;
4. contrato de correção com `questionOrder` e validação de pertencimento;
5. cliente com leitura segura de texto/JSON e mensagens específicas por status;
6. smoke real do handler compilado, com tentativa de cinco questões e POST de correção HTTP 200.
