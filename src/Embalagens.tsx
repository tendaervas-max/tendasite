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

type Cotacao = {cepDestino:string;opcoes:{codigo:string;valor:number;prazoDias:number|null}[]};
const ConsultarFrete:React.FC<{caixas:Caixa[]}> = ({caixas})=>{
 const [caixaId,setCaixaId]=useState('');
 const [peso,setPeso]=useState('');
 const [consultando,setConsultando]=useState(false);
 const [resultado,setResultado]=useState<Cotacao|null>(null);
 const [erro,setErro]=useState('');
 const [cep,setCep]=useState('');
 useEffect(()=>{let ativo=true; void (async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)return;
   const {data}=await supabase.from('users').select('cep').eq('id',user.id).maybeSingle();
   if(ativo)setCep(String(data?.cep||''));
 })(); return ()=>{ativo=false;};},[]);
 const consultar=async(e:React.FormEvent)=>{
  e.preventDefault();setErro('');setResultado(null);
  const caixa=caixas.find(c=>c.id===caixaId&&c.ativo);
  const pesoTotal=Number(peso);
  if(!caixa||!Number.isInteger(pesoTotal)||pesoTotal<1||pesoTotal>30000){setErro('Selecione a caixa e informe o peso total entre 1 e 30000 g.');return;}
  setConsultando(true);
  try{
   const {data,error}=await supabase.functions.invoke('cotar-frete-correios',{body:{
    pesoGramas:pesoTotal,comprimentoCm:Number(caixa.comprimento_cm),
    larguraCm:Number(caixa.largura_cm),alturaCm:Number(caixa.altura_cm)
   }});
   if(error){
    let mensagem='Não foi possível consultar. Confira o CEP da sua conta e a configuração dos Correios.';
    try{const resposta=await error.context?.json();if(typeof resposta?.erro==='string')mensagem=resposta.erro;}catch{}
    throw new Error(mensagem);
   }
   if(!data||!/^\d{8}$/.test(data.cepDestino)||!Array.isArray(data.opcoes)||!data.opcoes.length||
      !data.opcoes.every((o:any)=>typeof o.codigo==='string'&&typeof o.valor==='number'&&Number.isFinite(o.valor)&&o.valor>=0&&
       (o.prazoDias===null||(Number.isInteger(o.prazoDias)&&o.prazoDias>=0))))throw new Error('A consulta não retornou opções válidas.');
   setResultado(data);
  }catch(e){setErro(e instanceof Error?e.message:'Falha na consulta.');}
  finally{setConsultando(false);}
 };
 return <section className="bg-white border rounded-2xl p-5 mb-6 space-y-4">
  <h2 className="text-xl font-bold text-brand-olive">Consultar preço e prazo nos Correios</h2>
  <p className="text-sm text-gray-700">Destino: {cep||'cadastre seu CEP em Minha conta'}. A consulta usa o CEP da conta conectada. Informe o peso de todos os produtos, da caixa e da proteção juntos.</p>
  <form onSubmit={consultar} className="space-y-5">
   <fieldset disabled={consultando} className="min-w-0">
    <legend className="mb-2 text-sm font-semibold text-brand-olive">Caixa</legend>
    <div className="grid gap-2 sm:grid-cols-2">
     {caixas.filter(c => c.ativo).map(c => (
      <label key={c.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-brand-beige/60 bg-white px-3 py-3 cursor-pointer has-checked:border-brand-olive has-checked:bg-brand-mint/15">
       <input type="radio" name="caixa-frete" required value={c.id} checked={caixaId === c.id}
        onChange={() => { setCaixaId(c.id); setResultado(null); setErro(''); }}
        className="mt-1 shrink-0 accent-brand-olive" />
       <span className="min-w-0 text-sm">
        <span className="block break-words font-semibold">{c.nome}</span>
        <span className="block text-gray-600">{c.comprimento_cm} × {c.largura_cm} × {c.altura_cm} cm</span>
       </span>
      </label>
     ))}
    </div>
    {!caixas.some(c => c.ativo) && <p className="text-sm text-gray-600">Nenhuma caixa ativa disponível.</p>}
   </fieldset>
   <label className="grid gap-2">
    <span className="text-sm font-semibold text-brand-olive">Peso total do pacote (g)</span>
    <input required disabled={consultando} type="number" inputMode="numeric" min="1" max="30000" step="1"
     value={peso} onChange={e => { setPeso(e.target.value); setResultado(null); setErro(''); }}
     className="min-h-11 w-full rounded-xl border border-brand-beige/60 px-3 py-2" />
   </label>
   <button disabled={consultando || !cep || !caixaId} className="bg-brand-olive text-white rounded-xl px-4 py-3 font-semibold disabled:opacity-50">{consultando?'Consultando…':'Consultar Correios'}</button>
  </form>
  {erro&&<p role="alert" className="text-red-700">{erro}</p>}
  {resultado&&<div role="status" className="space-y-2"><p className="font-semibold">Opções para o CEP {resultado.cepDestino}</p>{resultado.opcoes.map(o=><p key={o.codigo}>Serviço {o.codigo}: {o.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · {o.prazoDias===null?'Prazo não informado':o.prazoDias+' dias úteis'}</p>)}
   <p className="text-xs text-gray-600">Consulta sem cobrança ou emissão de etiqueta. Se usar peso estimado, confira o pacote antes de combinar o frete.</p>
  </div>}
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
   <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-2 text-amber-950"><AlertTriangle size={22} className="shrink-0"/> <p>O checkout usa as caixas ativas marcadas com medidas reais e os dados de envio cadastrados nos produtos.</p></div>
   <ConsultarFrete caixas={inicial}/>
   {erroLeitura&&<p role="alert">{erroLeitura}</p>}{erro&&<p role="alert" className="text-red-700 mb-3">{erro}</p>}{aviso&&<p role="status" className="text-emerald-700 mb-3">{aviso}</p>}
   {carregando?<p>Carregando modelos…</p>:<div className="grid gap-4 md:grid-cols-2">{caixas.map(c=><section key={c.id} className="bg-white border border-brand-beige/30 rounded-2xl p-5 space-y-4">
    <h2 className="font-bold text-brand-olive text-xl flex gap-2 items-center"><Package size={20}/> Caixa {c.id} {c.exemplo?'· Exemplo':''}</h2>
    <label className="block text-sm font-semibold">Nome<input value={c.nome} onChange={e=>alterar(c.id,'nome',e.target.value)} className="block border rounded-lg px-3 py-2 mt-1 w-full"/></label>
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">{([['comprimento_cm','Comprimento (cm)'],['largura_cm','Largura (cm)'],['altura_cm','Altura (cm)'],['peso_embalagem_g','Peso da caixa (g)']] as const).map(([campo,label])=><label key={campo} className="grid min-w-0 gap-2 text-xs font-semibold"><span>{label}</span><input type="number" min={campo==='peso_embalagem_g'?0:1} step={campo==='peso_embalagem_g'?1:0.1} value={c[campo]} onChange={e=>alterar(c.id,campo,e.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border px-3 py-2"/></label>)}</div>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.exemplo} onChange={e=>alterar(c.id,'exemplo',e.target.checked)}/> Medidas ainda são exemplo</label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={c.ativo} onChange={e=>alterar(c.id,'ativo',e.target.checked)}/> Caixa ativa</label>
    <button disabled={salvando!==null} onClick={()=>void salvar(c)} className="bg-brand-olive text-white px-4 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Save size={17}/>{salvando===c.id?'Salvando…':'Salvar caixa '+c.id}</button>
   </section>)}</div>}
 </main>;
};
