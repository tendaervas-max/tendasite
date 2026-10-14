-- Atualização do banco da loja (Site Tenda), 14/10/2026: promoção por produto ou kit e kits montados pela gestão.
-- Rodar uma vez no SQL Editor, depois de atualizacao-2026-10-14-gestao-integrada.sql. Projeto novo não precisa: o schema.sql já traz estas mudanças.

-- Promoção do produto (vale também para kit, que é um produto da categoria Kits) e os itens de cada kit
alter table public.products add column if not exists preco_promocional numeric(10, 2) check (preco_promocional >= 0);
alter table public.products add column if not exists promocao_ate date;
alter table public.products add column if not exists kit_itens jsonb not null default '[]';

-- Função que diz o preço que vale hoje: o promocional enquanto a promoção está no prazo (data de São Paulo), senão o normal
create or replace function public.preco_atual(p_produto public.products)
returns numeric
language sql
stable
as $$
  select case
    when p_produto.preco_promocional is not null
     and (p_produto.promocao_ate is null or p_produto.promocao_ate >= (now() at time zone 'America/Sao_Paulo')::date)
    then p_produto.preco_promocional
    else p_produto.price
  end;
$$;

-- O pedido passa a cobrar o preço que vale hoje (com a promoção)
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
  v_preco numeric(10, 2);
  v_descricao text[] := '{}';
  v_itens jsonb := '[]';
  v_opcao text;
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

    -- Produto com opções (cor, aroma) exige uma opção que exista no cadastro ou Aleatório (a loja escolhe)
    v_opcao := nullif(trim(v_item ->> 'opcao'), '');
    if jsonb_array_length(v_produto.options) = 0 then
      v_opcao := null;
    elsif v_opcao is null or (v_opcao <> 'Aleatório' and not exists (select 1 from jsonb_array_elements(v_produto.options) o where o ->> 'nome' = v_opcao)) then
      raise exception 'Escolha uma opção válida para %', v_produto.name;
    end if;

    if v_produto.adult and (v_cliente.birth_date is null or v_cliente.birth_date > current_date - interval '18 years') then
      raise exception 'Só maiores de 18 anos podem comprar %. Confira a data de nascimento em Minha conta.', v_produto.name;
    end if;

    if v_produto.quantity < v_quantidade then
      raise exception 'Estoque insuficiente para %: restam %', v_produto.name, v_produto.quantity;
    end if;

    update public.products set quantity = quantity - v_quantidade where id = v_produto.id;

    v_preco := public.preco_atual(v_produto);
    v_total := v_total + v_preco * v_quantidade;
    v_descricao := v_descricao || (v_quantidade || 'x ' || v_produto.name || coalesce(' (' || v_opcao || ')', ''));
    v_itens := v_itens || jsonb_build_object('id', v_produto.id, 'nome', v_produto.name, 'opcao', v_opcao, 'quantidade', v_quantidade, 'preco', v_preco);
  end loop;

  insert into public.orders (user_id, customer_name, payment_method, delivery_method, description, items, total_price)
  values (v_cliente.id, v_cliente.full_name, p_forma_pagamento, p_entrega, array_to_string(v_descricao, ', '), v_itens, v_total)
  returning id into v_id;

  return v_id;
end;
$$;

-- Função que cria o kit: grava o produto na categoria Kits e tira do estoque os itens dos kits montados
create or replace function public.criar_kit(p_nome text, p_descricao text, p_preco numeric, p_quantidade integer, p_estoque_minimo integer, p_itens jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_produto public.products;
  v_quantidade integer;
  v_descricao text[] := '{}';
  v_itens jsonb := '[]';
  v_id bigint;
begin
  if not public.eh_da_equipe() then
    raise exception 'Só a equipe da gestão cria kit';
  end if;

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome do kit';
  end if;

  if p_preco is null or p_preco < 0 then
    raise exception 'Preço inválido';
  end if;

  if p_quantidade is null or p_quantidade < 0 then
    raise exception 'Quantidade de kits inválida';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Escolha os produtos do kit';
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

    if v_produto.quantity < v_quantidade * p_quantidade then
      raise exception 'Estoque insuficiente de % para montar % kit(s): restam %', v_produto.name, p_quantidade, v_produto.quantity;
    end if;

    update public.products set quantity = quantity - v_quantidade * p_quantidade where id = v_produto.id;

    v_descricao := v_descricao || (v_quantidade || 'x ' || v_produto.name);
    v_itens := v_itens || jsonb_build_object('id', v_produto.id, 'nome', v_produto.name, 'quantidade', v_quantidade);
  end loop;

  insert into public.products (name, description, category, price, quantity, estoque_minimo, kit_itens)
  values (
    trim(p_nome),
    coalesce(nullif(trim(p_descricao), ''), 'Inclui ' || array_to_string(v_descricao, ', ') || '.'),
    'Kits',
    p_preco,
    p_quantidade,
    coalesce(p_estoque_minimo, 5),
    v_itens
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.criar_kit(text, text, numeric, integer, integer, jsonb) from public, anon;
grant execute on function public.criar_kit(text, text, numeric, integer, integer, jsonb) to authenticated;

-- Função que monta mais unidades de um kit: tira os itens do estoque e soma no estoque do kit
create or replace function public.montar_kit(p_kit bigint, p_quantidade integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kit public.products;
  v_item jsonb;
  v_produto public.products;
  v_quantidade integer;
begin
  if not public.eh_da_equipe() then
    raise exception 'Só a equipe da gestão monta kit';
  end if;

  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade de kits inválida';
  end if;

  select * into v_kit from public.products where id = p_kit for update;
  if not found or jsonb_array_length(v_kit.kit_itens) = 0 then
    raise exception 'Este produto não é um kit montado pela gestão';
  end if;

  for v_item in select * from jsonb_array_elements(v_kit.kit_itens) loop
    v_quantidade := (v_item ->> 'quantidade')::integer;
    select * into v_produto from public.products where id = (v_item ->> 'id')::bigint for update;
    if not found then
      raise exception 'O produto % do kit não existe mais', v_item ->> 'nome';
    end if;

    if v_produto.quantity < v_quantidade * p_quantidade then
      raise exception 'Estoque insuficiente de % para montar % kit(s): restam %', v_produto.name, p_quantidade, v_produto.quantity;
    end if;

    update public.products set quantity = quantity - v_quantidade * p_quantidade where id = v_produto.id;
  end loop;

  update public.products set quantity = quantity + p_quantidade where id = p_kit;
end;
$$;

revoke execute on function public.montar_kit(bigint, integer) from public, anon;
grant execute on function public.montar_kit(bigint, integer) to authenticated;
