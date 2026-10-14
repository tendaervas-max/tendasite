// Dados da loja usados no rodapé, nas páginas de políticas e no pagamento
export const LOJA = {
  nome: "Tenda Ervas",
  razaoSocial: "",
  cnpj: "63.097.835/0001-21",
  endereco: "",
  cidade: "São Paulo, SP",
  email: "tendaervas@gmail.com",
  whatsapp: "5511995877633",
  whatsappExibicao: "(11) 99587-7633",
  whatsappOutroExibicao: "(11) 99865-3889",
  instagram: "tendaervas",
  chavePix: "63.097.835/0001-21",
  favorecidoPix: "",
  localRetirada: "Guarulhos, SP",
  urlGestao: "https://sistematenda.pages.dev"
};

// Método que formata o valor em reais no padrão brasileiro (R$ 48,93)
export const reais = (valor: number) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Método que monta o link do WhatsApp da loja com uma mensagem pronta
export const linkWhatsApp = (mensagem: string) =>
  `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(mensagem)}`;

// Nomes dos status do pedido como aparecem para o cliente e no painel
export const STATUS_PEDIDO: { [status: string]: string } = {
  "aguardando pagamento": "Aguardando pagamento",
  "pagamento confirmado": "Pagamento confirmado",
  "pedido sendo separado": "Separando",
  "pronto para retirada": "Pronto para retirada",
  "pedido enviado para entrega": "Enviado",
  "pedido entregue": "Entregue",
  "pedido cancelado": "Cancelado"
};

// Método que monta a mensagem do WhatsApp com o resumo do pedido
export const mensagemPedido = (pedido: { id: number, description: string, total_price: number, delivery_method: string }) =>
  `Olá! Fiz o pedido #${pedido.id} no site: ${pedido.description}. Total dos produtos: ${reais(pedido.total_price)}. ` +
  (pedido.delivery_method === "Retirada"
    ? "Vou retirar. Segue o comprovante do PIX."
    : "Envio pelos Correios: pode me passar o valor do frete?");

// Método que monta a mensagem do WhatsApp para combinar a entrega do pedido
export const mensagemEntrega = (pedido: { id: number, delivery_method: string }) =>
  `Olá! Fiz o pedido #${pedido.id} no site. Podemos combinar a ${pedido.delivery_method === "Retirada" ? "retirada" : "entrega"}?`;

// Ordem das abas de categoria na vitrine
export const CATEGORIAS = [
  "Ervas", "Incensos", "Porta Incenso", "Defumadores", "Colares e Pulseiras", "HeadShop",
  "Fumo", "Potes de Vidro", "Bags e Bolsas", "Enfeites e Decoração", "Acessórios", "Kits"
];

// Método que diz se a pessoa tem 18 anos ou mais pela data de nascimento (aaaa-mm-dd)
export const maiorDeIdade = (nascimento?: string | null) => {
  if (!nascimento) return false;
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 18);
  return new Date(`${nascimento}T00:00:00`) <= limite;
};

// Método que confere os dois dígitos verificadores do CPF (aceita com ou sem pontuação)
export const cpfValido = (cpf: string) => {
  const digitos = cpf.replace(/\D/g, "");
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  return [9, 10].every(posicao => {
    const soma = digitos.slice(0, posicao).split("").reduce((total, d, i) => total + Number(d) * (posicao + 1 - i), 0);
    return (soma * 10) % 11 % 10 === Number(digitos[posicao]);
  });
};

// Método que formata o CPF enquanto o cliente digita (000.000.000-00)
export const formatarCpf = (valor: string) =>
  valor.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");

// Método que aplica a promoção que está no prazo (data de São Paulo): price vira o promocional e precoOriginal guarda o normal
export const comPromocao = <T extends { price: number, preco_promocional?: number | null, promocao_ate?: string | null }>(produto: T): T & { precoOriginal?: number } => {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const ativa = produto.preco_promocional != null && (!produto.promocao_ate || produto.promocao_ate >= hoje);
  return ativa ? { ...produto, price: Number(produto.preco_promocional), precoOriginal: Number(produto.price) } : produto;
};

// Método que monta a chave do item no carrinho (o mesmo produto em cores diferentes vira itens separados)
export const chaveCarrinho = (id: number, opcao?: string) => `${id}|${opcao || ""}`;
