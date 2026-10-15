import { createClient } from "npm:@supabase/supabase-js@2.48.1";

// Cotação autenticada com os Correios. Credenciais armazenadas apenas em secrets do Supabase.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const cepValido = (value: unknown) => typeof value === "string" && /^\d{8}$/.test(value.replace(/\D/g, ""));
const decimal = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
const money = (text: unknown) => {
  if (typeof text === "number") return text;
  const s = String(text ?? "").trim();
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
  const corpo = cartao ? { numero: cartao, ...(contrato ? { contrato } : {}) } : { numero: contrato };
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

    const { data: cliente, error: clienteErro } = await supabase.from("users").select("cep").eq("id", auth.user.id).single();
    if (clienteErro || !cliente || !cepValido(cliente.cep)) return json(400, { erro: "Cadastre um CEP válido na sua conta" });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json(400, { erro: "Solicitação inválida" });

    const destino = String(cliente.cep).replace(/\D/g, "");
    const origem = (Deno.env.get("CORREIOS_CEP_ORIGEM") ?? "").replace(/\D/g, "");
    if (!/^\d{8}$/.test(origem)) return json(503, { erro: "CEP de postagem ainda não configurado na loja" });
    const peso = decimal(body.pesoGramas);
    const comprimento = decimal(body.comprimentoCm);
    const largura = decimal(body.larguraCm);
    const altura = decimal(body.alturaCm);
    if (![peso, comprimento, largura, altura].every(Number.isFinite)
      || peso < 1 || peso > 30000
      || comprimento < 1 || comprimento > 150
      || largura < 1 || largura > 150
      || altura < 1 || altura > 150
      || comprimento + largura + altura > 200) {
      return json(400, { erro: "Informe o peso (1 a 30000 g) e as medidas válidas da embalagem em centímetros" });
    }

    const servicos = (Deno.env.get("CORREIOS_CODIGOS_SERVICOS") ?? "").split(",").map(s => s.trim()).filter(s => /^\d{5}$/.test(s)).slice(0, 5);
    if (!servicos.length) return json(503, { erro: "Serviços do contrato ainda não configurados" });
    const token = await tokenCorreios();
    const resultado = await Promise.all(servicos.map(async codigo => {
      const query = new URLSearchParams({
        cepOrigem: origem, cepDestino: destino, psObjeto: String(Math.ceil(peso)), tpObjeto: "2",
        comprimento: String(comprimento), largura: String(largura), altura: String(altura),
      });
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
    const opcoes = resultado.filter((x): x is { codigo: string; valor: number; prazoDias: number | null } => x !== null);
    return opcoes.length ? json(200, { cepDestino: destino, opcoes }) :
      json(422, { erro: "Nenhum serviço do contrato disponibilizou frete para esta embalagem e destino" });
  } catch (e) {
    console.error("Falha na consulta aos Correios", e instanceof Error ? e.message : "erro");
    return json(502, { erro: "Não foi possível consultar o frete dos Correios. Confira as permissões da API e tente novamente." });
  }
});