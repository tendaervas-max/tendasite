type EnderecoCep = { rua: string; bairro: string; cidade: string; uf: string };
type ResultadoCep =
  | { status: "achou"; endereco: EnderecoCep }
  | { status: "nao_encontrado" | "indisponivel" };

export function formatarCep(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export async function consultarCep(cep: string, signal: AbortSignal): Promise<ResultadoCep> {
  const servicos = [
    { url: `https://viacep.com.br/ws/${cep}/json/`, campos: ["logradouro", "bairro", "localidade", "uf"] },
    { url: `https://brasilapi.com.br/api/cep/v2/${cep}`, campos: ["street", "neighborhood", "city", "state"] }
  ];
  let naoEncontrado = false;
  for (const { url, campos } of servicos) {
    if (signal.aborted) break;
    try {
      const resposta = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]) });
      if (resposta.status === 404) { naoEncontrado = true; continue; }
      if (!resposta.ok) continue;
      const dados = await resposta.json();
      if (dados?.erro === true || dados?.erro === "true") { naoEncontrado = true; continue; }
      const [rua, bairro, cidade, uf] = campos.map(campo => typeof dados?.[campo] === "string" ? dados[campo].trim() : "");
      if (cidade && /^[A-Z]{2}$/.test(uf)) return { status: "achou", endereco: { rua, bairro, cidade, uf } };
    } catch {
      // Tenta o próximo serviço após falha de rede, timeout ou resposta inválida.
    }
  }
  return { status: naoEncontrado ? "nao_encontrado" : "indisponivel" };
}
