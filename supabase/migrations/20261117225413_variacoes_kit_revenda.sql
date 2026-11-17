alter table public.products add column kit_variacoes jsonb not null default '[]'::jsonb;

create function public.validar_variacoes_kit()
returns trigger language plpgsql set search_path = '' as $$
declare v jsonb;
begin
 if jsonb_typeof(new.kit_variacoes) is distinct from 'array' then raise exception 'Variações inválidas'; end if;
 if jsonb_array_length(new.kit_variacoes)=0 then return new; end if;
 if new.category is distinct from 'Kits' or jsonb_array_length(new.kit_variacoes)>50 then
  raise exception 'Variações de quantidade são exclusivas de kits';
 end if;
 for v in select value from jsonb_array_elements(new.kit_variacoes) loop
  if jsonb_typeof(v) is distinct from 'object'
    or jsonb_typeof(v->'nome') is distinct from 'string'
    or length(btrim(v->>'nome')) not between 1 and 100
    or v->>'nome' <> btrim(v->>'nome')
    or jsonb_typeof(v->'quantidade') is distinct from 'number'
    or coalesce(v->>'quantidade','') !~ '^[1-9][0-9]{0,2}$'
    or jsonb_typeof(v->'preco') is distinct from 'number'
    or (v->>'preco')::numeric <= 0 or (v->>'preco')::numeric >= 100000000
    or round((v->>'preco')::numeric,2) <> (v->>'preco')::numeric then
      raise exception 'Cada variação precisa de nome, quantidade inteira de 1 a 999 e preço positivo em reais';
  end if;
 end loop;
 if (select count(distinct opcao.value->>'nome') from jsonb_array_elements(new.kit_variacoes) opcao) <> jsonb_array_length(new.kit_variacoes) then
  raise exception 'Os nomes das variações devem ser diferentes';
 end if;
 return new;
end $$;
create trigger validar_variacoes_kit before insert or update of kit_variacoes,category on public.products
for each row execute function public.validar_variacoes_kit();

