// Serviço de e-mails da loja: avisa a loja de pedido novo e acompanha o cliente a cada mudança de status.
// É chamado pelo gatilho ao_criar_ou_mudar_pedido (supabase/avisos-email.sql) só com o número do pedido;
// lê o pedido no banco e envia uma vez por status (coluna ultimo_aviso), então chamar de novo não duplica e-mail.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const GMAIL_USUARIO = Deno.env.get("GMAIL_USUARIO") ?? "";
const GMAIL_SENHA_APP = Deno.env.get("GMAIL_SENHA_APP") ?? "";
const EMAIL_LOJA = Deno.env.get("EMAIL_LOJA") || GMAIL_USUARIO;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const CHAVE_PIX = Deno.env.get("CHAVE_PIX") ?? "";
const WHATSAPP_LOJA = Deno.env.get("WHATSAPP_LOJA") ?? "";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Pedido = {
  id: number;
  status: string;
  ultimo_aviso: string | null;
  customer_name: string;
  delivery_method: string;
  description: string;
  total_price: number;
  users: { email: string; phone: string | null; cpf: string | null; address: string | null; cep: string | null; number: string | null } | null;
};

type Email = { para: string; assunto: string; texto: string };

// Método que monta a resposta em JSON da função
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

// Método que formata o valor em reais
const reais = (valor: number) => `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;

// Método que monta o link do WhatsApp da loja com uma mensagem pronta
const whatsapp = (mensagem: string) => WHATSAPP_LOJA ? `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}` : "";

// Método que monta os e-mails do pedido novo: um para a loja e um para o cliente
const emailsPedidoNovo = (p: Pedido): Email[] => {
  const cliente = p.users;
  const emails: Email[] = [{
    para: EMAIL_LOJA,
    assunto: `Novo pedido #${p.id} - ${reais(p.total_price)} - ${p.delivery_method}`,
    texto: [
      `Pedido #${p.id} recebido no site, aguardando pagamento.`,
      ``,
      `Itens: ${p.description}`,
      `Total dos produtos: ${reais(p.total_price)}`,
      `Entrega: ${p.delivery_method}`,
      ``,
      `Cliente: ${p.customer_name}`,
      `WhatsApp: ${cliente?.phone ?? "-"}`,
      `E-mail: ${cliente?.email ?? "-"}`,
      `CPF: ${cliente?.cpf ?? "-"}`,
      `Endereço: ${cliente?.address ?? "-"} - CEP ${cliente?.cep ?? "-"}`,
      ``,
      SITE_URL ? `Painel: ${SITE_URL}/admin` : ``,
    ].join("\n"),
  }];

  if (cliente?.email) {
    const mensagem = `Olá! Fiz o pedido #${p.id} no site: ${p.description}. Total dos produtos: ${reais(p.total_price)}. ` +
      (p.delivery_method === "Retirada" ? "Vou retirar. Segue o comprovante do PIX." : "Envio pelos Correios: pode me passar o valor do frete?");
    emails.push({
      para: cliente.email,
      assunto: `Recebemos seu pedido #${p.id}`,
      texto: [
        `Olá, ${p.customer_name}!`,
        ``,
        `Recebemos seu pedido #${p.id}: ${p.description}.`,
        `Total dos produtos: ${reais(p.total_price)}.`,
        ``,
        p.delivery_method === "Retirada"
          ? `Pague o total pelo PIX e mande o comprovante pelo WhatsApp. Combinamos a retirada por lá.`
          : `Mande o pedido pelo WhatsApp para calcularmos o frete dos Correios. Depois é só pagar pelo PIX os produtos mais o frete.`,
        CHAVE_PIX ? `Chave PIX: ${CHAVE_PIX}` : ``,
        whatsapp(mensagem) ? `WhatsApp: ${whatsapp(mensagem)}` : ``,
        ``,
        SITE_URL ? `Acompanhe em ${SITE_URL}/meus-pedidos` : ``,
        ``,
        `Tenda Ervas`,
      ].join("\n"),
    });
  }

  return emails;
};

