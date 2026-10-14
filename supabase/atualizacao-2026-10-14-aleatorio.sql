-- Atualização do banco da loja (Site Tenda), 14/10/2026: aceita a opção Aleatório (a loja escolhe a cor ou o aroma).
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz esta mudança.

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

    v_total := v_total + v_produto.price * v_quantidade;
    v_descricao := v_descricao || (v_quantidade || 'x ' || v_produto.name || coalesce(' (' || v_opcao || ')', ''));
    v_itens := v_itens || jsonb_build_object('id', v_produto.id, 'nome', v_produto.name, 'opcao', v_opcao, 'quantidade', v_quantidade, 'preco', v_produto.price);
  end loop;

  insert into public.orders (user_id, customer_name, payment_method, delivery_method, description, items, total_price)
  values (v_cliente.id, v_cliente.full_name, p_forma_pagamento, p_entrega, array_to_string(v_descricao, ', '), v_itens, v_total)
  returning id into v_id;

  return v_id;
end;
$$;
