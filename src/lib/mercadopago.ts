import { supabase } from './supabase';

/**
 * O Checkout Pro é habilitado apenas após instalar funções, webhook e segredos,
 * testar pagamento Pix/cartão em sandbox e confirmar configuração de frete.
 * Nunca considera o retorno do navegador como confirmação de pagamento.
 */
export const mercadoPagoHabilitado = import.meta.env.VITE_MERCADOPAGO_ATIVO === 'true';

export async function abrirCheckoutMercadoPago(pedidoId:number):Promise<void> {
  if (!mercadoPagoHabilitado) throw new Error('Pagamento online ainda não está habilitado.');
  if (!Number.isSafeInteger(pedidoId) || pedidoId<=0) throw new Error('Pedido inválido.');
  const {data,error} = await supabase.functions.invoke('criar-preferencia-mercadopago',{
    body:{pedido_id:pedidoId}
  });
  if (error || !data?.checkout_url) throw new Error('Não foi possível iniciar o Mercado Pago. Tente novamente ou contate a loja.');
  const url = new URL(data.checkout_url);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(
    host === 'mercadopago.com.br' || host.endsWith('.mercadopago.com.br') ||
    host === 'mercadopago.com' || host.endsWith('.mercadopago.com')
  )) throw new Error('Endereço de pagamento inesperado. Operação interrompida.');
  window.location.assign(url.toString());
}
