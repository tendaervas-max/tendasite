-- Volta o Cajueiro, erva do catálogo do Canva que foi excluída de produção, com os dados do cadastro original (produtos-catalogo.sql).
insert into public.products (name, description, price, quantity, image_url)
select 'Cajueiro', 'Pacote de 20g.', 6.99, 10, '/produtos/cajueiro.jpg'
where not exists (select 1 from public.products where name = 'Cajueiro');
