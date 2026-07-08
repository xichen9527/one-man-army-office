import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ─── 每个平台的发布 API 配置 ───────────────────────────────────────────────
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
    getPostUrl: () => null,
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
    getPostUrl: () => null,
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
    getPostUrl: () => null,
  },
  bilibili: {
    name: 'B站',
    postUrl: 'https://api.bilibili.com/x/dynamic/feed/create/dyn',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      dyn_req: { content: { contents: [{ raw_text: content, type: 1 }], scene: 1 } },
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.dyn_id_str || ''),
    getPostUrl: (_r, postId) => postId ? `https://t.bilibili.com/${postId}` : null,
  },
  zhihu: {
    name: '知乎',
    postUrl: 'https://www.zhihu.com/api/v4/questions/0/answers',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({ content, title: title || '' }),
    getPostId: (r) => String((r as Record<string, unknown>).id || ''),
    getPostUrl: (_r, postId) => postId ? `https://www.zhihu.com/answer/${postId}` : null,
  },
  toutiao: {
    name: '头条',
    postUrl: 'https://open.toutiao.com/api/v2/article/create',
    method: 'POST',
    extraHeaders: {},
    buildBody: (content, title, _meta) => ({
      title: title || content.slice(0, 30),
      content,
    }),
    getPostId: (r) => String((r as Record<string, unknown>).data?.article_id || ''),
    getPostUrl: (_r, postId) => postId ? `https://www.toutiao.com/article/${postId}` : null,
  },
}

// ─── 发布单个平台 ───────────────────────────────────────────────────────────
async function publishToPlatform(
  supabase: ReturnType<typeof createClient>,
  platformRecordId: string,
  accountId: string,
  postId: string,
  content: string,
  title: string | null,
  mediaUrls: string[] | null,
  platform: string,
): Promise<{ success: boolean; postId?: string | null; postUrl?: string | null; error?: string }> {
  // 获取账号信息
  const { data: account, error: accErr } = await supabase
    .from('social_accounts')
    .select('id, user_id, platform, access_token, refresh_token, token_expires_at, metadata')
    .eq('id', accountId)
    .single()

  if (accErr || !account) {
    return { success: false, error: '账号未找到或无法访问' }
  }

  // 检查 token 有效期
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at)
    if (expiresAt < new Date()) {
      return { success: false, error: 'access_token 已过期，请重新授权连接' }
    }
  }

  if (!account.access_token) {
    return { success: false, error: '账号未授权，请先连接平台完成 OAuth 授权' }
  }

  const cfg = PLATFORM_PUBLISH[platform]
  if (!cfg) {
    return { success: false, error: `不支持的平台: ${platform}` }
  }

  const meta = (account.metadata as Record<string, unknown>) || {}

  // 用户可自定义发布 API 端点和请求头
  const customPostUrl = meta.custom_publish_url as string | undefined
  const postUrl = customPostUrl || cfg.postUrl
  const customHeaders = (meta.custom_publish_headers as Record<string, string>) || {}

  const reqBody = cfg.buildBody(content, title, meta)

  // 如果有媒体文件，需要先上传到平台（这里仅处理 URL 类型媒体）
  // 实际视频/图片上传需要各平台专门的媒体 API
  const finalBody = mediaUrls?.length
    ? { ...reqBody, media_urls: mediaUrls }
    : reqBody

  let resp: Response
  try {
    resp = await fetch(postUrl, {
      method: cfg.method,
      headers: {
        'Authorization': 'Bearer ' + account.access_token,
        'Content-Type': 'application/json',
        ...cfg.extraHeaders,
        ...customHeaders,
      },
      body: JSON.stringify(finalBody),
    })
  } catch (err) {
    return { success: false, error: `网络请求失败: ${String(err)}` }
  }

  const data = await resp.json() as Record<string, unknown>

  if (!resp.ok || data.error || data.errcode || data.code?.toString().startsWith('4')) {
    const errMsg = String(
      data.error_message || data.error_description || data.msg ||
      data.errmsg || data.error || data.message || '发布失败'
    )
    // 更新平台记录为失败
    await supabase.from('social_post_platforms').update({
      status: 'failed',
      error_message: errMsg,
    }).eq('id', platformRecordId)

    return { success: false, error: errMsg }
  }

  const newPostId = cfg.getPostId(data)
  const postUrlResult = cfg.getPostUrl(data, newPostId, meta)

  // 更新平台记录为已发布
  await supabase.from('social_post_platforms').update({
    status: 'published',
    published_at: new Date().toISOString(),
    post_url: postUrlResult,
    platform_post_id: newPostId,
    error_message: null,
  }).eq('id', platformRecordId)

  return { success: true, postId: newPostId, postUrl: postUrlResult }
}

