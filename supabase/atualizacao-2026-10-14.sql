-- Atualização do banco da loja que já está em uso (Site Tenda), feita em 14/10/2026.
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- Traz: WhatsApp no cadastro, baixa do estoque no pedido, forma de entrega, itens do pedido,
-- novos status (aguardando pagamento, retirada, cancelado) e devolução do estoque ao cancelar.

-- Telefone (WhatsApp) do cliente
alter table public.users add column if not exists phone text;

-- Função que cria o cadastro do cliente quando ele se registra
create or replace function public.criar_cadastro_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, cpf, address, cep, number, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'cpf',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'cep',
    new.raw_user_meta_data ->> 'number',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

-- Forma de entrega, itens e controle dos avisos por e-mail no pedido
alter table public.orders add column if not exists delivery_method text not null default 'Correios';
alter table public.orders drop constraint if exists orders_delivery_method_check;
alter table public.orders add constraint orders_delivery_method_check check (delivery_method in ('Correios', 'Retirada'));
alter table public.orders add column if not exists items jsonb not null default '[]';
alter table public.orders add column if not exists ultimo_aviso text;

-- Status novos: o pedido começa aguardando o pagamento
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'aguardando pagamento' where status = 'pedido recebido';
alter table public.orders add constraint orders_status_check check (status in ('aguardando pagamento', 'pagamento confirmado', 'pedido sendo separado', 'pronto para retirada', 'pedido enviado para entrega', 'pedido entregue', 'pedido cancelado'));
alter table public.orders alter column status set default 'aguardando pagamento';

-- A função de pedido ganhou o parâmetro da forma de entrega
drop function if exists public.criar_pedido(jsonb, text);

-- Função que grava o pedido calculando o total pelos preços do banco e baixa o estoque
create or replace function public.criar_pedido(p_itens jsonb, p_forma_pagamento text, p_entrega text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente public.users;
  v_produto public.products;
  v_item jsonb;
  v_quantidade integer;
  v_total numeric(10, 2) := 0;
  v_descricao text[] := '{}';
  v_itens jsonb := '[]';
  v_id bigint;
begin
  select * into v_cliente from public.users where id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta para finalizar o pedido';
  end if;

  if p_forma_pagamento is null or p_forma_pagamento <> 'PIX' then
    raise exception 'Forma de pagamento inválida';
  end if;

  if p_entrega is null or p_entrega not in ('Correios', 'Retirada') then
    raise exception 'Forma de entrega inválida';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    if v_quantidade is null or v_quantidade < 1 then
      raise exception 'Quantidade inválida';
    end if;

    select * into v_produto from public.products where id = (v_item ->> 'id')::bigint for update;
    if not found then
      raise exception 'Produto não encontrado';
    end if;

    if v_produto.quantity < v_quantidade then
      raise exception 'Estoque insuficiente para %: restam %', v_produto.name, v_produto.quantity;
    end if;

    update public.products set quantity = quantity - v_quantidade where id = v_produto.id;

    v_total := v_total + v_produto.price * v_quantidade;
    v_descricao := v_descricao || (v_quantidade || 'x ' || v_produto.name);
    v_itens := v_itens || jsonb_build_object('id', v_produto.id, 'nome', v_produto.name, 'quantidade', v_quantidade, 'preco', v_produto.price);
  end loop;

  insert into public.orders (user_id, customer_name, payment_method, delivery_method, description, items, total_price)
  values (v_cliente.id, v_cliente.full_name, p_forma_pagamento, p_entrega, array_to_string(v_descricao, ', '), v_itens, v_total)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.criar_pedido(jsonb, text, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, text, text) to authenticated;

-- Função que devolve ao estoque os itens do pedido cancelado e impede reabrir um pedido cancelado
create or replace function public.devolver_estoque_pedido_cancelado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if old.status = 'pedido cancelado' and new.status <> old.status then
    raise exception 'Pedido cancelado não pode mudar de status';
  end if;

  if new.status = 'pedido cancelado' and old.status <> 'pedido cancelado' then
    for v_item in select * from jsonb_array_elements(new.items) loop
      update public.products
        set quantity = quantity + (v_item ->> 'quantidade')::integer
        where id = (v_item ->> 'id')::bigint;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists ao_cancelar_pedido on public.orders;
create trigger ao_cancelar_pedido
  before update of status on public.orders
  for each row execute function public.devolver_estoque_pedido_cancelado();
