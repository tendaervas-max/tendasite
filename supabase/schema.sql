-- Estrutura e regras de acesso da loja Tenda Ervas.
-- Rodar uma vez no SQL Editor de um projeto Supabase novo.
--
-- As senhas ficam só no Supabase Auth (criptografadas com bcrypt pelo próprio Supabase);
-- nenhuma tabela do sistema guarda senha.
--
-- Depois do primeiro administrador, os outros logins são criados e liberados pela aba Usuários do painel
-- (Edge Function criar-usuario). Para o primeiro, crie o usuário em Authentication > Users > Add user
-- e depois rode:
--   insert into public.admin (user_id) select id from auth.users where email = 'email-do-admin@exemplo.com';

-- Tabela que diz quem é administrador
create table if not exists public.admin (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text,
  dono boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin enable row level security;

-- Função que diz se o usuário logado é administrador
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

create policy "administrador vê os administradores"
  on public.admin for select
  using (public.is_admin());

create policy "administrador libera administrador"
  on public.admin for insert
  with check (public.is_admin());

-- Ninguém retira o próprio acesso nem o do dono, para a loja nunca ficar sem administrador
create policy "administrador retira administrador"
  on public.admin for delete
  using (public.is_admin() and user_id <> auth.uid() and not dono);

-- Função que diz se o usuário logado é o dono da loja
create or replace function public.eh_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin where user_id = auth.uid() and dono);
$$;

revoke execute on function public.eh_dono() from public, anon;
grant execute on function public.eh_dono() to authenticated;

-- Cadastro do cliente (dados de entrega), ligado ao usuário do Supabase Auth
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  cpf text,
  address text,
  cep text,
  number text,
  phone text,
  birth_date date,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "cliente vê o próprio cadastro"
  on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy "cliente altera o próprio cadastro"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke insert, delete on public.users from anon, authenticated;

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

-- Função que confere os dois dígitos verificadores do CPF (aceita com ou sem pontuação)
create or replace function public.cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_digitos text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_soma integer;
  v_resto integer;
begin
  if length(v_digitos) <> 11 or v_digitos = repeat(left(v_digitos, 1), 11) then
    return false;
  end if;

  for v_posicao in 9..10 loop
    v_soma := 0;
    for v_i in 1..v_posicao loop
      v_soma := v_soma + substr(v_digitos, v_i, 1)::integer * (v_posicao + 2 - v_i);
    end loop;
    v_resto := (v_soma * 10) % 11 % 10;
    if v_resto <> substr(v_digitos, v_posicao + 1, 1)::integer then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- Função que recusa CPF inválido quando o CPF do cadastro é gravado ou trocado
create or replace function public.validar_cpf()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.cpf, '') <> ''
     and (tg_op = 'INSERT' or new.cpf is distinct from old.cpf)
     and not public.cpf_valido(new.cpf) then
    raise exception 'CPF inválido. Confira os números digitados.';
  end if;
  return new;
end;
$$;

drop trigger if exists ao_gravar_cpf on public.users;
create trigger ao_gravar_cpf
  before insert or update of cpf on public.users
  for each row execute function public.validar_cpf();

-- Função que preenche o e-mail e o nome do administrador a partir do login e do cadastro
create or replace function public.preencher_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select u.email into new.email from auth.users u where u.id = new.user_id;
  select nullif(c.full_name, '') into new.nome from public.users c where c.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists ao_liberar_admin on public.admin;
create trigger ao_liberar_admin
  before insert or update of user_id on public.admin
  for each row execute function public.preencher_admin();

-- Quem acessa a gestão (sistematenda.netlify.app), escolhido pelo dono no painel Admin da loja
create table if not exists public.equipe (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text,
  created_at timestamptz not null default now()
);

alter table public.equipe enable row level security;
revoke all on public.equipe from anon;

create policy "administrador vê a equipe da gestão"
  on public.equipe for select
  using (public.is_admin() or user_id = auth.uid());

create policy "dono libera a gestão"
  on public.equipe for insert
  with check (public.eh_dono());

create policy "dono retira a gestão"
  on public.equipe for delete
  using (public.eh_dono());

-- O e-mail e o nome de quem entra na equipe vêm do login e do cadastro, como na tabela admin
drop trigger if exists ao_liberar_gestao on public.equipe;
create trigger ao_liberar_gestao
  before insert or update of user_id on public.equipe
  for each row execute function public.preencher_admin();

-- Função que diz se o usuário logado pode entrar na gestão
create or replace function public.eh_da_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

revoke execute on function public.eh_da_equipe() from public, anon;
grant execute on function public.eh_da_equipe() to authenticated;

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

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_cadastro_cliente();

-- Produtos: todos veem, só administrador altera
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  category text not null default 'Ervas',
  options jsonb not null default '[]',
  adult boolean not null default false,
  estoque_minimo integer not null default 5 check (estoque_minimo >= 0),
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "todos veem os produtos"
  on public.products for select
  using (true);

create policy "administrador cadastra produtos"
  on public.products for insert
  with check (public.is_admin());

create policy "administrador altera produtos"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "administrador exclui produtos"
  on public.products for delete
  using (public.is_admin());

-- Função que marca a data da última alteração do produto
create or replace function public.marcar_atualizacao_produto()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists ao_alterar_produto on public.products;
create trigger ao_alterar_produto
  before update on public.products
  for each row execute function public.marcar_atualizacao_produto();

-- A equipe da gestão cadastra, altera e exclui produtos
create policy "equipe cadastra produtos"
  on public.products for insert
  with check (public.eh_da_equipe());

create policy "equipe altera produtos"
  on public.products for update
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

create policy "equipe exclui produtos"
  on public.products for delete
  using (public.eh_da_equipe());

-- Pedidos: cliente vê os próprios, administrador vê todos
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid references public.users (id) on delete set null,
  customer_name text not null,
  payment_method text not null check (payment_method in ('PIX', 'Cartão')),
  delivery_method text not null default 'Correios' check (delivery_method in ('Correios', 'Retirada')),
  description text not null,
  items jsonb not null default '[]',
  total_price numeric(10, 2) not null,
  status text not null default 'aguardando pagamento'
    check (status in ('aguardando pagamento', 'pagamento confirmado', 'pedido sendo separado', 'pronto para retirada', 'pedido enviado para entrega', 'pedido entregue', 'pedido cancelado')),
  ultimo_aviso text,
  pedido_anterior bigint references public.orders (id),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "cliente vê os próprios pedidos"
  on public.orders for select
  using (user_id = auth.uid() or public.is_admin());

create policy "administrador altera o status"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "cliente confirma a entrega"
  on public.orders for update
  using (user_id = auth.uid() and status = 'pedido enviado para entrega')
  with check (user_id = auth.uid() and status = 'pedido entregue');

-- A equipe da gestão vê os clientes e os pedidos da loja e muda o status do pedido (o cliente recebe o aviso por e-mail)
create policy "equipe vê os clientes"
  on public.users for select
  using (public.eh_da_equipe());

create policy "equipe vê os pedidos"
  on public.orders for select
  using (public.eh_da_equipe());

create policy "equipe altera o status do pedido"
  on public.orders for update
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

-- Pedido só entra pela função criar_pedido e só o status pode ser alterado
revoke insert, update, delete on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

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

revoke execute on function public.criar_pedido(jsonb, text, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, text, text) to authenticated;

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

-- Fotos dos produtos: leitura pública, envio só por administrador
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "administrador envia fotos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "administrador altera fotos"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "administrador exclui fotos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
