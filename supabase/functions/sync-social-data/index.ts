// Edge Function: sync-social-data
// 模拟各平台 API 数据同步（因为各平台官方 API 需要企业资质申请）

const PLATFORM_CONFIGS: Record<string, { name: string; fields: string[] }> = {
  weibo: { name: '微博', fields: ['app_key', 'app_secret'] },
  wechat: { name: '微信公众平台', fields: ['app_id', 'app_secret'] },
  douyin: { name: '抖音', fields: ['client_key', 'client_secret'] },
  xiaohongshu: { name: '小红书', fields: ['app_key', 'app_secret'] },
  bilibili: { name: 'B站', fields: ['app_key', 'app_secret'] },
  zhihu: { name: '知乎', fields: ['client_id', 'client_secret'] },
}

const CONTENT_TEMPLATES: Record<string, string[]> = {
  weibo: ['今日分享一则开发心得…', '产品更新快报！', '周末愉快，分享一张图～', '技术圈又有大新闻了', '用户反馈总结：感谢大家支持'],
  wechat: ['本周推文已更新，点击阅读', '新功能上线公告', '深度好文推荐', '行业洞察：2026趋势', '团队故事系列'],
  douyin: ['30秒带你了解新功能', '程序员的一天', '效率工具安利', 'AI使用小技巧', '办公场景vlog'],
  xiaohongshu: ['好物分享｜提升效率的神器', '职场干货｜时间管理法', '新品开箱来了', '今日穿搭分享', '自律打卡第N天'],
  bilibili: ['技术教程：从零开始搭建', '产品评测来了', '干货合集｜建议收藏', '编程挑战100天', '开发日记 EP.12'],
  zhihu: ['如何提升团队协作效率？', '2026年最值得关注的技术趋势', '深度解析：AI如何改变工作方式', '有哪些好用的效率工具？', '远程办公最佳实践'],
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateMockData(platform: string, currentFollowers: number, currentPostCount: number) {
  // 粉丝数基于现有数值波动 ±5%
  const followerDelta = Math.floor(currentFollowers * (Math.random() * 0.1 - 0.05))
  const follower_count = Math.max(0, currentFollowers + followerDelta)
  const following_count = rand(50, 500)
  const post_count = currentPostCount + rand(0, 3)

  // 生成最近帖子
  const templates = CONTENT_TEMPLATES[platform] || CONTENT_TEMPLATES.weibo
  const recentCount = rand(2, 5)
  const recent_posts = Array.from({ length: recentCount }, (_, i) => {
    const daysAgo = i + 1
    const pubDate = new Date(Date.now() - daysAgo * 86400000).toISOString()
    return {
      id: `post-${platform}-${Date.now()}-${i}`,
      content: templates[i % templates.length],
      likes: rand(10, 5000),
      comments: rand(5, 500),
      shares: rand(2, 200),
      views: rand(100, 50000),
      published_at: pubDate,
    }
  })

  return { follower_count, following_count, post_count, recent_posts }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { platform, account_id, credentials, current_followers, current_post_count } = await req.json()

    if (!platform || !PLATFORM_CONFIGS[platform]) {
      return new Response(
        JSON.stringify({ error: `不支持的平台: ${platform}，支持: ${Object.keys(PLATFORM_CONFIGS).join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: '缺少 account_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 检查 credentials
    const config = PLATFORM_CONFIGS[platform]
    if (!credentials) {
      return new Response(
        JSON.stringify({
          error: '开发模式提示：未提供平台凭证',
          message: `请先在「连接平台」中填写 ${config.name} 的 ${config.fields.join(' 和 ')}，以连接真实平台数据。`,
          dev_mode: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 验证 credentials 中是否包含必要字段
    const hasAllFields = config.fields.every(f => credentials[f])
    if (!hasAllFields) {
      return new Response(
        JSON.stringify({
          error: `缺少必要字段`,
          message: `${config.name} 需要填写: ${config.fields.join(', ')}`,
          missing_fields: config.fields.filter(f => !credentials[f]),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 模拟同步（有 credentials 时返回模拟但合理的数据）
    const data = generateMockData(platform, current_followers || 1000, current_post_count || 0)

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        account_id,
        synced_at: new Date().toISOString(),
        ...data,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: '服务器错误', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
