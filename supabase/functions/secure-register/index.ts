import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Strong password: 8+ chars, uppercase, lowercase, digit, special char
function validatePassword(password: string): string | null {
  if (password.length < 8) return '密码长度至少8位'
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母'
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母'
  if (!/[0-9]/.test(password)) return '密码必须包含数字'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return '密码必须包含特殊字符'
  return null
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateUsername(username: string): string | null {
  if (username.length < 3) return '用户名长度至少3位'
  if (username.length > 30) return '用户名长度不超过30位'
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) return '用户名只能包含字母、数字、下划线和中文'
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { username, email, password, full_name } = await req.json()

    // Input validation
    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: '缺少必要参数: username, email, password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      return new Response(JSON.stringify({ error: usernameError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式无效' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check username uniqueness
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existingUsername) {
      return new Response(JSON.stringify({ error: '用户名已被占用' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check email uniqueness
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingEmail) {
      return new Response(JSON.stringify({ error: '该邮箱已注册' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Also check via auth admin
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const emailExists = authUsers?.users?.some(u => u.email === email)
    if (emailExists && !existingEmail) {
      return new Response(JSON.stringify({ error: '该邮箱已注册' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create user via Supabase Auth
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: full_name || '',
      },
    })

    if (createError) {
      console.error('Create user error:', createError)
      return new Response(JSON.stringify({ error: createError.message || '用户创建失败' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!userData.user) {
      return new Response(JSON.stringify({ error: '用户创建失败' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert profile with username
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userData.user.id,
      username,
      email,
      full_name: full_name || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('Profile insert error:', profileError)
      // Attempt to clean up: delete the auth user
      await supabase.auth.admin.deleteUser(userData.user.id)
      return new Response(JSON.stringify({ error: '用户资料创建失败，请重试' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userData.user.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('secure-register error:', e)
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
