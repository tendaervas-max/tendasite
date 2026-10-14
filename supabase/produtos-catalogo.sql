-- Cadastro das 9 ervas do catálogo do Canva (14/10/2026): pacotes de 20g a R$ 6,99, com 10 de cada em estoque.
-- As fotos ficam no próprio site, em public/produtos. Uma erva que já existe com o mesmo nome não é cadastrada de novo.
insert into public.products (name, description, price, quantity, image_url)
select v.name, v.description, 6.99, 10, v.image_url
from (values
  ('Alecrim', 'Pacote de 20g. Limpeza.', '/produtos/alecrim.jpg'),
  ('Alfavaca', 'Pacote de 20g. Proteção.', '/produtos/alfavaca.jpg'),
  ('Anis Estrelado', 'Pacote de 20g. Energia.', '/produtos/anis-estrelado.jpg'),
  ('Arnica do Mato', 'Pacote de 20g. Descarrego.', '/produtos/arnica-do-mato.jpg'),
  ('Aroeira', 'Pacote de 20g. Limpeza.', '/produtos/aroeira.jpg'),
  ('Arruda', 'Pacote de 20g. Energia.', '/produtos/arruda.jpg'),
  ('Artemísia', 'Pacote de 20g. Limpeza e proteção.', '/produtos/artemisia.jpg'),
  ('Boldo', 'Pacote de 20g. Limpeza e energia.', '/produtos/boldo.jpg'),
  ('Cajueiro', 'Pacote de 20g.', '/produtos/cajueiro.jpg')
) as v(name, description, image_url)
where not exists (select 1 from public.products p where p.name = v.name);
