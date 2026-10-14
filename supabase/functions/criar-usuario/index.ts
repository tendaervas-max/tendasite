// Cria login novo pela aba Usuários do painel administrativo.
// Só administrador logado chama (o site manda o token do login); o login já sai confirmado,
// o gatilho ao_criar_usuario cria o cadastro em users e, se pedido, o login entra na tabela admin.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Método que monta a resposta em JSON da função
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { erro: "Use POST" });

  // Confere se quem chamou é administrador
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user: quemChamou } } = await supabase.auth.getUser(token);
  if (!quemChamou) return responder(401, { erro: "Faça login de novo no painel" });

  const { data: ehAdmin } = await supabase.from("admin").select("user_id").eq("user_id", quemChamou.id).maybeSingle();
  if (!ehAdmin) return responder(403, { erro: "Só administrador cadastra usuário" });

  const { nome, email, senha, administrador } = await req.json().catch(() => ({}));
  const emailLimpo = String(email ?? "").trim().toLowerCase();
  if (!String(nome ?? "").trim()) return responder(400, { erro: "Informe o nome" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) return responder(400, { erro: "E-mail inválido" });
  if (String(senha ?? "").length < 6) return responder(400, { erro: "A senha precisa ter pelo menos 6 caracteres" });

  const { data: criado, error } = await supabase.auth.admin.createUser({
    email: emailLimpo,
    password: String(senha),
    email_confirm: true,
    user_metadata: { full_name: String(nome).trim() },
  });
  if (error) {
    const jaExiste = /already/i.test(error.message);
    return responder(400, { erro: jaExiste ? "Já existe um login com esse e-mail" : error.message });
  }

  if (administrador) {
    const { error: erroAdmin } = await supabase.from("admin").insert({ user_id: criado.user.id });
    if (erroAdmin) return responder(500, { erro: `Login criado, mas não virou administrador: ${erroAdmin.message}` });
  }

  return responder(200, { id: criado.user.id });
});
