import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 【修复问题7】各平台热搜的本地 fallback 数据（当 Edge Function 无法获取实时数据时使用）
const FALLBACK_TRENDING_DATA: TrendingItem[] = [
  // 微博热搜 fallback
  { title: '618购物节优惠攻略', heat: 2850000, url: 'https://s.weibo.com/weibo?q=618购物节优惠攻略', trend: 'up', platform: 'weibo', description: null },
  { title: '全国多地高温预警', heat: 1920000, url: 'https://s.weibo.com/weibo?q=全国多地高温预警', trend: 'up', platform: 'weibo', description: null },
  { title: '国产大飞机C919商业首航', heat: 1680000, url: 'https://s.weibo.com/weibo?q=国产大飞机C919商业首航', trend: 'up', platform: 'weibo', description: null },
  { title: '端午假期旅游数据公布', heat: 1350000, url: 'https://s.weibo.com/weibo?q=端午假期旅游数据公布', trend: 'stable', platform: 'weibo', description: null },
  { title: '人工智能最新政策解读', heat: 980000, url: 'https://s.weibo.com/weibo?q=人工智能最新政策解读', trend: 'stable', platform: 'weibo', description: null },
  { title: '新能源汽车销量创新高', heat: 860000, url: 'https://s.weibo.com/weibo?q=新能源汽车销量创新高', trend: 'stable', platform: 'weibo', description: null },
  { title: '毕业季就业形势分析', heat: 750000, url: 'https://s.weibo.com/weibo?q=毕业季就业形势分析', trend: 'stable', platform: 'weibo', description: null },
  { title: '夏日清凉美食推荐', heat: 620000, url: 'https://s.weibo.com/weibo?q=夏日清凉美食推荐', trend: 'stable', platform: 'weibo', description: null },
  { title: '世界杯预选赛最新战况', heat: 540000, url: 'https://s.weibo.com/weibo?q=世界杯预选赛最新战况', trend: 'stable', platform: 'weibo', description: null },
  { title: '高考志愿填报指南', heat: 480000, url: 'https://s.weibo.com/weibo?q=高考志愿填报指南', trend: 'down', platform: 'weibo', description: null },
  // B站热搜 fallback
  { title: '原神4.0版本更新内容', heat: 5200000, url: 'https://search.bilibili.com/all?keyword=原神4.0版本更新内容', trend: 'up', platform: 'bilibili', description: null },
  { title: '某国产动画电影口碑爆棚', heat: 3800000, url: 'https://search.bilibili.com/all?keyword=国产动画电影口碑爆棚', trend: 'up', platform: 'bilibili', description: null },
  { title: '程序员副业赚钱指南', heat: 2900000, url: 'https://search.bilibili.com/all?keyword=程序员副业赚钱指南', trend: 'stable', platform: 'bilibili', description: null },
  { title: '最新手机测评对比', heat: 2200000, url: 'https://search.bilibili.com/all?keyword=最新手机测评对比', trend: 'stable', platform: 'bilibili', description: null },
  { title: '零基础学Python入门教程', heat: 1800000, url: 'https://search.bilibili.com/all?keyword=零基础学Python入门教程', trend: 'stable', platform: 'bilibili', description: null },
  { title: '露营装备清单及选购', heat: 1500000, url: 'https://search.bilibili.com/all?keyword=露营装备清单及选购', trend: 'stable', platform: 'bilibili', description: null },
  { title: 'Switch游戏推荐2024', heat: 1200000, url: 'https://search.bilibili.com/all?keyword=Switch游戏推荐2024', trend: 'stable', platform: 'bilibili', description: null },
  { title: '自媒体运营干货分享', heat: 980000, url: 'https://search.bilibili.com/all?keyword=自媒体运营干货分享', trend: 'down', platform: 'bilibili', description: null },
  { title: '健身增肌完整计划', heat: 750000, url: 'https://search.bilibili.com/all?keyword=健身增肌完整计划', trend: 'stable', platform: 'bilibili', description: null },
  { title: '如何拍出好看的照片', heat: 620000, url: 'https://search.bilibili.com/all?keyword=如何拍出好看的照片', trend: 'stable', platform: 'bilibili', description: null },
  // 百度热搜 fallback
  { title: '全国经济半年报发布', heat: 3500000, url: 'https://www.baidu.com/s?wd=全国经济半年报发布', trend: 'up', platform: 'baidu', description: null },
  { title: '最新房地产政策调整', heat: 2800000, url: 'https://www.baidu.com/s?wd=最新房地产政策调整', trend: 'up', platform: 'baidu', description: null },
  { title: '暑期交通安全提示', heat: 2100000, url: 'https://www.baidu.com/s?wd=暑期交通安全提示', trend: 'stable', platform: 'baidu', description: null },
  { title: '中小学暑期托管服务', heat: 1750000, url: 'https://www.baidu.com/s?wd=中小学暑期托管服务', trend: 'stable', platform: 'baidu', description: null },
  { title: '数字经济发展新趋势', heat: 1400000, url: 'https://www.baidu.com/s?wd=数字经济发展新趋势', trend: 'stable', platform: 'baidu', description: null },
  { title: '夏季用电高峰应对', heat: 1100000, url: 'https://www.baidu.com/s?wd=夏季用电高峰应对', trend: 'down', platform: 'baidu', description: null },
  { title: '全国高校录取分数线', heat: 950000, url: 'https://www.baidu.com/s?wd=全国高校录取分数线', trend: 'stable', platform: 'baidu', description: null },
  { title: '新版个人征信指南', heat: 780000, url: 'https://www.baidu.com/s?wd=新版个人征信指南', trend: 'stable', platform: 'baidu', description: null },
  // 知乎热搜 fallback
  { title: 'AI大模型如何在工作中应用', heat: 850000, url: 'https://www.zhihu.com/search?type=content&q=AI大模型如何在工作中应用', trend: 'up', platform: 'zhihu', description: null },
  { title: '年轻人为什么开始反向消费', heat: 680000, url: 'https://www.zhihu.com/search?type=content&q=年轻人为什么开始反向消费', trend: 'stable', platform: 'zhihu', description: null },
  { title: '远程办公效率提升方法', heat: 520000, url: 'https://www.zhihu.com/search?type=content&q=远程办公效率提升方法', trend: 'stable', platform: 'zhihu', description: null },
  { title: '程序员35岁危机真的存在吗', heat: 450000, url: 'https://www.zhihu.com/search?type=content&q=程序员35岁危机', trend: 'stable', platform: 'zhihu', description: null },
  // 抖音热搜 fallback
  { title: '618直播间超值好物', heat: 6800000, url: 'https://www.douyin.com/hot', trend: 'up', platform: 'douyin', description: null },
  { title: '夏日清凉穿搭技巧', heat: 4200000, url: 'https://www.douyin.com/hot', trend: 'up', platform: 'douyin', description: null },
  { title: '宠物搞笑视频合集', heat: 3800000, url: 'https://www.douyin.com/hot', trend: 'stable', platform: 'douyin', description: null },
  { title: '厨房小白也能做的美食', heat: 3200000, url: 'https://www.douyin.com/hot', trend: 'stable', platform: 'douyin', description: null },
  // 今日头条 fallback
  { title: '国际局势最新动态', heat: 2100000, url: 'https://www.toutiao.com/hot-event/', trend: 'up', platform: 'toutiao', description: null },
  { title: '科技行业最新资讯', heat: 1800000, url: 'https://www.toutiao.com/hot-event/', trend: 'stable', platform: 'toutiao', description: null },
  { title: '健康养生知识汇总', heat: 1500000, url: 'https://www.toutiao.com/hot-event/', trend: 'stable', platform: 'toutiao', description: null },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrendingItem {
  title: string
  heat: number
  url: string | null
  trend: 'up' | 'down' | 'stable'
  platform: string
  description: string | null
}

// ========== Bilibili Hot Search ==========
async function fetchBilibiliHot(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/search/square?limit=20', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    const json = await res.json()
    if (json.code !== 0 || !json.data?.trending?.list) return []
    return json.data.trending.list.slice(0, 15).map((item: any, i: number) => ({
      title: item.keyword || item.show_name || '',
      heat: item.heat_score || 0,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword)}`,
      trend: i < 3 ? 'up' as const : 'stable' as const,
      platform: 'bilibili',
      description: null,
    }))
  } catch (e) {
    console.error('Bilibili hot fetch error:', e)
    return []
  }
}

// ========== Bilibili Ranking (Popular Videos) ==========
async function fetchBilibiliRanking(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    const json = await res.json()
    if (json.code !== 0 || !json.data?.list) return []
    return json.data.list.slice(0, 15).map((item: any, i: number) => ({
      title: item.title || '',
      heat: item.stat?.view || 0,
      url: `https://www.bilibili.com/video/${item.bvid}`,
      trend: i < 3 ? 'up' as const : 'stable' as const,
      platform: 'bilibili',
      description: item.desc?.slice(0, 100) || null,
    }))
  } catch (e) {
    console.error('Bilibili ranking fetch error:', e)
    return []
  }
}

