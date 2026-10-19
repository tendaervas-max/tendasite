import React, {useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
import {Package,Save,AlertTriangle,RefreshCw} from 'lucide-react';

export type Caixa = {id:string;nome:string;comprimento_cm:number;largura_cm:number;altura_cm:number;peso_embalagem_g:number;exemplo:boolean;ativo:boolean};
const cols=['comprimento_cm','largura_cm','altura_cm','peso_embalagem_g'] as const;
export const useCaixasDeEnvio=()=>{
  const [caixas,setCaixas]=useState<Caixa[]>([]);
  const [carregando,setCarregando]=useState(true);
  const [erro,setErro]=useState('');
  useEffect(()=>{
    let ativo=true;
    void supabase.from('configuracao_frete_tenda').select('id,nome,comprimento_cm,largura_cm,altura_cm,peso_embalagem_g,exemplo,ativo').order('id').then(({data,error})=>{
      if(!ativo)return;
      if(error)setErro('Modelos de embalagem indisponíveis.');
      else setCaixas((data||[]) as Caixa[]);
      setCarregando(false);
    });
    return ()=>{ativo=false;};
  },[]);
  return {caixas,carregando,erro};
};

export const ResumoCaixas:React.FC = ()=>{
 const {caixas,carregando,erro}=useCaixasDeEnvio();
 return <section aria-label="Modelos de embalagem" className="border border-amber-200 bg-amber-50 rounded-2xl p-5 space-y-2">
  <h3 className="font-bold text-amber-950 flex items-center gap-2"><Package size={19}/> Caixas cadastradas para envio — modo de teste</h3>
  {carregando?<p className="text-sm text-amber-950">Carregando embalagens…</p>:erro?<p role="alert" className="text-sm text-red-800">{erro}</p>:<>
   <p className="text-sm text-amber-950">Estas medidas são modelos editáveis, <strong>não são preço de frete</strong>. O frete real será definido antes de cobrar a entrega.</p>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{caixas.filter(c=>c.ativo).map(c=><div key={c.id} className="rounded-xl border border-amber-200 bg-white p-3 text-sm text-gray-800"><strong>{c.nome}</strong><p>{c.comprimento_cm} × {c.largura_cm} × {c.altura_cm} cm</p><p className="text-xs">{c.exemplo?'Medidas de exemplo':'Dimensões cadastradas'} · {c.peso_embalagem_g>0?c.peso_embalagem_g+' g de embalagem':'Peso não informado'}</p></div>)}</div>
  </>}
 </section>;
};

export const EditarCaixasLoja:React.FC<{temAcesso:boolean}> = ({temAcesso})=>{
 const {caixas:inicial,carregando,erro:erroLeitura}=useCaixasDeEnvio();
 const [dados,setDados]=useState<Caixa[]|null>(null);
 const [salvando,setSalvando]=useState<string|null>(null);
 const [erro,setErro]=useState('');
 const [aviso,setAviso]=useState('');
 const caixas=dados||inicial;
 if(!temAcesso)return <main className="max-w-xl mx-auto p-10 min-h-screen"><h1 className="text-2xl font-serif">Acesso restrito</h1><p>Somente a equipe da Tenda Ervas pode editar as medidas.</p></main>;
 const alterar=(id:string,campo:keyof Caixa,valor:string|boolean)=>setDados(caixas.map(c=>c.id===id?{...c,[campo]:typeof valor==='string'&&cols.includes(campo as any)?Number(valor):valor}:c));
 const salvar=async(c:Caixa)=>{
  setErro('');setAviso('');
  if(!c.nome.trim()||![c.comprimento_cm,c.largura_cm,c.altura_cm].every(v=>Number.isFinite(v)&&v>0&&v<=150)||c.comprimento_cm+c.largura_cm+c.altura_cm>200){setErro('Confira o nome e as três medidas da caixa.');return;}
  if(!Number.isInteger(c.peso_embalagem_g)||c.peso_embalagem_g<0||(!c.exemplo&&c.peso_embalagem_g===0)){setErro('Informe um peso válido da caixa antes de desmarcar exemplo.');return;}
  setSalvando(c.id);
  const {error}=await supabase.from('configuracao_frete_tenda').update({
   nome:c.nome.trim(),comprimento_cm:c.comprimento_cm,largura_cm:c.largura_cm,altura_cm:c.altura_cm,
   peso_embalagem_g:c.peso_embalagem_g,exemplo:c.exemplo,ativo:c.ativo,atualizado_em:new Date().toISOString()
  }).eq('id',c.id).select('id').single();
  if(error)setErro('Falha ao salvar: '+error.message);
  else setAviso('Caixa '+c.id+' atualizada; as medidas também serão vistas na gestão.');
  setSalvando(null);
 };
 return <main className="max-w-5xl mx-auto px-4 py-12 min-h-screen">
   <h1 className="font-serif text-4xl text-brand-olive mb-3">Configuração de caixas e frete</h1>
   <p className="mb-5 text-gray-700">Ajuste as embalagens que também aparecem na gestão. CEP de postagem: 07025-020.</p>
   <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-2 text-amber-950"><AlertTriangle size={22} className="shrink-0"/> <p><strong>Teste.</strong> Os tamanhos são exemplos e não geram tarifa dos Correios. O pagamento da entrega só será integrado após a cotação e conferência do valor.</p></div>
   {erroLeitura&&<p role="alert">{erroLeitura}</p>}{erro&&<p role="alert" className="text-red-700 mb-3">{erro}</p>}{aviso&&<p role="status" className="text-emerald-700 mb-3">{aviso}</p>}
   {carregando?<p>Carregando modelos…</p>:<div className="grid gap-4 md:grid-cols-2">{caixas.map(c=><section key={c.id} className="bg-white border border-brand-beige/30 rounded-2xl p-5 space-y-4">
    <h2 className="font-bold text-brand-olive text-xl flex gap-2 items-center"><Package size={20}/> Caixa {c.id} {c.exemplo?'· Exemplo':''}</h2>
    <label className="block text-sm font-semibold">Nome<input value={c.nome} onChange={e=>alterar(c.id,'nome',e.target.value)} className="block border rounded-lg px-3 py-2 mt-1 w-full"/></label>
    <div className="grid grid-cols-2 gap-2">{([['comprimento_cm','Comprimento (cm)'],['largura_cm','Largura (cm)'],['altura_cm','Altura (cm)'],['peso_embalagem_g','Peso da caixa (g)']] as const).map(([campo,label])=><label key={campo} className="text-xs font-semibold">{label}<input type="number" min={campo==='peso_embalagem_g'?0:1} step={campo==='peso_embalagem_g'?1:0.1} value={c[campo]} onChange={e=>alterar(c.id,campo,e.target.value)} className="block border rounded-lg px-3 py-2 mt-1 w-full"/></label>)}</div>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.exemplo} onChange={e=>alterar(c.id,'exemplo',e.target.checked)}/> Medidas ainda são exemplo</label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.ativo} onChange={e=>alterar(c.id,'ativo',e.target.checked)}/> Caixa ativa</label>
    <button disabled={salvando!==null} onClick={()=>void salvar(c)} className="bg-brand-olive text-white px-4 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Save size={17}/>{salvando===c.id?'Salvando…':'Salvar caixa '+c.id}</button>
   </section>)}</div>}
 </main>;
};
