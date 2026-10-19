import type { CartItem } from '../types';

const CHAVE = 'tendaervas:carrinho:v1';
const MAX_ITENS = 100;
const MAX_QUANTIDADE = 1000;

// O carrinho só salva informações públicas dos produtos. Nunca guarda sessão, CPF ou dados de pagamento.
// O servidor sempre reconfirma preço, estoque e disponibilidade quando o pedido é criado.
export function carregarCarrinho(): CartItem[] {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const itens: CartItem[] = [];
    const chaves = new Set<string>();
    for (const obj of parsed.slice(0, MAX_ITENS)) {
      if (!obj || typeof obj !== 'object') continue;
      const p = obj as Record<string, unknown>;
      const id = Number(p.id);
      const qtd = Number(p.cartQuantity);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(qtd) || qtd < 1 || qtd > MAX_QUANTIDADE ||
          typeof p.name !== 'string' || p.name.length > 300 ||
          typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0 ||
          typeof p.quantity !== 'number' || !Number.isFinite(p.quantity)) continue;
      const opcao = typeof p.opcao === 'string' && p.opcao.length <= 200 ? p.opcao : undefined;
      const key = JSON.stringify([id, opcao || '']);
      if (chaves.has(key)) continue;
      chaves.add(key);
      itens.push({
        id, name: p.name, price: p.price, quantity: p.quantity, cartQuantity: qtd, opcao,
        description: typeof p.description === 'string' ? p.description.slice(0, 3000) : '',
        image_url: typeof p.image_url === 'string' ? p.image_url : null,
        category: typeof p.category === 'string' ? p.category : '',
        options: Array.isArray(p.options) ? p.options.filter((v: unknown) =>
          !!v && typeof v === 'object' && typeof (v as {nome?: unknown}).nome === 'string'
        ).slice(0, 100) : [],
        adult: p.adult === true,
        preco_promocional: typeof p.preco_promocional === 'number' ? p.preco_promocional : null,
        promocao_ate: typeof p.promocao_ate === 'string' ? p.promocao_ate : null
      });
    }
    return itens;
  } catch {
    return []; // armazenamento desabilitado, privado ou JSON inválido
  }
}

export function salvarCarrinho(itens: CartItem[]): void {
  try {
    if (itens.length === 0) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, JSON.stringify(itens.slice(0, MAX_ITENS)));
  } catch {
    // O site continua utilizável quando o navegador não permite salvar dados locais.
  }
}