// ========== Weibo Hot (via m.weibo.cn) ==========
async function fetchWeiboHot(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://m.weibo.cn/',
      },
    })
    const json = await res.json()
    if (json.ok !== 1 || !json.data?.cards) return []
    const cardGroup = json.data.cards[0]?.card_group
    if (!cardGroup) return []
    return cardGroup.slice(0, 15).map((item: any, i: number) => ({
      title: item.desc || item.word || '',
      heat: parseInt(item.desc_extr || '0', 10) || 0,
      url: item.scheme ? `https://m.weibo.cn/search?containerid=${item.scheme}` : `https://s.weibo.com/weibo?q=${encodeURIComponent(item.desc || item.word)}`,
      trend: (item.icon_desc === '热' || item.icon_desc === '新' || i < 3) ? 'up' as const : 'stable' as const,
      platform: 'weibo',
      description: null,
    }))
  } catch (e) {
    console.error('Weibo hot fetch error:', e)
    return []
  }
}

// ========== Zhihu Hot (via page scraping fallback) ==========
async function fetchZhihuHot(): Promise<TrendingItem[]> {
  try {
    // Zhihu API requires auth, try the public page
    const res = await fetch('https://www.zhihu.com/hot', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })
    const html = await res.text()
    // Try to extract initial data from HTML
    const match = html.match(/"initialState":\s*({.+?})\s*<\/script>/)
    if (!match) {
      // Fallback: try the API with cookie-less approach
      const apiRes = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=15', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      })
      if (apiRes.ok) {
        const json = await apiRes.json()
        if (json.data) {
          return json.data.slice(0, 15).map((item: any, i: number) => ({
            title: item.target?.title || '',
            heat: item.detail_text ? parseInt(item.detail_text.replace(/[^\d]/g, ''), 10) : 0,
            url: `https://www.zhihu.com/question/${item.target?.id}`,
            trend: i < 3 ? 'up' as const : 'stable' as const,
            platform: 'zhihu',
            description: item.target?.excerpt?.slice(0, 100) || null,
          }))
        }
      }
      return []
    }
    // Parse initialState if available (complex, skip for now)
    return []
  } catch (e) {
    console.error('Zhihu hot fetch error:', e)
    return []
  }
}

