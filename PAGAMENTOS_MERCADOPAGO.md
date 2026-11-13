# Pagamentos Tenda Ervas — preparação segura

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

## Retirada e entrega

- **Retirada:** o pagamento usa o total dos produtos. Depois de confirmar o recebimento, combine a retirada pelo WhatsApp e use **Admin → Pedidos → Agendar retirada** para registrar o endereço, a data e a hora de Brasília. A loja só libera esses dados na conta do cliente do pedido, com pagamento confirmado.
- **Correios:** o checkout consulta preço e prazo com o CEP do cadastro. Cadastre o peso e as dimensões de cada produto ou kit em **Admin → Produtos** e confira as caixas ativas em **Caixas e frete**. A cotação vale por 15 minutos e fica vinculada ao carrinho e endereço. O pedido grava o serviço escolhido e libera o pagamento pelo total. Se a cotação estiver indisponível, a loja pode combinar o valor e registrá-lo em **Admin → Pedidos → Confirmar frete**. Para consultar a API, configure o CEP de postagem, os serviços e as credenciais contratuais dos Correios nos segredos da função `cotar-frete-correios`.

## Configuração e verificação

- Usar a aplicação Mercado Pago da loja. Usar credenciais de teste em homologação e de produção na loja.
- Configurar segredos **somente** nas Supabase Edge Functions:
  `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENV=sandbox`,
  `SITE_URL=https://<dominio-da-loja>`,
  `MP_WEBHOOK_URL=https://<supabase-ref>.supabase.co/functions/v1/webhook-mercadopago`.
  Nunca colocar tokens secretos em `VITE_*` nem fazer commit de `.env`.
- Aplicar a migração de pagamento e agendamento ao Supabase antes de publicar o novo checkout.
- A Edge Function `criar-preferencia-mercadopago` já foi implantada com validação de JWT ativada; configurações faltantes resultam em recusa do fluxo.
- A Edge Function `webhook-mercadopago` já foi implantada com `verify_jwt=false`: a autenticação dessa
  rota pública é feita **internamente** pela assinatura HMAC do provedor.
- Cadastrar exatamente a URL de webhook no Mercado Pago e configurar
  a assinatura secreta da integração.
- Realizar pagamentos de teste de cartão aprovado, recusado, Pix pendente/aprovado,
  webhook duplicado, valor incorreto, notificações falsas, pedido cancelado,
  sessão de outro cliente, retorno de navegador forjado e erro de provedor.
- Confirmar que nenhum fluxo confirma o pagamento somente por query string ou mensagem da interface.
- Usar `VITE_MERCADOPAGO_ATIVO=true` na publicação que oferece Checkout Pro.

## Controles e ameaças

| Risco | Medida |
|---|---|
| Alguém alterar valor no navegador | Total consultado na tabela `orders`, valor conferido novamente na RPC |
| Cliente tentar pagar pedido de outro usuário | Validação de JWT e correspondência com `orders.user_id` |
| Falso webhook ou replay | HMAC com segredo, `x-request-id` e janela temporal; nova consulta ao provedor |
| Webhook duplicado | Chave primária `pedido_id`, chave única de `pagamento_id` e operação idempotente |
| Vazamento de token | Credenciais ficam em segredos das funções, nunca no React |
| Falso positivo após retorno de pagamento | Página informa que o retorno não confirma a cobrança |
| Cobrar sem incluir frete | Cobrança de `Correios` liberada após confirmação do frete; o valor inclui produtos e frete |
| Confirmação de pedido cancelado | RPC rejeita pedidos cancelados |
| Cobrança errada ou duplicada | Bloqueio por status + chave de idempotência por pedido |

Referências: documentação oficial de Checkout Pro (preferências) e webhooks do Mercado Pago,
segredos e autenticação de Edge Functions do Supabase.
