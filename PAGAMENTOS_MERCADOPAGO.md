# Pagamentos Tenda Ervas — preparação segura

**Situação:** banco e Edge Functions implantados no projeto Site Tenda, mas a cobrança NÃO está habilitada na loja. Faltam credenciais, configuração de webhook e testes em sandbox.
O checkout manual por PIX continua disponível até existir ambiente de testes homologado.

## Arquitetura

1. A criação de um pedido existente usa a RPC `criar_pedido` do Supabase:
   estoque e preço são calculados no servidor.
2. O cliente autenticado solicita `criar-preferencia-mercadopago` com **somente** `pedido_id`.
   A Edge Function valida JWT, identidade, status, itens e total diretamente em `orders`.
3. O servidor cria uma preferência de Checkout Pro com Pix e cartão (meios disponíveis
   dependem da conta Mercado Pago). O navegador nunca recebe o access token.
4. O pagamento ocorre na página segura do Mercado Pago; o retorno é informativo,
   nunca uma prova de pagamento.
5. `webhook-mercadopago` verifica `x-signature` por HMAC, consulta a transação
   na API do Mercado Pago e confere ID, referência, moeda, status e valor.
6. Somente o serviço privilegiado executa
   `registrar_pagamento_mercadopago_verificado`, que confere o valor
   na transação e altera o pedido para `pagamento confirmado` quando aprovado.
7. As informações do cartão **não** são processadas pelo site nem salvas no Supabase.

## Limite operacional importante

**Pagamento integrado está preparado somente para RETIRADA.**
O frete dos Correios é atualmente combinado depois do pedido; a Edge Function
rejeita pedidos de entrega até existir cálculo e aprovação de frete no total.
**Não cobrar o preço incompleto com cartão ou Pix.**

## Implantação após homologação

- Criar uma aplicação no painel Mercado Pago e ativar credenciais de **teste**.
- Configurar segredos **somente** nas Supabase Edge Functions:
  `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENV=sandbox`,
  `SITE_URL=https://<dominio-da-loja>`,
  `MP_WEBHOOK_URL=https://<supabase-ref>.supabase.co/functions/v1/webhook-mercadopago`.
  Nunca colocar tokens secretos em `VITE_*` nem fazer commit de `.env`.
- A migração `supabase/pagamentos_mercadopago_preparacao.sql` já foi aplicada ao projeto Site Tenda; confirmar permissões após atualizações.
- A Edge Function `criar-preferencia-mercadopago` já foi implantada com validação de JWT ativada; configurações faltantes resultam em recusa do fluxo.
- A Edge Function `webhook-mercadopago` já foi implantada com `verify_jwt=false`: a autenticação dessa
  rota pública é feita **internamente** pela assinatura HMAC do provedor.
- Cadastrar exatamente a URL de webhook no Mercado Pago e configurar
  a assinatura secreta da integração.
- Realizar pagamentos de teste de cartão aprovado, recusado, Pix pendente/aprovado,
  webhook duplicado, valor incorreto, notificações falsas, pedido cancelado,
  sessão de outro cliente, retorno de navegador forjado e erro de provedor.
- Confirmar que nenhum fluxo confirma o pagamento somente por query string ou mensagem da interface.
- **Somente após passar por tudo isso**, ativar `VITE_MERCADOPAGO_ATIVO=true`
  no deploy de produção e utilizar credenciais de produção e URL aprovada.
- Planejar política de conciliação, reembolso, chargeback, retenção de dados
  e conciliação financeira antes da operação real.

## Controles e ameaças

| Risco | Medida |
|---|---|
| Alguém alterar valor no navegador | Total consultado na tabela `orders`, valor conferido novamente na RPC |
| Cliente tentar pagar pedido de outro usuário | Validação de JWT e correspondência com `orders.user_id` |
| Falso webhook ou replay | HMAC com segredo, `x-request-id` e janela temporal; nova consulta ao provedor |
| Webhook duplicado | Chave primária `pedido_id`, chave única de `pagamento_id` e operação idempotente |
| Vazamento de token | Credenciais ficam em segredos das funções, nunca no React |
| Falso positivo após retorno de pagamento | Página informa que o retorno não confirma a cobrança |
| Cobrar sem incluir frete | Bloqueio de pagamento automático para `Correios` |
| Confirmação de pedido cancelado | RPC rejeita pedidos cancelados |
| Cobrança errada ou duplicada | Bloqueio por status + chave de idempotência por pedido |

## Pendências de homologação

As credenciais Mercado Pago, a assinatura do webhook, a configuração de domínio e o
acesso à simulação real ainda não foram fornecidos nem usados. O SQL e as
Edge Functions foram implantados, mas **não há cobrança ativa**: o navegador continua
com `VITE_MERCADOPAGO_ATIVO` desativado e as funções só operam depois de configuradas.
A presença desses arquivos e das funções no Supabase **não significa** que Pix automático
ou cartão estejam funcionando. É obrigatório homologar o fluxo antes de habilitá-lo.

Referências: documentação oficial de Checkout Pro (preferências) e webhooks do Mercado Pago,
segredos e autenticação de Edge Functions do Supabase.