// ========== Baidu Hot (HTML parsing) ==========
async function fetchBaiduHot(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://top.baidu.com/board?tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    })
    const html = await res.text()
    // Parse the HTML for hot items - Baidu embeds data in script tags
    const items: TrendingItem[] = []
    // Try to find JSON data in the page
    const jsonMatch = html.match(/"content":\s*\[({[\s\S]+?})\]/)
    if (jsonMatch) {
      // Complex parsing needed, use simpler regex approach
    }

    // Fallback: parse from rendered HTML
    const titleRegex = /class="c-single-text-ellipsis"[^>]*>([^<]+)</g
    const heatRegex = /class="hot-index_1Bl1a"[^>]*>([^<]+)</g
    const linkRegex = /href="(https:\/\/www\.baidu\.com\/s\?[^"]+fyb[^"]*)"/g

    const titles: string[] = []
    const heats: string[] = []
    const links: string[] = []

    let m
    while ((m = titleRegex.exec(html)) !== null) titles.push(m[1].trim())
    while ((m = heatRegex.exec(html)) !== null) heats.push(m[1].trim())
    while ((m = linkRegex.exec(html)) !== null) links.push(m[1])

    const count = Math.min(titles.length, 15)
    for (let i = 0; i < count; i++) {
      items.push({
        title: titles[i] || '',
        heat: parseInt((heats[i] || '0').replace(/[^\d]/g, ''), 10) || 0,
        url: links[i] || null,
        trend: i < 3 ? 'up' as const : 'stable' as const,
        platform: 'baidu',
        description: null,
      })
    }
    return items
  } catch (e) {
    console.error('Baidu hot fetch error:', e)
    return []
  }
}

