-- Atualização do banco da loja (Site Tenda), 14/10/2026: produtos e kits escolhidos na venda da gestão.
-- Rodar uma vez no SQL Editor, depois de atualizacao-2026-10-14-cadastros.sql. Projeto novo não precisa: o schema.sql da gestão já traz estas colunas.

-- Itens da venda (produto, opção, quantidade e preço do dia) e o total
alter table public.gestao_vendas add column if not exists itens jsonb not null default '[]';
alter table public.gestao_vendas add column if not exists total numeric(10, 2) not null default 0;
