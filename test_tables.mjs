import { createClient } from '@supabase/supabase-js';

// Read env from .env file manually
const fs = await import('fs');
const envRaw = fs.readFileSync('.env', 'utf-8');
const getEnv = (key) => envRaw.split('\n').find(l => l.startsWith(key + '='))?.split('=')[1]?.trim() || '';

const url = getEnv('VITE_SUPABASE_URL');
const anon = getEnv('VITE_SUPABASE_ANON_KEY');
console.log('URL:', url);

const sb = createClient(url, anon);

const tables = ['projects','tasks','documents','files','customers','sales_opportunities','ai_conversations','social_accounts','video_conferences'];
for (const t of tables) {
  try {
    const { data, error } = await sb.from(t).select('*').limit(1);
    console.log(`${t}: data=${data?.length ?? 0} error=${error?.message ?? 'none'}`);
  } catch (e) { console.log(`${t}: EXCEPTION ${e.message}`); }
}