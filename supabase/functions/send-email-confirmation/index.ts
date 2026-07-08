// Supabase Edge Function: 发送邮箱修改确认邮件
// 文件路径: supabase/functions/send-email-confirmation/index.ts
//
// 流程：
//   1. 前端调用此函数，传入 newEmail
//   2. 生成确认 token 并保存到 profiles.email_change_token / email_change_token_exp
//   3. 通过 Resend 发送确认链接到新邮箱
//   4. 用户点击链接 → ConfirmEmail.tsx 验证 token → 完成修改

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.1'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const APP_URL = Deno.env.get('APP_URL') || 'https://xichen9527.github.io/one-man-army-office'
const APP_NAME = '一人成军办公平台'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, newEmail } = await req.json()

    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数', message: '请提供 userId 和 newEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: '邮箱格式不正确', message: `邮箱地址 "${newEmail}" 格式无效` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 使用 service_role key 初始化服务端 Supabase 客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // 生成确认 token（UUID v4）和过期时间（24 小时后）
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // 保存到 profiles 表
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_change_pending: newEmail,
        email_change_token: token,
        email_change_token_exp: expiresAt,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[send-email-confirmation] DB update error:', updateError)
      return new Response(
        JSON.stringify({ error: '数据库更新失败', message: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 构建确认链接
    const confirmUrl = `${APP_URL}/confirm-email?token=${token}`

    // 开发模式：如果没有配置 RESEND_API_KEY，返回模拟成功
    if (!RESEND_API_KEY || RESEND_API_KEY === 'xxx') {
      console.log(`[DEV MODE] 模拟发送确认邮件到: ${newEmail}`)
      console.log(`确认链接: ${confirmUrl}`)
      console.log(`Token: ${token}`)
      return new Response(
        JSON.stringify({
          success: true,
          dev: true,
          message: `开发模式：模拟发送确认邮件到 ${newEmail}`,
          confirmUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 通过 Resend 发送邮件
    const { Resend } = await import('https://esm.sh/resend@3.2.0')
    const resend = new Resend(RESEND_API_KEY)

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'PingFang SC','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:40px 40px 32px;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 16px;margin-bottom:20px;">
        <span style="font-size:20px;">✉️</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;">邮箱修改确认</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">请确认您的邮箱地址变更</p>
    </div>
    <div style="padding:36px 40px;">
      <div style="background:#f8f9ff;border-radius:12px;padding:24px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">您正在将邮箱修改为</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#4f46e5;">${newEmail}</p>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 32px;">
        点击下方按钮确认邮箱修改。此链接将在 <strong>24 小时后失效</strong>，请尽快完成验证。
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;font-size:16px;font-weight:600;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(79,70,229,0.4);">
          确认修改 →
        </a>
      </div>
      <div style="background:#fef3c7;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:600;">如果按钮无法点击，复制以下链接到浏览器打开：</p>
        <p style="margin:0;font-size:12px;color:#b45309;word-break:break-all;line-height:1.6;">${confirmUrl}</p>
      </div>
    </div>
    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-align:center;">
        此邮件由 <strong style="color:#6b7280;">${APP_NAME}</strong> 自动发送，如果您没有提交邮箱修改，请忽略此邮件。
      </p>
      <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
        © ${new Date().getFullYear()} ${APP_NAME}
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()

    const textContent = `
${APP_NAME} - 邮箱修改确认

您正在将邮箱修改为：${newEmail}

请点击以下链接确认修改：
${confirmUrl}

此链接将在 24 小时后失效。
如果这不是您本人的操作，请忽略此邮件。
    `.trim()

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <onboarding@resend.dev>`,
      to: [newEmail],
      subject: `【${APP_NAME}】请确认您的邮箱地址变更`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('[send-email-confirmation] Resend error:', error)
      const friendlyMessage = error.message?.includes('not authorized')
        ? '发件人邮箱未在 Resend 平台验证，请检查 RESEND_API_KEY 配置'
        : error.message?.includes('rate limit')
          ? '邮件发送频率超限，请稍后再试'
          : `邮件发送失败: ${error.message}`
      return new Response(
        JSON.stringify({ error: friendlyMessage, detail: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-email-confirmation] 成功发送确认邮件到: ${newEmail}, emailId: ${data?.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `确认邮件已发送到 ${newEmail}`,
        emailId: data?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-email-confirmation] Function error:', err)
    return new Response(
      JSON.stringify({ error: '服务器内部错误', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
