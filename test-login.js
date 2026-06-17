const SUPABASE_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa2pjZHJyY3l3bndtdGFhYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDE1MDMsImV4cCI6MjA5NTMxNzUwM30._O674GV4osHguZdkNXoK4jCuDsGxWF9UiaG08o44gOA';

async function test() {
  // Test 1: Health check
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/health');
    console.log('Health:', await r.json());
  } catch (e) {
    console.error('Health error:', e.message);
  }

  // Test 2: Try login with test credentials
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test123456' }),
    });
    const d = await r.json();
    console.log('Login test:', r.status, JSON.stringify(d).slice(0, 300));
  } catch (e) {
    console.error('Login error:', e.message);
  }

  // Test 3: Try the secure-login Edge Function
  try {
    const r = await fetch(SUPABASE_URL + '/functions/v1/secure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ANON_KEY,
      },
      body: JSON.stringify({ identifier: 'test@test.com', password: 'test123456' }),
    });
    const d = await r.json();
    console.log('Secure-login:', r.status, JSON.stringify(d).slice(0, 300));
  } catch (e) {
    console.error('Secure-login error:', e.message);
  }
}

test();
