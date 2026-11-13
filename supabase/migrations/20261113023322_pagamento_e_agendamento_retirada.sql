begin;

-- O painel concede acesso de administrador informando apenas user_id.
-- Um administrador comum não pode usar o mesmo INSERT para conceder a função de dono.
revoke insert on public.admin from public, anon, authenticated;
revoke insert (dono) on public.admin from public, anon, authenticated;
grant insert (user_id) on public.admin to authenticated;

alter table public.orders
  drop constraint orders_payment_method_check,
  add constraint orders_payment_method_check check (payment_method in ('PIX', 'Cartão', 'Mercado Pago')),
  add column frete_confirmado numeric(12,2) check (frete_confirmado >= 0 and frete_confirmado < 'Infinity'::numeric),
  add column pagamento_confirmado_em timestamptz;

update public.orders o set pagamento_confirmado_em = coalesce(
  (select p.verificado_em from public.pagamentos_mercadopago p
   where p.pedido_id = o.id and p.status = 'approved'), now()
)
where o.status = 'pagamento confirmado' or exists (
  select 1 from public.pagamentos_mercadopago p where p.pedido_id = o.id and p.status = 'approved'
);

create function public.marcar_pagamento_confirmado_pedido()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('aguardando pagamento', 'pedido cancelado') then
    new.pagamento_confirmado_em := null;
  elsif new.status = 'pagamento confirmado' then
    new.pagamento_confirmado_em := coalesce(old.pagamento_confirmado_em, now());
  end if;
  return new;
end $$;

create trigger marcar_pagamento_confirmado_pedido
before update of status on public.orders for each row
execute function public.marcar_pagamento_confirmado_pedido();

