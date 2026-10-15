# Auditoria UI/UX, conversão, acessibilidade e pagamentos — Tenda Ervas

**Escopo:** loja pública (`tendasite`), React 19 / Vite / Tailwind 4 / Supabase.
**Público observado pelo catálogo:** pessoas que compram ervas, incensos, acessórios e kits;
não foram pressupostas características pessoais específicas do público.
**Identidade mantida:** tons oliva, bege, verde e tipografia da loja.
**Nota de honestidade:** apenas os testes e verificações registrados aqui foram executados;
sem navegador externo acessível, a revisão visual da implantação real permanece pendente.

## Auditoria e priorização

| Gravidade | Tela/fluxo | Problema e impacto na conversão | Alteração |
|---|---|---|---|
| Alta | Catálogo | Não existiam busca textual, ordenação e filtro de estoque; cliente precisava rolar todo o catálogo | Busca (nome/descrição/categoria), ordenação, filtro e contagem |
| Alta | Catálogo/cartão de produto | Imagens aleatórias externas podiam representar outro produto | Placeholder neutro local identificando fotografia pendente |
| Alta | Carrinho/checkout | Resumo exibia total calculado no navegador, que pode ficar desatualizado | Após criar pedido, consultar total final e descrição no Supabase |
| Alta | Pagamento | PIX manual sem confirmação automática nem opção cartão validada | Backend Checkout Pro preparado e isolado; **não habilitado até homologação** |
| Alta | Entrega | Frete Correios é combinado depois da compra e não entra no total | Pagamento integrado restrito à retirada; informar entrega/WhatsApp |
| Média | Home | Mensagem abstrata não explicava claramente quais produtos existem | Descrição objetiva do catálogo, CTA e passos de compra |
| Média | Produto/modal | Sem gerenciamento suficiente do foco, Esc ou semântica de diálogo | Modal, foco, Esc e ciclo de tabulação acessíveis |
| Média | Carrinho/móvel | Controles pequenos sem nome acessível | Rótulos dos botões, responsividade e identificação do carrinho |
| Média | Navegação | Sem atalho ao conteúdo ou destaque consistente de foco | Skip link, foco visível e redução de movimento |
| Média | Falha/vazio | Nenhuma recuperação simples para resultado vazio/erro | Limpar filtros, tentar novamente e mensagens claras |
| Baixa | Busca orgânica | Metadados genéricos | Título e descrição reais da Tenda Ervas |
| Privacidade | Página de políticas | Descrição imprecisa do tratamento de senhas e prestadores | Texto ajustado para Supabase Auth, transportadora e futuro Mercado Pago |

## Mudanças implementadas

- `src/App.tsx`: Home, filtros, busca, ordenação, catálogo, detalhes, carrinho, resumo do pedido, aviso de retorno do provedor, menu, privacidade.
- `src/index.css`: foco visível e suporte a preferência por reduzir animações.
- `index.html`: SEO básico.
- `public/produto-sem-foto.svg`: imagem provisória verdadeira.
- `src/lib/mercadopago.ts`: botão cliente sob flag `VITE_MERCADOPAGO_ATIVO`, desativada por padrão.
- `supabase/functions/criar-preferencia-mercadopago/index.ts`: preferência com usuário autenticado e preço obtido do pedido no banco.
- `supabase/functions/webhook-mercadopago/index.ts`: HMAC e consulta independente ao Mercado Pago.
- `supabase/pagamentos_mercadopago_preparacao.sql`: RLS e registro de confirmação restrito ao servidor.
- `playwright.config.ts`, `tests/e2e/loja.spec.ts`, `.github/workflows/ux-e2e.yml`: testes automatizados em Chromium desktop/móvel, sem manipular contas reais.

## Validação

- Netlify deploy preview realiza build da loja (confira resultado no respectivo PR).
- GitHub Actions: `npm run lint`, `npm run build`, Playwright com interceptação do Supabase (dados simulados).
- Cenários do Playwright: home/catálogo, texto, filtros, ordenação, produto, variantes, carrinho, total, conta obrigatória, erro de API, responsividade e modal/teclado.
- O navegador executa screenshots automatizados e anexa artefatos quando o workflow conclui.
- A suíte **não realiza cobranças reais** nem substitui homologação de integração e navegação no domínio público.
- Supabase: validada a existência de RLS na tabela de pagamentos e ausência de permissão direta de execução de confirmação para `authenticated`.

## Revisão adversarial interna — duas rodadas (não independente)

**Limitação:** não houve execução de agentes independentes de UI/UX e marketing.
As duas rodadas abaixo são revisão crítica interna; não são opiniões externas.

### Rodada 1: descoberta/UX + conversão

- Crítica: busca ausente e fotos aleatórias enfraquecem descoberta e confiança.
- Resposta: pesquisa em nome/descrição/categoria, ordenação e filtro de estoque;
  placeholder neutro e mensagens claras.
- Rechecagem: fluxo Playwright com dados simulados; consulta e resultados de busca por
  descrição validados nos testes.
- Pendência: revisar visualmente a versão publicada nos navegadores reais e produzir
  fotografias dos itens ainda sem foto.

### Rodada 2: checkout/segurança + confiança

- Crítica: total do carrinho pode diferir do cobrado; retorno de pagamento pode ser interpretado como confirmação;
  modalidade Correios não tem frete previamente calculado; modal sem gerenciamento de foco.
- Resposta: total definitivo no banco, webhook assinado e valor conferido pelo servidor,
  botão de pagamento protegido por flag, restrição de pagamento integrado à retirada,
  modal com foco e Esc, melhoria de política de dados.
- Rechecagem: compilação TypeScript, testes simulados de teclado e navegação,
  permissões do Supabase. O primeiro lint detectou erro de tipos e foi corrigido.
- Pendência: PIX/cartão em ambiente Mercado Pago sandbox, testes de webhook,
  retorno, reembolso, recusa e duplicidades; nenhuma prova de operação financeira real ainda.

## Não resolvido / dependências

1. Configurar `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `SITE_URL`,
   `MP_WEBHOOK_URL`, domínio de retorno e rodar homologação em sandbox.
2. Integrar o valor definitivo de frete antes de cobrar online pedidos de entrega;
   a função bloqueia automaticamente esse caso.
3. Revisar fotografias reais dos produtos novos ainda sem foto correspondente.
4. Testes visuais manuais em desktop/celular contra o domínio publicado;
   a execução aqui está limitada a testes automatizados de navegador em CI.
5. Validar com responsável pela marca os textos de políticas, eventuais prazos de
   retenção, dados de contato, meios de pagamento e regras comerciais antes de publicar.
6. Fluxos com identidade autenticada e transações reais não foram exercitados nos testes
   públicos simulados por falta de credenciais de homologação.

## Segurança aplicada e limites

A chave secreta nunca é embutida no React. O Mercado Pago é chamado por Edge Functions
e o webhook usa validação HMAC + consulta à API. O usuário só vê seu próprio registro
por políticas RLS. O cliente não pode confirmar pagamento; a RPC permite execução apenas
por `service_role`. O retorno de navegador **não altera** estado de pagamento.
Os dados completos do cartão não são armazenados pela Tenda Ervas.

Consultar também `PAGAMENTOS_MERCADOPAGO.md`.
