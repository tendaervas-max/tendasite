-- Gatilho que chama o serviço de e-mails (Edge Function avisos-pedido) quando um pedido é criado ou muda de status.
-- Rodar no SQL Editor do Site Tenda depois de publicar a função supabase/functions/avisos-pedido.
-- A chamada vai só com o número do pedido; a função lê o pedido no banco e não repete aviso do mesmo status.

create extension if not exists pg_net with schema extensions;

-- Função que chama o serviço de e-mails com o número do pedido
create or replace function public.avisar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://hbkywvztwhdccznwuuex.supabase.co/functions/v1/avisos-pedido',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_ou_mudar_pedido on public.orders;
create trigger ao_criar_ou_mudar_pedido
  after insert or update of status on public.orders
  for each row execute function public.avisar_pedido();
