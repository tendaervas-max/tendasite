-- Atualização do banco da loja (Site Tenda), 14/10/2026: a gestão trabalha com os produtos, os clientes e os pedidos da loja.
-- Rodar uma vez no SQL Editor, depois de atualizacao-2026-10-14-gestao.sql. Projeto novo não precisa: o schema.sql já traz estas mudanças.

-- Estoque mínimo (alerta da gestão) e data da última alteração do produto
alter table public.products add column if not exists estoque_minimo integer not null default 5 check (estoque_minimo >= 0);
alter table public.products add column if not exists atualizado_em timestamptz not null default now();

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
drop policy if exists "equipe cadastra produtos" on public.products;
create policy "equipe cadastra produtos"
  on public.products for insert
  with check (public.eh_da_equipe());

drop policy if exists "equipe altera produtos" on public.products;
create policy "equipe altera produtos"
  on public.products for update
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

drop policy if exists "equipe exclui produtos" on public.products;
create policy "equipe exclui produtos"
  on public.products for delete
  using (public.eh_da_equipe());

-- A equipe da gestão vê os clientes e os pedidos da loja e muda o status do pedido (o cliente recebe o aviso por e-mail)
drop policy if exists "equipe vê os clientes" on public.users;
create policy "equipe vê os clientes"
  on public.users for select
  using (public.eh_da_equipe());

drop policy if exists "equipe vê os pedidos" on public.orders;
create policy "equipe vê os pedidos"
  on public.orders for select
  using (public.eh_da_equipe());

drop policy if exists "equipe altera o status do pedido" on public.orders;
create policy "equipe altera o status do pedido"
  on public.orders for update
  using (public.eh_da_equipe())
  with check (public.eh_da_equipe());

-- O estoque da gestão passou a ser a tabela products; a tabela separada, criada vazia, sai (se tiver item, para antes)
do $$
begin
  if exists (select 1 from public.gestao_estoque) then
    raise exception 'gestao_estoque tem itens: passe para products antes de apagar';
  end if;
end;
$$;

drop table if exists public.gestao_estoque;
