# Tenda Ervas — Loja

Loja virtual da Tenda Ervas: catálogo por categoria, carrinho, pedido com pagamento por PIX, Minha conta, Meus pedidos e painel Admin (produtos, pedidos e usuários).

- **No ar:** https://tendasite.pages.dev (Cloudflare Pages, publica sozinho a cada merge na `main`)
- **Sistema de gestão:** https://sistematenda.pages.dev (repositório `Tenda-Ervas`, mesmo banco e mesmo login)
- **Banco e login:** Supabase, projeto **Site Tenda**

Feito com React 19, Vite 6, Tailwind 4, React Router e Supabase (banco, login, fotos e Edge Functions).

## Rodar no computador

Precisa do Node.js 20 ou mais novo.

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase > Project Settings > API Keys, chave **publishable**). Sem elas o site não abre.
3. `npm run dev` e abra http://localhost:5173

Antes de publicar, `npm run lint` confere os tipos.

## Publicar

O Cloudflare Pages publica a `main` sozinho. Configuração do projeto **tendasite** no Cloudflare:

| Campo | Valor |
| --- | --- |
| Comando da build | `npm run build` |
| Saída da build | `dist` |
| Variáveis | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |

Variável nova ou alterada só vale na próxima publicação: depois de salvar, use "Tentar implantar novamente" no último deploy.

As rotas (`/produtos`, `/admin`, `/meus-pedidos`…) abrem direto porque o `public/_redirects` manda tudo para o `index.html`.

## Banco (Supabase)

O projeto **Site Tenda** já está montado. Para um projeto novo, rode no SQL Editor, nesta ordem:

1. `supabase/schema.sql`: tabelas, regras de acesso (RLS), funções de pedido e bucket de fotos.
2. `supabase/produtos-catalogo.sql` e `supabase/produtos-catalogo-completo.sql`: catálogo inicial (opcional).
3. `supabase/schema.sql` do repositório `Tenda-Ervas`: tabelas da gestão (`gestao_*`).
4. `supabase/avisos-email.sql`, depois de publicar a função `avisos-pedido` (abaixo): gatilho dos e-mails de pedido.

Os arquivos `supabase/atualizacao-*.sql` são as mudanças feitas no banco que já existia e já rodaram no Site Tenda. Projeto novo não precisa deles.

**Primeiro administrador:** crie o usuário em Authentication > Users e rode o `insert into public.admin` que está no começo do `schema.sql`. Os outros logins são criados no painel Admin, aba Usuários, onde o dono também libera quem entra na gestão.

### Edge Functions (`supabase/functions`)

| Função | O que faz | Configuração |
| --- | --- | --- |
| `avisos-pedido` | E-mail de pedido novo para a loja e de cada mudança de status para o cliente | Secrets `GMAIL_USUARIO`, `GMAIL_SENHA_APP`, `SITE_URL`, `CHAVE_PIX` e `WHATSAPP_LOJA` (`EMAIL_LOJA` se for outro e-mail); publicada sem "Verify JWT" |
| `criar-usuario` | Cria login pela aba Usuários do Admin | Só as variáveis padrão do Supabase |

### Login

- **E-mail e senha:** em Authentication > URL Configuration, Site URL `https://tendasite.pages.dev` e esse endereço com `/**` nas Redirect URLs.
- **Google:** cliente OAuth "Loja Tenda Ervas" no Google Cloud (projeto `tenda-ervas`), com retorno `https://<projeto>.supabase.co/auth/v1/callback`. O Client ID e o Client Secret ficam só em Authentication > Sign In / Providers > Google, com "Enable Sign in with Google" ligado. O secret nunca vai para o código.

## Documentação

Análise do sistema, segurança, o que já foi feito e o que falta: [DOCUMENTACAO.md](DOCUMENTACAO.md).
