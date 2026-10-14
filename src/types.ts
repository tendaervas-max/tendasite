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
  preco_promocional?: number | null;
  promocao_ate?: string | null;
  precoOriginal?: number;
}

export interface CartItem extends Product {
  cartQuantity: number;
  opcao?: string;
}
