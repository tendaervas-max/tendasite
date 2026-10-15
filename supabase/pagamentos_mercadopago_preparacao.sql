-- PREPARAÇÃO: executar após configurar credenciais e testar funções em sandbox.
-- Nunca habilitar pagamento por retorno de URL, somente após consulta assinada ao Mercado Pago.
begin;
create table if not exists public.pagamentos_mercadopago (
 pedido_id bigint primary key references public.orders(id) on delete cascade,
 preference_id text unique,
 pagamento_id text unique,
 status text not null default 'aguardando' check(status in ('aguardando','pending','in_process','approved','rejected','cancelled','refunded','charged_back')),
 metodo text,
 valor numeric(12,2),
 verificado_em timestamptz,
 atualizado_em timestamptz not null default now()
);
alter table public.pagamentos_mercadopago enable row level security;
revoke all on public.pagamentos_mercadopago from public,anon,authenticated;
grant select on public.pagamentos_mercadopago to authenticated;
drop policy if exists "Cliente acompanha pagamento do pedido" on public.pagamentos_mercadopago;
create policy "Cliente acompanha pagamento do pedido" on public.pagamentos_mercadopago for select
to authenticated using (
 exists(select 1 from public.orders o where o.id=pedido_id and (o.user_id=auth.uid() or (select public.eh_da_equipe())))
);
create or replace function public.registrar_pagamento_mercadopago_verificado(
 p_pedido bigint, p_pagamento text, p_status text, p_valor numeric, p_metodo text
) returns void language plpgsql security definer set search_path='' as $$
declare pedido public.orders%rowtype;
begin
 select * into pedido from public.orders where id=p_pedido for update;
 if not found then raise exception 'Pedido não encontrado'; end if;
 if pedido.status = 'pedido cancelado' then raise exception 'Pedido cancelado: encaminhar para reembolso ou conferência'; end if;
 if p_pagamento is null or p_pagamento !~ '^[0-9]+$' or p_status not in
  ('pending','in_process','approved','rejected','cancelled','refunded','charged_back') then raise exception 'Pagamento inválido'; end if;
 if p_valor is null or round(p_valor,2)<>round(pedido.total_price,2) then raise exception 'Divergência de valor'; end if;
 insert into public.pagamentos_mercadopago(pedido_id,pagamento_id,status,metodo,valor,verificado_em,atualizado_em)
 values(p_pedido,p_pagamento,p_status,p_metodo,p_valor,now(),now())
 on conflict(pedido_id) do update set
  pagamento_id=excluded.pagamento_id,status=excluded.status,metodo=excluded.metodo,
  valor=excluded.valor,verificado_em=now(),atualizado_em=now();
 if p_status='approved' and pedido.status='aguardando pagamento' then
  update public.orders set status='pagamento confirmado',
   payment_method=case when lower(coalesce(p_metodo,''))='pix' then 'PIX' else 'Mercado Pago' end
   where id=p_pedido;
 end if;
end $$;
revoke all on function public.registrar_pagamento_mercadopago_verificado(bigint,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.registrar_pagamento_mercadopago_verificado(bigint,text,text,numeric,text) to service_role;
commit;
