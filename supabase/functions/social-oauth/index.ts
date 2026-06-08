import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// 每个平台的 OAuth 配置 — 用户在 metadata 中存储凭证
const PLATFORM_OAUTH: Record<string, {
  name: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
  clientIdField: string   // metadata 中 clientId 的 key
  clientSecretField: string // metadata 中 clientSecret 的 key
  extraTokenParams?: Record<string, string>
}> = {
  weibo: {
    name: '微博',
    authorizeUrl: 'https://api.weibo.com/oauth2/authorize',
    tokenUrl: 'https://api.weibo.com/oauth2/access_token',
    scopes: 'all',
    clientIdField: 'app_key',
    clientSecretField: 'app_secret',
  },
  wechat: {
    name: '微信公众平台',
    authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    scopes: 'snsapi_login',
    clientIdField: 'app_id',
    clientSecretField: 'app_secret',
  },
  douyin: {
    name: '抖音',
    authorizeUrl: 'https://open.douyin.com/platform/oauth/connect/',
    tokenUrl: 'https://open.douyin.com/oauth/access_token/',
    scopes: 'user_info,video.create',
    clientIdField: 'client_key',
    clientSecretField: 'client_secret',
  },
  xiaohongshu: {
    name: '小红书',
    authorizeUrl: 'https://open.xiaohongshu.com/oauth/authorize',
    tokenUrl: 'https://open.xiaohongshu.com/oauth/token',
    scopes: 'basic_info,note_create',
    clientIdField: 'app_key',
    clientSecretField: 'app_secret',
  },
  bilibili: {
    name: 'B站',
    authorizeUrl: 'https://passport.bilibili.com/oauth2/authorize',
    tokenUrl: 'https://passport.bilibili.com/oauth2/access_token',
    scopes: '',
    clientIdField: 'app_key',
    clientSecretField: 'app_secret',
  },
  zhihu: {
    name: '知乎',
    authorizeUrl: 'https://www.zhihu.com/oauth2/authorize',
    tokenUrl: 'https://www.zhihu.com/oauth2/token',
    scopes: 'read,content_create',
    clientIdField: 'client_id',
    clientSecretField: 'client_secret',
  },
  toutiao: {
    name: '头条',
    authorizeUrl: 'https://open.toutiao.com/oauth2/authorize',
    tokenUrl: 'https://open.toutiao.com/oauth2/access_token',
    scopes: 'user_info,article_create',
    clientIdField: 'app_key',
    clientSecretField: 'app_secret',
  },
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
}

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? '#22c55e' : '#ef4444'
  const icon = success ? '&#10004;' : '&#10060;'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f9fafb}
