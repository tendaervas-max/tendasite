-- Ajuste do banco antigo da loja (projeto Site Tenda), para rodar antes do schema.sql.
-- Em 14/10/2026 o banco antigo tinha products e orders vazios, admin com 2 logins antigos
-- e a tabela users com a senha dos clientes sem criptografia.
--
-- Move as tabelas da versão antiga para o esquema backup, sem apagar nada.
-- O site não enxerga o esquema backup; o conteúdo continua visível no Table Editor (esquema backup).
-- Depois rode o schema.sql.

create schema if not exists backup;
revoke all on schema backup from anon, authenticated;

alter table if exists public.admin set schema backup;
alter table if exists public.users set schema backup;
alter table if exists public.orders set schema backup;
alter table if exists public.products set schema backup;
