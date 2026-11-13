create table public.produtos_custos (
  produto_id bigint primary key references public.products(id) on delete cascade,
  custo_unitario numeric(14,4) check (custo_unitario >= 0 and custo_unitario < 'Infinity'::numeric)
);
alter table public.produtos_custos enable row level security;
revoke all on public.produtos_custos from public, anon, authenticated;
grant select, insert, update on public.produtos_custos to authenticated;

create policy "Loja consulta custos" on public.produtos_custos
for select to authenticated using ((select public.is_admin()) or (select public.eh_da_equipe()));

create policy "Loja cadastra custos" on public.produtos_custos
for insert to authenticated with check ((select public.is_admin()) or (select public.eh_da_equipe()));

create policy "Loja ajusta custos" on public.produtos_custos
for update to authenticated
using ((select public.is_admin()) or (select public.eh_da_equipe()))
with check ((select public.is_admin()) or (select public.eh_da_equipe()));
