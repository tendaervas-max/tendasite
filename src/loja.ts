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
  localRetirada: "Guarulhos, SP"
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
