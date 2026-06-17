const SUPABASE_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa2pjZHJyY3l3bndtdGFhYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDE1MDMsImV4cCI6MjA5NTMxNzUwM30._O674GV4osHguZdkNXoK4jCuDsGxWF9UiaG08o44gOA';

async function test() {
  // Test all Edge Functions
  const funcs = ['secure-login', 'ai-search', 'text-generation'];
  for (const f of funcs) {
    try {
      const r = await fetch(SUPABASE_URL + '/functions/v1/' + f, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY, 'apikey': ANON_KEY },
        body: JSON.stringify(f === 'ai-search' ? { query: 'test' } : { identifier: 'x', password: 'x' })
      });
      const d = await r.json();
      console.log(f + ': ' + r.status + ' ' + JSON.stringify(d).slice(0,100));
    } catch (e) {
      console.log(f + ': ERROR ' + e.message);
    }
  }
}
test();