// Método que monta o e-mail para o cliente quando o status muda; status sem aviso devolvem null
const emailMudancaStatus = (p: Pedido): Email | null => {
  if (!p.users?.email) return null;
  const textos: { [status: string]: string } = {
    "pagamento confirmado": "Recebemos seu pagamento. Agora vamos separar seu pedido.",
    "pronto para retirada": "Seu pedido está pronto para retirada. Combine o dia e o horário pelo WhatsApp.",
    "pedido enviado para entrega": "Seu pedido foi enviado pelos Correios. Quando chegar, confirme em Meus pedidos.",
    "pedido cancelado": "Seu pedido foi cancelado. Se tiver dúvida, fale com a gente pelo WhatsApp.",
  };
  const texto = textos[p.status];
  if (!texto) return null;
  return {
    para: p.users.email,
    assunto: `Pedido #${p.id}: ${p.status}`,
    texto: [
      `Olá, ${p.customer_name}!`,
      ``,
      texto,
      ``,
      `Itens: ${p.description}`,
      SITE_URL ? `Acompanhe em ${SITE_URL}/meus-pedidos` : ``,
      whatsapp(`Olá! Tenho uma dúvida sobre o pedido #${p.id}.`) ? `WhatsApp: ${whatsapp(`Olá! Tenho uma dúvida sobre o pedido #${p.id}.`)}` : ``,
      ``,
      `Tenda Ervas`,
    ].join("\n"),
  };
};

// Método que envia os e-mails pelo Gmail da loja (porta 465; a 587 é bloqueada nas Edge Functions)
const enviar = async (emails: Email[]) => {
  const cliente = new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: GMAIL_USUARIO, password: GMAIL_SENHA_APP } },
  });
  try {
    for (const email of emails) {
      await cliente.send({ from: `Tenda Ervas <${GMAIL_USUARIO}>`, to: email.para, subject: email.assunto, content: email.texto });
    }
  } finally {
    await cliente.close();
  }
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return responder(405, { erro: "Use POST" });
  if (!GMAIL_USUARIO || !GMAIL_SENHA_APP) return responder(500, { erro: "Configure GMAIL_USUARIO e GMAIL_SENHA_APP nos secrets da função" });

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!Number.isInteger(id)) return responder(400, { erro: "Informe o id do pedido" });

  const { data: pedido, error } = await supabase
    .from("orders")
    .select("id, status, ultimo_aviso, customer_name, delivery_method, description, total_price, users(email, phone, cpf, address, cep, number)")
    .eq("id", id)
    .maybeSingle<Pedido>();
  if (error) return responder(500, { erro: error.message });
  if (!pedido) return responder(404, { erro: "Pedido não encontrado" });
  if (pedido.ultimo_aviso === pedido.status) return responder(200, { enviado: false, motivo: "status já avisado" });

  // Marca o status como avisado antes de enviar, para duas chamadas ao mesmo tempo não mandarem o e-mail duas vezes
  const filtro = pedido.ultimo_aviso === null ? "ultimo_aviso.is.null" : `ultimo_aviso.eq."${pedido.ultimo_aviso}"`;
  const { data: marcado, error: erroMarca } = await supabase
    .from("orders")
    .update({ ultimo_aviso: pedido.status })
    .eq("id", id)
    .eq("status", pedido.status)
    .or(filtro)
    .select("id");
  if (erroMarca) return responder(500, { erro: erroMarca.message });
  if (!marcado?.length) return responder(200, { enviado: false, motivo: "outra chamada já está avisando" });

  const emails = pedido.ultimo_aviso === null ? emailsPedidoNovo(pedido) : [emailMudancaStatus(pedido)].filter((e): e is Email => e !== null);
  if (emails.length === 0) return responder(200, { enviado: false, motivo: "status sem aviso por e-mail" });

  try {
    await enviar(emails);
  } catch (erro) {
    // Volta a marca para o aviso poder ser enviado de novo na próxima mudança ou chamada
    await supabase.from("orders").update({ ultimo_aviso: pedido.ultimo_aviso }).eq("id", id);
    console.error("Falha ao enviar e-mail do pedido", id, erro);
    return responder(502, { erro: "Falha ao enviar e-mail" });
  }

  return responder(200, { enviado: true, para: emails.map((e) => e.para) });
});
