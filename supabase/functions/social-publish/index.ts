import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const PLATFORM_PUBLISH: Record<string, {
  name: string
  postUrl: string
  method: string
  extraHeaders: Record<string, string>
  buildBody: (content: string, title: string | null, meta: Record<string, unknown>) => Record<string, unknown>
  getPostId: (resp: unknown) => string | null
  getPostUrl: (resp: unknown, postId: string | null) => string | null
}> = {
  weibo: {
    name: 'Weibo',
    postUrl: 'https://api.weibo.com/2/statuses/update.json',
    method: 'POST',
    extraHeaders: {},
    buildBody: (_content) => ({ status: _content }),
    getPostId: (r) => (r as Record<string, unknown>).idstr ? String((r as Record<string, unknown>).idstr) : null,
    getPostUrl: (r) => (r as Record<string, unknown>).idstr ? 'https://weibo.com/' + (r as Record<string, unknown>).idstr : null,
  },
  bilibili: {
    name: 'Bilibili',
    postUrl: 'https://api.bilibili.com/v1/article',
    method: 'POST',
    extraHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
    buildBody: (_content, _title) => ({ title: _title || 'B站动态', content: _content }),
    getPostId: (r) => String(((r as Record<string, unknown>).data as Record<string, unknown>)?.id ?? ''),
    getPostUrl: (r) => {
      const id = ((r as Record<string, unknown>).data as Record<string, unknown>)?.id
      return id ? 'https://www.bilibili.com/read/cv' + id : null
    },
  },
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const headers = { ...corsHeaders(), 'Content-Type': 'application/json' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const body = await req.json() as { post_id?: string; account_id?: string; content?: string; title?: string; platform?: string }
    const postId = body.post_id
    const accountId = body.account_id

    if (!postId || !accountId) {
      return new Response(JSON.stringify({ error: 'missing post_id or account_id' }),
        { status: 400, headers })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: account } = await supabase
      .from('social_accounts')
      .select('id, user_id, platform, access_token, refresh_token, token_expires_at, metadata')
      .eq('id', accountId)
      .single()

    if (!account) {
      return new Response(JSON.stringify({ error: 'account not found' }),
        { status: 404, headers })
    }

    if (account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at)
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: 'access_token expired, please re-authorize' }),
          { status: 401, headers })
      }
    }

    if (!account.access_token) {
      return new Response(JSON.stringify({ error: 'account not authorized, connect platform first' }),
        { status: 401, headers })
    }

    const p = body.platform || account.platform
    const cfg = PLATFORM_PUBLISH[p]
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'unsupported platform: ' + p }),
        { status: 400, headers })
    }

    const meta = (account.metadata as Record<string, unknown>) || {}
    const reqBody = cfg.buildBody(body.content || '', body.title || null, meta)

    const resp = await fetch(cfg.postUrl, {
      method: cfg.method,
      headers: {
        'Authorization': 'Bearer ' + account.access_token,
        'Content-Type': 'application/json',
        ...cfg.extraHeaders,
      },
      body: JSON.stringify(reqBody),
    })

    const data = await resp.json() as Record<string, unknown>
    if (!resp.ok || data.error) {
      const errMsg = String((data.error_message || data.error_description || data.errmsg || data.error || 'publish failed'))
      await supabase.from('social_posts').update({ status: 'failed' }).eq('id', postId)
      return new Response(JSON.stringify({ success: false, error: errMsg, data }),
        { status: 200, headers })
    }

    const newPostId = cfg.getPostId(data)
    const postUrl = cfg.getPostUrl(data, newPostId)

    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      post_url: postUrl,
    }).eq('id', postId)

    return new Response(JSON.stringify({
      success: true,
      platform: p,
      post_id: newPostId,
      post_url: postUrl,
      message: cfg.name + ' published successfully!',
    }), { headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'server error', detail: String(err) }),
      { status: 500, headers })
  }
})