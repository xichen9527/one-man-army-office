// Supabase Edge Function: 发送团队邀请邮件
// 文件路径: supabase/functions/send-invitation-email/index.ts
// 【修复问题5】
//   1. APP_URL 默认值改为 GitHub Pages 地址
//   2. 发件人地址从 invite@resend.dev 改为 onboarding@resend.dev（Resend 默认可用）
//   3. 添加更友好的错误提示

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@3.2.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const APP_NAME = '一人成军办公平台'
// 【修复】默认地址改为 GitHub Pages 地址
const APP_URL = Deno.env.get('APP_URL') || 'https://xichen9527.github.io/one-man-army-office'

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { email, inviterName, inviteeRole, token, appName } = await req.json()

    if (!email || !token) {
      return new Response(JSON.stringify({ error: '缺少必要参数', message: '请提供邮箱地址和邀请 Token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式不正确', message: `邮箱地址 "${email}" 格式无效` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const platform = appName || APP_NAME
    const inviteUrl = `${APP_URL}/invite/${token}`
    const roleText: Record<string, string> = { admin: '管理员', manager: '经理', member: '成员' }
    const roleLabel = roleText[inviteeRole] || '成员'

    // 使用 Resend 发送邮件
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
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:40px 40px 32px;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 16px;margin-bottom:20px;">
        <span style="font-size:20px;">🚀</span>
      </div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;">您收到了一个邀请</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">加入 ${platform} 团队，开启高效协作</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <div style="background:#f8f9ff;border-radius:12px;padding:24px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">邀请人</p>
        <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#1f2937;">${inviterName}</p>
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">邀请您以</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#4f46e5;">${roleLabel}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">身份加入团队</p>
      </div>

      <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 32px;">
        点击下方按钮接受邀请，创建您的账号并加入团队。邀请链接将在 <strong>7 天后失效</strong>，请尽快完成注册。
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;font-size:16px;font-weight:600;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(79,70,229,0.4);">
          接受邀请 →
        </a>
      </div>

      <!-- Fallback link -->
      <div style="background:#fef3c7;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:600;">如果按钮无法点击，复制以下链接到浏览器打开：</p>
        <p style="margin:0;font-size:12px;color:#b45309;word-break:break-all;line-height:1.6;">${inviteUrl}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-align:center;">
        此邮件由 <strong style="color:#6b7280;">${platform}</strong> 自动发送，请勿回复。
      </p>
      <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
        © ${new Date().getFullYear()} ${platform} · 保护隐私政策
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()

    const textContent = `
${platform} - 团队邀请

${inviterName} 邀请您以 ${roleLabel} 身份加入团队。

点击以下链接接受邀请：
${inviteUrl}

此链接将在 7 天后失效，请尽快完成注册。
    `.trim()

    // 如果没有配置 RESEND_API_KEY，返回模拟成功（开发阶段）
    if (!RESEND_API_KEY || RESEND_API_KEY === 'xxx') {
      console.log(`[DEV MODE] 模拟发送邀请邮件到: ${email}`)
      console.log(`邀请链接: ${inviteUrl}`)
      return new Response(JSON.stringify({
        success: true,
        dev: true,
        message: `开发模式：模拟发送邀请邮件到 ${email}`,
        inviteUrl,
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 【修复】使用 onboarding@resend.dev 作为发件人（Resend 默认可用，支持发送到任意邮箱）
    const { data, error } = await resend.emails.send({
      from: `${platform} <onboarding@resend.dev>`,
      to: [email],
      subject: `【${platform}】您收到了来自 ${inviterName} 的团队邀请`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('Resend error:', error)
      // 【修复】提供更友好的错误提示
      const friendlyMessage = error.message?.includes('not authorized')
        ? '发件人邮箱未在 Resend 平台验证，请检查 RESEND_API_KEY 配置'
        : error.message?.includes('rate limit')
          ? '邮件发送频率超限，请稍后再试'
          : `邮件发送失败: ${error.message}`
      return new Response(JSON.stringify({
        error: friendlyMessage,
        detail: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    console.log(`[send-invitation-email] 成功发送邀请邮件到: ${email}, emailId: ${data?.id}`)

    return new Response(JSON.stringify({
      success: true,
      message: `邀请邮件已发送到 ${email}`,
      emailId: data?.id,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: '服务器内部错误', message: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
