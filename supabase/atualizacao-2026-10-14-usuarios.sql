-- Atualização do banco da loja (Site Tenda), 14/10/2026: o painel administrativo lista os administradores e libera ou retira o acesso.
-- Rodar uma vez no SQL Editor. Projeto novo não precisa: o schema.sql já traz estas mudanças.
-- O login novo é criado pela Edge Function criar-usuario (supabase/functions/criar-usuario), que usa a chave de serviço.

drop policy if exists "administrador vê os administradores" on public.admin;
create policy "administrador vê os administradores"
  on public.admin for select
  using (public.is_admin());

drop policy if exists "administrador libera administrador" on public.admin;
create policy "administrador libera administrador"
  on public.admin for insert
  with check (public.is_admin());

-- Ninguém retira o próprio acesso, para a loja nunca ficar sem administrador
drop policy if exists "administrador retira administrador" on public.admin;
create policy "administrador retira administrador"
  on public.admin for delete
  using (public.is_admin() and user_id <> auth.uid());
