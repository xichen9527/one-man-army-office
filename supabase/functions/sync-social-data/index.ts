// Edge Function: sync-social-data
// 各平台数据同步 — 优先调用真实 API，失败时降级为模拟数据

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const PLATFORM_CONFIGS: Record<string, {
  name: string
  fields: string[]
  userInfoUrl: string
  parseUserStats: (data: Record<string, unknown>) => { follower_count: number; following_count: number; post_count: number }
}> = {
  weibo: {
    name: '微博',
    fields: ['app_key', 'app_secret'],
    userInfoUrl: 'https://api.weibo.com/2/users/show.json',
    parseUserStats: (d) => ({
      follower_count: Number(d.followers_count) || 0,
      following_count: Number(d.friends_count) || 0,
      post_count: Number(d.statuses_count) || 0,
    }),
  },
  wechat: {
    name: '微信公众平台',
    fields: ['app_id', 'app_secret'],
    userInfoUrl: 'https://api.weixin.qq.com/cgi-bin/user/info',
    parseUserStats: (d) => ({
      follower_count: Number(d.subscribe ? 1 : 0),
      following_count: 0,
      post_count: 0,
    }),
  },
  douyin: {
    name: '抖音',
    fields: ['client_key', 'client_secret'],
    userInfoUrl: 'https://open.douyin.com/api/douyin/v1/user/info/',
    parseUserStats: (d) => ({
      follower_count: Number(d.data?.follower_count || d.data?.followers_count || 0),
      following_count: Number(d.data?.following_count || 0),
      post_count: Number(d.data?.video_count || 0),
    }),
  },
  xiaohongshu: {
    name: '小红书',
    fields: ['app_key', 'app_secret'],
    userInfoUrl: 'https://open.xiaohongshu.com/api/user/info',
    parseUserStats: (d) => ({
      follower_count: Number(d.data?.follower_count || 0),
      following_count: Number(d.data?.following_count || 0),
      post_count: Number(d.data?.note_count || 0),
    }),
  },
  bilibili: {
    name: 'B站',
    fields: ['app_key', 'app_secret'],
    userInfoUrl: 'https://api.bilibili.com/x/space/acc/info',
    parseUserStats: (d) => ({
      follower_count: Number(d.data?.follower || d.data?.fans || 0),
      following_count: Number(d.data?.following || 0),
      post_count: 0,
    }),
  },
  zhihu: {
    name: '知乎',
    fields: ['client_id', 'client_secret'],
    userInfoUrl: 'https://www.zhihu.com/api/v4/me',
    parseUserStats: (d) => ({
      follower_count: Number(d.follower_count || 0),
      following_count: Number(d.following_count || 0),
      post_count: Number(d.answer_count || 0) + Number(d.articles_count || 0),
    }),
  },
  toutiao: {
    name: '头条',
    fields: ['app_key', 'app_secret'],
    userInfoUrl: 'https://open.toutiao.com/api/v2/user/info',
    parseUserStats: (d) => ({
      follower_count: Number(d.data?.follower_count || 0),
      following_count: 0,
      post_count: Number(d.data?.article_count || 0),
    }),
  },
}

// 模拟数据（降级方案）
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateMockData(platform: string, currentFollowers: number, currentPostCount: number) {
  const followerDelta = Math.floor(currentFollowers * (Math.random() * 0.1 - 0.05))
  const follower_count = Math.max(0, currentFollowers + followerDelta)
  const following_count = rand(50, 500)
  const post_count = currentPostCount + rand(0, 3)

  const templates: Record<string, string[]> = {
    weibo: ['今日分享', '产品更新快报', '周末愉快'],
    wechat: ['本周推文已更新', '新功能上线公告', '行业洞察'],
    douyin: ['30秒带你了解新功能', '程序员的一天', '效率工具安利'],
    xiaohongshu: ['好物分享', '职场干货', '自律打卡'],
    bilibili: ['技术教程', '产品评测', '干货合集'],
    zhihu: ['如何提升团队协作效率？', '2026年技术趋势', '效率工具推荐'],
    toutiao: ['行业快讯', '深度解读', '观点评论'],
  }

  const recent_posts = Array.from({ length: rand(2, 5) }, (_, i) => ({
    id: `post-${platform}-${Date.now()}-${i}`,
    content: (templates[platform] || templates.weibo)[i % 3],
    likes: rand(10, 5000),
    comments: rand(5, 500),
    shares: rand(2, 200),
    views: rand(100, 50000),
    published_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }))

  return { follower_count, following_count, post_count, recent_posts }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { platform, account_id, credentials, current_followers, current_post_count } = await req.json()

    if (!platform || !PLATFORM_CONFIGS[platform]) {
      return new Response(
        JSON.stringify({ error: `不支持的平台: ${platform}`, supported: Object.keys(PLATFORM_CONFIGS) }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      )
    }

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: '缺少 account_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      )
    }

    const config = PLATFORM_CONFIGS[platform]

    // 没有凭证 → 返回提示
    if (!credentials) {
      return new Response(
        JSON.stringify({
          error: '未提供平台凭证',
          message: `请先在「连接平台」中填写 ${config.name} 的 ${config.fields.join(' 和 ')}`,
          dev_mode: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      )
    }

    // 凭证不完整
    const hasAllFields = config.fields.every(f => credentials[f])
    if (!hasAllFields) {
      return new Response(
        JSON.stringify({
          error: '缺少必要字段',
          message: `${config.name} 需要填写: ${config.fields.join(', ')}`,
          missing_fields: config.fields.filter(f => !credentials[f]),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      )
    }

    // 尝试调用真实 API
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: account } = await supabase
      .from('social_accounts')
      .select('access_token, metadata')
      .eq('id', account_id)
      .single()

    const accessToken = account?.access_token
    const meta = (account?.metadata as Record<string, unknown>) || {}
    const customUserInfoUrl = meta.custom_user_info_url as string | undefined

    if (accessToken) {
      try {
        const userInfoUrl = customUserInfoUrl || config.userInfoUrl
        const resp = await fetch(userInfoUrl, {
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
        })

        if (resp.ok) {
          const apiData = await resp.json() as Record<string, unknown>
          const stats = config.parseUserStats(apiData)

          return new Response(JSON.stringify({
            success: true,
            platform,
            account_id,
            synced_at: new Date().toISOString(),
            source: 'live_api',
            ...stats,
            raw_data: apiData,
          }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } })
        }
      } catch (e) {
        console.warn('Live API failed, falling back to mock:', e)
      }
    }

    // 降级：模拟数据
    const mockData = generateMockData(platform, current_followers || 1000, current_post_count || 0)
    return new Response(JSON.stringify({
      success: true,
      platform,
      account_id,
      synced_at: new Date().toISOString(),
      source: 'mock',
      message: accessToken
        ? 'API 调用失败，使用模拟数据（可能 token 已过期或 API 端点不可用）'
        : '使用模拟数据（未完成 OAuth 授权，连接后可获取真实数据）',
      ...mockData,
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: '服务器错误', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    )
  }
})
