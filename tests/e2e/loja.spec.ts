import {test,expect} from '@playwright/test';

const itens = [
 {id:1,name:'Alecrim',description:'Pacote de 20 g',price:6.99,quantity:4,image_url:null,category:'Ervas',options:[],adult:false,ativo:true,kit_itens:[]},
 {id:2,name:'Camomila',description:'Pacote de 20 g',price:7.13,quantity:0,image_url:null,category:'Ervas',options:[],adult:false,ativo:true,kit_itens:[]},
 {id:3,name:'Incenso Satya',description:'Aromas disponíveis',price:12,quantity:3,image_url:null,category:'Incensos',options:[{nome:'Lavanda'},{nome:'Rosas'}],adult:false,ativo:true,kit_itens:[]},
 {id:4,name:'Kit Demonstração',description:'Batedor e Alecrim',price:35,quantity:0,image_url:null,category:'Kits',options:[],adult:false,ativo:true,kit_itens:[{id:1,quantidade:1},{id:5,quantidade:1}]},
 {id:5,name:'Batedor de carvão',description:'Acessório',price:9,quantity:2,image_url:null,category:'Acessórios',options:[],adult:false,ativo:true,kit_itens:[]}
];

test.beforeEach(async ({page})=>{
 await page.route('**/rest/v1/products**', route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify(itens),
  headers:{'content-range':'0-4/5'}
 }));
 await page.route('**/rest/v1/categorias**',route=>route.fulfill({
  status:200,contentType:'application/json',body:'[]'
 }));
 await page.goto('/produtos');
 await expect(page.getByRole('heading',{name:'Nossa Coleção'})).toBeVisible();
});

test('navega, pesquisa e limpa o filtro do catálogo',async ({page})=>{
 await expect(page.getByText('5 produtos encontrados')).toBeVisible();
 await page.getByRole('searchbox',{name:'Buscar produtos'}).fill('alecrim');
 await expect(page.getByText('2 produtos encontrados')).toBeVisible(); // Erva e kit cuja descrição menciona Alecrim
 await page.getByRole('searchbox',{name:'Buscar produtos'}).fill('produto inexistente');
 await expect(page.getByText('0 produtos encontrados')).toBeVisible();
 await page.getByRole('button',{name:'Limpar filtros'}).click();
 await expect(page.getByText('5 produtos encontrados')).toBeVisible();
 await page.screenshot({path:`test-results/catalogo-${test.info().project.name}.png`,fullPage:true});
});

test('filtra disponibilidade e ordena por preço',async ({page})=>{
 await page.getByRole('checkbox',{name:'Somente disponíveis'}).check();
 await expect(page.getByText('4 produtos encontrados')).toBeVisible();
 await page.getByLabel('Ordenar por').selectOption('maior-preco');
 await expect(page.getByRole('heading',{name:'Kit Demonstração'})).toBeVisible();
 await expect(page.getByText('Estoque: 2').first()).toBeVisible();
});

test('abre detalhes, seleciona variante e gerencia o carrinho',async ({page})=>{
 await page.getByRole('button',{name:'Escolher aroma'}).click();
 const dialog=page.getByRole('dialog',{name:'Detalhes de Incenso Satya'});
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Lavanda'}).click();
 await dialog.getByRole('button',{name:/Adicionar/}).click();
 await page.locator('a[href="/carrinho"]:visible').first().click();
 await expect(page.getByRole('heading',{name:'Seu Carrinho'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Incenso Satya'})).toBeVisible();
 await page.getByRole('button',{name:'Aumentar quantidade de Incenso Satya'}).click();
 await expect(page.getByText('2', {exact:true}).last()).toBeVisible();
 await page.getByRole('button',{name:'Remover Incenso Satya do carrinho'}).click();
 await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible();
});

test('cliente não autenticado é direcionado ao cadastro antes de pagar',async ({page})=>{
 await page.getByRole('button',{name:/Adicionar R\$/}).first().click();
 await page.locator('a[href="/carrinho"]:visible').first().click();
 await page.getByRole('button',{name:'Confirme seu pedido'}).click();
 await expect(page).toHaveURL(/\/checkout/);
});

test('layout mantém controles operáveis em dispositivos móveis',async ({page,isMobile})=>{
 if(!isMobile)return;
 await expect(page.getByRole('searchbox',{name:'Buscar produtos'})).toBeVisible();
 await expect(page.getByLabel('Ordenar por')).toBeVisible();
 const excedente=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(excedente).toBeLessThanOrEqual(2);
 await page.screenshot({path:`test-results/mobile-${test.info().project.name}.png`,fullPage:true});
});

test('modal de produto fecha com Escape e mantém foco acessível',async ({page})=>{
 await page.getByRole('button',{name:'Escolher aroma'}).click();
 const dialog=page.getByRole('dialog',{name:'Detalhes de Incenso Satya'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Fechar detalhes'})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
});

test('página inicial explica a loja e direciona ao catálogo',async ({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Tenda Ervas',level:1})).toBeVisible();
 await expect(page.getByText(/Ervas, incensos, acessórios e kits/)).toBeVisible();
 await expect(page.getByText('3. Combine a entrega')).toBeVisible();
 await page.getByRole('link',{name:/Explorar Produtos/}).click();
 await expect(page).toHaveURL(/\/produtos/);
 await expect(page.getByRole('heading',{name:'Nossa Coleção'})).toBeVisible();
});

test('falha na API mostra mensagem e botão para tentar novamente',async ({page})=>{
 await page.route('**/rest/v1/products**',route=>route.fulfill({
  status:503,contentType:'application/json',
  body:JSON.stringify({code:'PGRST999',message:'Serviço indisponível'})
 }));
 await page.reload();
 await expect(page.getByText('Não foi possível carregar os produtos. Verifique a conexão e tente novamente.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Tentar novamente'})).toBeVisible();
});

test('edição de caixas é restrita à equipe autenticada',async ({page})=>{
 await page.goto('/configurar-frete');
 await expect(page.getByRole('heading',{name:'Acesso restrito'})).toBeVisible();
 await expect(page.getByText('Somente a equipe da Tenda Ervas pode editar as medidas.')).toBeVisible();
});