// ─── 核心处理函数 ────────────────────────────────────────────────────────────
async function processScheduledPosts(
  supabase: ReturnType<typeof createClient>,
): Promise<{ processed: number; published: number; failed: number; errors: string[] }> {
  // 查询所有待发布的帖子（主表 status = 'scheduled' 且 scheduled_at 已到期）
  const { data: posts, error: postErr } = await supabase
    .from('social_media_posts')
    .select('id, title, content, scheduled_at, media_urls, status')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())

  if (postErr) {
    return { processed: 0, published: 0, failed: 0, errors: [`查询待发布帖子失败: ${postErr.message}`] }
  }

  if (!posts || posts.length === 0) {
    return { processed: 0, published: 0, failed: 0, errors: [] }
  }

  let publishedCount = 0
  let failedCount = 0
  const allErrors: string[] = []

  for (const post of posts) {
    // 查询该帖子关联的所有平台记录（只处理 scheduled 状态的）
    const { data: platformRecords, error: ppErr } = await supabase
      .from('social_post_platforms')
      .select('id, account_id, platform, status, scheduled_at, media_urls')
      .eq('post_id', post.id)
      .eq('status', 'scheduled')

    if (ppErr) {
      allErrors.push(`[${post.id}] 查询平台记录失败: ${ppErr.message}`)
      continue
    }

    if (!platformRecords || platformRecords.length === 0) {
      // 没有待发布的平台记录，检查是否全部已完成
      const { data: remaining } = await supabase
        .from('social_post_platforms')
        .select('status')
        .eq('post_id', post.id)

      const allDone = !remaining || remaining.every(
        (r: { status: string }) => ['published', 'failed', 'draft'].includes(r.status)
      )

      if (allDone) {
        await supabase.from('social_media_posts').update({ status: 'scheduled' }).eq('id', post.id)
      }
      continue
    }

    // 将主帖状态更新为 publishing（发布中）
    await supabase.from('social_media_posts').update({ status: 'scheduled' }).eq('id', post.id)

    let anySuccess = false
    let anyFailure = false

    for (const pp of platformRecords) {
      const result = await publishToPlatform(
        supabase,
        pp.id,
        pp.account_id,
        post.id,
        post.content,
        post.title,
        post.media_urls as string[] | null,
        pp.platform,
      )

      if (result.success) {
        anySuccess = true
      } else {
        anyFailure = true
        allErrors.push(`[${post.id} @ ${pp.platform}] ${result.error}`)
      }
    }

    // 检查该帖子所有平台记录的最终状态
    const { data: finalPlatformRecords } = await supabase
      .from('social_post_platforms')
      .select('status')
      .eq('post_id', post.id)

    const finalStatuses = finalPlatformRecords?.map((r: { status: string }) => r.status) || []
    const allPublished = finalStatuses.every((s: string) => s === 'published')
    const anyFailed = finalStatuses.some((s: string) => s === 'failed')
    const allDone = finalStatuses.every((s: string) => ['published', 'failed'].includes(s))

    if (allPublished) {
      await supabase.from('social_media_posts').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', post.id)
      publishedCount++
    } else if (allDone) {
      await supabase.from('social_media_posts').update({ status: 'failed' }).eq('id', post.id)
      failedCount++
    }
    // 若还有 pending/scheduled，继续留待下次 cron 处理
  }

  return {
    processed: posts.length,
    published: publishedCount,
    failed: failedCount,
    errors: allErrors,
  }
}

// ─── HTTP Handler ───────────────────────────────────────────────────────────
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

  // 该函数由 pg_cron 调用，不需要任何参数（内部使用 service_role 查询）
  // 也支持手动调用（带 post_id 时只处理指定帖子）
  let postId: string | undefined
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json() as { post_id?: string }
      postId = body.post_id
    }
  } catch { /* no body */ }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if (postId) {
      // 手动触发：只处理指定的帖子
      const { data: post } = await supabase
        .from('social_media_posts')
        .select('id, title, content, scheduled_at, media_urls, status')
        .eq('id', postId)
        .single()

      if (!post) {
        return new Response(JSON.stringify({ error: '帖子未找到' }), { status: 404, headers })
      }

      // 将状态改为 scheduled 以便处理
      if (post.status === 'draft') {
        await supabase.from('social_media_posts').update({ status: 'scheduled' }).eq('id', postId)
      }

      const { data: platformRecords } = await supabase
        .from('social_post_platforms')
        .select('id, account_id, platform, status')
        .eq('post_id', postId)
        .eq('status', 'scheduled')

      let successCount = 0
      let failCount = 0
      const platformErrors: Record<string, string> = {}

      for (const pp of (platformRecords || [])) {
        const result = await publishToPlatform(
          supabase, pp.id, pp.account_id, post.id,
          post.content, post.title, post.media_urls as string[] | null, pp.platform,
        )
        if (result.success) successCount++
        else { failCount++; platformErrors[pp.platform] = result.error || '未知错误' }
      }

      return new Response(JSON.stringify({
        success: true,
        post_id: postId,
        platforms: { success: successCount, failed: failCount },
        platform_errors: Object.keys(platformErrors).length > 0 ? platformErrors : undefined,
      }), { headers })

    } else {
      // Cron 调用：处理所有到期的帖子
      const result = await processScheduledPosts(supabase)
      return new Response(JSON.stringify({
        ok: true,
        ...result,
        timestamp: new Date().toISOString(),
      }), { headers })
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: '服务器错误', detail: String(err) }),
      { status: 500, headers })
  }
})
