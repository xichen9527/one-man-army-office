// Deploy Edge Functions via Supabase Management API
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co'
// Read PAT from env or prompt
const PAT = process.env.SUPABASE_PAT || ''
if (!PAT) {
  console.error('Set SUPABASE_PAT env variable')
  process.exit(1)
}

const PROJECT_REF = 'jikjcdrrcywnwmtaabzh'
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`

const functions = ['social-oauth', 'social-publish', 'sync-social-data']

async function deploy(fn) {
  const fnPath = path.join(__dirname, 'supabase', 'functions', fn, 'index.ts')
  const body = fs.readFileSync(fnPath, 'utf-8')
  
  console.log(`Deploying ${fn}...`)
  const resp = await fetch(`${API_BASE}/${fn}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })
  
  const data = await resp.json()
  if (resp.ok) {
    console.log(`✅ ${fn} deployed: version=${data.version || 'ok'}`)
  } else {
    console.error(`❌ ${fn} failed:`, JSON.stringify(data))
  }
}

(async () => {
  for (const fn of functions) {
    await deploy(fn)
  }
})()
