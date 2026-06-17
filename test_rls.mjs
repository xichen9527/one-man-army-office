import { createClient } from '@supabase/supabase-js';
const fs = await import('fs');
const envRaw = fs.readFileSync('.env', 'utf-8');
const getEnv = (key) => envRaw.split('\n').find(l => l.startsWith(key + '='))?.split('=')[1]?.trim() || '';
const url = getEnv('VITE_SUPABASE_URL');
const anon = getEnv('VITE_SUPABASE_ANON_KEY');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

// Use anon key to check RLS
const sb = createClient(url, anon);

// Check projects table data
const { data: projects } = await sb.from('projects').select('*');
console.log('Projects (anon):', JSON.stringify(projects, null, 2));

// Try with service role if available
if (serviceRoleKey) {
  const sbAdmin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminProjects } = await sbAdmin.from('projects').select('*');
  console.log('Projects (admin):', JSON.stringify(adminProjects, null, 2));
} else {
  console.log('No service role key available');
}

// Check what owner_id values exist
if (projects) {
  for (const p of projects) {
    console.log(`Project "${p.name}": owner_id="${p.owner_id}"`);
  }
}