// ========== Douyin Hot (via HTML scraping) ==========
async function fetchDouyinHot(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://www.douyin.com/hot', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Cookie': 'ttwid=1',
      },
      redirect: 'follow',
    })
    const html = await res.text()
    // Douyin embeds data in <script> tags with RENDER_DATA
    const match = html.match(/id="RENDER_DATA"[^>]*>([^<]+)</)
    if (!match) return []
    const decoded = decodeURIComponent(match[1])
    const data = JSON.parse(decoded)
    // Navigate the structure to find hot list
    const hotList = data?.app?.videoList || data?.data || []
    if (!Array.isArray(hotList) || hotList.length === 0) return []

    return hotList.slice(0, 15).map((item: any, i: number) => ({
      title: item.title || item.word || '',
      heat: item.hot_value || 0,
      url: item.url || `https://www.douyin.com/hot/${item.id || ''}`,
      trend: i < 3 ? 'up' as const : 'stable' as const,
      platform: 'douyin',
      description: null,
    }))
  } catch (e) {
    console.error('Douyin hot fetch error:', e)
    return []
  }
}

// ========== Toutiao Hot ==========
async function fetchToutiaoHot(): Promise<TrendingItem[]> {
  try {
    const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })
    const json = await res.json()
    if (!json.data) return []
    return json.data.slice(0, 15).map((item: any, i: number) => ({
      title: item.Title || item.title || '',
      heat: item.HotValue || item.hot_value || 0,
      url: item.Url || item.url || null,
      trend: i < 3 ? 'up' as const : 'stable' as const,
      platform: 'toutiao',
      description: null,
    }))
  } catch (e) {
    console.error('Toutiao hot fetch error:', e)
    return []
  }
}

// ========== Main Handler ==========
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { platform } = body

    // Fetch from all supported platforms in parallel
    const fetchers: Record<string, () => Promise<TrendingItem[]>> = {
      weibo: fetchWeiboHot,
      bilibili: fetchBilibiliHot,
      baidu: fetchBaiduHot,
      zhihu: fetchZhihuHot,
      douyin: fetchDouyinHot,
      toutiao: fetchToutiaoHot,
    }

    let allItems: TrendingItem[] = []

    if (platform && fetchers[platform]) {
      allItems = await fetchers[platform]()
    } else {
      // Fetch all platforms in parallel
      const results = await Promise.allSettled(
        Object.entries(fetchers).map(async ([name, fn]) => {
          const items = await fn()
          return items
        })
      )
      allItems = results
        .filter((r): r is PromiseFulfilledResult<TrendingItem[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
    }

    // 【修复问题7】如果所有平台都抓取失败（allItems 为空），使用本地 fallback 数据
    const usedFallback = allItems.length === 0
    if (usedFallback) {
      console.warn('[get-trending-lists] 所有平台抓取失败，使用本地 fallback 数据')
      allItems = FALLBACK_TRENDING_DATA
    }

    // Store results in trending_topics table (upsert: delete old + insert new)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseKey && allItems.length > 0) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const platforms = [...new Set(allItems.map(i => i.platform))]
        // Delete old data for fetched platforms
        for (const p of platforms) {
          await supabase.from('trending_topics').delete().eq('platform', p)
        }

        // Insert new data
        const rows = allItems.map(item => ({
          title: item.title,
          platform: item.platform,
          heat: item.heat,
          trend: item.trend,
          url: item.url,
          description: item.description,
        }))
        const { error: insertError } = await supabase.from('trending_topics').insert(rows)
        if (insertError) console.error('Insert trending error:', insertError)
      }
    } catch (e) {
      console.warn('Failed to store trending data:', e)
    }

    return new Response(JSON.stringify({
      success: true,
      count: allItems.length,
      platforms: [...new Set(allItems.map(i => i.platform))],
      items: allItems,
      usedFallback, // 【修复】标识是否使用了 fallback 数据
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('get-trending-lists error:', e)
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
