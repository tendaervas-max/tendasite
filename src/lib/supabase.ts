import { createClient } from '@supabase/supabase-js';

// Endereço e chave pública do projeto vêm do .env.local (ou das variáveis de ambiente da Netlify)
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust fallback logic to handle undefined, empty strings, or the string "undefined"
const isValidUrl = (url: string | undefined) => url && url.startsWith('http') && url !== 'undefined';
const isValidKey = (key: string | undefined) => key && key.length > 20 && key !== 'undefined';

if (!isValidUrl(rawUrl) || !isValidKey(rawKey)) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local');
}

export const supabase = createClient(rawUrl, rawKey);
