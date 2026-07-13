# Auditoria de segurança on-line

## Resultado

**APROVADO PARA SMOKE TEST COM INFRAESTRUTURA REAL.**

Ainda não aprovado como implantação pública definitiva até a validação das políticas RLS e das variáveis no ambiente real.

## Controles verificados

- chave Gemini ausente do frontend;
- chave `service_role` não utilizada;
- rotas de IA protegidas por Bearer token em produção;
- validação remota do usuário antes do uso da IA;
- snapshot isolado por `auth.uid()`;
- arquivos isolados pelo primeiro diretório igual ao `auth.uid()`;
- bucket não público;
- PDF limitado a 50 MB e MIME `application/pdf` no SQL;
- URL de leitura temporária;
- controle de revisão atômico;
- conflito não resolvido automaticamente;
- PDF licenciado fora do backup e do pacote;
- conteúdo privado fora da busca semântica e do organizador de IA;
- `.dockerignore` bloqueia PDFs, compactados e `.env`.

## Testes obrigatórios no ambiente real

1. usuário B não lê o snapshot do usuário A;
2. usuário B não lista, abre, substitui ou remove PDF do usuário A;
3. requisição sem token não acessa `/api/coach-chat`;
4. token expirado retorna 401;
5. duas gravações concorrentes geram conflito de revisão;
6. restaurar nuvem não duplica sessões nem tentativas;
7. remover PDF invalida novos links e mantém somente o localizador seguro.
