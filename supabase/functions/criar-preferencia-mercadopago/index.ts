import { createClient } from 'npm:@supabase/supabase-js@2';

// Checkout Pro: preferência criada EXCLUSIVAMENTE no servidor, após autenticação.
// Não confiar em preço, total, cliente ou método enviados pelo navegador.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';
const MP_ENV = Deno.env.get('MP_ENV') || 'sandbox';
const SITE_URL = Deno.env.get('SITE_URL') || '';
const MP_WEBHOOK_URL = Deno.env.get('MP_WEBHOOK_URL') || '';

// CORS é necessário no preflight enviado pelo navegador antes do POST autenticado.
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tendasite.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY ||
      !MP_ACCESS_TOKEN || !SITE_URL.startsWith('https://') || !MP_WEBHOOK_URL.startsWith('https://'))
    return json({ error: 'Integração de pagamentos ainda não configurada' }, 503);
  const bearer = req.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer ')) return json({ error: 'Faça login para pagar' }, 401);
  const jwt = bearer.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: bearer } }, auth: { persistSession: false }
  });
  const { data: auth, error: authError } = await client.auth.getUser(jwt);
  if (authError || !auth.user) return json({ error: 'Sessão inválida' }, 401);
  let pedidoId: number;
  try {
    const body = await req.json();
    pedidoId = Number(body.pedido_id);
  } catch { return json({ error: 'Requisição inválida' }, 400); }
  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) return json({ error: 'Pedido inválido' }, 400);
  const { data: pedido, error } = await client.from('orders')
    .select('id,user_id,status,total_price,items,delivery_method').eq('id', pedidoId).single();
  if (error || !pedido || pedido.user_id !== auth.user.id) return json({ error: 'Pedido não encontrado' }, 404);
  if (pedido.status !== 'aguardando pagamento') return json({ error: 'Este pedido não está aguardando pagamento' }, 409);
  // Frete dos Correios ainda é combinado manualmente e NÃO compõe o total do pedido.
  // Não criar cobrança incompleta para entrega sem frete calculado.
  if (pedido.delivery_method !== 'Retirada') return json({ error: 'Pagamento online para entrega requer frete confirmado; use a opção de atendimento da loja' }, 422);
  const total = Number(pedido.total_price);
  if (!Number.isFinite(total) || total <= 0 || !Array.isArray(pedido.items) || !pedido.items.length)
    return json({ error: 'Pedido sem total válido' }, 422);

  const base = SITE_URL.replace(/\/$/, '');
  const referencia = `tenda-${pedidoId}`;
  const preference = {
    items: [{ id: referencia, title: `Pedido Tenda Ervas #${pedidoId}`, quantity: 1, currency_id: 'BRL', unit_price: Number(total.toFixed(2)) }],
    external_reference: referencia,
    back_urls: {
      success: `${base}/meus-pedidos?retorno=mercadopago`,
      failure: `${base}/meus-pedidos?retorno=mercadopago`,
      pending: `${base}/meus-pedidos?retorno=mercadopago`
    },
    auto_return: 'approved',
    notification_url: MP_WEBHOOK_URL
  };
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json',
      'X-Idempotency-Key': `tenda-pedido-${pedidoId}` },
    body: JSON.stringify(preference)
  });
  if (!res.ok) return json({ error: 'Não foi possível iniciar o pagamento' }, 502);
  const pagamento = await res.json();
  const url = MP_ENV === 'production' ? pagamento.init_point : pagamento.sandbox_init_point;
  if (typeof url !== 'string' || !url.startsWith('https://')) return json({ error: 'URL segura de pagamento indisponível' }, 502);

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  // Salva somente a preferência; nunca antecipa "pago".
  const { error: trackingError } = await service.from('pagamentos_mercadopago')
    .upsert({ pedido_id: pedidoId, preference_id: pagamento.id }, { onConflict: 'pedido_id' });
  if (trackingError) return json({ error: 'Não foi possível vincular o pagamento ao pedido' }, 502);
  return json({ checkout_url: url, pedido_id: pedidoId });
});