create function public.confirmar_frete_pedido(p_pedido bigint, p_frete numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare pedido public.orders%rowtype;
begin
  if not (public.is_admin() or public.eh_da_equipe()) then
    raise exception 'Somente a loja pode confirmar o frete' using errcode = '42501';
  end if;
  if p_frete is null or p_frete < 0 or p_frete >= 10000000000 or p_frete <> round(p_frete, 2) then
    raise exception 'Informe um valor de frete válido';
  end if;
  select * into pedido from public.orders where id = p_pedido for update;
  if not found or pedido.delivery_method is distinct from 'Correios'
    or pedido.status is distinct from 'aguardando pagamento' or pedido.arquivado_teste then
    raise exception 'Pedido indisponível para confirmar frete';
  end if;
  if pedido.frete_confirmado is not null then
    if pedido.frete_confirmado = p_frete then return pedido.frete_confirmado; end if;
    raise exception 'O valor do frete já foi confirmado para este pedido';
  end if;
  update public.orders set frete_confirmado = p_frete where id = p_pedido;
  return p_frete;
end $$;

revoke all on function public.confirmar_frete_pedido(bigint, numeric) from public, anon, authenticated;
grant execute on function public.confirmar_frete_pedido(bigint, numeric) to authenticated;

create table public.agendamentos_retirada (
  pedido_id bigint primary key references public.orders(id) on delete cascade,
  endereco text not null check (length(btrim(endereco)) between 1 and 500),
  agendado_para timestamptz not null check (isfinite(agendado_para)),
  confirmado_por uuid not null,
  confirmado_em timestamptz not null default now()
);
alter table public.agendamentos_retirada enable row level security;
revoke all on public.agendamentos_retirada from public, anon, authenticated;
grant select on public.agendamentos_retirada to authenticated;

create policy "Dono e cliente autorizado veem a retirada"
on public.agendamentos_retirada for select to authenticated using (
  (select public.eh_dono()) or exists (
    select 1 from public.orders o
    where o.id = pedido_id
      and o.user_id = (select auth.uid())
      and o.delivery_method = 'Retirada'
      and not coalesce(o.arquivado_teste, false)
      and o.pagamento_confirmado_em is not null
      and o.status in ('pagamento confirmado', 'pedido sendo separado', 'pronto para retirada', 'pedido entregue')
      and not exists (
        select 1 from public.pagamentos_mercadopago p
        where p.pedido_id = o.id and p.status in ('refunded', 'charged_back')
      )
  )
);

create function public.confirmar_retirada_pedido(p_pedido bigint, p_endereco text, p_data_hora timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare pedido public.orders%rowtype;
begin
  if not public.eh_dono() then
    raise exception 'Somente o dono da loja pode confirmar a retirada' using errcode = '42501';
  end if;
  if p_data_hora is null or not isfinite(p_data_hora) or p_data_hora <= now()
    or p_endereco is null or length(btrim(p_endereco)) not between 1 and 500 then
    raise exception 'Informe um endereço e uma data e hora futuras';
  end if;
  select * into pedido from public.orders where id = p_pedido for update;
  if not found or pedido.delivery_method is distinct from 'Retirada' or pedido.user_id is null
    or pedido.arquivado_teste
    or pedido.pagamento_confirmado_em is null
    or pedido.status not in ('pagamento confirmado', 'pedido sendo separado', 'pronto para retirada')
    or exists (select 1 from public.pagamentos_mercadopago p
      where p.pedido_id = p_pedido and p.status in ('refunded', 'charged_back')) then
    raise exception 'Confirme o pagamento antes de agendar uma retirada ativa';
  end if;
  insert into public.agendamentos_retirada(pedido_id, endereco, agendado_para, confirmado_por)
  values (p_pedido, btrim(p_endereco), p_data_hora, auth.uid())
  on conflict (pedido_id) do update
    set endereco = excluded.endereco, agendado_para = excluded.agendado_para,
        confirmado_por = excluded.confirmado_por, confirmado_em = excluded.confirmado_em;
end $$;

revoke all on function public.confirmar_retirada_pedido(bigint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.confirmar_retirada_pedido(bigint, text, timestamptz) to authenticated;

create or replace function public.registrar_pagamento_mercadopago_verificado(
  p_pedido bigint, p_pagamento text, p_status text, p_valor numeric, p_metodo text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  pedido public.orders%rowtype;
  pagamento public.pagamentos_mercadopago%rowtype;
  total numeric;
begin
  select * into pedido from public.orders where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if pedido.status = 'pedido cancelado' then raise exception 'Pedido cancelado: encaminhar para reembolso ou conferência'; end if;
  if p_pagamento is null or p_pagamento !~ '^[0-9]+$' or p_status is null or p_status not in
    ('pending','in_process','approved','rejected','cancelled','refunded','charged_back') then
    raise exception 'Pagamento inválido';
  end if;
  total := case pedido.delivery_method
    when 'Retirada' then pedido.total_price
    when 'Correios' then pedido.total_price + pedido.frete_confirmado
  end;
  if total is null or p_valor is null or round(p_valor,2) <> round(total,2) then
    raise exception 'Divergência de valor';
  end if;

  select * into pagamento from public.pagamentos_mercadopago where pedido_id = p_pedido;
  if pagamento.status in ('approved', 'refunded', 'charged_back') then
    if pagamento.pagamento_id is distinct from p_pagamento then
      if p_status = 'approved' then raise exception 'Segundo pagamento aprovado: encaminhar para conferência'; end if;
      return;
    end if;
    if pagamento.status = p_status
      or (pagamento.status = 'approved' and p_status not in ('refunded', 'charged_back'))
      or (pagamento.status in ('refunded', 'charged_back') and p_status not in ('refunded', 'charged_back')) then
      return;
    end if;
  end if;

  insert into public.pagamentos_mercadopago(pedido_id,pagamento_id,status,metodo,valor,verificado_em,atualizado_em)
  values(p_pedido,p_pagamento,p_status,p_metodo,p_valor,now(),now())
  on conflict(pedido_id) do update set
    pagamento_id=excluded.pagamento_id,status=excluded.status,metodo=excluded.metodo,
    valor=excluded.valor,verificado_em=now(),atualizado_em=now();
  if p_status = 'approved' and pedido.pagamento_confirmado_em is null then
    update public.orders set
      status = case when pedido.status = 'aguardando pagamento' then 'pagamento confirmado' else pedido.status end,
      pagamento_confirmado_em = now(),
      payment_method = case when lower(coalesce(p_metodo,'')) = 'pix' then 'PIX' else 'Mercado Pago' end
    where id = p_pedido;
  end if;
end $$;

revoke all on function public.registrar_pagamento_mercadopago_verificado(bigint,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_mercadopago_verificado(bigint,text,text,numeric,text) to service_role;

commit;
