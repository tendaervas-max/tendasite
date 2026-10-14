-- Atualização do banco da loja (Site Tenda), 14/10/2026: o cliente cancela ou edita o pedido enquanto ele aguarda o pagamento.
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- Editar = refazer: o pedido anterior é cancelado (o estoque volta) e um novo é gravado com os preços e o estoque de agora,
-- tudo na mesma transação; se o novo falhar, o anterior continua como estava.

-- Pedido que este substituiu (quando o cliente editou)
alter table public.orders add column if not exists pedido_anterior bigint references public.orders (id);

-- Função que cancela o pedido do cliente logado enquanto ele aguarda o pagamento (o gatilho devolve o estoque)
create or replace function public.cancelar_pedido(p_pedido bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
    set status = 'pedido cancelado'
    where id = p_pedido and user_id = auth.uid() and status = 'aguardando pagamento';

  if not found then
    raise exception 'Só dá para cancelar pedido que ainda aguarda o pagamento. Se já pagou, fale com a gente pelo WhatsApp.';
  end if;
end;
$$;

revoke execute on function public.cancelar_pedido(bigint) from public, anon;
grant execute on function public.cancelar_pedido(bigint) to authenticated;

-- Função que refaz o pedido do cliente logado: cancela o anterior e grava o novo recalculado
create or replace function public.refazer_pedido(p_pedido bigint, p_itens jsonb, p_forma_pagamento text, p_entrega text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  -- O anterior sai marcado como avisado: o cliente recebe só o e-mail do pedido novo
  update public.orders
    set status = 'pedido cancelado', ultimo_aviso = 'pedido cancelado'
    where id = p_pedido and user_id = auth.uid() and status = 'aguardando pagamento';

  if not found then
    raise exception 'Só dá para editar pedido que ainda aguarda o pagamento. Se já pagou, fale com a gente pelo WhatsApp.';
  end if;

  v_id := public.criar_pedido(p_itens, p_forma_pagamento, p_entrega);
  update public.orders set pedido_anterior = p_pedido where id = v_id;
  return v_id;
end;
$$;

revoke execute on function public.refazer_pedido(bigint, jsonb, text, text) from public, anon;
grant execute on function public.refazer_pedido(bigint, jsonb, text, text) to authenticated;
