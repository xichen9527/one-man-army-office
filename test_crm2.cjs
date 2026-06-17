const { createClient } = require('@supabase/supabase-js')

const SB_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa2pjZHJyY3l3bndtdGFhYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDE1MDMsImV4cCI6MjA5NTMxNzUwM30._O674GV4osHguZdkNXoK4jCuDsGxWF9UiaG08o44gOA'

const sb = createClient(SB_URL, SB_ANON)

async function main() {
  const { data: session } = await sb.auth.getSession()
  console.log('Session:', session?.session?.user?.id ? 'YES uid=' + session.session.user.id.slice(0,8) : 'NO SESSION')

  const tables = ['customers', 'profiles', 'followups', 'sales_opportunities', 'projects', 'tasks']
  for (const table of tables) {
    const { data, error } = await sb.from(table).select('count')
    if (error) {
      console.log(table + ' ERROR:', error.message, '| code:', error.code)
    } else {
      console.log(table + ' OK, count=', data && data[0] && data[0].count)
    }
  }
}

main().catch(e => { console.error('Script error:', e.message); process.exit(1) })
