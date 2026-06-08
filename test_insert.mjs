// 在 Supabase 客户端层面测试 insert
const SUPABASE_URL = 'https://jikjcdrrcywnwmtaabzh.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa2pjZHJyY3l3bndtdGFhYnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDE1MDMsImV4cCI6MjA5NTMxNzUwM30._O674GV4osHguZdkNXoK4jCuDsGxWF9UiaG08o44gOA'

console.log('=== Supabase Insert Test ===\n')

// 1. 先检查表是否存在
async function checkTables() {
  const tables = ['projects', 'tasks', 'documents', 'ai_conversations']
  for (const t of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id&limit=1`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    })
    console.log(`${t}: ${res.status} ${res.statusText}`)
    if (res.status !== 200) {
      const err = await res.json()
      console.log(`  Error:`, JSON.stringify(err))
    }
  }
}

// 2. 尝试 insert（不带 auth token，测试 RLS）
async function testInsert() {
  console.log('\n--- Test INSERT without auth ---')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: 'RLS诊断测试',
      description: '测试创建后可删除',
      owner_id: 'test-no-auth'
    })
  })
  console.log(`Insert projects (no auth): ${res.status}`)
  const data = await res.json()
  console.log('Response:', JSON.stringify(data, null, 2))
  
  // 查看是否真的插入了
  const check = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,name,created_at&order=created_at.desc&limit=5`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  })
  console.log('\nLatest 5 projects:')
  const latest = await check.json()
  latest.forEach(p => console.log(`  - ${p.name} (${p.id}) created: ${p.created_at}`))
}

// 3. 检查 policies
async function checkPolicies() {
  console.log('\n--- Check RLS Policies ---')
  // 通过 REST API 无法直接查，用 storage test 间接判断
  const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&limit=0`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Range': '0-0' }
  })
  // Count header
  console.log(`Count header:`, res.headers.get('content-range'))
}

await checkTables()
await testInsert()
