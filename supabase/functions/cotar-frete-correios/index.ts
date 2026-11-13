import { createClient } from "npm:@supabase/supabase-js@2.48.1";

// Cotação autenticada com os Correios. Credenciais armazenadas apenas em secrets do Supabase.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const cepValido = (value: unknown) => typeof value === "string" && /^\d{8}$/.test(value.replace(/\D/g, ""));
const decimal = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
const money = (text: unknown) => {
  if (typeof text === "number") return text;
  const s = String(text ?? "").trim();
  if (!s) return NaN;
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
};

async function tokenCorreios() {
  const delegated = Deno.env.get("CORREIOS_BEARER_TOKEN");
  if (delegated) return delegated;
  const usuario = Deno.env.get("CORREIOS_USUARIO");
  const codigo = Deno.env.get("CORREIOS_CODIGO_ACESSO");
  const contrato = Deno.env.get("CORREIOS_CONTRATO");
  const cartao = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");
  if (!usuario || !codigo || (!contrato && !cartao)) throw new Error("Credenciais contratuais dos Correios não configuradas");
  const dr = Deno.env.get("CORREIOS_DR");
  const regiao = dr && /^\d+$/.test(dr) ? { dr: Number(dr) } : {};
  const corpo = cartao ? { numero: cartao, ...(contrato ? { contrato } : {}), ...regiao } : { numero: contrato, ...regiao };
  const path = cartao ? "cartaopostagem" : "contrato";
  const resposta = await fetch("https://api.correios.com.br/token/v1/autentica/" + path, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(usuario + ":" + codigo), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(12000),
  });
  if (!resposta.ok) throw new Error("Falha de autenticação na API Token dos Correios (" + resposta.status + ")");
  const dados = await resposta.json();
  if (typeof dados.token !== "string" || !dados.token) throw new Error("A API Token não retornou um token válido");
  return dados.token as string;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });
  try {
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!bearer) return json(401, { erro: "Entre na sua conta para consultar o frete" });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: "Bearer " + bearer } },
      auth: { persistSession: false },
    });
    const { data: auth, error: authError } = await supabase.auth.getUser(bearer);
    if (authError || !auth.user) return json(401, { erro: "Sessão inválida" });

    const { data: cliente, error: clienteErro } = await supabase.from("users").select("cep,address").eq("id", auth.user.id).single();
    if (clienteErro || !cliente || !cepValido(cliente.cep)) return json(400, { erro: "Cadastre um CEP válido na sua conta" });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json(400, { erro: "Solicitação inválida" });

    const destino = String(cliente.cep).replace(/\D/g, "");
    const origem = (Deno.env.get("CORREIOS_CEP_ORIGEM") ?? "").replace(/\D/g, "");
    let peso = decimal(body.pesoGramas);
    let comprimento = decimal(body.comprimentoCm);
    let largura = decimal(body.larguraCm);
    let altura = decimal(body.alturaCm);
    const itens = body.itens;
    const checkout = itens !== undefined;
    if (checkout) {
      if (!cliente.address?.trim()) return json(400, { erro: "Cadastre seu endereço de entrega" });
      if (!Array.isArray(itens) || !itens.length || itens.length > 100 || itens.some(item =>
        !item || !Number.isSafeInteger(item.id) || item.id < 1 ||
        !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 100 ||
        (item.opcao != null && (typeof item.opcao !== "string" || item.opcao.length > 200)))) {
        return json(400, { erro: "Carrinho inválido para calcular o frete" });
      }
      const ids = [...new Set(itens.map(item => item.id))];
      const [produtos, caixas] = await Promise.all([
        supabase.from("products").select("id,category,kit_itens,peso_envio_g,comprimento_envio_cm,largura_envio_cm,altura_envio_cm").eq("ativo", true).in("id", ids),
        supabase.from("configuracao_frete_tenda").select("id,comprimento_cm,largura_cm,altura_cm,peso_embalagem_g")
          .eq("ativo", true).eq("exemplo", false).gt("peso_embalagem_g", 0).order("id")
      ]);
      if (produtos.error || caixas.error) return json(503, { erro: "Dados de envio indisponíveis. Tente novamente." });
      const catalogo = new Map((produtos.data || []).map(produto => [produto.id, produto]));
      const componentes = (produtos.data || []).flatMap(produto =>
        produto.category === "Kits" && Array.isArray(produto.kit_itens)
          ? produto.kit_itens.map(item => Number(item.id)) : []);
      const { data: fumos, error: erroComponentes } = componentes.length
        ? await supabase.from("products").select("id").in("id", [...new Set(componentes)]).eq("category", "Fumo")
        : { data: [], error: null };
      if (erroComponentes) return json(503, { erro: "Dados de envio indisponíveis. Tente novamente." });
      if (fumos?.length || (produtos.data || []).some(produto => produto.category === "Fumo")) {
        return json(422, { erro: "Este carrinho contém produto indisponível para envio pelos Correios. Escolha retirada.", somenteRetirada: true });
      }
      let pesoProdutos = 0;
      let baseMaior = 0;
      let baseMenor = 0;
      let pilha = 0;
      for (const item of itens) {
        const produto = catalogo.get(item.id);
        if (!produto?.peso_envio_g || !produto.comprimento_envio_cm || !produto.largura_envio_cm || !produto.altura_envio_cm) {
          return json(422, { erro: "Um ou mais produtos ainda precisam de peso e medidas de envio." });
        }
        const [maior, menor, espessura] = [produto.comprimento_envio_cm, produto.largura_envio_cm, produto.altura_envio_cm]
          .map(Number).sort((a, b) => b - a);
        pesoProdutos += produto.peso_envio_g * item.quantidade;
        baseMaior = Math.max(baseMaior, maior);
        baseMenor = Math.max(baseMenor, menor);
        pilha += espessura * item.quantidade;
      }
      const pacote = [baseMaior, baseMenor, Math.round(pilha * 10) / 10].sort((a, b) => b - a);
      const modelos = (caixas.data || []).map(caixa => ({
        ...caixa,
        medidas: [caixa.comprimento_cm, caixa.largura_cm, caixa.altura_cm].map(Number).sort((a, b) => b - a)
      }));
      const caixa = modelos.filter(c =>
        c.medidas.every((medida, i) => medida >= pacote[i]) && pesoProdutos + c.peso_embalagem_g <= 30000
      ).sort((a, b) =>
        a.comprimento_cm * a.largura_cm * a.altura_cm - b.comprimento_cm * b.largura_cm * b.altura_cm
      )[0];
      if (!caixa) return json(422, { erro: "O carrinho precisa de uma embalagem que a loja confira manualmente." });
      peso = pesoProdutos + caixa.peso_embalagem_g;
      comprimento = Number(caixa.comprimento_cm);
      largura = Number(caixa.largura_cm);
      altura = Number(caixa.altura_cm);
    }
    if (![peso, comprimento, largura, altura].every(Number.isFinite)
      || peso < 1 || peso > 30000
      || comprimento < 1 || comprimento > 150
      || largura < 1 || largura > 150
      || altura < 1 || altura > 150
      || comprimento + largura + altura > 200) {
      return json(400, { erro: "Informe o peso (1 a 30000 g) e as medidas válidas da embalagem em centímetros" });
    }

    if (!/^\d{8}$/.test(origem)) return json(503, { erro: "CEP de postagem ainda não configurado na loja" });
    const servicos = (Deno.env.get("CORREIOS_CODIGOS_SERVICOS") ?? "").split(",").map(s => s.trim()).filter(s => /^\d{5}$/.test(s)).slice(0, 5);
    if (!servicos.length) return json(503, { erro: "Serviços do contrato ainda não configurados" });
    const token = await tokenCorreios();
    const resultado = await Promise.allSettled(servicos.map(async codigo => {
      const query = new URLSearchParams({
        cepOrigem: origem, cepDestino: destino, psObjeto: String(Math.ceil(peso)), tpObjeto: "2",
        comprimento: String(comprimento), largura: String(largura), altura: String(altura),
      });
      const contrato = Deno.env.get("CORREIOS_CONTRATO");
      const dr = Deno.env.get("CORREIOS_DR");
      if (contrato && dr && /^\d+$/.test(dr)) {
        query.set("nuContrato", contrato);
        query.set("nuDR", dr);
      }
      const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
      const [preco, prazo] = await Promise.all([
        fetch("https://api.correios.com.br/preco/v1/nacional/" + codigo + "?" + query, { headers, signal: AbortSignal.timeout(12000) }),
        fetch("https://api.correios.com.br/prazo/v1/nacional/" + codigo + "?cepOrigem=" + origem + "&cepDestino=" + destino, { headers, signal: AbortSignal.timeout(12000) }),
      ]);
      if (!preco.ok) return null;
      const p = await preco.json();
      const valor = money(p.pcFinal);
      if (!Number.isFinite(valor) || valor < 0) return null;
      let prazoDias: number | null = null;
      if (prazo.ok) {
        const d = await prazo.json();
        const parsed = Number(d.prazoEntrega ?? d.prazo ?? NaN);
        if (Number.isFinite(parsed) && parsed >= 0) prazoDias = parsed;
      }
      return { codigo, valor, prazoDias };
    }));
    const opcoes = resultado.flatMap(resposta => resposta.status === "fulfilled" && resposta.value ? [resposta.value] : []);
    if (!checkout) return opcoes.length ? json(200, { cepDestino: destino, opcoes })
      : json(422, { erro: "Nenhum serviço do contrato disponibilizou frete para esta embalagem e destino" });

    const validas = opcoes.filter(o => Number.isInteger(o.prazoDias) && o.prazoDias! >= 0);
    if (!validas.length) return json(422, { erro: "Os Correios não retornaram preço e prazo para este pacote." });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false }
    });
    const { data: cotacoes, error: erroCotacoes } = await service.from("cotacoes_frete_correios").insert(
      validas.map(opcao => ({
        cliente_id: auth.user.id, itens, cep: destino, endereco: cliente.address,
        servico: opcao.codigo, valor: opcao.valor, prazo_dias: opcao.prazoDias
      }))
    ).select("id,servico,valor,prazo_dias,expira_em");
    if (erroCotacoes) return json(503, { erro: "Não foi possível registrar a cotação. Tente novamente." });
    return json(200, { cepDestino: destino, opcoes: cotacoes });
  } catch (e) {
    console.error("Falha na consulta aos Correios", e instanceof Error ? e.message : "erro");
    return json(502, { erro: "Não foi possível consultar o frete dos Correios. Confira as permissões da API e tente novamente." });
  }
});