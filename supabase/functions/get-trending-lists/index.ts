import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simulated trending data for 9 platforms
// In production, replace with real API calls
function getMockTrending(platform: string) {
  const now = new Date().toISOString()
  const platforms: Record<string, Array<{ rank: number; title: string; heat: string; url: string }>> = {
    weibo: [
      { rank: 1, title: '全国高考作文题公布', heat: '9876543', url: 'https://weibo.com/hot/1' },
      { rank: 2, title: '新能源汽车补贴政策调整', heat: '8765432', url: 'https://weibo.com/hot/2' },
      { rank: 3, title: 'AI大模型最新突破', heat: '7654321', url: 'https://weibo.com/hot/3' },
      { rank: 4, title: '夏季防晒科普指南', heat: '6543210', url: 'https://weibo.com/hot/4' },
      { rank: 5, title: '国产芯片新进展', heat: '5432109', url: 'https://weibo.com/hot/5' },
    ],
    douyin: [
      { rank: 1, title: '城市夜景航拍合集', heat: '5.2亿', url: 'https://douyin.com/hot/1' },
      { rank: 2, title: '夏日饮品制作教程', heat: '4.8亿', url: 'https://douyin.com/hot/2' },
      { rank: 3, title: '宠物搞笑瞬间', heat: '4.1亿', url: 'https://douyin.com/hot/3' },
      { rank: 4, title: '健身打卡挑战', heat: '3.5亿', url: 'https://douyin.com/hot/4' },
      { rank: 5, title: '旅行vlog推荐', heat: '3.2亿', url: 'https://douyin.com/hot/5' },
    ],
    bilibili: [
      { rank: 1, title: '年度动画番剧盘点', heat: '3245万', url: 'https://bilibili.com/hot/1' },
      { rank: 2, title: '程序员日常搞笑', heat: '2987万', url: 'https://bilibili.com/hot/2' },
      { rank: 3, title: '游戏新游评测', heat: '2654万', url: 'https://bilibili.com/hot/3' },
      { rank: 4, title: '硬核科普系列', heat: '2345万', url: 'https://bilibili.com/hot/4' },
      { rank: 5, title: '国风音乐推荐', heat: '2123万', url: 'https://bilibili.com/hot/5' },
    ],
    xiaohongshu: [
      { rank: 1, title: '夏日穿搭灵感', heat: '1.2亿', url: 'https://xiaohongshu.com/hot/1' },
      { rank: 2, title: '平价好物推荐', heat: '9876万', url: 'https://xiaohongshu.com/hot/2' },
      { rank: 3, title: '减脂餐食谱', heat: '8765万', url: 'https://xiaohongshu.com/hot/3' },
      { rank: 4, title: '护肤成分科普', heat: '7654万', url: 'https://xiaohongshu.com/hot/4' },
      { rank: 5, title: '家居收纳技巧', heat: '6543万', url: 'https://xiaohongshu.com/hot/5' },
    ],
    zhihu: [
      { rank: 1, title: '如何看待AI对就业的影响', heat: '4567万', url: 'https://zhihu.com/hot/1' },
      { rank: 2, title: '年轻人该不该买房', heat: '3456万', url: 'https://zhihu.com/hot/2' },
      { rank: 3, title: '哪些专业未来发展前景好', heat: '2345万', url: 'https://zhihu.com/hot/3' },
      { rank: 4, title: '远程办公的利与弊', heat: '1234万', url: 'https://zhihu.com/hot/4' },
      { rank: 5, title: '如何评价最新科技产品', heat: '987万', url: 'https://zhihu.com/hot/5' },
    ],
    toutiao: [
      { rank: 1, title: '国内经济形势分析', heat: '5678万', url: 'https://toutiao.com/hot/1' },
      { rank: 2, title: '教育改革新政策', heat: '4567万', url: 'https://toutiao.com/hot/2' },
      { rank: 3, title: '健康生活新发现', heat: '3456万', url: 'https://toutiao.com/hot/3' },
      { rank: 4, title: '科技创新成果', heat: '2345万', url: 'https://toutiao.com/hot/4' },
      { rank: 5, title: '国际局势解读', heat: '1234万', url: 'https://toutiao.com/hot/5' },
    ],
    wechat: [
      { rank: 1, title: '微信新功能上线', heat: '2345万', url: 'https://weixin.qq.com/hot/1' },
      { rank: 2, title: '公众号年度精选', heat: '1987万', url: 'https://weixin.qq.com/hot/2' },
      { rank: 3, title: '小程序热门推荐', heat: '1654万', url: 'https://weixin.qq.com/hot/3' },
      { rank: 4, title: '视频号爆款内容', heat: '1321万', url: 'https://weixin.qq.com/hot/4' },
      { rank: 5, title: '朋友圈热门话题', heat: '1098万', url: 'https://weixin.qq.com/hot/5' },
    ],
    kuaishou: [
      { rank: 1, title: '乡村生活记录', heat: '4.5亿', url: 'https://kuaishou.com/hot/1' },
      { rank: 2, title: '美食制作分享', heat: '3.8亿', url: 'https://kuaishou.com/hot/2' },
      { rank: 3, title: '手工制作过程', heat: '3.2亿', url: 'https://kuaishou.com/hot/3' },
      { rank: 4, title: '民间才艺展示', heat: '2.7亿', url: 'https://kuaishou.com/hot/4' },
      { rank: 5, title: '乡村风景航拍', heat: '2.1亿', url: 'https://kuaishou.com/hot/5' },
    ],
    baidu: [
      { rank: 1, title: '高考真题答案', heat: '6789万', url: 'https://baidu.com/hot/1' },
      { rank: 2, title: '天气预报', heat: '5678万', url: 'https://baidu.com/hot/2' },
      { rank: 3, title: '股票行情', heat: '4567万', url: 'https://baidu.com/hot/3' },
      { rank: 4, title: '旅游景点推荐', heat: '3456万', url: 'https://baidu.com/hot/4' },
      { rank: 5, title: '最新科技新闻', heat: '2345万', url: 'https://baidu.com/hot/5' },
    ],
  }

  if (platform && platforms[platform]) {
    return { platform, topics: platforms[platform], updated_at: now }
  }

  // Return all platforms
  const allPlatforms = Object.entries(platforms).map(([name, topics]) => ({
    platform: name,
    topics,
    updated_at: now,
  }))
  return { all: allPlatforms }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const { platform } = body

    const result = getMockTrending(platform)

    // Try to store results in trending_topics table
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const topicsToStore = result.all
          ? result.all.flatMap((p: any) => p.topics.map((t: any) => ({
              platform: p.platform,
              rank: t.rank,
              title: t.title,
              heat: t.heat,
              url: t.url,
              fetched_at: p.updated_at,
            })))
          : result.topics.map((t: any) => ({
              platform: result.platform,
              rank: t.rank,
              title: t.title,
              heat: t.heat,
              url: t.url,
              fetched_at: result.updated_at,
            }))

        // Insert in batches, ignore errors (table may not exist yet)
        if (topicsToStore.length > 0) {
          await supabase.from('trending_topics').insert(topicsToStore)
        }
      }
    } catch (e) {
      console.warn('Failed to store trending data:', e)
    }

    return new Response(JSON.stringify(result), {
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
