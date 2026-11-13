-- Executar com a migração instalada em banco de teste, com gatilhos de e-mail desativados.
begin;
insert into public.orders (id,user_id,status,delivery_method,total_price,customer_name,description,payment_method) overriding system value
values
  (101,'00000000-0000-0000-0000-000000000001','aguardando pagamento','Retirada',30,'Cliente teste','Itens teste','PIX'),
  (102,'00000000-0000-0000-0000-000000000001','aguardando pagamento','Correios',30,'Cliente teste','Itens teste','PIX'),
  (103,'00000000-0000-0000-0000-000000000002','aguardando pagamento','Retirada',20,'Cliente teste','Itens teste','PIX');
insert into public.admin (user_id,dono)
values
  ('00000000-0000-0000-0000-000000000003',true),
  ('00000000-0000-0000-0000-000000000004',false);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$
begin
  begin
    insert into public.admin(user_id,dono) values ('00000000-0000-0000-0000-000000000005',true);
    raise exception 'Administrador comum concedeu papel de dono';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.confirmar_retirada_pedido(101,'Endereço de teste',now() + interval '1 day');
    raise exception 'Administrador comum agendou retirada';
  exception when insufficient_privilege then null;
  end;
end $$;
select public.confirmar_frete_pedido(102, 12.30);
select public.confirmar_frete_pedido(102, 12.30);
do $$
begin
  begin
    perform public.confirmar_frete_pedido(102, 15);
    raise exception 'Frete confirmado foi alterado';
  exception when raise_exception then
    if sqlerrm <> 'O valor do frete já foi confirmado para este pedido' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$
begin
  begin
    perform public.confirmar_retirada_pedido(101,'Endereço de teste',now() + interval '1 day');
    raise exception 'Agendamento sem pagamento foi aceito';
  exception when raise_exception then
    if sqlerrm <> 'Confirme o pagamento antes de agendar uma retirada ativa' then raise; end if;
  end;
end $$;

reset role;
set local role service_role;
do $$
begin
  begin
    perform public.registrar_pagamento_mercadopago_verificado(102,'222','approved',30,'pix');
    raise exception 'Pagamento sem frete foi aceito';
  exception when raise_exception then
    if sqlerrm <> 'Divergência de valor' then raise; end if;
  end;
end $$;
select public.registrar_pagamento_mercadopago_verificado(102,'222','approved',42.30,'visa');
select public.registrar_pagamento_mercadopago_verificado(101,'111','approved',30,'pix');
select public.registrar_pagamento_mercadopago_verificado(101,'112','pending',30,'pix');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  if exists (select 1 from public.agendamentos_retirada) then raise exception 'Endereço exibido sem agendamento'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.confirmar_retirada_pedido(101,'Endereço de teste',now() + interval '1 day');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
begin
  if exists (select 1 from public.agendamentos_retirada) then raise exception 'Outro cliente viu o endereço'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  if not exists (select 1 from public.agendamentos_retirada where pedido_id=101 and endereco='Endereço de teste') then
    raise exception 'O cliente do pedido não viu o agendamento';
  end if;
end $$;
reset role;
set local role service_role;
select public.registrar_pagamento_mercadopago_verificado(101,'111','refunded',30,'pix');
reset role;
set local role authenticated;
do $$
begin
  if exists (select 1 from public.agendamentos_retirada) then raise exception 'Reembolso deixou o endereço acessível'; end if;
end $$;
rollback;
