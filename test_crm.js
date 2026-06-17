require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

  const { data: session } = await sb.auth.getSession()
  console.log('Session:', session?.session?.user?.id ? 'YES uid=' + session.session.user.id.slice(0,8) : 'NO SESSION')

  const { data: customers, error: crmErr } = await sb.from('customers').select('count')
  if (crmErr) {
    console.log('customers ERROR:', crmErr.message, '| code:', crmErr.code)
  } else {
    console.log('customers OK, count=', customers && customers[0] && customers[0].count)
  }

  const { data: profiles, error: profErr } = await sb.from('profiles').select('count')
  if (profErr) {
    console.log('profiles ERROR:', profErr.message)
  } else {
    console.log('profiles OK, count=', profiles && profiles[0] && profiles[0].count)
  }

  const { data: followups, error: fuErr } = await sb.from('followups').select('count')
  if (fuErr) {
    console.log('followups ERROR:', fuErr.message)
  } else {
    console.log('followups OK, count=', followups && followups[0] && followups[0].count)
  }

  const { data: sales, error: salesErr } = await sb.from('sales_opportunities').select('count')
  if (salesErr) {
    console.log('sales_opportunities ERROR:', salesErr.message)
  } else {
    console.log('sales_opportunities OK, count=', sales && sales[0] && sales[0].count)
  }
}

main().catch(e => { console.error('Script error:', e.message); process.exit(1) })
