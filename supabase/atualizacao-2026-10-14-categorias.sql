-- Atualização do banco da loja (Site Tenda), feita em 14/10/2026 à noite.
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- Traz: categoria, opções (cor, aroma) e marca 18+ nos produtos; data de nascimento no cadastro;
-- nome, CPF e data de nascimento travados depois do cadastro; pedido com a opção escolhida e conferência de idade.

-- Produtos: categoria, opções e venda só para maiores de 18
alter table public.products add column if not exists category text not null default 'Ervas';
alter table public.products add column if not exists options jsonb not null default '[]';
alter table public.products add column if not exists adult boolean not null default false;

-- Cadastro: data de nascimento
alter table public.users add column if not exists birth_date date;

-- Função que cria o cadastro do cliente quando ele se registra
create or replace function public.criar_cadastro_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, cpf, address, cep, number, phone, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'cpf',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'cep',
    new.raw_user_meta_data ->> 'number',
    new.raw_user_meta_data ->> 'phone',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
  );
  return new;
end;
$$;

-- Função que impede o cliente de trocar nome e CPF depois do cadastro (o admin e o painel do Supabase podem)
create or replace function public.travar_nome_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.cpf is not null
     and (new.cpf is distinct from old.cpf or new.full_name is distinct from old.full_name or (old.birth_date is not null and new.birth_date is distinct from old.birth_date))
     and coalesce(auth.role(), '') = 'authenticated'
     and not public.is_admin() then
    raise exception 'Nome, CPF e data de nascimento não podem ser alterados depois do cadastro';
  end if;
  return new;
end;
$$;

drop trigger if exists ao_alterar_cadastro on public.users;
create trigger ao_alterar_cadastro
  before update on public.users
  for each row execute function public.travar_nome_cpf();

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

    -- Produto com opções (cor, aroma) exige uma opção que exista no cadastro
    v_opcao := nullif(trim(v_item ->> 'opcao'), '');
    if jsonb_array_length(v_produto.options) = 0 then
      v_opcao := null;
    elsif v_opcao is null or not exists (select 1 from jsonb_array_elements(v_produto.options) o where o ->> 'nome' = v_opcao) then
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
