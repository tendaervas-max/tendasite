alter table public.products
  add column peso_envio_g integer check (peso_envio_g between 1 and 30000),
  add column comprimento_envio_cm numeric(5,1) check (comprimento_envio_cm between 0.1 and 150),
  add column largura_envio_cm numeric(5,1) check (largura_envio_cm between 0.1 and 150),
  add column altura_envio_cm numeric(5,1) check (altura_envio_cm between 0.1 and 150);

alter table public.orders
  add column frete_servico text,
  add column frete_prazo_dias integer,
  add column frete_cep text,
  add column frete_endereco text;

create table public.cotacoes_frete_correios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references auth.users(id) on delete cascade,
  itens jsonb not null,
  cep text not null check (cep ~ '^[0-9]{8}$'),
  endereco text not null,
  servico text not null check (servico ~ '^[0-9]{5}$'),
  valor numeric(12,2) not null check (valor >= 0 and valor < 'Infinity'::numeric),
  prazo_dias integer not null check (prazo_dias >= 0),
  expira_em timestamptz not null default (now() + interval '15 minutes'),
  pedido_id bigint references public.orders(id) on delete cascade
);
alter table public.cotacoes_frete_correios enable row level security;
revoke all on public.cotacoes_frete_correios from public, anon, authenticated;
grant select, insert on public.cotacoes_frete_correios to service_role;

create function public.finalizar_pedido_com_frete(
  p_itens jsonb, p_cotacao uuid, p_pedido_anterior bigint default null
)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  cotacao public.cotacoes_frete_correios%rowtype;
  cliente public.users%rowtype;
  novo_id bigint;
begin
  select * into cotacao from public.cotacoes_frete_correios
    where id = p_cotacao and cliente_id = auth.uid() for update;
  if not found or cotacao.itens <> p_itens or p_itens is null then
    raise exception 'Cotação inválida para este carrinho';
  end if;
  if cotacao.pedido_id is not null then return cotacao.pedido_id; end if;
  select * into cliente from public.users where id = auth.uid() for share;
  if cotacao.expira_em <= now()
    or regexp_replace(cliente.cep, '[^0-9]', '', 'g') is distinct from cotacao.cep
    or cliente.address is distinct from cotacao.endereco then
    raise exception 'Cotação vencida ou endereço alterado. Consulte o frete novamente.';
  end if;
  if p_pedido_anterior is null then
    novo_id := public.criar_pedido(p_itens, 'PIX', 'Correios');
  else
    novo_id := public.refazer_pedido(p_pedido_anterior, p_itens, 'PIX', 'Correios');
  end if;
  update public.orders set frete_confirmado = cotacao.valor, frete_servico = cotacao.servico,
    frete_prazo_dias = cotacao.prazo_dias, frete_cep = cotacao.cep, frete_endereco = cotacao.endereco
  where id = novo_id;
  update public.cotacoes_frete_correios set pedido_id = novo_id where id = cotacao.id;
  return novo_id;
end $$;
revoke all on function public.finalizar_pedido_com_frete(jsonb, uuid, bigint) from public, anon, authenticated;
grant execute on function public.finalizar_pedido_com_frete(jsonb, uuid, bigint) to authenticated;

create function public.validar_itens_postagem()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.delivery_method = 'Correios' and exists (
    select 1 from jsonb_array_elements(new.items) item
    join public.products p on p.id = (item->>'id')::bigint
    where p.category = 'Fumo' or (
      p.category = 'Kits' and exists (
        select 1 from jsonb_array_elements(p.kit_itens) componente
        join public.products c on c.id = (componente->>'id')::bigint
        where c.category = 'Fumo'
      )
    )
  ) then
    raise exception 'Este carrinho contém produto indisponível para envio pelos Correios. Escolha retirada.';
  end if;
  return new;
end $$;
create trigger validar_itens_postagem before insert on public.orders
for each row execute function public.validar_itens_postagem();
