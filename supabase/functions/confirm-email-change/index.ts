// Supabase Edge Function: 确认邮箱修改
// 文件路径: supabase/functions/confirm-email-change/index.ts
//
// 流程：
//   1. 用户点击确认链接 → ConfirmEmail.tsx → 调用此函数
//   2. 验证 token 在 profiles 表中存在且未过期
//   3. 更新 profiles.email = email_change_pending
//   4. 清除 email_change_pending / token / token_exp

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const APP_NAME = '一人成军办公平台'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: '缺少确认令牌', message: '请提供确认 token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // 查找 token 对应的用户
    const { data: profile, error: selectError } = await supabase
      .from('profiles')
      .select('id, email, email_change_pending, email_change_token, email_change_token_exp, email_change_count')
      .eq('email_change_token', token)
      .single()

    if (selectError || !profile) {
      console.error('[confirm-email-change] Token lookup failed:', selectError?.message)
      return new Response(
        JSON.stringify({ error: '令牌无效', message: '确认链接无效或已过期，请重新提交邮箱修改申请' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 检查 token 是否过期
    if (profile.email_change_token_exp) {
      const expTime = new Date(profile.email_change_token_exp).getTime()
      if (Date.now() > expTime) {
        // 清除过期 token
        await supabase
          .from('profiles')
          .update({
            email_change_pending: null,
            email_change_token: null,
            email_change_token_exp: null,
          })
          .eq('id', profile.id)

        return new Response(
          JSON.stringify({ error: '令牌已过期', message: '确认链接已过期（有效期 24 小时），请重新提交邮箱修改申请' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!profile.email_change_pending) {
      return new Response(
        JSON.stringify({ error: '无待修改邮箱', message: '没有待修改的邮箱，请重新提交申请' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newEmail = profile.email_change_pending
    const currentCount = profile.email_change_count || 0

    // 更新 profiles：email = email_change_pending，清除 pending/token，递增 email_change_count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: newEmail,
        email_change_pending: null,
        email_change_token: null,
        email_change_token_exp: null,
        email_change_count: currentCount + 1,
        last_email_change_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[confirm-email-change] Update error:', updateError)
      return new Response(
        JSON.stringify({ error: '更新失败', message: '邮箱更新失败，请稍后重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 同时更新 auth.users.email（需要 service_role key）
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { email: newEmail }
    )

    if (authUpdateError) {
      console.warn('[confirm-email-change] Auth update warning:', authUpdateError.message)
      // 不阻止流程，profiles.email 已更新
    }

    console.log(`[confirm-email-change] 成功修改邮箱: ${profile.email} → ${newEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `邮箱已成功修改为 ${newEmail}`,
        newEmail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[confirm-email-change] Function error:', err)
    return new Response(
      JSON.stringify({ error: '服务器内部错误', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