create function public.variacao_kit(p_produto public.products, p_opcao text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v jsonb;
begin
 if p_produto.category <> 'Kits' or jsonb_array_length(p_produto.kit_variacoes)=0 then return null; end if;
 select value into v from jsonb_array_elements(p_produto.kit_variacoes) where value->>'nome'=p_opcao;
 if v is null then raise exception 'Escolha uma quantidade válida para %',p_produto.name; end if;
 return v;
end $$;

CREATE OR REPLACE FUNCTION public.criar_pedido(p_itens jsonb, p_forma_pagamento text, p_entrega text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cliente public.users%rowtype; v_item jsonb; v_prod public.products%rowtype; v_opcao text; v_q integer;
 v_total numeric(10,2):=0; v_desc text[]:='{}'; v_items jsonb:='[]'; v_id bigint; v_r record; v_com jsonb; v_variacao jsonb; v_multiplicador integer; v_preco numeric; v_estoque jsonb;
begin
 select * into v_cliente from public.users where id=auth.uid();
 if not found then raise exception 'Entre na sua conta para finalizar o pedido'; end if;
 if p_forma_pagamento <> 'PIX' or p_entrega not in ('Correios','Retirada') then raise exception 'Pagamento ou entrega inválido'; end if;
 if p_itens is null or jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'Carrinho vazio'; end if;
 for v_item in select value from jsonb_array_elements(p_itens) order by (value->>'id')::bigint loop
  if coalesce(v_item->>'id','') !~ '^[0-9]+$' or coalesce(v_item->>'quantidade','') !~ '^[0-9]+$' or (v_item->>'quantidade')::integer<1 then raise exception 'Item inválido'; end if;
  select * into v_prod from public.products where id=(v_item->>'id')::bigint for update;
  if not found then raise exception 'Produto não encontrado'; end if;
  if not v_prod.ativo then raise exception 'O produto % foi desativado e não pode ser comprado',v_prod.name; end if;
  v_q=(v_item->>'quantidade')::integer;
  v_opcao=nullif(trim(v_item->>'opcao'),'');
  v_variacao := public.variacao_kit(v_prod,v_opcao);
  v_multiplicador := coalesce((v_variacao->>'quantidade')::integer,1);
  v_preco := coalesce((v_variacao->>'preco')::numeric,public.preco_atual(v_prod));
  if v_variacao is not null then null;
  elsif v_prod.color_stock <> '{}'::jsonb and v_prod.category <> 'Kits' then
    if v_opcao is null or not (v_prod.color_stock ? v_opcao) then raise exception 'Escolha uma cor válida para %',v_prod.name; end if;
  elsif jsonb_array_length(v_prod.options)=0 then v_opcao=null;
  elsif v_opcao is null or (v_opcao<>'Aleatório' and not exists(select 1 from jsonb_array_elements(v_prod.options) o where o->>'nome'=v_opcao)) then
   raise exception 'Escolha uma opção válida para %',v_prod.name;
  end if;
  if v_prod.adult and (v_cliente.birth_date is null or v_cliente.birth_date>current_date-interval '18 years') then raise exception 'Somente maiores de 18 anos podem comprar %',v_prod.name; end if;
  if v_prod.category='Kits' and jsonb_array_length(v_prod.kit_itens)=0 then raise exception 'O kit % ainda não possui composição; entre em contato com a loja',v_prod.name; end if;
  if v_prod.category='Kits' then
   for v_com in select value from jsonb_array_elements(v_prod.kit_itens) loop
    if exists (select 1 from public.products p where id=(v_com->>'id')::bigint and p.adult) and
     (v_cliente.birth_date is null or v_cliente.birth_date>current_date-interval '18 years') then
      raise exception 'O kit % contém item somente para maiores de 18 anos',v_prod.name;
    end if;
   end loop;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','quantidade',(c->>'quantidade')::integer*v_multiplicador)),'[]'::jsonb)
    into v_estoque from jsonb_array_elements(case when v_prod.category='Kits' then v_prod.kit_itens
      else jsonb_build_array(jsonb_build_object('id',v_prod.id,'quantidade',1)) end) c;
  v_total=v_total+v_preco*v_q;
  v_desc=v_desc||(v_q||'x '||v_prod.name||coalesce(' ('||v_opcao||')',''));
  v_items=v_items||jsonb_build_object('id',v_prod.id,'nome',v_prod.name,'opcao',v_opcao,'quantidade',v_q,'preco',v_preco,'multiplicador_kit',v_multiplicador,'estoque_itens',v_estoque);
 end loop;
 -- Produtos repetidos no carrinho e componentes compartilhados por kits são somados antes do bloqueio de estoque.
 for v_r in
  select (c->>'id')::bigint id,sum((i->>'quantidade')::integer*(c->>'quantidade')::integer)::integer qtd
  from jsonb_array_elements(v_items) i cross join lateral jsonb_array_elements(i->'estoque_itens') c
  group by 1 order by 1
 loop
  select * into v_prod from public.products where id=v_r.id for update;
  if not found then raise exception 'Componente do kit não encontrado'; end if;
  if not v_prod.ativo then raise exception 'O componente % foi desativado',v_prod.name; end if;
  if v_prod.quantity<v_r.qtd then raise exception 'Estoque insuficiente de %: precisa de %, disponível %',v_prod.name,v_r.qtd,v_prod.quantity; end if;
  update public.products set quantity=quantity-v_r.qtd,atualizado_em=now() where id=v_r.id;
 end loop;
 for v_item in select value from jsonb_array_elements(v_items) loop
    select * into v_prod from public.products where id=(v_item->>'id')::bigint for update;
    v_opcao=nullif(trim(v_item->>'opcao'),'');
    if v_prod.color_stock <> '{}'::jsonb and v_prod.category <> 'Kits' then
      v_q=(v_item->>'quantidade')::integer;
      if v_opcao is null or not (v_prod.color_stock ? v_opcao) then raise exception 'Cor indisponível para %',v_prod.name; end if;
      if jsonb_typeof(v_prod.color_stock->v_opcao) <> 'number' then raise exception 'Quantidade por cor inválida'; end if;
      if (v_prod.color_stock->>v_opcao)::integer < v_q then raise exception 'Estoque insuficiente para % cor %',v_prod.name,v_opcao; end if;
      update public.products set color_stock=jsonb_set(color_stock,array[v_opcao],to_jsonb((color_stock->>v_opcao)::integer-v_q),false) where id=v_prod.id;
    end if;
  end loop;
 insert into public.orders(user_id,customer_name,payment_method,delivery_method,description,items,total_price)
 values(v_cliente.id,v_cliente.full_name,p_forma_pagamento,p_entrega,array_to_string(v_desc,', '),v_items,v_total) returning id into v_id;
 return v_id;
end; $function$;


create or replace function public.devolver_estoque_pedido_cancelado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
 if old.status='pedido cancelado' and new.status<>old.status then raise exception 'Pedido cancelado não pode mudar de status'; end if;
 if new.status<>'pedido cancelado' or old.status='pedido cancelado' then return new; end if;
 for r in
  select (c->>'id')::bigint id,sum((i->>'quantidade')::integer*(c->>'quantidade')::integer)::integer qtd
  from jsonb_array_elements(old.items) i
  left join public.products p on p.id=(i->>'id')::bigint
  cross join lateral jsonb_array_elements(coalesce(i->'estoque_itens',
    case when p.category='Kits' and jsonb_array_length(p.kit_itens)>0 then p.kit_itens
      else jsonb_build_array(jsonb_build_object('id',i->>'id','quantidade',1)) end)) c
  group by 1 order by 1
 loop
  update public.products set quantity=quantity+r.qtd,atualizado_em=now() where id=r.id;
 end loop;
 for r in
  select (i->>'id')::bigint id,i->>'opcao' cor,sum((i->>'quantidade')::integer)::integer qtd
  from jsonb_array_elements(old.items) i
  where nullif(i->>'opcao','') is not null group by 1,2
 loop
  update public.products set color_stock=jsonb_set(color_stock,array[r.cor],to_jsonb((color_stock->>r.cor)::integer+r.qtd),false)
   where id=r.id and category<>'Kits' and color_stock ? r.cor;
 end loop;
 return new;
end $$;

CREATE OR REPLACE FUNCTION public.cancelar_pedido(p_pedido bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_pedido public.orders%rowtype; v_r record;
begin
 select * into v_pedido from public.orders where id=p_pedido and user_id=auth.uid() and status='aguardando pagamento' for update;
 if not found then raise exception 'Só dá para cancelar pedido que ainda aguarda pagamento'; end if;
 update public.orders set status='pedido cancelado' where id=p_pedido;
end; $function$;


update public.products set kit_variacoes='[
 {"nome":"1","quantidade":1,"preco":145},
 {"nome":"5","quantidade":5,"preco":725},
 {"nome":"10","quantidade":10,"preco":1450}
]'::jsonb where id=291 and name='Kit Revendedor' and category='Kits';

create function public.criar_kit_com_variacoes(
 p_nome text,p_descricao text,p_preco numeric,p_quantidade integer,p_estoque_minimo integer,p_itens jsonb,p_fotos text[],p_variacoes jsonb
) returns bigint language plpgsql set search_path='' as $$
declare v_id bigint;
begin
 v_id:=public.criar_kit_com_fotos(p_nome,p_descricao,p_preco,p_quantidade,p_estoque_minimo,p_itens,p_fotos);
 update public.products set kit_variacoes=p_variacoes where id=v_id;
 return v_id;
end $$;
revoke all on function public.criar_kit_com_variacoes(text,text,numeric,integer,integer,jsonb,text[],jsonb) from public,anon;
grant execute on function public.criar_kit_com_variacoes(text,text,numeric,integer,integer,jsonb,text[],jsonb) to authenticated;

create function public.editar_kit_com_variacoes(
 p_kit bigint,p_nome text,p_descricao text,p_preco numeric,p_estoque_minimo integer,p_itens jsonb,
 p_ativo boolean,p_preco_promocional numeric,p_promocao_ate date,p_fotos text[],p_variacoes jsonb
) returns void language plpgsql set search_path='' as $$
begin
 perform public.editar_kit_com_fotos(p_kit,p_nome,p_descricao,p_preco,p_estoque_minimo,p_itens,p_ativo,p_preco_promocional,p_promocao_ate,p_fotos);
 update public.products set kit_variacoes=p_variacoes where id=p_kit;
end $$;
revoke all on function public.editar_kit_com_variacoes(bigint,text,text,numeric,integer,jsonb,boolean,numeric,date,text[],jsonb) from public,anon;
grant execute on function public.editar_kit_com_variacoes(bigint,text,text,numeric,integer,jsonb,boolean,numeric,date,text[],jsonb) to authenticated;

update public.cotacoes_frete_correios set expira_em=now()
where pedido_id is null and exists(select 1 from jsonb_array_elements(itens) i where i->>'id'='291');
