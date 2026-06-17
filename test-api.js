const SUPABASE_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa2pjZHJyY3l3bndtdGFhYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDE1MDMsImV4cCI6MjA5NTMxNzUwM30._O674GV4osHguZdkNXoK4jCuDsGxWF9UiaG08o44gOA';

async function test() {
  const tables = ['documents', 'customers', 'ai_conversations', 'social_posts', 'video_conferences', 'profiles'];
  for (const t of tables) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/' + t + '?select=id&limit=1', {
        headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
      });
      const d = await r.json();
      console.log(t + ': ' + r.status + ' ' + JSON.stringify(d).slice(0,120));
    } catch (e) {
      console.log(t + ': ERROR ' + e.message);
    }
  }
}
test();