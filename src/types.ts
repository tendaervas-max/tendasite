export interface OpcaoProduto {
  nome: string;
  imagem?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image_url: string | null;
  category: string;
  options: OpcaoProduto[];
  adult: boolean;
}

export interface CartItem extends Product {
  cartQuantity: number;
  opcao?: string;
}
