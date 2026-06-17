import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
