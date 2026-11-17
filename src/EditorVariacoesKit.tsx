import React from "react";

export type VariacaoKit = { nome: string; quantidade: number; preco: number };

export function EditorVariacoesKit({ value, onChange }: {
  value: VariacaoKit[]; onChange: (variacoes: VariacaoKit[]) => void;
}) {
  return <fieldset className="rounded-xl border p-4 space-y-3">
    <legend className="px-1 font-semibold">Quantidades e preços do kit</legend>
    <p className="text-sm">Defina o preço total de cada opção. Cada quantidade multiplica todos os componentes de um kit.</p>
    {value.map((variacao, index) => (
      <div key={index} className="grid grid-cols-2 gap-3 items-end">
        <label className="grid gap-1 text-sm">Quantidade de kits
          <input type="number" min="1" max="999" step="1" required value={variacao.quantidade || ""}
            onChange={e => onChange(value.map((v, i) => i === index ? { ...v, nome: e.target.value, quantidade: Number(e.target.value) } : v))}
            className="w-full min-w-0 rounded-lg border p-2 bg-white text-gray-900" />
        </label>
        <label className="grid gap-1 text-sm">Preço total (R$)
          <input type="number" min="0.01" max="99999999.99" step="0.01" required value={variacao.preco || ""}
            onChange={e => onChange(value.map((v, i) => i === index ? { ...v, preco: Number(e.target.value) } : v))}
            className="w-full min-w-0 rounded-lg border p-2 bg-white text-gray-900" />
        </label>
        <button type="button" className="col-span-2 text-left text-sm text-red-700 underline"
          onClick={() => onChange(value.filter((_, i) => i !== index))}>Remover opção</button>
      </div>
    ))}
    <button type="button" className="text-sm font-semibold underline" onClick={() =>
      onChange([...value, { nome: String((value.at(-1)?.quantidade || 0) + 1), quantidade: (value.at(-1)?.quantidade || 0) + 1, preco: 0 }])
    }>Adicionar quantidade</button>
  </fieldset>;
}
