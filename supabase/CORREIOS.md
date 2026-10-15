# Integração oficial dos Correios — Site Tenda

Esta integração **não utiliza intermediadores**. A consulta de frete é efetuada por uma Edge Function autenticada do projeto Supabase **Site Tenda** (`hbkywvztwhdccznwuuex`).

## Pré-requisitos de contrato

- Confirme no Correios Web Services (CWS) que seu contrato possui a **API Preço**, serviço 38202, e a **API Prazo** habilitadas.
- Confira os códigos de serviços realmente habilitados (PAC, SEDEX etc.) no seu contrato. Não utilize códigos inventados.
- Gere **código de acesso às APIs**, usando uma conta PJ do Meu Correios, ou solicite chave de subdelegação para a integração.
- Nunca guarde senha do Meu Correios, código de acesso, token ou cartão de postagem em variáveis `VITE_*`, no React, no GitHub ou na mensagem de um chat.

## Secrets do Supabase

Em Supabase > Edge Functions > Secrets, no projeto **Site Tenda**:

| Secret | Uso |
| --- | --- |
| `CORREIOS_CEP_ORIGEM` | CEP de postagem com 8 dígitos (não é o CEP do comprador). |
| `CORREIOS_CODIGOS_SERVICOS` | Códigos de produtos/serviços de seu contrato separados por vírgulas, ex. `03220,03298` somente se habilitados. |
| `CORREIOS_USUARIO` | Usuário de acesso às APIs no CWS. |
| `CORREIOS_CODIGO_ACESSO` | Código de acesso a APIs gerado no CWS. |
| `CORREIOS_CONTRATO` | Número de contrato comercial. |
| `CORREIOS_CARTAO_POSTAGEM` | Número do cartão de postagem (quando exigido pelo serviço; se informado, é usado na autenticação). |

Como alternativa ao login/senha, a função aceita `CORREIOS_BEARER_TOKEN` como segredo de acesso já autorizado (por exemplo, uma chave de subdelegação do Correios), evitando gerar token por chamada. Não use um token de curta validade sem rotina de renovação.

A Edge Function `cotar-frete-correios` valida o JWT do usuário, consulta seu CEP cadastrado e valida medidas/peso. Não confia no CEP fornecido pelo navegador, utiliza o CEP cadastrado na tabela `users`, e nunca devolve credenciais.

## Ativação

A função deve ser implantada no projeto Site Tenda com verificação JWT habilitada:

```sh
supabase link --project-ref hbkywvztwhdccznwuuex
supabase functions deploy cotar-frete-correios
```

Confirme que todas as credenciais constam em Edge Functions > Secrets. Se o contrato não autoriza os serviços, os Correios retornarão erro e nenhuma cotação será exibida. Os preços variam por contrato, peso e dimensões do pacote.

## Fluxo atual

No checkout, a seção **Consultar frete pelo contrato dos Correios** permite informar *peso e dimensões da embalagem completa*. A função retorna preços e prazos para os serviços autorizados. **A consulta é informativa**: não altera `orders.total_price` nem a cobrança do PIX, pois o processo de pagamento e de emissão de etiquetas ainda requer integração financeira e logística adicionais.

Para cobrança automática e etiqueta: vincular cotação ao pedido no servidor, persistir serviço/preço junto do pedido com validação na criação, incorporar frete no PIX e implementar API Pré Postagem/Rastreamento conforme as permissões do contrato.

## Documentação oficial

- https://www.correios.com.br/atendimento/developers/manuais/manual-uso-da-api-token
- https://www.correios.com.br/atendimento/developers/manuais/manual-api-preco-1
- https://www.correios.com.br/atendimento/developers/manuais/manual-api-prazo
- https://supabase.com/docs/guides/functions/secrets
