import { createClient } from '@supabase/supabase-js';

// Use environment variables with hardcoded fallbacks for the current session to ensure it works immediately
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust fallback logic to handle undefined, empty strings, or the string "undefined"
const isValidUrl = (url: string | undefined) => url && url.startsWith('http') && url !== 'undefined';
const isValidKey = (key: string | undefined) => key && key.length > 20 && key !== 'undefined';

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl! : 'https://hbkywvztwhdccznwuuex.supabase.co';
const supabaseAnonKey = isValidKey(rawKey) ? rawKey! : 'sb_publishable_yzr5emhPHqt04KM4doNW5A_lxs9T1fE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
