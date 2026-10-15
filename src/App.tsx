import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, User, LogOut, Plus, Pencil, Trash2, Instagram, Phone, MapPin, Menu, X, ChevronRight, Leaf, Check, Database, Eye, EyeOff } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, definirManterConectado } from "./lib/supabase";
import { CotacaoCorreios } from "./components/CotacaoCorreios";
import { Product, CartItem } from "./types";
import { LOJA, linkWhatsApp, STATUS_PEDIDO, mensagemPedido, mensagemEntrega, reais, CATEGORIAS, maiorDeIdade, chaveCarrinho, cpfValido, formatarCpf, comPromocao, comEstoqueDosKits } from "./loja";

// --- Components ---

const Navbar = ({ cartCount, isAdmin, acessoGestao, user }: { cartCount: number, isAdmin: boolean, acessoGestao: boolean, user: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Método que sai da conta e volta para o início
  const sair = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };
  
  return (
    <nav className="sticky top-0 z-50 bg-brand-paper/80 backdrop-blur-md border-b border-brand-beige/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full border-2 border-brand-olive bg-brand-mint/20 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png.png" 
                className="w-full h-full object-cover"
                alt="Tenda Ervas Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=TendaErvas&backgroundColor=A7C080&fontFamily=serif';
                }}
              />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-brand-olive">Tenda Ervas</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium hover:text-brand-olive transition-colors">Início</Link>
            <Link to="/produtos" className="text-sm font-medium hover:text-brand-olive transition-colors">Produtos</Link>
            {!user && <Link to="/checkout" className="text-sm font-medium hover:text-brand-olive transition-colors">Cadastro</Link>}
            {user && <Link to="/meus-pedidos" className="text-sm font-medium hover:text-brand-olive transition-colors">Meus Pedidos</Link>}
            {user && <Link to="/minha-conta" className="text-sm font-medium hover:text-brand-olive transition-colors">Minha conta</Link>}
            {user && <button onClick={sair} className="text-sm font-medium hover:text-brand-olive transition-colors">Sair</button>}
            <Link to="/carrinho" className="relative p-2 text-gray-700 hover:text-brand-olive transition-colors">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-brand-olive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            {!user && <Link to="/checkout" state={{ entrar: true }} className="text-sm font-medium hover:text-brand-olive transition-colors">Login</Link>}
            {acessoGestao && <a href={LOJA.urlGestao} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-brand-olive transition-colors">Gestão</a>}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-brand-olive hover:opacity-80 transition-colors">
                <User size={18} /> Admin
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <Link to="/carrinho" className="relative p-2 text-gray-700">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-brand-olive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-700">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-paper border-b border-brand-beige/20 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link to="/" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Início</Link>
              <Link to="/produtos" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Produtos</Link>
              {!user && <Link to="/checkout" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Cadastro</Link>}
              {!user && <Link to="/checkout" state={{ entrar: true }} onClick={() => setIsOpen(false)} className="block text-lg font-medium">Login</Link>}
              {user && <Link to="/meus-pedidos" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Meus Pedidos</Link>}
              {user && <Link to="/minha-conta" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Minha conta</Link>}
              {user && <button onClick={sair} className="block text-lg font-medium">Sair</button>}
              {acessoGestao && <a href={LOJA.urlGestao} target="_blank" rel="noreferrer" className="block text-lg font-medium">Gestão</a>}
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-brand-olive">Admin</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-brand-olive text-brand-paper py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <h3 className="text-2xl font-serif mb-4">Tenda Ervas</h3>
          <p className="text-brand-paper/70 text-sm leading-relaxed">
            Conectando você à sabedoria ancestral das ervas. 
          </p>
        </div>
        <div>
          <h4 className="text-lg font-medium mb-4">Contato</h4>
          <ul className="space-y-3 text-sm text-brand-paper/70">
            <li className="flex items-center gap-2">
              <Phone size={16} />
              <a href={linkWhatsApp("Olá! Vim pelo site da Tenda Ervas.")} target="_blank" rel="noreferrer" className="hover:text-brand-paper">{LOJA.whatsappExibicao}</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} /> {LOJA.whatsappOutroExibicao}
            </li>
            <li className="flex items-center gap-2">
              <Instagram size={16} /> @{LOJA.instagram}
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={16} /> {LOJA.cidade}
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-medium mb-4">Informações</h4>
          <ul className="space-y-3 text-sm text-brand-paper/70">
            {LOJA.razaoSocial && <li>{LOJA.razaoSocial}</li>}
            <li>CNPJ {LOJA.cnpj}</li>
            {LOJA.endereco && <li>{LOJA.endereco}</li>}
            <li>
              <a href={`mailto:${LOJA.email}`} className="hover:text-brand-paper transition-colors">{LOJA.email}</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-medium mb-4">Ajuda</h4>
          <ul className="space-y-3 text-sm text-brand-paper/70">
            <li><Link to="/privacidade" className="hover:text-brand-paper transition-colors">Política de privacidade</Link></li>
            <li><Link to="/trocas" className="hover:text-brand-paper transition-colors">Trocas e devoluções</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-brand-paper/20 text-center text-xs text-brand-paper/60">
        © {new Date().getFullYear()} {LOJA.nome}. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