.card{background:white;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);text-align:center;max-width:400px}
.icon{font-size:48px;margin-bottom:16px}.title{font-size:20px;font-weight:bold;margin-bottom:8px;color:#1f2937}
.msg{color:#6b7280;font-size:14px;margin-top:16px;line-height:1.5}
.btn{display:inline-block;margin-top:16px;padding:8px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:14px}</style></head><body>
<div class="card"><div class="icon" style="color:${color}">${icon}</div>
<div class="title">${title}</div><div class="msg">${message}</div>
${success ? '<a class="btn" href="javascript:window.close()">关闭窗口</a>' : ''}</div></body></html>`
}

serve(async (req) => {
  const headers = corsHeaders()
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const platform = url.searchParams.get('platform') || url.searchParams.get('state')?.split(':')[0]

    // ===== CALLBACK: OAuth 授权回调 =====
    if (code && platform) {
      const cfg = PLATFORM_OAUTH[platform]
      if (!cfg) {
        return new Response(htmlPage('不支持的平台', '该平台的 OAuth 尚未配置', false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } })
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const accountId = url.searchParams.get('state')?.split(':')[1] || ''

      const { data: account } = accountId
        ? await supabase.from('social_accounts').select('id, metadata').eq('id', accountId).single()
        : await supabase.from('social_accounts').select('id, metadata').eq('platform', platform).limit(1).single()

      if (!account) {
        return new Response(htmlPage('账号未找到', '请先在平台中绑定该社交账号', false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }

      const meta = (account.metadata as Record<string, string>) || {}
      const clientId = meta[cfg.clientIdField] || ''
      const clientSecret = meta[cfg.clientSecretField] || ''

      if (!clientId || !clientSecret) {
        return new Response(htmlPage('凭证缺失', '请先填写 ' + cfg.clientIdField + ' 和 ' + cfg.clientSecretField, false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }

      const redirectUri = SUPABASE_URL + '/functions/v1/social-oauth?platform=' + platform

      // 构建请求 token 的参数
      const tokenParams: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }
      if (cfg.extraTokenParams) {
        Object.assign(tokenParams, cfg.extraTokenParams)
      }

      const tokenResp = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams),
      })

      const tokenData = await tokenResp.json() as Record<string, unknown>

      if (!tokenResp.ok || tokenData.error) {
        const errMsg = String(tokenData.error_description || tokenData.error_description || tokenData.msg || JSON.stringify(tokenData))
        return new Response(htmlPage('授权失败', '获取 access_token 失败: ' + errMsg, false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }

      const expiresIn = Number(tokenData.expires_in) || 0
      const tokenExpiresAt = expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null

      // 处理各平台不同的返回格式
      const accessToken = String(tokenData.access_token || tokenData.data?.access_token || '')
      const refreshToken = String(tokenData.refresh_token || tokenData.data?.refresh_token || '')
      const openId = String(tokenData.uid || tokenData.openid || tokenData.data?.open_id || '')

      await supabase.from('social_accounts').update({
        access_token: accessToken,
        refresh_token: refreshToken || null,
        token_expires_at: tokenExpiresAt,
        check_status: 'active',
        metadata: { ...meta, oauth_uid: openId, connected_at: new Date().toISOString() },
      }).eq('id', account.id)

      return new Response(
        htmlPage('连接成功！', cfg.name + ' 已授权，现在可以发布内容了', true),
        { headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } }
      )
    }

    // ===== INITIATE: 发起 OAuth 授权 =====
    let platformParam = ''
    let accountId = ''

    if (req.method === 'POST') {
      const body = await req.json() as Record<string, string>
      platformParam = body.platform || ''
      accountId = body.account_id || ''
    } else {
      platformParam = url.searchParams.get('platform') || ''
      accountId = url.searchParams.get('account_id') || ''
    }

    const cfg = PLATFORM_OAUTH[platformParam]
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'unsupported platform', supported: Object.keys(PLATFORM_OAUTH) }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: account } = accountId
      ? await supabase.from('social_accounts').select('id, metadata').eq('id', accountId).single()
      : await supabase.from('social_accounts').select('id, metadata').eq('platform', platformParam).limit(1).single()

    if (!account) {
      return new Response(JSON.stringify({ error: 'account not found', message: '请先绑定该平台的社交账号' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    const meta = (account.metadata as Record<string, string>) || {}
    const clientId = meta[cfg.clientIdField] || ''
    const clientSecret = meta[cfg.clientSecretField] || ''

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: 'missing credentials',
        message: '请先填写 ' + cfg.clientIdField + ' 和 ' + cfg.clientSecretField,
        needs_credentials: true,
        required_fields: { client_id: cfg.clientIdField, client_secret: cfg.clientSecretField },
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    // 检查用户是否配置了自定义 API 端点
    const customAuthorizeUrl = meta.custom_authorize_url
    const authorizeUrl = customAuthorizeUrl || cfg.authorizeUrl

    const redirectUri = SUPABASE_URL + '/functions/v1/social-oauth?platform=' + platformParam
    const state = platformParam + ':' + account.id

    let authUrl = authorizeUrl +
      '?client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&state=' + encodeURIComponent(state)

    if (cfg.scopes) authUrl += '&scope=' + encodeURIComponent(cfg.scopes)

    return new Response(JSON.stringify({
      auth_url: authUrl,
      platform: platformParam,
      platform_name: cfg.name,
      message: '正在跳转到 ' + cfg.name + ' 授权页面...',
    }), { headers: { 'Content-Type': 'application/json', ...headers } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'server error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...headers } })
  }
})
