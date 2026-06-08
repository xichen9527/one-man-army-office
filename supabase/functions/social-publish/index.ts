import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// 每个平台的发布 API 配置
const PLATFORM_PUBLISH: Record<string, {
  name: string
  postUrl: string
  method: string
  extraHeaders: Record<string, string>
  buildBody: (content: string, title: string | null, meta: Record<string, unknown>) => Record<string, unknown>
  getPostId: (resp: unknown) => string | null
  getPostUrl: (resp: unknown, postId: string | null, meta: Record<string, unknown>) => string | null
}> = {
  weibo: {
    name: '微博',
    postUrl: 'https://api.weibo.com/2/statuses/share.json',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, _title, _meta) => ({ status: content }),
    getPostId: (r) => String((r as Record<string, unknown>).idstr || (r as Record<string, unknown>).id || ''),
    getPostUrl: (_r, postId, meta) => postId ? `https://weibo.com/${meta.oauth_uid || ''}/${postId}` : null,
  },
  wechat: {
    name: '微信公众号',
    postUrl: 'https://api.weixin.qq.com/cgi-bin/draft/add',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      articles: [{ title: title || '微信文章', content, thumb_media_id: '', author: '', digest: content.slice(0, 120) }],
    }),
    getPostId: (r) => String((r as Record<string, unknown>).media_id || ''),
    getPostUrl: (_r, _postId, _meta) => null, // 草稿需手动发布
  },
  douyin: {
    name: '抖音',
    postUrl: 'https://open.douyin.com/api/douyin/v1/video/create_video/',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, meta) => ({
      text: content,
      title: title || '',
      open_id: meta.oauth_uid || '',
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.item_id || ''),
    getPostUrl: (_r, _postId, _meta) => null,
  },
  xiaohongshu: {
    name: '小红书',
    postUrl: 'https://open.xiaohongshu.com/api/note/post',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, meta) => ({
      title: title || content.slice(0, 20),
      desc: content,
      type: 'normal',
      note_type: 1,
      is_video: false,
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.note_id || ''),
    getPostUrl: (_r, _postId, _meta) => null,
  },
  bilibili: {
    name: 'B站',
    postUrl: 'https://api.bilibili.com/x/dynamic/feed/create/dyn',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      dyn_req: {
        content: { contents: [{ raw_text: content, type: 1 }] },
        scene: 1,
      },
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.dyn_id_str || ''),
    getPostUrl: (_r, postId, _meta) => postId ? `https://t.bilibili.com/${postId}` : null,
  },
  zhihu: {
    name: '知乎',
    postUrl: 'https://www.zhihu.com/api/v4/questions/0/answers',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      content: content,
      title: title || '',
    }),
    getPostId: (r) => String((r as Record<string, unknown>).id || ''),
    getPostUrl: (_r, postId, _meta) => postId ? `https://www.zhihu.com/answer/${postId}` : null,
  },
  toutiao: {
    name: '头条',
    postUrl: 'https://open.toutiao.com/api/v2/article/create',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      title: title || content.slice(0, 30),
      content: content,
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.article_id || ''),
    getPostUrl: (_r, postId, _meta) => postId ? `https://www.toutiao.com/article/${postId}` : null,
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
    const body = await req.json() as {
      post_id?: string
      account_id?: string
      content?: string
      title?: string
      platform?: string
    }

    const postId = body.post_id
    const accountId = body.account_id

    if (!postId || !accountId) {
      return new Response(JSON.stringify({ error: '缺少 post_id 或 account_id' }),
        { status: 400, headers })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: account } = await supabase
      .from('social_accounts')
      .select('id, user_id, platform, access_token, refresh_token, token_expires_at, metadata')
      .eq('id', accountId)
      .single()

    if (!account) {
      return new Response(JSON.stringify({ error: '账号未找到' }),
        { status: 404, headers })
    }

    // 检查 token 是否过期
    if (account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at)
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: 'access_token 已过期，请重新授权连接' }),
          { status: 401, headers })
      }
    }

    if (!account.access_token) {
      return new Response(JSON.stringify({ error: '账号未授权，请先连接平台完成 OAuth 授权' }),
        { status: 401, headers })
    }

    const p = body.platform || account.platform
    const cfg = PLATFORM_PUBLISH[p]
    if (!cfg) {
      return new Response(JSON.stringify({ error: '不支持的平台: ' + p, supported: Object.keys(PLATFORM_PUBLISH) }),
        { status: 400, headers })
    }

    const meta = (account.metadata as Record<string, unknown>) || {}

    // 用户可自定义发布 API 端点
    const customPostUrl = meta.custom_publish_url as string | undefined
    const postUrl = customPostUrl || cfg.postUrl

    // 用户可自定义额外请求头
    const customHeaders = (meta.custom_publish_headers as Record<string, string>) || {}

    const reqBody = cfg.buildBody(body.content || '', body.title || null, meta)

    const resp = await fetch(postUrl, {
      method: cfg.method,
      headers: {
        'Authorization': 'Bearer ' + account.access_token,
        'Content-Type': 'application/json',
        ...cfg.extraHeaders,
        ...customHeaders,
      },
      body: JSON.stringify(reqBody),
    })

    const data = await resp.json() as Record<string, unknown>

    if (!resp.ok || data.error || data.errcode || data.code?.toString().startsWith('4')) {
      const errMsg = String(
        data.error_message || data.error_description || data.msg ||
        data.errmsg || data.error || data.message || '发布失败'
      )
      await supabase.from('social_posts').update({ status: 'failed' }).eq('id', postId)
      return new Response(JSON.stringify({ success: false, error: errMsg, detail: data }),
        { status: 200, headers })
    }

    const newPostId = cfg.getPostId(data)
    const postUrlResult = cfg.getPostUrl(data, newPostId, meta)

    await supabase.from('social_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      post_url: postUrlResult,
    }).eq('id', postId)

    return new Response(JSON.stringify({
      success: true,
      platform: p,
      platform_name: cfg.name,
      post_id: newPostId,
      post_url: postUrlResult,
      message: cfg.name + ' 发布成功！',
    }), { headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: '服务器错误', detail: String(err) }),
      { status: 500, headers })
  }
})
