export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface CartItem extends Product {
  cartQuantity: number;
}
