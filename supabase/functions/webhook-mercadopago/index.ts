import { createClient } from 'npm:@supabase/supabase-js@2';

// Esta função deve ter verify_jwt = false, pois é chamada pelo Mercado Pago.
// Segurança: HMAC da notificação + consulta autenticada da transação no provedor,
// conferência de referência, moeda e total, seguido de atualização restrita no banco.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || '';
const reply = (status:number, msg:string) => new Response(msg, {status, headers:{'Cache-Control':'no-store'}});

const constantTimeEqual = (a:string,b:string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for(let i=0;i<a.length;i++)diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff === 0;
};

async function validSignature(req:Request, paymentId:string):Promise<boolean>{
  const signature = req.headers.get('x-signature')||'';
  const requestId = req.headers.get('x-request-id')||'';
  if (!MP_WEBHOOK_SECRET || !requestId) return false;
  const parts = Object.fromEntries(signature.split(',').map(part => part.trim().split('=',2)));
  const ts = parts.ts || '';
  const claimed = parts.v1 || '';
  const numericTs = Number(ts);
  if (!/^\d{10,16}$/.test(ts) || !/^[0-9a-f]{64}$/i.test(claimed)) return false;
  const sentAt = numericTs < 1e12 ? numericTs*1000 : numericTs;
  if (Math.abs(Date.now() - sentAt) > 10*60*1000) return false;
  const message = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name:'HMAC',hash:'SHA-256' },false,['sign']);
  const calculated = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message));
  const hex = [...new Uint8Array(calculated)].map(x=>x.toString(16).padStart(2,'0')).join('');
  return constantTimeEqual(hex,claimed.toLowerCase());
}

Deno.serve(async req => {
  if (req.method !== 'POST') return reply(405,'Method not allowed');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET)
    return reply(503,'Not configured');
  const url = new URL(req.url);
  // Usar APENAS o ID que foi assinado pela origem, não um ID arbitrário do body.
  const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
  const kind = url.searchParams.get('type') || url.searchParams.get('topic') || '';
  if (kind !== 'payment') return reply(200,'ignored');
  if (!/^\d{1,30}$/.test(paymentId)) return reply(400,'Missing payment ID');
  if (!(await validSignature(req,paymentId))) return reply(401,'Invalid signature');

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,{
    headers:{Authorization:`Bearer ${MP_ACCESS_TOKEN}`}
  });
  if (!response.ok) return reply(502,'Provider verification failed');
  const payment = await response.json();
  if (String(payment.id) !== paymentId || payment.currency_id !== 'BRL') return reply(422,'Payment mismatch');
  const ref = String(payment.external_reference || '');
  if (!/^tenda-[1-9]\d*$/.test(ref)) return reply(422,'Unknown reference');
  const pedidoId = Number(ref.slice(6));
  if (!Number.isSafeInteger(pedidoId)) return reply(422,'Bad reference');
  const status = String(payment.status||'');
  const allowed = ['pending','in_process','approved','rejected','cancelled','refunded','charged_back'];
  if (!allowed.includes(status)) return reply(200,'status ignored');
  const total = Number(payment.transaction_amount);
  if (!Number.isFinite(total) || total<=0) return reply(422,'Invalid amount');

  const service = createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  // RPC revogada a anon/authenticated. Valida pedido e total dentro da transação,
  // não cria nem movimenta estoque e é idempotente para pagamentos repetidos.
  const {error} = await service.rpc('registrar_pagamento_mercadopago_verificado',{
    p_pedido:pedidoId,p_pagamento:paymentId,p_status:status,
    p_valor:total,p_metodo:String(payment.payment_method_id||'')
  });
  if (error) {console.error('Payment state rejected:',error.code);return reply(422,'Order/payment mismatch');}
  return reply(200,'ok');
});
