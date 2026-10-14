import { createClient } from '@supabase/supabase-js';

// Endereço e chave pública do projeto vêm do .env.local (ou das variáveis de ambiente da Cloudflare)
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust fallback logic to handle undefined, empty strings, or the string "undefined"
const isValidUrl = (url: string | undefined) => url && url.startsWith('http') && url !== 'undefined';
const isValidKey = (key: string | undefined) => key && key.length > 20 && key !== 'undefined';

if (!isValidUrl(rawUrl) || !isValidKey(rawKey)) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local');
}

// Método que guarda a escolha de "Manter conectado"; sem ela, a sessão some ao fechar o navegador
export const definirManterConectado = (manter: boolean) => {
  try {
    localStorage.setItem('manter-conectado', manter ? 'sim' : 'nao');
  } catch {
    // Navegador sem acesso ao armazenamento: a sessão segue o padrão do Supabase
  }
};

// Método que escolhe onde a sessão fica: no navegador (localStorage) ou só nesta aba aberta (sessionStorage)
const armazenamento = () => {
  try {
    return localStorage.getItem('manter-conectado') === 'nao' ? sessionStorage : localStorage;
  } catch {
    return sessionStorage;
  }
};

export const supabase = createClient(rawUrl, rawKey, {
  auth: {
    storage: {
      getItem: chave => armazenamento().getItem(chave),
      setItem: (chave, valor) => armazenamento().setItem(chave, valor),
      removeItem: chave => {
        localStorage.removeItem(chave);
        sessionStorage.removeItem(chave);
      }
    }
  }
});
