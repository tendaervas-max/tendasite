import React, { useState } from "react";
import { supabase } from "./lib/supabase";
import { reais } from "./loja";

export type RetiradaAgendada = { pedido_id: number; endereco: string; agendado_para: string };

export const statusRetiradaPaga = ["pagamento confirmado", "pedido sendo separado", "pronto para retirada"];

export const dataBrasilia = (valor: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo"
}).format(new Date(valor));

export function ConfirmarRetirada({ pedidoId, retirada, aoSalvar }: {
  pedidoId: number; retirada?: RetiradaAgendada; aoSalvar: (retirada: RetiradaAgendada) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const horario = retirada ? new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo"
  }).format(new Date(retirada.agendado_para)).replace(" ", "T") : "";

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    const endereco = String(campos.get("endereco") || "").trim();
    const agendado_para = String(campos.get("horario")) + ":00-03:00";
    setSalvando(true);
    setErro("");
    try {
      const { error } = await supabase.rpc("confirmar_retirada_pedido", {
        p_pedido: pedidoId, p_endereco: endereco, p_data_hora: agendado_para
      });
      if (error) { setErro(error.message); return; }
      aoSalvar({ pedido_id: pedidoId, endereco, agendado_para });
      setAberto(false);
    } finally { setSalvando(false); }
  }

  return <div className="space-y-2 text-sm">
    {retirada && <p className="font-semibold text-green-800">Retirada confirmada para {dataBrasilia(retirada.agendado_para)} (Brasília)</p>}
    {!aberto ? (
      <button type="button" onClick={() => setAberto(true)} className="font-semibold text-brand-olive underline">
        {retirada ? "Reagendar retirada" : "Agendar retirada"}
      </button>
    ) : (
      <form onSubmit={salvar} className="grid gap-2">
        <label>Endereço da retirada
          <input name="endereco" required maxLength={500} defaultValue={retirada?.endereco} className="block w-full rounded-lg border p-2" />
        </label>
        <label>Data e hora (Brasília)
          <input name="horario" type="datetime-local" required defaultValue={horario} className="block w-full rounded-lg border p-2" />
        </label>
        <p>O cliente verá esses dados em Meus pedidos após a confirmação.</p>
        {erro && <p role="alert" className="text-red-700">{erro}</p>}
        <div className="flex flex-wrap gap-3">
          <button disabled={salvando} className="rounded-lg bg-brand-olive px-3 py-2 text-white">Confirmar agendamento</button>
          <button type="button" disabled={salvando} onClick={() => { setAberto(false); setErro(""); }}>Fechar</button>
        </div>
      </form>
    )}
  </div>;
}

export function ConfirmarFrete({ pedidoId, valor, aoSalvar }: {
  pedidoId: number; valor?: number | null; aoSalvar: (valor: number) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  if (valor != null) return <p className="text-sm font-semibold text-green-800">Frete confirmado: {reais(valor)}</p>;

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const frete = Number(new FormData(evento.currentTarget).get("frete"));
    if (!window.confirm(`Confirmar o frete de ${reais(frete)} para o pedido #${pedidoId}?`)) return;
    setSalvando(true);
    setErro("");
    try {
      const { data, error } = await supabase.rpc("confirmar_frete_pedido", { p_pedido: pedidoId, p_frete: frete });
      if (error) { setErro(error.message); return; }
      aoSalvar(Number(data));
    } finally { setSalvando(false); }
  }

  return <form onSubmit={salvar} className="space-y-2 text-sm">
    <label className="block">Valor combinado do frete (R$)
      <input name="frete" type="number" min="0" max="9999999999.99" step="0.01" required className="block w-full rounded-lg border p-2" />
    </label>
    <button disabled={salvando} className="rounded-lg bg-brand-olive px-3 py-2 text-white">Confirmar frete</button>
    {erro && <p role="alert" className="text-red-700">{erro}</p>}
  </form>;
}
