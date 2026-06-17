import { createClient } from '@supabase/supabase-js';
const fs = await import('fs');
const envRaw = fs.readFileSync('.env', 'utf-8');
const getEnv = (key) => envRaw.split('\n').find(l => l.startsWith(key + '='))?.split('=')[1]?.trim() || '';
const url = getEnv('VITE_SUPABASE_URL');
const anon = getEnv('VITE_SUPABASE_ANON_KEY');

const sb = createClient(url, anon);

// Test: sign in and then query
const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456'
});
if (signInError) {
  console.log('signIn error:', signInError.message);
  // Try with the existing user
  const { data: signInData2, error: signInError2 } = await sb.auth.signInWithPassword({
    email: 'wqich@qq.com',
    password: '123456'
  });
  if (signInError2) {
    console.log('signIn2 error:', signInError2.message);
  } else {
    console.log('signIn2 success, user:', signInData2.user?.id);
  }
} else {
  console.log('signIn success, user:', signInData.user?.id);
}

if (sb.auth.getSession()) {
  const { data: session } = await sb.auth.getSession();
  console.log('session user:', session.session?.user?.id);
  
  // Now query tables with auth context
  const tables = ['projects','tasks','documents','files','customers'];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(5);
    console.log(`${t}: data=${data?.length ?? 0} error=${error?.message ?? 'none'}`);
  }
}