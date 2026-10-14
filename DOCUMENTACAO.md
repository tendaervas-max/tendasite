# Tenda Ervas — documentação técnica

Atualizado em 14/10/2026. Versão editável: [Tenda Ervas — documentação técnica](https://claude.ai/code/artifact/64d7d56c-dd49-4957-82d6-aa7b441094a9).

## Visão geral

A conta do GitHub `tendaervas-max` tem dois sistemas, os dois gerados no Google AI Studio e usando o Supabase como banco. Os dois projetos Supabase foram retomados em 14/10/2026: os dois já estão ligados ao banco novo, com as regras de acesso.

| Sistema | Para que serve | Repositório | Pasta na máquina | Tecnologia | Publicação | Porta local |
| --- | --- | --- | --- | --- | --- | --- |
| Loja (`tendasite`) | Loja virtual de ervas para banho: catálogo, carrinho, cadastro de cliente, pedidos e painel `/admin` | [tendaervas-max/tendasite](https://github.com/tendaervas-max/tendasite) (público) | `~/Documents/GitHub/tendasite` | React 19, Vite 6, Tailwind 4, React Router, Supabase | Netlify (`netlify.toml`: `npm run build`, pasta `dist`) | 5173 |
| Gestão (`Tenda-Ervas`) | Sistema interno: vendas em quadro (kanban), pedidos de produção, estoque de ervas e dashboard | [tendaervas-max/Tenda-Ervas](https://github.com/tendaervas-max/Tenda-Ervas) (privado) | `~/Documents/GitHub/Tenda-Ervas` | React 19, Vite 6, Tailwind pelo CDN, Supabase | Nenhuma configurada | 3000 |

Os ajustes estão na branch `ajustes-nathalia` dos dois repositórios, com os commits feitos e o push ainda pendente.

Os dois sistemas não conversam entre si: um pedido feito na loja não aparece na gestão.

## Situação em 14/10/2026 e próximos passos

O código está pronto e os dois projetos Supabase foram retomados. Em 14/10 a loja e a gestão ficaram ligadas ao banco novo, com admin e equipe liberados. Falta publicar a branch e testar com o banco de verdade. Para continuar com o Claude numa conversa nova, abra a pasta do projeto e peça para ele ler o `DOCUMENTACAO.md`.

- [x] Ajustes de segurança com commit na branch `ajustes-nathalia` dos dois repositórios
- [x] Site Tenda (loja) e Tenda Ervas (gestão) retomados no Supabase; o projeto tenda continua pausado
- [x] Conferido o que cada banco tinha (consulta na seção Consultas úteis); RLS ligado em todas as tabelas da loja
- [ ] Publicar a branch `ajustes-nathalia` nos dois repositórios pelo GitHub Desktop (o terminal não tem login do GitHub)
- [x] Loja: no SQL Editor do Site Tenda, rodar `supabase/migracao-banco-antigo.sql` e depois `supabase/schema.sql`
- [x] Loja: liberar o admin com o `insert into public.admin` (em 14/10/2026 foi liberado o usuário que já existia no Auth; ele nunca entrou, então talvez precise de Send password recovery)
- [x] Loja: `.env.local` preenchido com o endereço e a chave publishable do Site Tenda; o site rodando local já conecta no banco novo
- [x] Gestão: no SQL Editor do Tenda Ervas, rodar `supabase/schema.sql`
- [x] Gestão: liberar com o `insert into public.equipe` o usuário que já existia no Auth e desligar "Allow new users to sign up" (feito em 14/10/2026; ele nunca entrou, então talvez precise de Send password recovery)
- [x] Gestão: preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local` com o endereço e a chave publishable do Tenda Ervas
- [ ] Testar loja e gestão rodando local com `npm run dev`
- [ ] Abrir pull request de `ajustes-nathalia` para a `main` e, depois do merge, cadastrar as variáveis na Netlify e publicar
- [ ] Apagar o esquema `backup` da loja com `drop schema backup cascade;`: conferido em 14/10/2026, ele só guarda os 2 logins antigos de admin, sem nada a recuperar
- [ ] Decidir o autor do git: o `~/.gitconfig` global está como `tendaervas-max`, e isso vale para todos os repositórios da máquina

Se a versão antiga da loja estiver no ar na Netlify, ela para de funcionar com as regras novas do banco. Isso se resolve publicando a nova versão.

## O que a análise encontrou

O problema mais grave era o banco sem nenhuma regra de acesso. Qualquer pessoa com a chave pública do site, que vai junto para todo navegador, lia CPF e endereço dos clientes e alterava produtos e pedidos. Todos os itens já foram corrigidos.

| Problema | Sistema | O que permitia | Situação |
| --- | --- | --- | --- |
| Banco sem regras de acesso (RLS) | Loja e gestão | Ler clientes, pedidos e vendas; alterar e excluir produtos e estoque sem login | Corrigido |
| Senha do cliente gravada sem criptografia na tabela `users`; o login comparava a senha direto no banco | Loja | Quem lesse a tabela via todas as senhas | Corrigido |
| Cadastro do cliente, com a senha, salvo no navegador (`localStorage`, chave `userData`) | Loja | Quem usasse o mesmo computador via a senha | Corrigido; o site apaga esse dado ao abrir |
| Login do admin baixava o hash da senha para o navegador e comparava lá | Loja | Ver o hash e tentar descobrir a senha | Corrigido |
| Gravar `adminToken` no `localStorage` abria o painel admin | Loja | Qualquer pessoa entrar no painel | Corrigido |
| Total do pedido calculado no navegador | Loja | Gravar pedido com o valor que quisesse | Corrigido |
| Sistema sem login | Gestão | Qualquer pessoa com o endereço usar o sistema | Corrigido |
| Chave do banco fixa no código, apontando para projeto apagado | Loja | Nada funcionar sem mexer no código | Corrigido; agora vem do `.env.local` |
| Sem `.gitignore` | Loja | `node_modules` e `.env.local` irem para o GitHub | Corrigido |
| `index.html` sem a linha que carrega o app | Gestão | Página abria em branco | Corrigido |
| Chave do Supabase lida por `process.env`, que não chega ao navegador | Gestão | Sistema sempre em modo local, sem salvar nada | Corrigido |
| Projetos Supabase `hbkywvztwhdccznwuuex` (loja) e `msbofqngdoqvuxfpodjd` (gestão) estavam pausados (o endereço deles não respondia) | Loja e gestão | Nenhum dado aparece nem é salvo | Corrigido em 14/10/2026: projetos retomados e configurados |

## O que foi feito na branch `ajustes-nathalia`

As senhas passaram a ficar só no Supabase Auth, que as guarda criptografadas (bcrypt), e cada tabela ganhou regras de acesso no próprio banco. Vale a regra combinada: visitante vê produtos e usa o carrinho, e para comprar precisa de login.

| Sistema | Commit | Arquivos principais |
| --- | --- | --- |
| Loja | `87e0496` | `src/App.tsx`, `src/lib/supabase.ts`, `supabase/schema.sql`, `.gitignore`, `.env.example`, `README.md` |
| Gestão | `3457401` | `App.tsx`, `components/Login.tsx`, `components/Sidebar.tsx`, `lib/supabase.ts`, `vite-env.d.ts`, `index.html`, `supabase/schema.sql`, `.env.example`, `README.md` |

**Loja**

- Cadastro e login de cliente pelo Supabase Auth; os dados de entrega vão para a tabela `users` por um gatilho no banco.
- Admin entra com e-mail e senha; quem é admin é decidido pela tabela `admin` (função `is_admin`).
- Pedido gravado pela função `criar_pedido`, que calcula o total pelos preços do banco.
- Cliente vê só o próprio cadastro e os próprios pedidos; só confirma a entrega de pedido já enviado.
- Só o admin cadastra, altera e exclui produtos, fotos e status de pedido.
- Botão Sair para o cliente, que antes não existia.

**Gestão**

- Tela de login e botão Sair no menu.
- Só acessa quem estiver na tabela `equipe` (função `eh_da_equipe`).
- Sem as chaves no `.env.local`, continua abrindo em modo local, sem login.

**Como foi testado**

- Os dois `schema.sql` rodaram sem erro num Postgres 16 local que imita o Supabase (esquemas `auth` e `storage`, papéis `anon` e `authenticated`).
- Regras conferidas por perfil: visitante, cliente, outro cliente, admin, pessoa da equipe e pessoa de fora. Exemplo: pedido de 2x Arruda gravou R$ 25,00 pelo preço do banco, e alterar o total na mão foi negado.
- TypeScript sem erros nos dois projetos; telas de login e cadastro abertas no navegador com um endereço de Supabase fictício.
- Em 14/10/2026, com os dois sistemas ligados aos bancos novos, um visitante só conseguiu ver os produtos: gravar, ler pedidos e clientes, criar pedido e enviar foto foram recusados. Ainda não testado com login: cadastro com confirmação de e-mail, login do admin e envio de foto.

## Configuração do Supabase

São dois projetos Supabase separados, um para a loja e outro para a gestão, porque os dois têm uma tabela `orders`. Criar os projetos exige entrar na conta Supabase da Tenda Ervas, então essa parte fica com você. Os arquivos `.env.local` já têm o endereço de cada projeto e a chave publishable.

Os projetos antigos não foram apagados: estavam pausados na organização `tendaervas-max's Org` (plano Free) e foram retomados em 14/10/2026. Site Tenda (`hbkywvztwhdccznwuuex`) é a loja, Tenda Ervas (`msbofqngdoqvuxfpodjd`) é a gestão, e tenda (`parmnfeapncnvhnespwz`) não é usado por nenhum dos dois. Nenhum dos três tinha arquivos no Storage.

O banco da gestão estava sem tabelas, então leva só o `schema.sql`. O da loja tinha `products` e `orders` vazios, 2 logins antigos em `admin` e os clientes em `users` com senha sem criptografia. Nele, rode antes o `supabase/migracao-banco-antigo.sql`, que move essas tabelas para o esquema `backup` sem apagar nada, e depois o `schema.sql`. Depois de conferir que nada falta, apague o esquema `backup`, que ainda guarda as senhas antigas. Nos passos abaixo, pule a criação do projeto.

| O que o `schema.sql` cria | Loja | Gestão |
| --- | --- | --- |
| Tabelas | `products`, `orders`, `users` (cadastro, sem senha), `admin` | `inventory`, `sales`, `orders`, `equipe` |
| Quem acessa | Produtos: todos veem, só admin altera. Pedidos e cadastro: o dono e o admin | Só quem está em `equipe` |
| Funções | `is_admin`, `criar_pedido`, gatilho `ao_criar_usuario` | `eh_da_equipe` |
| Fotos | Bucket público `product-images` (PNG, JPEG ou WebP, até 5 MB), envio só pelo admin | — |

**Projeto da loja**

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), crie o projeto (sugestão: `tenda-ervas-loja`, região South America (São Paulo)). Guarde a senha do banco num gerenciador de senhas.
2. Em SQL Editor > New query, cole o conteúdo de `tendasite/supabase/schema.sql` e clique em Run.
3. Em Project Settings > API Keys, copie o Project URL e a chave publishable (anon) para o `tendasite/.env.local`, em `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca coloque a chave secret (service\_role) no site.
4. Em Authentication > Users > Add user, crie o usuário do admin com e-mail, senha e "Auto Confirm User". Depois rode no SQL Editor: `insert into public.admin (user_id) select id from auth.users where email = 'email-do-admin';`
5. Em Authentication > URL Configuration, coloque o endereço da Netlify em Site URL e `http://localhost:5173` em Redirect URLs, para o link de confirmação de e-mail funcionar.
6. Em Authentication > Sign In / Providers > Email, deixe "Confirm email" ligado e aumente o tamanho mínimo de senha para 8.
7. Na Netlify, em Site configuration > Environment variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e faça um novo deploy.

**Projeto da gestão**

1. Crie o segundo projeto (sugestão: `tenda-ervas-gestao`).
2. Rode `Tenda-Ervas/supabase/schema.sql` no SQL Editor.
3. Copie o Project URL e a chave publishable para o `Tenda-Ervas/.env.local`.
4. Crie cada pessoa da equipe em Authentication > Users > Add user e libere com: `insert into public.equipe (user_id) select id from auth.users where email = 'email-da-pessoa';`
5. Em Authentication > Sign In / Providers, desligue "Allow new users to sign up". Assim ninguém cria conta sozinho.

No plano gratuito, projeto sem uso por muito tempo é pausado, e foi o que aconteceu com os três projetos antigos. Confira as regras atuais em [supabase.com/pricing](https://supabase.com/pricing). Abra os sistemas de vez em quando ou avalie o plano pago.

## Como acessar para fazer ajustes

Código se altera pelo VS Code e vai para o GitHub. Dados e usuários se alteram no painel do Supabase. Produtos e pedidos da loja também se alteram pelo `/admin` do próprio site.

| O que ajustar | Onde | Como |
| --- | --- | --- |
| Código da loja | `~/Documents/GitHub/tendasite` | VS Code > File > Open Folder; aceite "Trust" no aviso de Restricted Mode; no terminal, `npm install` (só na primeira vez) e `npm run dev`; abra http://localhost:5173 |
| Código da gestão | `~/Documents/GitHub/Tenda-Ervas` | Mesmo caminho; `npm run dev` abre em http://localhost:3000 |
| Enviar alterações | GitHub `tendaervas-max` | Na branch `ajustes-nathalia`: `git push -u origin ajustes-nathalia` e abrir um pull request para a `main` |
| Dados (produtos, pedidos, estoque) | Supabase > Table Editor | Ver e editar linha a linha; as regras de acesso não valem para quem está no painel |
| Estrutura e consultas | Supabase > SQL Editor | Rodar SQL, como os `insert` de admin e equipe |
| Usuários e senhas | Supabase > Authentication > Users | Criar usuário, mandar redefinição de senha, excluir conta |
| Fotos dos produtos | Supabase > Storage > `product-images` | Ver, trocar ou apagar arquivos |
| Produtos e status de pedido | Site da loja em `/admin` | Entrar com e-mail e senha do admin; a aba Supabase confere se as tabelas existem |
| Publicação da loja | [app.netlify.com](https://app.netlify.com), site ligado ao `tendasite` | Deploys, variáveis de ambiente e endereço; confira em Build & deploy qual branch ele publica |
| Versão original | Google AI Studio: [loja](https://ai.studio/apps/43632240-6692-412b-9d38-f853e4d5d56e), [gestão](https://ai.studio/apps/drive/1U_kajzVf6Zrv_b0U0P63RD5mHiRwiSEj) | Só consulta: exportar de lá de novo apaga estes ajustes |

O autor dos commits vem do `~/.gitconfig` global da máquina, que hoje está como `tendaervas-max`. Ele também vale para os outros repositórios da máquina. Para usar esse nome só nas pastas da Tenda Ervas, rode `git config user.name` e `git config user.email` dentro de cada uma, e volte o global para o seu nome.

## Melhorias a serem feitas

Antes de publicar: tirar as dependências com falha de segurança e corrigir o erro 404 da Netlify. O resto melhora o uso, sem risco de segurança.

| Prioridade | Status | Sistema | Melhoria | Por quê |
| --- | --- | --- | --- | --- |
| Alta | Feito | Loja e gestão | Configurar os bancos retomados, rodar os scripts e preencher os `.env.local` (feito em 14/10/2026) | Sem isso nada é salvo |
| Alta | A fazer | Loja | Remover pacotes sem uso (`express`, `better-sqlite3`, `multer`, `jsonwebtoken`, `bcryptjs`, `mercadopago`, `dotenv`, `@google/genai`) e atualizar `vite` e `react-router-dom` | O `npm audit` aponta 22 vulnerabilidades (2 críticas, 12 altas); as críticas vêm de pacotes sem uso |
| Alta | A fazer | Loja | Criar `public/_redirects` com `/* /index.html 200` | Abrir `/produtos` ou `/admin` direto por link dá 404 na Netlify |
| Alta | A fazer | Loja | Baixar o estoque ao finalizar o pedido e recusar compra acima do estoque | Hoje a quantidade em estoque nunca muda |
| Alta | A fazer | Loja e gestão | Testar com o Supabase real: cadastro com confirmação de e-mail, login do admin, envio de foto, login da equipe | Só foi testado num banco local que imita o Supabase |
| Média | A fazer | Loja | Opção "Esqueci minha senha" | Hoje o cliente não consegue recuperar a senha sozinho |
| Média | A fazer | Loja | Tela para o cliente alterar endereço e dados | O banco já permite; falta a tela |
| Média | A fazer | Loja | Editar produto no admin (preço, estoque, foto) | Hoje só cadastra e exclui |
| Média | A fazer | Loja | Guardar o carrinho no navegador | O carrinho some ao recarregar a página |
| Média | A fazer | Loja | Esconder o botão "+ Novo Produto" de visitantes | Aparece para todo mundo e leva ao login do admin |
| Média | A fazer | Loja | Traduzir as mensagens de erro do cadastro | O Supabase responde em inglês (ex.: senha curta, e-mail já usado) |
| Média | A fazer | Loja | Pagamento online (PIX e cartão) | Hoje só registra a forma escolhida; há sobra de código de retorno do Mercado Pago no carrinho |
| Média | A fazer | Loja | Avisar na página de produtos quando o banco não responde | Hoje aparece "Nenhum produto cadastrado no momento" mesmo quando a consulta falha |
| Média | A fazer | Gestão | Avisar quando o banco recusar uma gravação | A tela atualiza mesmo quando a gravação falha |
| Média | A fazer | Gestão | Número do pedido gerado pelo banco | Hoje é a quantidade de pedidos + 1, e pode repetir |
| Média | A fazer | Gestão | Instalar o Tailwind no build e tirar o `importmap` do esm.sh do `index.html` | O Tailwind pelo CDN não é para produção (o próprio aviso no console diz isso) |
| Média | A fazer | Gestão | Fazer funcionar a busca do dashboard e o botão "Recolher" do menu | Hoje os dois não fazem nada |
| Média | A fazer | Gestão | Trocar os "+12%" e "+8% vs mês anterior" por números reais | São textos fixos no código |
| Média | A fazer | Gestão | Publicar a gestão (Netlify ou similar) | Hoje só roda na máquina |
| Baixa | A fazer | Loja | Título da aba e idioma da página: "Tenda Ervas" e `pt-BR` | Hoje aparece "My Google AI Studio App", em inglês |
| Baixa | A fazer | Loja | Apagar a foto do Storage ao excluir o produto | As fotos ficam ocupando espaço |
| Baixa | A fazer | Gestão | Alterar estoque pelo id da erva, não pelo nome | Duas ervas com o mesmo nome mudam juntas |
| Baixa | A fazer | Gestão | Arrumar o campo de busca da tela Estoque em janela estreita | Numa janela de 800 px ele fica espremido ao lado dos filtros de peso |
| Baixa | A fazer | Loja | Política de privacidade (LGPD) | A loja guarda CPF e endereço dos clientes |
| Baixa | A fazer | Loja e gestão | Levar os pedidos da loja para a gestão | Hoje os dois sistemas não se falam |

## Consultas úteis

Consultas de conferência para o SQL Editor de cada projeto. Elas só leem, não alteram nada.

**Loja (Site Tenda):** RLS por tabela, regras, admins, usuários, esquema `backup` e bucket de fotos.

```sql
select 'tabela ' || c.relname as item, case when c.relrowsecurity then 'RLS ligado' else 'RLS DESLIGADO' end as valor
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
union all
select 'regras em ' || tablename, count(*)::text from pg_policies where schemaname in ('public', 'storage') group by tablename
union all
select 'admin: ' || u.email, coalesce(to_char(u.email_confirmed_at, 'DD/MM/YYYY'), 'e-mail não confirmado')
from public.admin a join auth.users u on u.id = a.user_id
union all
select 'usuários no Auth', count(*)::text from auth.users
union all
select 'esquema backup', case when exists (select 1 from pg_namespace where nspname = 'backup') then 'ainda existe' else 'apagado' end
union all
select 'bucket ' || id, case when public then 'público' else 'privado' end || ', limite ' || coalesce((file_size_limit / 1024 / 1024)::text || ' MB', 'nenhum')
from storage.buckets;
```

**Gestão (Tenda Ervas):** RLS por tabela, regras e quem está ou não na equipe.

```sql
select 'tabela ' || c.relname as item, case when c.relrowsecurity then 'RLS ligado' else 'RLS DESLIGADO' end as valor
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
union all
select 'regras em ' || tablename, count(*)::text from pg_policies where schemaname = 'public' group by tablename
union all
select 'na equipe: ' || u.email, 'liberado' from public.equipe e join auth.users u on u.id = e.user_id
union all
select 'fora da equipe: ' || u.email, 'sem acesso' from auth.users u
where not exists (select 1 from public.equipe e where e.user_id = u.id);
```

Resultado esperado em 14/10/2026: RLS ligado em todas as tabelas; na loja 4 regras em `products`, 3 em `orders`, 2 em `users` e 3 nas fotos (`objects`); na gestão 1 regra em `inventory`, `sales` e `orders`.
