import { supabase } from "./supabase";

export type ItemCotacao = { id: number; quantidade: number; opcao: string | null };
export type OpcaoFrete = { id: string; servico: string; valor: number; prazo_dias: number; expira_em: string };

export class ErroFreteCorreios extends Error {
  constructor(mensagem: string, readonly somenteRetirada = false) { super(mensagem); }
}

export async function cotarFreteCorreios(itens: ItemCotacao[]): Promise<OpcaoFrete[]> {
  const { data, error } = await supabase.functions.invoke("cotar-frete-correios", { body: { itens } });
  if (error) {
    const resposta = await error.context?.json?.().catch(() => null);
    throw new ErroFreteCorreios(resposta?.erro || "Não foi possível consultar os Correios.", resposta?.somenteRetirada === true);
  }
  if (!Array.isArray(data?.opcoes) || !data.opcoes.length) throw new Error("Nenhuma opção de entrega disponível.");
  return data.opcoes;
}
