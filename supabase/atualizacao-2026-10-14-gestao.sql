-- Atualização do banco da loja (Site Tenda), 14/10/2026: a gestão passa a usar o mesmo banco e o mesmo login da loja.
-- Rodar uma vez no SQL Editor, depois de atualizacao-2026-10-14-usuarios.sql. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- As tabelas da gestão (gestao_estoque, gestao_vendas, gestao_pedidos) são criadas pelo supabase/schema.sql do repositório Tenda-Ervas.

-- Dono da loja: só ele escolhe quem acessa a gestão, e ninguém retira o acesso de administrador dele
alter table public.admin add column if not exists dono boolean not null default false;
update public.admin set dono = true where email = 'tendaervas@gmail.com';

drop policy if exists "administrador retira administrador" on public.admin;
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

-- Quem acessa a gestão (sistematenda.netlify.app), escolhido pelo dono no painel Admin da loja
create table if not exists public.equipe (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text,
  created_at timestamptz not null default now()
);

alter table public.equipe enable row level security;
revoke all on public.equipe from anon;

drop policy if exists "administrador vê a equipe da gestão" on public.equipe;
create policy "administrador vê a equipe da gestão"
  on public.equipe for select
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists "dono libera a gestão" on public.equipe;
create policy "dono libera a gestão"
  on public.equipe for insert
  with check (public.eh_dono());

drop policy if exists "dono retira a gestão" on public.equipe;
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

-- O dono já entra na gestão
insert into public.equipe (user_id)
select user_id from public.admin where dono
on conflict (user_id) do nothing;
