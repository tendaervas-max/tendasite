import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { reais } from '../loja';

type Cotacao = { codigo: string; valor: number; prazoDias: number | null };

export const CotacaoCorreios: React.FC<{
  cep: string | null | undefined;
  selecionada: Cotacao | null;
  aoSelecionar: (opcao: Cotacao | null) => void;
}> = ({ cep, selecionada, aoSelecionar }) => {
  const [peso, setPeso] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [opcoes, setOpcoes] = useState<Cotacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const consultar = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    setErro('');
    setOpcoes([]);
    aoSelecionar(null);
    const payload = {
      pesoGramas: Number(peso), comprimentoCm: Number(comprimento),
      larguraCm: Number(largura), alturaCm: Number(altura),
    };
    if (Object.values(payload).some(n => !Number.isFinite(n) || n <= 0)) {
      setErro('Informe peso e medidas válidos da embalagem.');
      setCarregando(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('cotar-frete-correios', { body: payload });
      if (error) {
        let detalhe = '';
        try {
          const resposta = await error.context?.json?.();
          detalhe = resposta?.erro || '';
        } catch { /* não há resposta JSON da função */ }
        throw new Error(detalhe || error.message);
      }
      setOpcoes(Array.isArray(data?.opcoes) ? data.opcoes : []);
      if (!data?.opcoes?.length) setErro('Nenhum frete disponível para esta embalagem.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao consultar o frete.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <section className="bg-white border border-brand-beige/30 rounded-2xl p-5 mt-4 space-y-4">
      <div>
        <h4 className="font-semibold text-brand-olive">Consultar frete pelo contrato dos Correios</h4>
        <p className="text-xs text-gray-600 mt-1">
          Destino: CEP {cep || 'não informado'}. Informe as medidas e o peso da embalagem completa, já preparada para envio.
          Esta consulta não inclui o frete no pedido automaticamente.
        </p>
      </div>
      <form onSubmit={consultar} className="grid grid-cols-2 gap-3 text-sm">
        <label>Peso (gramas)<input required type="number" min="1" max="30000" step="1" value={peso} onChange={e => setPeso(e.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label>
        <label>Comprimento (cm)<input required type="number" min="1" max="150" step="0.1" value={comprimento} onChange={e => setComprimento(e.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label>
        <label>Largura (cm)<input required type="number" min="1" max="150" step="0.1" value={largura} onChange={e => setLargura(e.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label>
        <label>Altura (cm)<input required type="number" min="1" max="150" step="0.1" value={altura} onChange={e => setAltura(e.target.value)} className="w-full border rounded-lg p-2 mt-1" /></label>
        <button type="submit" disabled={carregando || !cep} className="col-span-2 bg-brand-olive text-white py-3 rounded-xl font-semibold disabled:opacity-50">{carregando ? 'Consultando Correios…' : 'Consultar preço e prazo'}</button>
      </form>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      {opcoes.length > 0 && (
        <div className="space-y-2">
          {opcoes.map(opcao => (
            <label key={opcao.codigo} className="flex justify-between items-center gap-3 bg-brand-mint/15 rounded-xl px-4 py-3 text-sm cursor-pointer">
              <input type="radio" name="servico-correios" checked={selecionada?.codigo === opcao.codigo} onChange={() => aoSelecionar(opcao)} aria-label={`Selecionar serviço ${opcao.codigo}`} />
              <div><strong>Correios · Serviço {opcao.codigo}</strong><p className="text-gray-600">{opcao.prazoDias == null ? 'Prazo não disponível' : opcao.prazoDias + ' dia(s) úteis (estimativa)'}</p></div>
              <span className="font-bold text-brand-olive">{reais(opcao.valor)}</span>
            </label>
          ))}
          <p className="text-xs text-amber-800">Cotação informativa. O pedido continua cobrando apenas os produtos; a entrega é combinada diretamente com a loja.</p>
        </div>
      )}
    </section>
  );
};