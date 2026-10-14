-- Atualização do banco da loja (Site Tenda), 14/10/2026: cadastro para todo login, nome e e-mail na tabela admin e CPF conferido.
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- A senha não é copiada para estas tabelas: ela fica só no Supabase Auth (auth.users, coluna encrypted_password), criptografada.

-- Cadastro para os logins criados antes do gatilho ao_criar_usuario (como o do admin)
insert into public.users (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.users c where c.id = u.id);

update public.users set full_name = 'Tenda Ervas' where email = 'tendaervas@gmail.com' and full_name = '';

-- Nome e e-mail do administrador na própria tabela admin
alter table public.admin add column if not exists email text;
alter table public.admin add column if not exists nome text;

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

-- Preenche os administradores que já existem
update public.admin a
  set email = u.email, nome = nullif(c.full_name, '')
  from auth.users u
  left join public.users c on c.id = u.id
  where u.id = a.user_id;

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