const Home = () => (
  <div className="space-y-20 pb-20">
    {/* Hero Section */}
    <section className="relative h-screen flex items-start justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero.png.png" 
          className="w-full h-full object-cover"
          alt="Tenda Ervas Hero"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540324155974-7523202daa3f?q=80&w=1920&auto=format&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
      </div>
      
      {/* O texto fica no alto para não cobrir o nome da loja no logo da imagem de fundo */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-[6vh] md:pt-[10vh]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h1 className="text-6xl md:text-8xl font-serif text-white mb-6 tracking-tight drop-shadow-2xl">
            Tenda Ervas
          </h1>

          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-lg">
            Sabedoria ancestral e equilíbrio natural para o seu dia a dia.
          </p>

          <Link 
            to="/produtos" 
            className="inline-flex items-center gap-2 bg-brand-olive text-white px-12 py-5 rounded-full hover:bg-brand-olive/90 transition-all shadow-2xl group text-lg font-bold"
          >
            <span>Explorar Produtos</span>
            <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>

    {/* About Section */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-brand-beige/20">
            <img 
              src="/hero.png.png" 
              className="w-full h-full object-cover"
              alt="Nossa Essência - Tenda Ervas"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1602928321679-560bb453f190?q=80&w=800&auto=format&fit=crop';
              }}
            />
          </div>
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-brand-mint/20 rounded-full -z-10 blur-3xl"></div>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-serif text-brand-olive">Nossa Essência</h2>
          <div className="w-20 h-1 bg-brand-mint"></div>
          <p className="text-gray-600 leading-relaxed text-lg">
            Tradição, Axé e Cuidado. Encontre o melhor em artigos religiosos de matriz africana, fitoterapia e itens para rituais. 
            Das velas que iluminam caminhos aos óleos que renovam o corpo, entregamos a essência do sagrado diretamente na sua casa.
          </p>
          <div className="pt-4 grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-brand-olive text-2xl">Axé</h4>
              <p className="text-sm text-gray-500 uppercase tracking-wider">Energia</p>
            </div>
            <div>
              <h4 className="font-bold text-brand-olive text-2xl">Tradição</h4>
              <p className="text-sm text-gray-500 uppercase tracking-wider">Ancestral</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

// Método que carrega as categorias da loja (tabela categorias, editável pela gestão), na ordem das abas
const useCategorias = () => {
  const [lista, setLista] = useState<string[]>(CATEGORIAS);
  useEffect(() => {
    supabase.from('categorias').select('nome').order('ordem').order('nome').then(({ data }) => {
      if (data?.length) setLista(data.map(c => c.nome));
    });
  }, []);
  return lista;
};

// Método que diz o que o cliente escolhe no produto: aroma, sabor ou cor
const tipoOpcao = (product: Product) =>
  ["Incensos", "Defumadores"].includes(product.category) ? "aroma" : product.category === "Fumo" ? "sabor" : "cor";

const ProductCard = ({ product, onAddToCart, onAbrir }: { product: Product, onAddToCart: (p: Product, qty: number, opcao?: string) => void, onAbrir: (p: Product) => void }) => {
  const [qty, setQty] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const esgotado = product.quantity <= 0;
  const temOpcoes = (product.options || []).length > 0;

  // Método que adiciona ao carrinho e mostra "Adicionado" no botão por um instante
  const adicionar = () => {
    onAddToCart(product, qty);
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 1500);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-brand-beige/10"
    >
      <button type="button" onClick={() => onAbrir(product)} className="block w-full aspect-square overflow-hidden relative shrink-0">
        <img 
          src={product.image_url || `https://picsum.photos/seed/${product.id}/600/600`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          alt={product.name}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-olive shadow-sm">
          {product.precoOriginal && <span className="line-through text-gray-400 font-normal mr-1">{reais(product.precoOriginal)}</span>}
          {reais(product.price)}
        </div>
        {product.precoOriginal && (
          <div className="absolute bottom-4 left-4 bg-brand-mint text-brand-olive px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">Promoção</div>
        )}
        {product.adult && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">18+</div>
        )}
      </button>
      <div className="p-6 flex flex-col flex-1 gap-3">
        <button type="button" onClick={() => onAbrir(product)} className="text-left">
          <h3 className="text-xl font-serif text-brand-olive hover:underline line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
        </button>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed min-h-[2.875rem]">{product.description}</p>
        <div className="flex flex-col gap-4 pt-2 mt-auto">
          {temOpcoes ? (
            <>
              <span className="text-xs text-gray-400 uppercase tracking-widest">{product.options.length} opções · Estoque: {product.quantity}</span>
              <button 
                onClick={() => onAbrir(product)}
                disabled={esgotado}
                className="w-full bg-brand-olive text-white py-2 rounded-full hover:bg-brand-olive/90 transition-colors shadow-md flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {esgotado ? "Esgotado" : `Escolher ${tipoOpcao(product)}`}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Estoque: {product.quantity}</span>
                <div className="flex items-center border border-brand-beige/30 rounded-full px-2 py-0.5">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-2 text-brand-olive">-</button>
                  <span className="mx-2 text-sm font-medium">{qty}</span>
                  <button onClick={() => setQty(Math.min(Math.max(1, product.quantity), qty + 1))} className="px-2 text-brand-olive">+</button>
                </div>
              </div>
              <button 
                onClick={adicionar}
                disabled={esgotado}
                className="w-full bg-brand-olive text-white py-2 rounded-full hover:bg-brand-olive/90 transition-colors shadow-md flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {esgotado ? "Esgotado" : adicionado ? <><Check size={16} /> Adicionado</> : <><Plus size={16} /> Adicionar {reais(product.price * qty)}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Janela do produto: foto grande, descrição, escolha da opção (a foto muda quando a opção tem foto própria) e quantidade
const JanelaProduto = ({ product, onFechar, onAddToCart }: { product: Product, onFechar: () => void, onAddToCart: (p: Product, qty: number, opcao?: string) => void }) => {
  // Com duas opções ou mais, o cliente também pode deixar a loja escolher (Aleatório)
  const opcoes = (product.options || []).length >= 2 ? [...product.options, { nome: "Aleatório" }] : (product.options || []);
  const [opcao, setOpcao] = useState<string | undefined>(opcoes.length === 1 ? opcoes[0].nome : undefined);
  const [qty, setQty] = useState(1);
  const esgotado = product.quantity <= 0;
  const foto = opcoes.find(o => o.nome === opcao)?.imagem || product.image_url || `https://picsum.photos/seed/${product.id}/600/600`;
  const falta = opcoes.length > 0 && !opcao;

  // Método que adiciona a opção escolhida ao carrinho e fecha a janela
  const adicionar = () => {
    onAddToCart(product, qty, opcao);
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFechar}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl grid grid-cols-1 sm:grid-cols-2"
      >
        <div className="relative bg-white">
          <img src={foto} alt={opcao ? `${product.name} - ${opcao}` : product.name} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
          {product.adult && <div className="absolute top-4 left-4 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold">18+</div>}
        </div>
        <div className="p-6 sm:p-8 space-y-5 relative">
          <button onClick={onFechar} aria-label="Fechar" className="absolute top-4 right-4 p-1 text-gray-500 hover:text-brand-olive"><X size={22} /></button>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">{product.category}</div>
            <h3 className="text-3xl font-serif text-brand-olive pr-8">{product.name}</h3>
            <div className="text-xl font-bold text-brand-olive mt-1">
              {product.precoOriginal && <span className="line-through text-gray-400 font-normal text-base mr-2">{reais(product.precoOriginal)}</span>}
              {reais(product.price)}
              {product.precoOriginal && <span className="ml-2 align-middle text-xs bg-brand-mint text-brand-olive px-2 py-0.5 rounded-full">Promoção</span>}
            </div>
          </div>
          {product.description && <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>}
          {product.adult && <p className="text-xs text-red-700 bg-red-50 rounded-xl p-3">Venda só para maiores de 18 anos. Conferimos pela data de nascimento do cadastro.</p>}
          {product.category === "Kits" && (
            <p className="text-xs text-gray-700 bg-brand-mint/20 rounded-xl p-3">
              As cores dos itens do kit são aleatórias. Para escolher a cor de cada item,{" "}
              <a href={linkWhatsApp(`Olá! Quero o ${product.name} e gostaria de escolher a cor dos itens.`)} target="_blank" rel="noreferrer" className="font-bold text-green-700 underline">chame no WhatsApp</a>.
            </p>
          )}
          {opcoes.length > 0 && (
            <div>
              <div className="text-sm font-medium text-brand-olive mb-2">Escolha {tipoOpcao(product) === "cor" ? "a cor" : `o ${tipoOpcao(product)}`}</div>
              <div className="flex flex-wrap gap-2">
                {opcoes.map(o => (
                  <button
                    key={o.nome}
                    type="button"
                    onClick={() => setOpcao(o.nome)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${opcao === o.nome ? "bg-brand-olive text-white border-brand-olive" : "border-brand-beige/50 text-gray-700 hover:border-brand-olive"}`}
                  >
                    {o.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Estoque: {product.quantity}</span>
            <div className="flex items-center border border-brand-beige/30 rounded-full px-2 py-0.5">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-2 text-brand-olive">-</button>
              <span className="mx-2 text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(Math.max(1, product.quantity), qty + 1))} className="px-2 text-brand-olive">+</button>
            </div>
          </div>
          <button
            onClick={adicionar}
            disabled={esgotado || falta}
            className="w-full bg-brand-olive text-white py-3 rounded-full font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {esgotado ? "Esgotado" : falta ? `Escolha ${tipoOpcao(product) === "cor" ? "a cor" : `o ${tipoOpcao(product)}`}` : <><Plus size={16} /> Adicionar {reais(product.price * qty)}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Products = ({ onAddToCart, isAdmin }: { onAddToCart: (p: Product, qty: number, opcao?: string) => void, isAdmin: boolean }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<Product | null>(null);
  const [busca, setBusca] = useSearchParams();
  const ordemCategorias = useCategorias();
  const categoria = busca.get("categoria") || "";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('ativo',true)
        .order('name');
      
      if (error) {
        console.error("Error fetching products:", error);
        setErro(error.message || "sem resposta");
      } else {
        setProducts(comEstoqueDosKits(data || []).map(comPromocao));
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const categorias = ordemCategorias.filter(c => products.some(p => p.category === c))
    .concat(Array.from(new Set<string>(products.map(p => p.category))).filter(c => c && !ordemCategorias.includes(c)));
  const visiveis = categoria ? products.filter(p => p.category === categoria) : products;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-10 space-y-4">
        <h2 className="text-5xl font-serif text-brand-olive">Nossa Coleção</h2>
        <p className="text-gray-500 max-w-xl mx-auto">Escolha os elementos que farão parte do seu próximo ritual.</p>
        
        {isAdmin && (
          <div className="pt-4">
            <button 
              onClick={() => navigate("/admin", { state: { tab: "add" } })}
              className="inline-flex items-center gap-2 bg-brand-olive text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <Plus size={20} /> Novo Produto
            </button>
          </div>
        )}
      </div>

      {categorias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:flex-wrap sm:justify-center">
          {["", ...categorias].map(c => (
            <button
              key={c || "todos"}
              onClick={() => setBusca(c ? { categoria: c } : {})}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${categoria === c ? "bg-brand-olive text-white border-brand-olive" : "bg-white/70 border-brand-beige/40 text-gray-700 hover:border-brand-olive"}`}
            >
              {c || "Todos"}
            </button>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {visiveis.map(product => (
          <div key={product.id} className="h-full">
            <ProductCard product={product} onAddToCart={onAddToCart} onAbrir={setAberto} />
          </div>
        ))}
      </div>
      
      {visiveis.length === 0 && (
        <div className="text-center py-20 space-y-6">
          <p className="text-gray-500">
            {erro ? "Não foi possível carregar os produtos. Tente de novo em alguns instantes." : "Nenhum produto cadastrado no momento."}
          </p>
          {isAdmin && erro && (
            <p className="max-w-xl mx-auto text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
              Aviso para o admin: o banco não respondeu ({erro}). Confira se o projeto Supabase está ativo.
            </p>
          )}
        </div>
      )}

      {aberto && <JanelaProduto product={aberto} onFechar={() => setAberto(null)} onAddToCart={onAddToCart} />}
    </div>
  );
};

// Pedido que o cliente está editando: o estoque que ele segura conta como disponível até o pedido ser refeito
type EdicaoPedido = { id: number, entrega: "Correios" | "Retirada", reservado: { [produto: number]: number } };

const Cart = ({ cart, onUpdateQuantity, onRemove, user, edicao, onDesistirEdicao }: { 
  cart: CartItem[], 
  onUpdateQuantity: (chave: string, delta: number) => void,
  onRemove: (chave: string) => void,
  user: any,
  edicao: EdicaoPedido | null,
  onDesistirEdicao: () => void
}) => {
  const navigate = useNavigate();
  const total = cart.reduce((acc, item) => acc + item.price * item.cartQuantity, 0);
  
  // Método que desiste da edição: o pedido continua como estava
  const desistirEdicao = () => {
    onDesistirEdicao();
    navigate("/meus-pedidos");
  };

  const handleGoToPayment = () => {
    if (!user) {
      navigate("/checkout", { state: { entrar: true, voltarPara: "/carrinho" } });
      return;
    }
    navigate("/pagamento");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 min-h-screen">
      <h2 className="text-4xl font-serif text-brand-olive mb-12">Seu Carrinho</h2>

      {edicao && (
        <div className="mb-8 bg-brand-mint/20 border border-brand-mint rounded-2xl p-5 text-sm text-gray-700 space-y-3">
          <p>
            Editando o pedido <strong>#{edicao.id}</strong>. Mude as quantidades, tire ou inclua produtos. Ao finalizar, o pedido #{edicao.id} é cancelado
            e um pedido novo é feito com os valores recalculados.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/produtos" className="text-brand-olive font-medium underline underline-offset-4">Incluir produtos</Link>
            <button onClick={desistirEdicao} className="text-brand-olive font-medium underline underline-offset-4">Desistir da edição</button>
          </div>
        </div>
      )}
      
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-brand-beige/40">
          <p className="text-gray-400 mb-6">Seu carrinho está vazio.</p>
          <Link to="/produtos" className="text-brand-olive font-medium underline underline-offset-4">Explorar produtos</Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-brand-beige/10">
            {cart.map(item => (
              <div key={chaveCarrinho(item.id, item.opcao)} className="flex items-center gap-6 p-6 border-b border-brand-beige/10 last:border-0">
                <img 
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`} 
                  className="w-20 h-20 object-cover rounded-xl"
                  alt={item.name}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-brand-olive">{item.name}</h3>
                  {item.opcao && <p className="text-sm text-gray-600">{item.opcao}</p>}
                  {item.category === "Kits" && (
                    <p className="text-xs text-gray-500">
                      Cores dos itens aleatórias.{" "}
                      <a href={linkWhatsApp(`Olá! Quero o ${item.name} e gostaria de escolher a cor dos itens.`)} target="_blank" rel="noreferrer" className="text-green-700 underline">Escolher pelo WhatsApp</a>
                    </p>
                  )}
                  <p className="text-sm text-gray-400">{reais(item.price)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-brand-beige/30 rounded-full px-3 py-1">
                    <button onClick={() => onUpdateQuantity(chaveCarrinho(item.id, item.opcao), -1)} className="text-brand-olive hover:opacity-50">-</button>
                    <span className="mx-4 text-sm font-medium">{item.cartQuantity}</span>
                    <button onClick={() => onUpdateQuantity(chaveCarrinho(item.id, item.opcao), 1)} className="text-brand-olive hover:opacity-50">+</button>
                  </div>
                  <button onClick={() => onRemove(chaveCarrinho(item.id, item.opcao))} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-brand-olive text-white p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex justify-between items-center text-xl font-serif">
              <span>Total do Pedido</span>
              <span>{reais(total)}</span>
            </div>
            <p className="text-sm text-brand-paper/70 leading-relaxed">
              Pagamento por PIX. Envio pelos Correios, com frete combinado pelo WhatsApp, ou retirada em {LOJA.localRetirada || LOJA.cidade}.
            </p>
            <button 
              onClick={handleGoToPayment}
              className="w-full bg-brand-mint text-brand-olive font-bold py-4 rounded-full hover:bg-brand-mint/90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Confirme seu pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Método que lista as colunas de todos os registros da grade, na ordem em que aparecem
const colunasRegistros = (registros: any[]) => Array.from(new Set(registros.flatMap(r => Object.keys(r))));

// Método que mostra o valor de uma coluna na grade de registros
const valorCelula = (valor: any) =>
  valor === null || valor === undefined ? "—"
  : typeof valor === "boolean" ? (valor ? "sim" : "não")
  : typeof valor === "object" ? JSON.stringify(valor)
  : /^\d{4}-\d{2}-\d{2}T/.test(String(valor)) ? new Date(valor).toLocaleString("pt-BR")
  : String(valor);

const Admin = ({ isAdmin, ehDono }: { isAdmin: boolean, ehDono: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = isAdmin;
  const [activeTab, setActiveTab] = useState<"products" | "add" | "orders" | "usuarios" | "supabase">("products");

  useEffect(() => {
    const state = location.state as { tab?: string };
    if (state?.tab) {
      setActiveTab(state.tab as any);
    }
  }, [location]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [erroBanco, setErroBanco] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", quantity: "", category: "Ervas", opcoes: "", adult: false });
  const [image, setImage] = useState<File | null>(null);
  const [categoriaNova, setCategoriaNova] = useState(false);
  const [editando, setEditando] = useState<Product | null>(null);
  const [tabelaAberta, setTabelaAberta] = useState("");
  const [registros, setRegistros] = useState<any[]>([]);
  const [carregandoRegistros, setCarregandoRegistros] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [idsAdmin, setIdsAdmin] = useState<string[]>([]);
  const [idsDono, setIdsDono] = useState<string[]>([]);
  const [idsGestao, setIdsGestao] = useState<string[]>([]);
  const [meuId, setMeuId] = useState("");
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", senha: "", administrador: false });
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
  // Categorias fixas mais as criadas no cadastro de produtos
  const ordemCategorias = useCategorias();
  const categoriasCadastro = ordemCategorias.concat(Array.from(new Set<string>(products.map(p => p.category))).filter(c => c && !ordemCategorias.includes(c)));
  const [supabaseStatus, setSupabaseStatus] = useState<{ [key: string]: string }>({
    products: "Checking...",
    admin: "Checking...",
    users: "Checking...",
    orders: "Checking...",
    equipe: "Checking..."
  });

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        const { data: productsData, error: erroProdutos } = await supabase.from('products').select('*').eq('ativo',true);
        setProducts(comEstoqueDosKits(productsData || []));
        
        const { data: ordersData, error: erroPedidos } = await supabase.from('orders').select('*, users(email, phone, cpf, address, cep, number)').order('created_at', { ascending: false });
        setOrders(ordersData || []);
        const erroCarga = erroProdutos || erroPedidos;
        setErroBanco(erroCarga ? (erroCarga.message || "sem resposta") : "");

        testSupabase();
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const testSupabase = async () => {
    const tables = ['products', 'admin', 'users', 'orders', 'equipe'];
    const newStatus: { [key: string]: string } = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes("does not exist")) {
            newStatus[table] = "❌ Not Found";
          } else {
            newStatus[table] = `⚠️ ${error.message}`;
          }
        } else {
          newStatus[table] = "✅ OK";
        }
      } catch (err: any) {
        newStatus[table] = `❌ Failed: ${err.message}`;
      }
    }
    setSupabaseStatus(newStatus);
  };

  // Método que abre os registros de uma tabela na aba Supabase (clicar de novo fecha)
  const verRegistros = async (tabela: string) => {
    if (tabelaAberta === tabela) {
      setTabelaAberta("");
      return;
    }
    setTabelaAberta(tabela);
    setRegistros([]);
    setCarregandoRegistros(true);
    const { data, error } = await supabase.from(tabela).select('*').order('created_at', { ascending: false }).limit(200);
    if (error) {
      setCarregandoRegistros(false);
      alert(`Erro ao ler ${tabela}: ${error.message}`);
      return;
    }
    // Nas tabelas admin e equipe, mostra se a pessoa é só admin, só da gestão ou as duas coisas
    if (tabela === 'admin' || tabela === 'equipe') {
      const { data: outra } = await supabase.from(tabela === 'admin' ? 'equipe' : 'admin').select('user_id');
      const naOutra = new Set((outra || []).map(r => r.user_id));
      setRegistros((data || []).map(({ user_id, email, nome, ...resto }) => ({
        user_id, email, nome,
        acesso: naOutra.has(user_id) ? "Admin e gestão" : tabela === 'admin' ? "Só admin" : "Só gestão",
        ...resto
      })));
    } else {
      setRegistros(data || []);
    }
    setCarregandoRegistros(false);
  };

  // Método que carrega os usuários, quem deles é administrador e quem acessa a gestão
  const carregarUsuarios = async () => {
    const [{ data: lista, error }, { data: admins }, { data: equipe }, { data: { user } }] = await Promise.all([
      supabase.from('users').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
      supabase.from('admin').select('user_id, dono'),
      supabase.from('equipe').select('user_id'),
      supabase.auth.getUser()
    ]);
    if (error) {
      alert(`Erro ao carregar os usuários: ${error.message}`);
      return;
    }
    setUsuarios(lista || []);
    setIdsAdmin((admins || []).map(a => a.user_id));
    setIdsDono((admins || []).filter(a => a.dono).map(a => a.user_id));
    setIdsGestao((equipe || []).map(e => e.user_id));
    setMeuId(user?.id || "");
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === "usuarios") carregarUsuarios();
  }, [isLoggedIn, activeTab]);

  // Método que libera ou retira o acesso ao painel administrativo
  const alternarAdmin = async (id: string, ehAdmin: boolean, email: string) => {
    if (ehAdmin && !window.confirm(`Retirar o acesso administrativo de ${email}?`)) return;
    const { error } = ehAdmin
      ? await supabase.from('admin').delete().eq('user_id', id)
      : await supabase.from('admin').insert({ user_id: id });
    if (error) {
      alert(`Erro ao alterar o acesso: ${error.message}`);
      return;
    }
    carregarUsuarios();
  };

  // Método que libera ou retira o acesso à gestão (só o dono consegue; o banco confere)
  const alternarGestao = async (id: string, temAcesso: boolean, email: string) => {
    if (temAcesso && !window.confirm(`Retirar o acesso de ${email} à gestão?`)) return;
    const { error } = temAcesso
      ? await supabase.from('equipe').delete().eq('user_id', id)
      : await supabase.from('equipe').insert({ user_id: id });
    if (error) {
      alert(`Erro ao alterar o acesso à gestão: ${error.message}`);
      return;
    }
    carregarUsuarios();
  };

  // Método que cria o login pela Edge Function criar-usuario
  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoUsuario(true);
    const { error } = await supabase.functions.invoke('criar-usuario', { body: novoUsuario });
    setSalvandoUsuario(false);
    if (error) {
      const corpo = await (error as any).context?.json?.().catch(() => null);
      alert(`Erro ao cadastrar usuário: ${corpo?.erro || error.message}`);
      return;
    }
    setNovoUsuario({ nome: "", email: "", senha: "", administrador: false });
    alert("Usuário cadastrado!");
    carregarUsuarios();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Login pelo Supabase Auth; quem é administrador é decidido pelo banco (tabela admin)
      const { error } = await supabase.auth.signInWithPassword({ email: username, password });
      if (error) {
        alert("Usuário ou senha incorretos");
        return;
      }

      const { data: ehAdmin, error: erroAdmin } = await supabase.rpc('is_admin');
      if (erroAdmin) throw erroAdmin;

      if (!ehAdmin) {
        await supabase.auth.signOut();
        alert("Este usuário não tem acesso administrativo");
      }
    } catch (err: any) {
      alert(`Erro no login: ${err.message}`);
      console.error("Login error:", err);
    }
  };

  // Método que abre o formulário vazio para cadastrar um produto novo
  const novoProduto = () => {
    setEditando(null);
    setNewProduct({ name: "", description: "", price: "", quantity: "", category: "Ervas", opcoes: "", adult: false });
    setCategoriaNova(false);
    setImage(null);
    setActiveTab("add");
  };

  // Método que abre o formulário com os dados do produto para alterar
  const editarProduto = (p: Product) => {
    setEditando(p);
    setNewProduct({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      quantity: String(p.quantity),
      category: p.category,
      opcoes: (p.options || []).map(o => o.nome).join(", "),
      adult: p.adult
    });
    setCategoriaNova(false);
    setImage(null);
    setActiveTab("add");
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = "";
      
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      const dados = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
        // Na alteração sem foto nova, fica a foto que o produto já tinha
        image_url: imageUrl || editando?.image_url || "",
        category: categoriasCadastro.find(c => c.toLowerCase() === newProduct.category.trim().toLowerCase()) ?? newProduct.category.trim(),
        // Opção que já existia mantém a foto dela
        options: newProduct.opcoes.split(",").map(o => o.trim()).filter(Boolean).map(nome => editando?.options?.find(o => o.nome === nome) ?? { nome }),
        adult: newProduct.adult
      };

      const { data, error } = editando
        ? await supabase.from('products').update(dados).eq('id', editando.id).select().single()
        : await supabase.from('products').insert([dados]).select().single();

      if (error) throw error;

      setProducts(editando ? products.map(p => p.id === editando.id ? data : p) : [...products, data]);
      setNewProduct({ name: "", description: "", price: "", quantity: "", category: "Ervas", opcoes: "", adult: false });
      setCategoriaNova(false);
      setImage(null);
      setEditando(null);
      alert(editando ? "Produto alterado com sucesso!" : "Produto cadastrado com sucesso!");
    } catch (err: any) {
      alert((editando ? "Erro ao alterar produto: " : "Erro ao cadastrar produto: ") + err.message);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (newStatus === "pedido cancelado" && !window.confirm("Cancelar o pedido devolve os itens ao estoque e não pode ser desfeito. Cancelar?")) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      alert("Erro ao atualizar status: " + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    const produto = products.find(p => p.id === id);
    if (!window.confirm(`Excluir ${produto?.name ?? "o produto"}? Ele sai do site e não dá para desfazer.`)) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (!error) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert("Erro ao excluir produto: " + error.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-brand-beige/20">
          <h2 className="text-3xl font-serif text-brand-olive mb-8 text-center">Acesso Restrito</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <input
                type="email"
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-beige/30 focus:ring-2 focus:ring-brand-olive outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <CampoSenha value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-beige/30 focus:ring-2 focus:ring-brand-olive outline-none"
              />
            </div>
            <button className="w-full bg-brand-olive text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      {erroBanco && (
        <div className="mb-8 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          O banco não respondeu ({erroBanco}). Os produtos e pedidos podem estar incompletos; confira se o projeto Supabase está ativo.
        </div>
      )}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-8">
          <h2 className="text-4xl font-serif text-brand-olive">Painel Administrativo</h2>
          <div className="flex bg-brand-beige/10 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab("products")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "products" ? "bg-brand-olive text-white shadow-md" : "text-gray-500 hover:text-brand-olive"}`}
            >
              Lista de Produtos
            </button>
            <button 
              onClick={novoProduto}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "add" ? "bg-brand-olive text-white shadow-md" : "text-gray-500 hover:text-brand-olive"}`}
            >
              <Plus size={14} /> Cadastrar Novo
            </button>
            <button 
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "orders" ? "bg-brand-olive text-white shadow-md" : "text-gray-500 hover:text-brand-olive"}`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab("usuarios")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "usuarios" ? "bg-brand-olive text-white shadow-md" : "text-gray-500 hover:text-brand-olive"}`}
            >
              Usuários
            </button>
            <button
              onClick={() => setActiveTab("supabase")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "supabase" ? "bg-brand-olive text-white shadow-md" : "text-gray-500 hover:text-brand-olive"}`}
            >
              <Database size={14} /> Supabase
            </button>
          </div>
        </div>
        <button 
          onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium"
        >
          <LogOut size={20} /> Sair
        </button>
      </div>

      {activeTab === "add" ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-brand-beige/20">
            <h3 className="text-2xl font-serif text-brand-olive mb-6">{editando ? "Alterar Produto" : "Cadastrar Novo Produto"}</h3>
            <form onSubmit={(e) => { handleAddProduct(e); setActiveTab("products"); }} className="space-y-4">
              <input 
                placeholder="Nome do produto" 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                required
              />
              <textarea 
                placeholder="Descrição" 
                value={newProduct.description} 
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30 h-24"
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Preço (R$)"
                  value={newProduct.price} 
                  onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                  required
                />
                <input 
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Qtd em estoque"
                  value={newProduct.quantity} 
                  onChange={e => setNewProduct({...newProduct, quantity: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                  required
                />
              </div>
              <select
                value={categoriaNova ? "__nova__" : newProduct.category}
                onChange={e => {
                  const nova = e.target.value === "__nova__";
                  setCategoriaNova(nova);
                  setNewProduct({...newProduct, category: nova ? "" : e.target.value});
                }}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30 bg-white"
              >
                {categoriasCadastro.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__nova__">+ Nova categoria</option>
              </select>
              {categoriaNova && (
                <input
                  placeholder="Nome da nova categoria"
                  value={newProduct.category}
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                  autoFocus
                  required
                />
              )}
              <input 
                placeholder="Opções separadas por vírgula (ex.: Azul, Rosa, Verde) — deixe vazio se não tiver" 
                value={newProduct.opcoes} 
                onChange={e => setNewProduct({...newProduct, opcoes: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={newProduct.adult} onChange={e => setNewProduct({...newProduct, adult: e.target.checked})} className="accent-brand-olive" />
                Só para maiores de 18 anos (fumo)
              </label>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-widest">{editando?.image_url ? "Trocar a Foto (opcional)" : "Foto do Produto"}</label>
                {editando?.image_url && !image && (
                  <img src={editando.image_url} alt={editando.name} className="w-20 h-20 object-cover rounded-lg" referrerPolicy="no-referrer" />
                )}
                <input 
                  type="file" 
                  onChange={e => setImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-mint file:text-brand-olive hover:file:bg-brand-mint/80"
                />
              </div>
              <button className="w-full bg-brand-olive text-white py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all">
                {editando ? "Salvar Alterações" : "Cadastrar Produto"}
              </button>
              {editando && (
                <button type="button" onClick={() => { setEditando(null); setActiveTab("products"); }} className="w-full py-3 rounded-full font-medium text-gray-500 border border-brand-beige/30 hover:bg-gray-50">
                  Cancelar
                </button>
              )}
            </form>
          </div>
        </div>
      ) : activeTab === "products" ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif text-brand-olive">Produtos Cadastrados</h3>
            <button 
              onClick={novoProduto}
              className="flex items-center gap-2 bg-brand-olive text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              <Plus size={16} /> Novo Produto
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-brand-beige/20 overflow-hidden">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-6 p-6 border-b border-brand-beige/10 last:border-0">
                <img 
                  src={p.image_url || `https://picsum.photos/seed/${p.id}/200/200`} 
                  className="w-16 h-16 object-cover rounded-lg"
                  alt={p.name}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-brand-olive">{p.name}</h4>
                  <p className="text-xs text-gray-400">{p.category} • {reais(p.price)} • Est: {p.quantity}{(p.options || []).length > 0 ? ` • ${p.options.length} opções` : ""}{p.adult ? " • 18+" : ""}</p>
                </div>
                <button onClick={() => editarProduto(p)} title="Alterar produto" className="text-gray-400 hover:text-brand-olive">
                  <Pencil size={20} />
                </button>
                <button onClick={() => handleDelete(p.id)} title="Excluir produto" className="text-red-400 hover:text-red-600">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            {products.length === 0 && (
              <div className="p-12 text-center text-gray-400">Nenhum produto cadastrado.</div>
            )}
          </div>
        </div>
      ) : activeTab === "orders" ? (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-brand-olive">Pedidos Recebidos</h3>
          <div className="bg-white rounded-3xl shadow-sm border border-brand-beige/20 overflow-hidden">
            <div className="grid grid-cols-4 p-4 bg-brand-beige/5 border-b border-brand-beige/10 text-xs font-bold uppercase tracking-wider text-gray-500">
              <div>Cliente</div>
              <div>Entrega</div>
              <div className="col-span-2">Descrição do Pedido</div>
            </div>
            {orders.map(order => (
              <div key={order.id} className="grid grid-cols-4 p-6 border-b border-brand-beige/10 last:border-0 items-center">
                <div>
                  <div className="font-medium text-brand-olive">{order.customer_name}</div>
                  {order.users && (
                    <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                      {order.users.phone && (
                        <a href={`https://wa.me/55${order.users.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")}`} target="_blank" rel="noreferrer" className="block text-green-700 hover:underline">
                          WhatsApp {order.users.phone}
                        </a>
                      )}
                      <div>{order.users.email}</div>
                      <div>{order.users.address} · CEP {order.users.cep}</div>
                      {order.users.cpf && <div>CPF {order.users.cpf}</div>}
                    </div>
                  )}
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${order.delivery_method === "Retirada" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-600"}`}>
                    {order.delivery_method}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-2">Pedido #{order.id} · {order.payment_method}{order.pedido_anterior ? ` · substitui o #${order.pedido_anterior}` : ""}</div>
                </div>
                <div className="col-span-2 flex justify-between items-center">
                  <div className="text-sm text-gray-600 flex-1">
                    {order.description}
                    <div className="text-[10px] text-gray-400 mt-1">Total: {reais(order.total_price)} • {new Date(order.created_at).toLocaleString()}</div>
                  </div>
                  <div className="ml-4">
                    <select 
                      value={order.status}
                      disabled={order.status === "pedido cancelado"}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="text-xs border border-brand-beige/30 rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-brand-olive disabled:opacity-60"
                    >
                      {Object.entries(STATUS_PEDIDO).map(([valor, nome]) => (
                        <option key={valor} value={valor}>{nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-12 text-center text-gray-400">Nenhum pedido recebido ainda.</div>
            )}
          </div>
        </div>
      ) : activeTab === "usuarios" ? (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-brand-olive">Usuários</h3>
          <div className="bg-brand-mint/10 border border-brand-mint/30 rounded-2xl p-5 text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p>
              Quem tem o selo <strong>Gestão</strong> entra no sistema de gestão com o mesmo e-mail e senha da loja.
              {ehDono ? " Você é o dono: só você libera ou retira esse acesso." : " Só o dono da loja libera ou retira esse acesso."}
            </p>
            <a href={LOJA.urlGestao} target="_blank" rel="noreferrer" className="shrink-0 text-brand-olive font-bold underline underline-offset-4">Abrir a gestão</a>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-brand-beige/20">
            <h4 className="text-lg font-serif text-brand-olive mb-4">Cadastrar usuário</h4>
            <form onSubmit={handleAddUsuario} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Nome"
                value={novoUsuario.nome}
                onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                required
              />
              <input
                type="email"
                placeholder="E-mail"
                value={novoUsuario.email}
                onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                required
              />
              <input
                type="password"
                placeholder="Senha (mínimo 6 caracteres)"
                value={novoUsuario.senha}
                onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-brand-beige/30"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={novoUsuario.administrador} onChange={e => setNovoUsuario({...novoUsuario, administrador: e.target.checked})} className="accent-brand-olive" />
                Administrador (acessa este painel)
              </label>
              <button disabled={salvandoUsuario} className="md:col-span-2 w-full bg-brand-olive text-white py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                {salvandoUsuario ? "Cadastrando..." : "Cadastrar Usuário"}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-3">O login já sai confirmado. Depois a pessoa pode trocar a senha em "Esqueci minha senha".</p>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-brand-beige/20 overflow-hidden">
            {usuarios.map(u => {
              const ehAdmin = idsAdmin.includes(u.id);
              const ehDonoDaLoja = idsDono.includes(u.id);
              const temGestao = idsGestao.includes(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between gap-4 p-6 border-b border-brand-beige/10 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">
                      {u.full_name || "Sem nome"}
                      {ehDonoDaLoja && <span className="ml-2 text-xs font-bold text-white bg-brand-olive px-2 py-0.5 rounded-full">Dono</span>}
                      {ehAdmin && <span className="ml-2 text-xs font-bold text-brand-olive bg-brand-mint/30 px-2 py-0.5 rounded-full">Admin</span>}
                      {temGestao && <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Gestão</span>}
                    </p>
                    <p className="text-xs text-gray-400">{u.email} • desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => alternarGestao(u.id, temGestao, u.email)}
                      disabled={!ehDono}
                      title={ehDono ? "" : "Só o dono libera ou retira o acesso à gestão"}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${temGestao ? "border-red-200 text-red-500 hover:bg-red-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}`}
                    >
                      {temGestao ? "Retirar gestão" : "Liberar gestão"}
                    </button>
                    <button
                      onClick={() => alternarAdmin(u.id, ehAdmin, u.email)}
                      disabled={u.id === meuId || ehDonoDaLoja}
                      title={u.id === meuId ? "Você não pode retirar o próprio acesso" : ehDonoDaLoja ? "O dono continua sempre administrador" : ""}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${ehAdmin ? "border-red-200 text-red-500 hover:bg-red-50" : "border-brand-olive/30 text-brand-olive hover:bg-brand-mint/20"}`}
                    >
                      {ehAdmin ? "Retirar admin" : "Tornar admin"}
                    </button>
                  </div>
                </div>
              );
            })}
            {usuarios.length === 0 && (
              <div className="p-12 text-center text-gray-400">Nenhum usuário cadastrado.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-brand-olive">Integração Supabase</h3>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-brand-beige/20 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(supabaseStatus) as [string, string][]).map(([table, status]) => (
                <button
                  key={table}
                  onClick={() => verRegistros(table)}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${tabelaAberta === table ? "bg-brand-mint/10 border-brand-olive/40" : "bg-gray-50 border-gray-100 hover:border-brand-olive/30"}`}
                >
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-brand-olive" />
                    <span className="text-sm font-medium text-gray-700 capitalize">{table}</span>
                    <span className="text-xs text-gray-400">{tabelaAberta === table ? "ocultar registros" : "ver registros"}</span>
                  </div>
                  <span className={`text-xs font-bold ${status.includes("✅") ? "text-green-600" : "text-red-500"}`}>
                    {status}
                  </span>
                </button>
              ))}
            </div>

            {tabelaAberta && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {carregandoRegistros
                    ? `Carregando ${tabelaAberta}...`
                    : `${registros.length} registro(s) em ${tabelaAberta}${registros.length === 200 ? " (os 200 mais recentes)" : ""}`}
                </p>
                {registros.length > 0 && (
                  <div className="overflow-auto max-h-[28rem] rounded-xl border border-gray-100">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {colunasRegistros(registros).map(c => (
                            <th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            {colunasRegistros(registros).map(c => (
                              <td key={c} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate" title={valorCelula(r[c])}>{valorCelula(r[c])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Abaixo está o status de cada tabela necessária para o funcionamento completo da Tenda Ervas no Supabase.
              </p>
              <div className="bg-brand-mint/10 p-4 rounded-xl border border-brand-mint/20">
                <code className="text-xs text-brand-olive block">
                  // Tabelas verificadas:<br/>
                  - products (Estoque)<br/>
                  - admin (Acesso administrativo)<br/>
                  - equipe (Acesso à gestão)<br/>
                  - users (Clientes)<br/>
                  - orders (Vendas)
                </code>
              </div>
              <button 
                onClick={testSupabase}
                className="bg-brand-olive text-white px-6 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-all"
              >
                Verificar Novamente
              </button>

              <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-200">
                <h4 className="text-sm font-bold text-green-800 mb-2">Pronto para Netlify/Vercel! ✅</h4>
                <p className="text-xs text-green-700 leading-relaxed">
                  Este projeto foi convertido para uma <strong>SPA (Single Page Application)</strong>. Isso significa que ele funciona perfeitamente na Netlify ou Vercel!
                </p>
                <p className="text-xs text-green-700 mt-2 leading-relaxed">
                  <strong>Importante:</strong> As tabelas <code>admin</code>, <code>products</code>, <code>users</code> e <code>orders</code>, o bucket <code>product-images</code> e as regras de acesso são criados pelo arquivo <code>supabase/schema.sql</code>, rodado no SQL Editor do Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bloco com a chave PIX e o botão do WhatsApp, usado no fim da compra e em "Meus pedidos"
const InstrucoesPagamento = ({ pedido }: { pedido: { id: number, description: string, total_price: number, delivery_method: string } }) => {
  const [copiado, setCopiado] = useState(false);

  // Método que copia a chave PIX para a área de transferência
  const copiarChave = async () => {
    try {
      await navigator.clipboard.writeText(LOJA.chavePix);
      setCopiado(true);
    } catch {
      alert(`Chave PIX: ${LOJA.chavePix}`);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <p className="text-gray-700 leading-relaxed">
        {pedido.delivery_method === "Retirada"
          ? <>Pague <strong>{reais(Number(pedido.total_price))}</strong> pelo PIX e mande o comprovante pelo WhatsApp. Combinamos a retirada por lá.</>
          : <>Mande o pedido pelo WhatsApp para calcularmos o frete dos Correios. Depois é só pagar pelo PIX o valor dos produtos ({reais(Number(pedido.total_price))}) mais o frete.</>}
      </p>
      <div className="bg-brand-mint/20 p-5 rounded-2xl">
        <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">Chave PIX</div>
        {LOJA.chavePix ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-brand-olive break-all">{LOJA.chavePix}</div>
              {LOJA.favorecidoPix && <div className="text-xs text-gray-600 mt-1">{LOJA.favorecidoPix}</div>}
            </div>
            <button onClick={copiarChave} className="shrink-0 text-sm font-medium text-brand-olive border border-brand-olive rounded-full px-4 py-1.5 hover:bg-brand-olive hover:text-white transition-all">
              {copiado ? "Copiada!" : "Copiar"}
            </button>
          </div>
        ) : (
          <div className="text-gray-700">Enviamos a chave pelo WhatsApp.</div>
        )}
      </div>
      <a
        href={linkWhatsApp(mensagemPedido(pedido))}
        target="_blank"
        rel="noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-full hover:bg-green-700 transition-all shadow-lg"
      >
        <Phone size={18} /> Enviar pedido pelo WhatsApp
      </a>
      <BotaoCombinarEntrega pedido={pedido} />
    </div>
  );
};

// Botão que abre o WhatsApp da loja com a mensagem para combinar a entrega ou a retirada
const BotaoCombinarEntrega = ({ pedido }: { pedido: { id: number, delivery_method: string } }) => (
  <a
    href={linkWhatsApp(mensagemEntrega(pedido))}
    target="_blank"
    rel="noreferrer"
    className="w-full inline-flex items-center justify-center gap-2 border-2 border-green-600 text-green-700 font-bold py-3 rounded-full hover:bg-green-50 transition-all"
  >
    <Phone size={18} /> Combinar a {pedido.delivery_method === "Retirada" ? "retirada" : "entrega"} pelo WhatsApp
  </a>
);

const PaymentPage = ({ cart, user, edicao, onPedidoFeito }: { cart: CartItem[], user: any, edicao: EdicaoPedido | null, onPedidoFeito: () => void }) => {
  const [pedido, setPedido] = useState<{ id: number, description: string, total_price: number, delivery_method: string, anterior?: number } | null>(null);
  const [entrega, setEntrega] = useState<"Correios" | "Retirada">(edicao?.entrega || "Correios");
  const [loading, setLoading] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<{ codigo: string; valor: number; prazoDias: number | null } | null>(null);
  const navigate = useNavigate();
  const total = cart.reduce((acc, item) => acc + item.price * item.cartQuantity, 0);

  useEffect(() => {
    if (cart.length === 0 && !pedido) navigate("/produtos");
    if (!user || !cadastroCompleto(user)) navigate("/checkout");
  }, [cart, user, pedido]);

  const handleFinalize = async () => {
    setLoading(true);

    try {
      // O banco confere o estoque, calcula o total pelos preços cadastrados e grava o pedido no nome do cliente logado;
      // na edição, cancela o pedido anterior e grava o novo na mesma transação
      const dados = {
        p_itens: cart.map(item => ({ id: item.id, quantidade: item.cartQuantity, opcao: item.opcao })),
        p_forma_pagamento: "PIX",
        p_entrega: entrega
      };
      const { data, error } = edicao
        ? await supabase.rpc('refazer_pedido', { p_pedido: edicao.id, ...dados })
        : await supabase.rpc('criar_pedido', dados);

      if (error) throw error;

      setPedido({
        id: data,
        description: cart.map(item => `${item.cartQuantity}x ${item.name}${item.opcao ? ` (${item.opcao})` : ""}`).join(", "),
        total_price: total,
        delivery_method: entrega,
        anterior: edicao?.id
      });
      onPedidoFeito();
    } catch (error: any) {
      console.error("Erro ao salvar pedido:", error);
      alert("Erro ao finalizar pedido: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (pedido) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 min-h-screen flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl border border-brand-beige/20 text-center space-y-6 w-full"
        >
          <div className="w-20 h-20 bg-brand-mint/30 rounded-full flex items-center justify-center mx-auto text-brand-olive">
            <Leaf size={40} />
          </div>
          <h2 className="text-4xl font-serif text-brand-olive">Pedido #{pedido.id} recebido!</h2>
          {pedido.anterior && <p className="text-sm text-gray-600">Ele substitui o pedido #{pedido.anterior}, que foi cancelado.</p>}
          <InstrucoesPagamento pedido={pedido} />
          <div className="pt-2">
            <Link to="/meus-pedidos" className="text-brand-olive font-medium underline underline-offset-4">
              Ver meus pedidos
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 min-h-screen">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-brand-beige/20">
        <h2 className="text-3xl font-serif text-brand-olive mb-8 text-center">Resumo do Pedido</h2>
        {edicao && (
          <p className="-mt-4 mb-8 text-sm text-gray-600 text-center">
            Ao finalizar, o pedido #{edicao.id} é cancelado e este entra no lugar dele.
          </p>
        )}
        
        <div className="space-y-4 mb-8">
          {cart.map(item => (
            <div key={chaveCarrinho(item.id, item.opcao)} className="flex justify-between text-sm border-b border-brand-beige/10 pb-2">
              <span className="text-gray-600">{item.cartQuantity}x {item.name}{item.opcao ? ` (${item.opcao})` : ""}</span>
              <span className="font-medium text-brand-olive">{reais((item.price * item.cartQuantity))}</span>
            </div>
          ))}
          <div className="flex justify-between text-xl font-serif pt-4 text-brand-olive">
            <span>Total dos produtos</span>
            <span>{reais(total)}</span>
          </div>
        </div>

        <div className="mb-8">
          <h4 className="font-medium text-brand-olive mb-4">Entrega</h4>
          <div className="grid grid-cols-2 gap-4">
            {(["Correios", "Retirada"] as const).map(opcao => (
              <button
                key={opcao}
                onClick={() => { setEntrega(opcao); setCotacaoSelecionada(null); }}
                className={`py-3 rounded-xl border-2 transition-all font-medium ${
                  entrega === opcao 
                    ? "border-brand-olive bg-brand-olive text-white" 
                    : "border-brand-beige/30 text-gray-500 hover:border-brand-olive/50"
                }`}
              >
                {opcao === "Correios" ? "Correios" : "Retirar"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-mint/20 p-6 rounded-2xl mb-8">
          {entrega === "Correios" ? (
            <>
              <h4 className="font-medium text-brand-olive mb-2 flex items-center gap-2">
                <MapPin size={18} /> Endereço de Entrega
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {user?.full_name}<br />
                {user?.address}<br />
                CEP: {user?.cep}
              </p>
              <p className="text-sm text-gray-600 mt-3">O frete dos Correios é combinado pelo WhatsApp depois de finalizar.</p>
              <CotacaoCorreios cep={user?.cep} selecionada={cotacaoSelecionada} aoSelecionar={setCotacaoSelecionada} />
              {cotacaoSelecionada && (
                <p className="text-sm mt-3 text-brand-olive font-semibold">
                  Serviço selecionado para combinar com a loja: {cotacaoSelecionada.codigo} · {reais(cotacaoSelecionada.valor)}.
                  O frete não será cobrado junto com os produtos neste pedido.
                </p>
              )}
              <a href={linkWhatsApp(cotacaoSelecionada
                ? `Olá! Estou fazendo um pedido no site. Consultei o serviço ${cotacaoSelecionada.codigo} dos Correios com frete de ${reais(cotacaoSelecionada.valor)}${cotacaoSelecionada.prazoDias == null ? '' : ` e prazo estimado de ${cotacaoSelecionada.prazoDias} dias úteis`}. Gostaria de confirmar esse frete antes de pagar.`
                : "Olá! Estou fazendo um pedido no site e queria combinar a entrega pelos Correios.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-green-700 hover:underline">
                <Phone size={16} /> Combinar a entrega pelo WhatsApp
              </a>
            </>
          ) : (
            <>
              <h4 className="font-medium text-brand-olive mb-2 flex items-center gap-2">
                <MapPin size={18} /> Retirada
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {LOJA.localRetirada || LOJA.cidade}. Combinamos o dia e o horário pelo WhatsApp.
              </p>
              <a href={linkWhatsApp(`Olá! Estou fazendo um pedido no site e queria combinar a retirada em ${LOJA.localRetirada || LOJA.cidade}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-green-700 hover:underline">
                <Phone size={16} /> Combinar a retirada pelo WhatsApp
              </a>
            </>
          )}
        </div>

        <div className="mb-8">
          <h4 className="font-medium text-brand-olive mb-2">Pagamento</h4>
          <p className="text-sm text-gray-600">PIX. Depois de finalizar, mostramos a chave e o botão para enviar o comprovante pelo WhatsApp.</p>
        </div>

        {cart.some(item => item.adult) && !maiorDeIdade(user?.birth_date) && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
            Seu carrinho tem itens só para maiores de 18 anos. {user?.birth_date ? "Pela data de nascimento do cadastro, a compra não é permitida." : <>Informe sua data de nascimento em <Link to="/minha-conta" className="underline">Minha conta</Link> para continuar.</>}
          </p>
        )}
        <button 
          onClick={handleFinalize}
          disabled={loading || (cart.some(item => item.adult) && !maiorDeIdade(user?.birth_date))}
          className="w-full bg-brand-olive text-white font-bold py-5 rounded-full hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3 text-lg disabled:opacity-50"
        >
          {loading ? "Processando..." : "Finalizar Pedido"}
        </button>
      </div>
    </div>
  );
};

const MyOrders = ({ user, onCarregar }: { user: any, onCarregar: (pedido: any, editar: boolean) => Promise<boolean> }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [processando, setProcessando] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/checkout");
      return;
    }
    const fetchMyOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error) {
        setOrders(data || []);
      }
    };
    fetchMyOrders();
  }, [user]);

  const handleConfirmArrival = async (orderId: number) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: "pedido entregue" })
      .eq('id', orderId);

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "pedido entregue" } : o));
    }
  };

  // Método que leva os itens do pedido para o carrinho: para editar (refaz o pedido) ou para fazer um pedido igual
  const levarParaCarrinho = async (order: any, editar: boolean) => {
    setProcessando(order.id);
    const carregado = await onCarregar(order, editar);
    setProcessando(null);
    if (carregado) navigate("/carrinho");
  };

  // Método que cancela o pedido que ainda aguarda o pagamento; o estoque volta para a loja
  const cancelar = async (order: any) => {
    if (!confirm(`Cancelar o pedido #${order.id}?`)) return;
    setProcessando(order.id);
    const { error } = await supabase.rpc('cancelar_pedido', { p_pedido: order.id });
    setProcessando(null);
    if (error) {
      alert("Não foi possível cancelar: " + error.message);
      return;
    }
    setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pedido cancelado" } : o));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 min-h-screen">
      <h2 className="text-4xl font-serif text-brand-olive mb-12">Meus Pedidos</h2>
      <div className="space-y-6">
        {orders.map(order => (
          <div key={order.id} className="bg-white p-8 rounded-3xl shadow-sm border border-brand-beige/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-widest">Status</span>
                <div className="font-serif text-xl text-brand-olive">{STATUS_PEDIDO[order.status] || order.status}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Pedido #{order.id} · {order.delivery_method === "Retirada" ? "Retirada" : "Correios"}
                  {order.pedido_anterior && <> · substitui o #{order.pedido_anterior}</>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Data</span>
                <div className="text-sm">{new Date(order.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="border-t border-brand-beige/10 pt-4 mb-6">
              <p className="text-sm text-gray-600">{order.description}</p>
              <p className="text-sm font-bold text-brand-olive mt-2">Total: {reais(order.total_price)}</p>
            </div>
            {order.status === "aguardando pagamento" && (
              <>
                <InstrucoesPagamento pedido={order} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => levarParaCarrinho(order, true)}
                    disabled={processando === order.id}
                    className="py-3 rounded-full border-2 border-brand-olive text-brand-olive font-bold hover:bg-brand-olive hover:text-white transition-all disabled:opacity-50"
                  >
                    Editar pedido
                  </button>
                  <button
                    onClick={() => cancelar(order)}
                    disabled={processando === order.id}
                    className="py-3 rounded-full border-2 border-red-300 text-red-600 font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Dá para editar ou cancelar enquanto o pagamento não é confirmado. Na edição, o pedido é refeito com os valores recalculados.
                </p>
              </>
            )}
            {["pagamento confirmado", "pedido sendo separado", "pronto para retirada", "pedido enviado para entrega"].includes(order.status) && (
              <div className="mb-4">
                <BotaoCombinarEntrega pedido={order} />
              </div>
            )}
            {order.status === "pedido enviado para entrega" && (
              <button 
                onClick={() => handleConfirmArrival(order.id)}
                className="w-full bg-brand-mint text-brand-olive font-bold py-3 rounded-full hover:bg-brand-mint/80 transition-all"
              >
                Confirmar que chegou
              </button>
            )}
            {order.status === "pedido entregue" && (
              <div className="text-center text-brand-olive font-medium flex items-center justify-center gap-2 mb-4">
                <Check size={20} /> Pedido Entregue
              </div>
            )}
            {["pedido cancelado", "pedido entregue"].includes(order.status) && (
              orders.some(o => o.pedido_anterior === order.id) ? (
                <p className="text-sm text-gray-500 text-center">Substituído pelo pedido #{orders.find(o => o.pedido_anterior === order.id).id}.</p>
              ) : (
                <>
                  <button
                    onClick={() => levarParaCarrinho(order, false)}
                    disabled={processando === order.id}
                    className="w-full py-3 rounded-full border-2 border-brand-olive text-brand-olive font-bold hover:bg-brand-olive hover:text-white transition-all disabled:opacity-50"
                  >
                    Fazer pedido igual
                  </button>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Os mesmos produtos e quantidades vão para o carrinho, com o preço e o estoque de hoje.
                  </p>
                </>
              )
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-brand-beige/40">
            <p className="text-gray-400">Você ainda não fez nenhum pedido.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Campo de senha com o olho para mostrar ou esconder o que foi digitado
const CampoSenha = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visivel ? "text" : "password"} className={`${props.className || ""} pr-12`} />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-brand-olive"
      >
        {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

// Método que traduz as mensagens de erro do Supabase Auth, mantendo o original em inglês embaixo
const traduzirErroAuth = (error: any) => {
  const codigo = error?.code || "";
  const mensagem = error?.message || "";
  const minimo = mensagem.match(/at least (\d+)/);
  let traducao = "";
  if (codigo === "user_already_exists" || mensagem.includes("already registered")) traducao = "Este e-mail já tem cadastro. Entre com ele ou use \"Esqueci minha senha\".";
  else if (codigo === "weak_password" || minimo) traducao = minimo ? `A senha precisa ter pelo menos ${minimo[1]} caracteres.` : "Senha fraca: escolha uma senha mais difícil de adivinhar.";
  else if (codigo === "email_not_confirmed") traducao = "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  else if (codigo === "invalid_credentials") traducao = "E-mail ou senha incorretos.";
  else if (codigo === "email_address_invalid" || mensagem.includes("invalid format")) traducao = "E-mail inválido.";
  else if (codigo.includes("rate_limit") || mensagem.includes("rate limit")) traducao = "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  else if (codigo === "same_password") traducao = "A senha nova precisa ser diferente da atual.";
  if (!traducao) return mensagem || "Erro ao processar solicitação";
  return mensagem ? `${traducao}\n\n(${mensagem})` : traducao;
};

type DadosCliente = { full_name: string, cpf: string, birth_date: string, cep: string, rua: string, bairro: string, cidade: string, uf: string, number: string, complemento: string, phone: string };

const dadosClienteVazios: DadosCliente = { full_name: "", cpf: "", birth_date: "", cep: "", rua: "", bairro: "", cidade: "", uf: "", number: "", complemento: "", phone: "" };

// Método que diz se o cadastro tem o que a loja precisa para entregar (quem entra pelo Google chega sem isso)
const cadastroCompleto = (user: any) => !!(user?.cpf && user?.birth_date && user?.address && user?.cep && user?.phone);

// Método que monta o endereço numa linha: rua, número, complemento - bairro, cidade/UF
const montarEndereco = (d: DadosCliente) =>
  [d.rua, d.number, d.complemento].filter(Boolean).join(", ") + ` - ${[d.bairro, `${d.cidade}/${d.uf}`].filter(Boolean).join(", ")}`;

// Método que confere os dados do cliente antes de gravar e devolve o aviso do que está errado (null quando está tudo certo)
const problemaDadosCliente = (d: DadosCliente, conferirCpf: boolean) =>
  conferirCpf && !cpfValido(d.cpf) ? "CPF inválido. Confira os números digitados."
    : !d.cidade ? "Digite um CEP válido para preencher o endereço de entrega."
    : null;

// Campos de nome, CPF, endereço pelo CEP (ViaCEP) e WhatsApp, usados no cadastro e ao completar o cadastro
const CamposCliente = ({ dados, setDados, travarNomeCpf = false }: { dados: DadosCliente, setDados: React.Dispatch<React.SetStateAction<DadosCliente>>, travarNomeCpf?: boolean }) => {
  const [cepStatus, setCepStatus] = useState<"" | "buscando" | "achou" | "erro">(dados.cidade ? "achou" : "");

  // Com o CEP já preenchido (tela Minha conta), busca a rua e o bairro ao abrir
  useEffect(() => {
    if (!dados.cidade && dados.cep.replace(/\D/g, "").length === 8) buscarCep(dados.cep);
  }, []);

  // Método que preenche rua, bairro e cidade a partir do CEP
  const buscarCep = async (valor: string) => {
    setDados(d => ({ ...d, cep: valor }));
    const cep = valor.replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepStatus("");
      setDados(d => ({ ...d, cidade: "" }));
      return;
    }
    setCepStatus("buscando");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(resposta => resposta.json());
      if (r.erro) {
        setCepStatus("erro");
        return;
      }
      setDados(d => ({ ...d, rua: r.logradouro || "", bairro: r.bairro || "", cidade: r.localidade || "", uf: r.uf || "" }));
      setCepStatus("achou");
    } catch {
      setCepStatus("erro");
    }
  };

  const campo = "w-full px-4 py-3 rounded-xl border border-brand-beige/30";

  return (
    <>
      {travarNomeCpf ? (
        <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 space-y-1">
          <div>{dados.full_name}</div>
          <div>CPF {dados.cpf}</div>
          {dados.birth_date && <div>Nascimento {dados.birth_date.split("-").reverse().join("/")}</div>}
          <div className="text-xs text-gray-500">Nome, CPF e data de nascimento não podem ser alterados depois do cadastro.</div>
        </div>
      ) : (
        <>
          <input placeholder="Nome Completo" value={dados.full_name} onChange={e => setDados({ ...dados, full_name: e.target.value })} className={campo} required />
          <div>
            <input placeholder="CPF" inputMode="numeric" value={dados.cpf} onChange={e => setDados({ ...dados, cpf: formatarCpf(e.target.value) })} className={campo} required />
            {dados.cpf.replace(/\D/g, "").length === 11 && !cpfValido(dados.cpf) && (
              <p className="text-xs text-red-600 mt-1 ml-2">CPF inválido. Confira os números digitados.</p>
            )}
          </div>
        </>
      )}
      {(!travarNomeCpf || !dados.birth_date) && (
        <label className="block">
          <span className="block text-xs text-gray-500 mb-1 px-1">Data de nascimento</span>
          <input type="date" value={dados.birth_date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDados({ ...dados, birth_date: e.target.value })} className={campo} required />
        </label>
      )}
      <div>
        <input placeholder="CEP" inputMode="numeric" maxLength={9} value={dados.cep} onChange={e => buscarCep(e.target.value)} className={campo} required />
        {cepStatus === "buscando" && <p className="text-xs text-gray-500 mt-1 px-1">Buscando o endereço...</p>}
        {cepStatus === "erro" && <p className="text-xs text-red-600 mt-1 px-1">Não achamos esse CEP. Confira os números.</p>}
      </div>
      {cepStatus === "achou" && (
        <>
          <input placeholder="Rua" value={dados.rua} onChange={e => setDados({ ...dados, rua: e.target.value })} className={campo} required />
          <p className="text-sm text-gray-600 px-1">{[dados.bairro, `${dados.cidade}/${dados.uf}`].filter(Boolean).join(" · ")}</p>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Número" value={dados.number} onChange={e => setDados({ ...dados, number: e.target.value })} className={campo} required />
            <input placeholder="Complemento" value={dados.complemento} onChange={e => setDados({ ...dados, complemento: e.target.value })} className={campo} />
          </div>
        </>
      )}
      <input type="tel" placeholder="WhatsApp com DDD" value={dados.phone} onChange={e => setDados({ ...dados, phone: e.target.value })} className={campo} required />
    </>
  );
};

// Botão de entrar ou se cadastrar com a conta Google
const BotaoGoogle = () => {
  // Método que manda o cliente para o login do Google e traz de volta para o cadastro
  const entrarComGoogle = async () => {
    definirManterConectado(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/checkout` }
    });
    if (error) alert(traduzirErroAuth(error));
  };

  return (
    <button
      type="button"
      onClick={entrarComGoogle}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-800 py-3 rounded-full font-medium hover:bg-gray-50 transition-all"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
        <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z"/>
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/>
      </svg>
      Continuar com Google
    </button>
  );
};

const Checkout = ({ user, onCadastroAtualizado }: { user: any, onCadastroAtualizado: (dados: any) => void }) => {
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(!(location.state as any)?.entrar);
  const [acesso, setAcesso] = useState({ email: "", password: "", confirmacao: "" });
  const [manterConectado, setManterConectado] = useState(true);
  const [dados, setDados] = useState<DadosCliente>(dadosClienteVazios);
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  // O link "Login" do menu abre direto o formulário de entrar
  useEffect(() => {
    setIsRegistering(!(location.state as any)?.entrar && !new URLSearchParams(location.search).has("entrar"));
  }, [location.key]);

  // Com o cadastro completo segue para o carrinho; quem entrou pelo Google completa o cadastro antes
  useEffect(() => {
    if (user && cadastroCompleto(user)) navigate((location.state as any)?.voltarPara || "/");
    if (user && !cadastroCompleto(user)) setDados(d => ({ ...d, full_name: d.full_name || user.full_name || "" }));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        if (acesso.password !== acesso.confirmacao) {
          alert("As duas senhas não são iguais.");
          return;
        }
        const problema = problemaDadosCliente(dados, true);
        if (problema) {
          alert(problema);
          return;
        }
        // A senha fica só no Supabase Auth; os dados de entrega vão para a tabela users pelo banco
        const { data, error } = await supabase.auth.signUp({
          email: acesso.email,
          password: acesso.password,
          options: {
            data: {
              full_name: dados.full_name,
              cpf: dados.cpf,
              birth_date: dados.birth_date,
              address: montarEndereco(dados),
              cep: dados.cep,
              number: dados.number,
              phone: dados.phone
            }
          }
        });

        if (error) throw error;

        if (!data.session) {
          alert("Cadastro feito! Confirme seu e-mail pelo link que enviamos e depois entre na sua conta.");
          setIsRegistering(false);
        }
      } else {
        definirManterConectado(manterConectado);
        const { error } = await supabase.auth.signInWithPassword({
          email: acesso.email,
          password: acesso.password
        });

        if (error) throw error;
      }
    } catch (err: any) {
      alert(traduzirErroAuth(err));
    }
  };

  // Método que grava os dados que faltam no cadastro de quem entrou pelo Google
  const completarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = problemaDadosCliente(dados, true);
    if (problema) {
      alert(problema);
      return;
    }
    setSalvando(true);
    const novos = { full_name: dados.full_name, cpf: dados.cpf, birth_date: dados.birth_date, address: montarEndereco(dados), cep: dados.cep, number: dados.number, phone: dados.phone };
    const { error } = await supabase.from('users').update(novos).eq('id', user.id);
    setSalvando(false);
    if (error) {
      alert("Não foi possível salvar o cadastro: " + error.message);
      return;
    }
    onCadastroAtualizado(novos);
  };

  // Método que envia o link para o cliente criar uma senha nova
  const esqueciSenha = async () => {
    if (!acesso.email) {
      alert("Digite seu e-mail no campo acima e clique de novo em \"Esqueci minha senha\".");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(acesso.email, {
      redirectTo: `${window.location.origin}/nova-senha`
    });
    alert(error ? traduzirErroAuth(error) : `Se houver uma conta com ${acesso.email}, enviamos um link para criar uma senha nova.`);
  };

  const campo = "w-full px-4 py-3 rounded-xl border border-brand-beige/30";

  if (user && !cadastroCompleto(user)) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 min-h-screen">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-beige/20">
          <h2 className="text-3xl font-serif text-brand-olive mb-2 text-center">Complete seu cadastro</h2>
          <p className="text-sm text-gray-600 text-center mb-8">Precisamos do endereço e do WhatsApp para entregar seu pedido.</p>
          <form onSubmit={completarCadastro} className="space-y-4">
            <CamposCliente dados={dados} setDados={setDados} />
            <button disabled={salvando} className="w-full bg-brand-olive text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {salvando ? "Salvando..." : "Salvar e Continuar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 min-h-screen">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-beige/20">
        <h2 className="text-3xl font-serif text-brand-olive mb-8 text-center">
          {isRegistering ? "Crie sua conta" : "Entre na sua conta"}
        </h2>
        <BotaoGoogle />
        <div className="flex items-center gap-3 my-6 text-xs text-gray-500 uppercase tracking-widest">
          <div className="flex-1 h-px bg-brand-beige/30" />ou<div className="flex-1 h-px bg-brand-beige/30" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && <CamposCliente dados={dados} setDados={setDados} />}
          <input type="email" name="email" autoComplete="email" placeholder="Login (Seu melhor e-mail)" value={acesso.email} onChange={e => setAcesso({ ...acesso, email: e.target.value })} className={campo} required />
          <CampoSenha name="password" autoComplete={isRegistering ? "new-password" : "current-password"} placeholder="Senha" value={acesso.password} onChange={e => setAcesso({ ...acesso, password: e.target.value })} className={campo} required />
          {isRegistering && (
            <CampoSenha name="confirmacao" autoComplete="new-password" placeholder="Confirme a senha" value={acesso.confirmacao} onChange={e => setAcesso({ ...acesso, confirmacao: e.target.value })} className={campo} required />
          )}
          {!isRegistering && (
            <label className="flex items-center gap-2 text-sm text-gray-600 px-1">
              <input type="checkbox" checked={manterConectado} onChange={e => setManterConectado(e.target.checked)} className="accent-brand-olive" />
              Manter conectado
            </label>
          )}
          <button className="w-full bg-brand-olive text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all">
            {isRegistering ? "Cadastrar e Continuar" : "Entrar"}
          </button>
        </form>
        {!isRegistering && (
          <button 
            onClick={esqueciSenha}
            className="w-full mt-4 text-sm text-gray-500 hover:underline"
          >
            Esqueci minha senha
          </button>
        )}
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-6 text-sm text-brand-olive font-medium hover:underline"
        >
          {isRegistering ? "Já tem conta? Entre aqui" : "Não tem conta? Cadastre-se"}
        </button>
      </div>
    </div>
  );
};

const NovaSenha = ({ user }: { user: any }) => {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const navigate = useNavigate();

  // Método que grava a senha nova do cliente que veio pelo link do e-mail
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmacao) {
      alert("As duas senhas não são iguais.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      alert(traduzirErroAuth(error));
      return;
    }
    alert("Senha alterada!");
    navigate("/produtos");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 min-h-screen">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-beige/20">
        <h2 className="text-3xl font-serif text-brand-olive mb-8 text-center">Criar senha nova</h2>
        {!user ? (
          <p className="text-gray-600 text-center">
            O link expirou ou já foi usado. Peça outro em Entrar &gt; "Esqueci minha senha".
          </p>
        ) : (
          <form onSubmit={salvar} className="space-y-4">
            <CampoSenha placeholder="Senha nova"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-beige/30"
              required
            />
            <CampoSenha placeholder="Repita a senha nova"
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-beige/30"
              required
            />
            <button className="w-full bg-brand-olive text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all">
              Salvar senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Página de texto simples usada pelas políticas da loja
const PaginaTexto = ({ titulo, children }: { titulo: string, children: React.ReactNode }) => (
  <div className="max-w-3xl mx-auto px-4 py-20 min-h-screen">
    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-brand-beige/20 space-y-5 text-gray-700 leading-relaxed">
      <h2 className="text-4xl font-serif text-brand-olive mb-4">{titulo}</h2>
      {children}
    </div>
  </div>
);

const Privacidade = () => (
  <PaginaTexto titulo="Política de privacidade">
    <p>Esta política explica como a {LOJA.nome} usa os seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Quais dados guardamos</h3>
    <p>No cadastro: nome, CPF, e-mail, WhatsApp, endereço e CEP. Em cada compra: os produtos, o valor, a forma de entrega e o andamento do pedido. A senha fica criptografada e nem a loja tem acesso a ela.</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Para que usamos</h3>
    <p>Para separar e entregar os pedidos, falar com você sobre a compra, emitir documentos fiscais e cumprir obrigações legais. Não vendemos nem usamos seus dados para propaganda de terceiros.</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Com quem compartilhamos</h3>
    <p>Só com quem é necessário para a compra acontecer: os Correios ou a transportadora (nome e endereço de entrega) e os serviços que hospedam o site e o banco de dados (Cloudflare e Supabase).</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Seus direitos</h3>
    <p>Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou tirar dúvidas sobre o uso deles. Alguns dados de compras precisam ser guardados pelo prazo que a lei fiscal exige.</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Contato</h3>
    <p>
      E-mail <a href={`mailto:${LOJA.email}`} className="text-brand-olive underline">{LOJA.email}</a> ou WhatsApp{" "}
      <a href={linkWhatsApp("Olá! Tenho uma dúvida sobre meus dados.")} target="_blank" rel="noreferrer" className="text-brand-olive underline">{LOJA.whatsappExibicao}</a>.
    </p>
  </PaginaTexto>
);

const Trocas = () => (
  <PaginaTexto titulo="Trocas e devoluções">
    <h3 className="text-2xl font-serif text-brand-olive">Arrependimento em até 7 dias</h3>
    <p>Em compras feitas pelo site, você pode desistir em até 7 dias corridos a partir do recebimento, sem precisar explicar o motivo (art. 49 do Código de Defesa do Consumidor). Devolvemos o valor pago, incluindo o frete.</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Produto com defeito ou errado</h3>
    <p>Se o produto chegar danificado, vencido ou diferente do pedido, avise em até 30 dias do recebimento. Trocamos o produto ou devolvemos o valor, como você preferir.</p>
    <h3 className="text-2xl font-serif text-brand-olive pt-2">Como pedir</h3>
    <p>
      Chame no WhatsApp{" "}
      <a href={linkWhatsApp("Olá! Quero pedir troca ou devolução do pedido #")} target="_blank" rel="noreferrer" className="text-brand-olive underline">{LOJA.whatsappExibicao}</a>{" "}
      ou mande e-mail para <a href={`mailto:${LOJA.email}`} className="text-brand-olive underline">{LOJA.email}</a> com o número do pedido e fotos, se houver defeito. Combinamos a devolução e o reembolso é feito por PIX.
    </p>
  </PaginaTexto>
);

const MinhaConta = ({ user, onCadastroAtualizado }: { user: any, onCadastroAtualizado: (dados: any) => void }) => {
  const navigate = useNavigate();
  const [dados, setDados] = useState<DadosCliente>({ ...dadosClienteVazios, full_name: user?.full_name || "", cpf: user?.cpf || "", birth_date: user?.birth_date || "", cep: user?.cep || "", number: user?.number || "", phone: user?.phone || "" });
  const [senha, setSenha] = useState({ atual: "", nova: "", confirmacao: "" });
  const [senhaAtualLiberada, setSenhaAtualLiberada] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) navigate("/checkout", { state: { entrar: true, voltarPara: "/minha-conta" } });
  }, [user]);

  // Método que grava os dados de cadastro e entrega
  const salvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = problemaDadosCliente(dados, !user.cpf);
    if (problema) {
      alert(problema);
      return;
    }
    setSalvando(true);
    const novos: any = { address: montarEndereco(dados), cep: dados.cep, number: dados.number, phone: dados.phone };
    if (!user.cpf) Object.assign(novos, { full_name: dados.full_name, cpf: dados.cpf });
    if (!user.birth_date) Object.assign(novos, { birth_date: dados.birth_date });
    const { error } = await supabase.from('users').update(novos).eq('id', user.id);
    setSalvando(false);
    if (error) {
      alert("Não foi possível salvar: " + error.message);
      return;
    }
    onCadastroAtualizado(novos);
    alert("Dados atualizados!");
  };

  // Método que troca a senha de quem está logado, conferindo antes a senha atual
  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.nova !== senha.confirmacao) {
      alert("As duas senhas novas não são iguais.");
      return;
    }
    const { error: erroAtual } = await supabase.auth.signInWithPassword({ email: user.email, password: senha.atual });
    if (erroAtual) {
      alert("A senha atual está incorreta.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: senha.nova });
    if (error) {
      alert(traduzirErroAuth(error));
      return;
    }
    setSenha({ atual: "", nova: "", confirmacao: "" });
    alert("Senha alterada!");
  };

  if (!user) return null;

  const cartao = "bg-white p-8 rounded-3xl shadow-sm border border-brand-beige/20";
  const campo = "w-full px-4 py-3 rounded-xl border border-brand-beige/30";

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 min-h-screen space-y-8">
      <h2 className="text-4xl font-serif text-brand-olive">Minha conta</h2>

      <form onSubmit={salvarDados} className={`${cartao} space-y-4`}>
        <h3 className="text-2xl font-serif text-brand-olive">Meus dados</h3>
        {user.address && <p className="text-sm text-gray-600">Endereço atual: {user.address} · CEP {user.cep}</p>}
        <CamposCliente dados={dados} setDados={setDados} travarNomeCpf={!!user.cpf} />
        <button disabled={salvando} className="w-full bg-brand-olive text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
          {salvando ? "Salvando..." : "Salvar dados"}
        </button>
      </form>

      <form onSubmit={trocarSenha} className={`${cartao} space-y-4`}>
        <h3 className="text-2xl font-serif text-brand-olive">Acesso</h3>
        <p className="text-sm text-gray-600">E-mail de login: {user.email}</p>
        <CampoSenha name="conferencia-senha-atual" autoComplete="off" readOnly={!senhaAtualLiberada} onFocus={() => setSenhaAtualLiberada(true)} placeholder="Senha atual" value={senha.atual} onChange={e => setSenha({ ...senha, atual: e.target.value })} className={campo} required />
        <CampoSenha name="nova-senha" autoComplete="new-password" placeholder="Senha nova" value={senha.nova} onChange={e => setSenha({ ...senha, nova: e.target.value })} className={campo} required />
        <CampoSenha name="confirmacao-senha" autoComplete="new-password" placeholder="Confirme a senha nova" value={senha.confirmacao} onChange={e => setSenha({ ...senha, confirmacao: e.target.value })} className={campo} required />
        <button className="w-full border-2 border-brand-olive text-brand-olive py-3 rounded-full font-bold hover:bg-brand-olive hover:text-white transition-all">
          Trocar senha
        </button>
        <p className="text-xs text-gray-500">Se você entra com o Google e ainda não tem senha, use "Esqueci minha senha" na tela de login para criar uma.</p>
      </form>

      <div className={`${cartao} space-y-3`}>
        <h3 className="text-2xl font-serif text-brand-olive">Pagamento</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Os pagamentos são feitos por PIX, direto do seu banco: não é preciso cadastrar cartão nem conta aqui.
          Se precisar de reembolso, combinamos a sua chave PIX pelo WhatsApp {LOJA.whatsappExibicao}.
        </p>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [acessoGestao, setAcessoGestao] = useState(false);
  const [ehDono, setEhDono] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);

  useEffect(() => {
    // Remove o login da versão antiga, que guardava o cadastro do cliente (com a senha) no navegador
    ["userData", "userToken", "adminToken"].forEach(chave => localStorage.removeItem(chave));

    // Método que carrega o cadastro e o perfil de administrador do usuário logado
    const carregarSessao = async (session: Session | null) => {
      if (!session) {
        setUser(null);
        setIsAdmin(false);
        setAcessoGestao(false);
        setEhDono(false);
      } else {
        const { data: cadastro } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
        const [{ data: ehAdmin }, { data: daEquipe }, { data: dono }] = await Promise.all([
          supabase.rpc('is_admin'), supabase.rpc('eh_da_equipe'), supabase.rpc('eh_dono')
        ]);
        setUser(cadastro ?? { id: session.user.id, email: session.user.email });
        setIsAdmin(!!ehAdmin);
        setAcessoGestao(!!daEquipe);
        setEhDono(!!dono);
      }
      setSessaoCarregada(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      // O Supabase pede para não chamar o client dentro deste callback; o setTimeout tira a chamada dele
      setTimeout(() => carregarSessao(session), 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [aviso, setAviso] = useState<{ id: number, texto: string } | null>(null);

  // Método que mostra um aviso rápido no pé da tela e some depois de alguns segundos
  const mostrarAviso = (texto: string) => {
    const id = Date.now();
    setAviso({ id, texto });
    setTimeout(() => setAviso(atual => (atual?.id === id ? null : atual)), 3000);
  };

  const [edicao, setEdicao] = useState<EdicaoPedido | null>(null);

  // Método que diz quanto do produto o cliente pode levar (na edição, soma o que o pedido já segurava)
  const estoque = (product: Product) => product.quantity + (edicao?.reservado[product.id] || 0);

  // Método que põe no carrinho os itens de um pedido: para editar (o pedido é refeito) ou para fazer um pedido igual
  const carregarPedido = async (pedido: { id: number, delivery_method: string, items: { id: number, nome: string, opcao?: string | null, quantidade: number }[] }, editar: boolean) => {
    const itens = pedido.items || [];
    if (itens.length === 0) {
      alert("Este pedido não tem os itens gravados. Escolha os produtos de novo na loja, ou fale com a gente pelo WhatsApp.");
      return false;
    }
    if (cart.length > 0 && !confirm("Os produtos que estão no carrinho serão trocados pelos itens do pedido. Continuar?")) return false;

    const { data: dadosProdutos, error } = await supabase.from('products').select('*');
    const produtos = comEstoqueDosKits(dadosProdutos || []).map(comPromocao);
    if (error) {
      alert("Não foi possível carregar os produtos do pedido: " + error.message);
      return false;
    }

    // Na edição, o estoque que o próprio pedido segura conta como disponível
    const reservado: { [produto: number]: number } = {};
    if (editar) itens.forEach(item => { reservado[item.id] = (reservado[item.id] || 0) + item.quantidade; });

    const fora: string[] = [];
    const avisos: string[] = [];
    const usado: { [produto: number]: number } = {};
    const novoCarrinho: CartItem[] = [];
    itens.forEach(item => {
      const produto = (produtos || []).find(p => p.id === item.id) as Product | undefined;
      const opcoes = produto?.options || [];
      const opcao = opcoes.length === 0 ? undefined : item.opcao || undefined;
      const nome = item.opcao ? `${item.nome} (${item.opcao})` : item.nome;
      if (!produto || (opcoes.length > 0 && opcao !== "Aleatório" && !opcoes.some(o => o.nome === opcao))) {
        fora.push(nome);
        return;
      }
      const disponivel = produto.quantity + (reservado[produto.id] || 0) - (usado[produto.id] || 0);
      const quantidade = Math.min(item.quantidade, disponivel);
      if (quantidade <= 0) {
        avisos.push(`${nome}: esgotado`);
        return;
      }
      if (quantidade < item.quantidade) avisos.push(`${nome}: só ${quantidade} em estoque`);
      usado[produto.id] = (usado[produto.id] || 0) + quantidade;
      novoCarrinho.push({ ...produto, opcao, cartQuantity: quantidade });
    });

    if (novoCarrinho.length === 0) {
      alert(`Nenhum produto deste pedido está disponível agora. ${[...fora.map(f => `${f}: fora de venda`), ...avisos].join(", ")}`);
      return false;
    }

    setCart(novoCarrinho);
    setEdicao(editar ? { id: pedido.id, entrega: pedido.delivery_method === "Retirada" ? "Retirada" : "Correios", reservado } : null);
    const mensagens = [...fora.map(f => `${f}: fora de venda`), ...avisos];
    if (mensagens.length > 0) alert(`Alguns itens mudaram desde o pedido: ${mensagens.join(", ")}`);
    return true;
  };

  // Método que encerra a edição (pedido refeito ou desistência) e esvazia o carrinho
  const encerrarEdicao = () => {
    setEdicao(null);
    setCart([]);
  };

  // O estoque é do produto: as cores e aromas do mesmo produto somam juntos
  const addToCart = (product: Product, qty: number, opcao?: string) => {
    const noCarrinho = cart.filter(item => item.id === product.id).reduce((total, item) => total + item.cartQuantity, 0);
    const quantidade = Math.min(qty, estoque(product) - noCarrinho);
    if (quantidade <= 0) {
      mostrarAviso(`Você já tem todo o estoque de ${product.name} no carrinho`);
      return;
    }
    const chave = chaveCarrinho(product.id, opcao);
    setCart(prev => {
      const existing = prev.find(item => chaveCarrinho(item.id, item.opcao) === chave);
      if (existing) {
        return prev.map(item => 
          chaveCarrinho(item.id, item.opcao) === chave ? { ...item, cartQuantity: item.cartQuantity + quantidade } : item
        );
      }
      return [...prev, { ...product, opcao, cartQuantity: quantidade }];
    });
    const nome = opcao ? `${product.name} (${opcao})` : product.name;
    mostrarAviso(`${quantidade}x ${nome} ${quantidade > 1 ? "adicionados" : "adicionado"} ao carrinho`);
  };

  const updateCartQuantity = (chave: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (chaveCarrinho(item.id, item.opcao) === chave) {
        const outros = prev.filter(i => i.id === item.id && chaveCarrinho(i.id, i.opcao) !== chave).reduce((total, i) => total + i.cartQuantity, 0);
        const newQty = Math.min(Math.max(1, estoque(item) - outros), Math.max(1, item.cartQuantity + delta));
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (chave: string) => {
    setCart(prev => prev.filter(item => chaveCarrinho(item.id, item.opcao) !== chave));
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar 
          cartCount={cart.reduce((acc, item) => acc + item.cartQuantity, 0)} 
          isAdmin={isAdmin}
          acessoGestao={acessoGestao}
          user={user}
        />
        
        <main className="flex-grow">
          {!sessaoCarregada ? (
            <div className="min-h-screen flex items-center justify-center">Carregando...</div>
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/produtos" element={<Products onAddToCart={addToCart} isAdmin={isAdmin} />} />
              <Route path="/carrinho" element={<Cart cart={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} user={user} edicao={edicao} onDesistirEdicao={encerrarEdicao} />} />
              <Route path="/checkout" element={<Checkout user={user} onCadastroAtualizado={dados => setUser((u: any) => ({ ...u, ...dados }))} />} />
              <Route path="/nova-senha" element={<NovaSenha user={user} />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/trocas" element={<Trocas />} />
              <Route path="/meus-pedidos" element={<MyOrders user={user} onCarregar={carregarPedido} />} />
              <Route path="/minha-conta" element={<MinhaConta user={user} onCadastroAtualizado={dados => setUser((u: any) => ({ ...u, ...dados }))} />} />
              <Route path="/pagamento" element={<PaymentPage cart={cart} user={user} edicao={edicao} onPedidoFeito={encerrarEdicao} />} />
              <Route path="/admin" element={<Admin isAdmin={isAdmin} ehDono={ehDono} />} />
            </Routes>
          )}
        </main>

        <Footer />

        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
          <AnimatePresence>
            {aviso && (
              <motion.div
                key={aviso.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto flex items-center gap-3 bg-brand-olive text-white text-sm px-5 py-3 rounded-full shadow-2xl"
              >
                <Check size={18} className="text-brand-mint shrink-0" />
                <span>{aviso.texto}</span>
                <Link to="/carrinho" onClick={() => setAviso(null)} className="font-bold underline underline-offset-4 whitespace-nowrap">Ver carrinho</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Router>
  );
}
