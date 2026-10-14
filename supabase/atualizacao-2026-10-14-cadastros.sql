-- Atualização do banco da loja (Site Tenda), 14/10/2026: categorias e formas de trabalho editáveis, clientes da gestão e responsável da venda.
-- Rodar uma vez no SQL Editor, depois de atualizacao-2026-10-14-kits-promocoes.sql. Projeto novo não precisa: os schema.sql
-- da loja (categorias) e da gestão (formas de trabalho, clientes e vendas) já trazem estas mudanças.

-- Categorias dos produtos, na ordem das abas do site; admin e equipe da gestão criam, renomeiam e excluem
create table if not exists public.categorias (
  nome text primary key,
  ordem integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;

drop policy if exists "todos veem as categorias" on public.categorias;
create policy "todos veem as categorias"
  on public.categorias for select
  using (true);

drop policy if exists "admin e equipe cadastram categorias" on public.categorias;
create policy "admin e equipe cadastram categorias"
  on public.categorias for insert
  with check (public.is_admin() or public.eh_da_equipe());

insert into public.categorias (nome, ordem) values
  ('Ervas', 1), ('Incensos', 2), ('Porta Incenso', 3), ('Defumadores', 4), ('Colares e Pulseiras', 5), ('HeadShop', 6),
  ('Fumo', 7), ('Potes de Vidro', 8), ('Bags e Bolsas', 9), ('Enfeites e Decoração', 10), ('Acessórios', 11), ('Kits', 12)
on conflict (nome) do nothing;

insert into public.categorias (nome)
select distinct category from public.products
on conflict (nome) do nothing;

-- Função que coloca na lista a categoria nova usada num produto
create or replace function public.registrar_categoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (nome) values (new.category) on conflict (nome) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_gravar_categoria_produto on public.products;
create trigger ao_gravar_categoria_produto
  before insert or update of category on public.products
  for each row execute function public.registrar_categoria();

-- Função que renomeia a categoria e leva os produtos junto
create or replace function public.renomear_categoria(p_nome text, p_novo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.eh_da_equipe()) then
    raise exception 'Só administrador ou equipe da gestão altera categoria';
  end if;

  if coalesce(trim(p_novo), '') = '' then
    raise exception 'Informe o novo nome da categoria';
  end if;

  if exists (select 1 from public.categorias where lower(nome) = lower(trim(p_novo)) and nome <> p_nome) then
    raise exception 'Já existe a categoria %', trim(p_novo);
  end if;

  update public.categorias set nome = trim(p_novo) where nome = p_nome;
  if not found then
    raise exception 'Categoria não encontrada';
  end if;

  update public.products set category = trim(p_novo) where category = p_nome;
end;
$$;

revoke execute on function public.renomear_categoria(text, text) from public, anon;
grant execute on function public.renomear_categoria(text, text) to authenticated;

-- Função que exclui a categoria; se ela tiver produtos, eles vão para a categoria escolhida
create or replace function public.excluir_categoria(p_nome text, p_mover_para text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produtos integer;
begin
  if not (public.is_admin() or public.eh_da_equipe()) then
    raise exception 'Só administrador ou equipe da gestão exclui categoria';
  end if;

  select count(*) into v_produtos from public.products where category = p_nome;
  if v_produtos > 0 then
    if p_mover_para is null or p_mover_para = p_nome or not exists (select 1 from public.categorias where nome = p_mover_para) then
      raise exception 'A categoria % tem % produto(s): escolha para qual categoria eles vão', p_nome, v_produtos;
    end if;
    update public.products set category = p_mover_para where category = p_nome;
  end if;

  delete from public.categorias where nome = p_nome;
end;
$$;

revoke execute on function public.excluir_categoria(text, text) from public, anon;
grant execute on function public.excluir_categoria(text, text) to authenticated;

-- Formas de trabalho dos clientes da gestão (Umbanda, Candomblé...), editáveis pela equipe
create table if not exists public.gestao_formas_trabalho (
  nome text primary key,
  created_at timestamptz not null default now()
);

alter table public.gestao_formas_trabalho enable row level security;
revoke all on public.gestao_formas_trabalho from anon;

drop policy if exists "equipe acessa as formas de trabalho" on public.gestao_formas_trabalho;
create policy "equipe acessa as formas de trabalho"
  on public.gestao_formas_trabalho for all to authenticated
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

insert into public.gestao_formas_trabalho (nome) values ('Umbanda'), ('Candomblé'), ('Ifá'), ('Kimbanda')
on conflict (nome) do nothing;

-- Clientes cadastrados pela gestão (separados das vendas): nome, data de nascimento e CPF válido são obrigatórios
create table if not exists public.gestao_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (trim(nome) <> ''),
  data_nascimento date not null,
  cpf text not null check (public.cpf_valido(cpf)),
  telefone text,
  email text,
  endereco text,
  rede_social text,
  forma_trabalho text,
  created_at timestamptz not null default now()
);

create unique index if not exists gestao_clientes_cpf_unico on public.gestao_clientes ((regexp_replace(cpf, '\D', '', 'g')));

alter table public.gestao_clientes enable row level security;
revoke all on public.gestao_clientes from anon;

drop policy if exists "equipe acessa os clientes" on public.gestao_clientes;
create policy "equipe acessa os clientes"
  on public.gestao_clientes for all to authenticated
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

-- Função que renomeia a forma de trabalho e leva os clientes e as vendas junto
create or replace function public.renomear_forma_trabalho(p_nome text, p_novo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_da_equipe() then
    raise exception 'Só a equipe da gestão altera forma de trabalho';
  end if;

  if coalesce(trim(p_novo), '') = '' then
    raise exception 'Informe o novo nome';
  end if;

  if exists (select 1 from public.gestao_formas_trabalho where lower(nome) = lower(trim(p_novo)) and nome <> p_nome) then
    raise exception 'Já existe a forma de trabalho %', trim(p_novo);
  end if;

  update public.gestao_formas_trabalho set nome = trim(p_novo) where nome = p_nome;
  if not found then
    raise exception 'Forma de trabalho não encontrada';
  end if;

  update public.gestao_clientes set forma_trabalho = trim(p_novo) where forma_trabalho = p_nome;
  update public.gestao_vendas set forma_trabalho = trim(p_novo) where forma_trabalho = p_nome;
end;
$$;

revoke execute on function public.renomear_forma_trabalho(text, text) from public, anon;
grant execute on function public.renomear_forma_trabalho(text, text) to authenticated;

-- A venda aponta para o cliente cadastrado e para o administrador responsável
alter table public.gestao_vendas add column if not exists cliente_id uuid references public.gestao_clientes (id) on delete restrict;
alter table public.gestao_vendas add column if not exists responsavel_id uuid references auth.users (id) on delete set null;

-- A equipe da gestão vê os administradores, para escolher o responsável da venda
drop policy if exists "equipe vê os administradores" on public.admin;
create policy "equipe vê os administradores"
  on public.admin for select
  using (public.eh_da_equipe());
