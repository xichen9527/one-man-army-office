const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) { console.error('Missing env vars'); process.exit(1); }

const sb = createClient(url, anon);

(async () => {
  const tables = ['projects','tasks','documents','files','customers','sales_opportunities','ai_conversations','social_accounts','video_conferences'];
  for (const t of tables) {
    try {
      const { data, error } = await sb.from(t).select('*').limit(1);
      console.log(`${t}: data=${data ? data.length : 0} error=${error ? error.message : 'none'}`);
    } catch (e) { console.log(`${t}: EXCEPTION ${e.message}`); }
  }
})();