import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const PLATFORM_CONFIG: Record<string, {
  name: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
}> = {
  weibo: {
    name: 'Weibo',
    authorizeUrl: 'https://api.weibo.com/oauth2/authorize',
    tokenUrl: 'https://api.weibo.com/oauth2/access_token',
    scopes: '',
  },
  bilibili: {
    name: 'Bilibili',
    authorizeUrl: 'https://api.bilibili.com/v1/oauth2/authorize',
    tokenUrl: 'https://api.bilibili.com/v1/oauth2/token',
    scopes: '',
  },
  wechat: {
    name: 'WeChat MP',
    authorizeUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    scopes: 'snsapi_login',
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
.msg{color:#6b7280;font-size:14px;margin-top:16px;line-height:1.5}</style></head><body>
<div class="card"><div class="icon" style="color:${color}">${icon}</div>
<div class="title">${title}</div><div class="msg">${message}</div></div></body></html>`
}

serve(async (req) => {
  const headers = corsHeaders()
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const platform = url.searchParams.get('platform') || url.searchParams.get('state')

    if (code && platform) {
      const cfg = PLATFORM_CONFIG[platform]
      if (!cfg) {
        return new Response(
          htmlPage('Unsupported Platform', 'OAuth for ' + platform + ' not configured', false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } }
        )
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data: accounts } = await supabase
        .from('social_accounts').select('id, user_id, metadata')
        .eq('platform', platform).limit(1)

      if (!accounts || accounts.length === 0) {
        return new Response(
          htmlPage('Account Not Found', 'Please connect this platform first', false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }

      const account = accounts[0]
      const meta = (account.metadata as Record<string, string>) || {}
      const clientId = meta.app_key || meta.client_id || meta.client_key || ''
      const clientSecret = meta.app_secret || meta.client_secret || ''

      if (!clientId || !clientSecret) {
        return new Response(
          htmlPage('Credentials Missing', 'Please fill in App Key and App Secret first', false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }

      const redirectUri = SUPABASE_URL + '/functions/v1/social-oauth?platform=' + platform
      const tokenResp = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }),
      })

      const tokenData = await tokenResp.json() as Record<string, unknown>
      if (!tokenResp.ok || tokenData.error) {
        return new Response(
          htmlPage('Token Error', 'Failed to get access token: ' + (tokenData.error_description || JSON.stringify(tokenData)), false),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      }

      const expiresIn = tokenData.expires_in as number || 0
      const tokenExpiresAt = expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null

      await supabase.from('social_accounts').update({
        access_token: tokenData.access_token as string || '',
        refresh_token: tokenData.refresh_token as string || null,
        token_expires_at: tokenExpiresAt,
        check_status: 'active',
        metadata: { ...meta, oauth_uid: tokenData.uid || tokenData.openid || null },
      }).eq('id', account.id)

      return new Response(
        htmlPage('Connected!', cfg.name + ' account authorized. You can now publish content.', true),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // INITIATE mode
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

    const cfg = PLATFORM_CONFIG[platformParam]
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'unsupported platform' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: account } = accountId
      ? await supabase.from('social_accounts').select('id, metadata').eq('id', accountId).single()
      : await supabase.from('social_accounts').select('id, metadata').eq('platform', platformParam).limit(1).single()

    if (!account) {
      return new Response(JSON.stringify({ error: 'account not found, connect platform first' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    const meta = (account.metadata as Record<string, string>) || {}
    const clientId = meta.app_key || meta.client_id || meta.client_key || ''
    const clientSecret = meta.app_secret || meta.client_secret || ''

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: 'missing credentials',
        message: 'fill in App Key and App Secret first',
        needs_credentials: true,
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } })
    }

    const redirectUri = SUPABASE_URL + '/functions/v1/social-oauth?platform=' + platformParam
    const state = account.id

    let authUrl = cfg.authorizeUrl + '?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code&state=' + state
    if (cfg.scopes) authUrl += '&scope=' + cfg.scopes

    return new Response(JSON.stringify({
      auth_url: authUrl,
      platform: platformParam,
      message: 'opening authorization page...',
    }), { headers: { 'Content-Type': 'application/json', ...headers } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'server error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...headers } })
  }
})