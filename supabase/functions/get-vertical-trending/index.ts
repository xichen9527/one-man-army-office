import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mock vertical trending data
const verticalData: Record<string, Array<{ title: string; heat: string; source: string }>> = {
  food: [
    { title: '夏季清凉甜品推荐', heat: '892万', source: '小红书' },
    { title: '夜市小吃攻略', heat: '765万', source: '抖音' },
    { title: '家常菜新做法', heat: '654万', source: '下厨房' },
    { title: '减脂餐搭配方案', heat: '543万', source: '小红书' },
    { title: '烘焙入门教程', heat: '432万', source: 'B站' },
  ],
  travel: [
    { title: '暑假亲子游推荐', heat: '765万', source: '马蜂窝' },
    { title: '国内避暑胜地', heat: '654万', source: '携程' },
    { title: '小众旅行地推荐', heat: '543万', source: '小红书' },
    { title: '自驾游路线攻略', heat: '432万', source: '汽车之家' },
    { title: '出境游签证新政策', heat: '321万', source: '穷游' },
  ],
  tech: [
    { title: 'AI大模型最新进展', heat: '987万', source: '36氪' },
    { title: '苹果WWDC新品发布', heat: '876万', source: '少数派' },
    { title: '国产芯片突破', heat: '765万', source: '虎嗅' },
    { title: '新能源技术革新', heat: '654万', source: '钛媒体' },
    { title: '自动驾驶最新测试', heat: '543万', source: '车东西' },
  ],
  entertainment: [
    { title: '暑期档电影推荐', heat: '876万', source: '猫眼' },
    { title: '热门综艺讨论', heat: '765万', source: '微博' },
    { title: '明星新剧定档', heat: '654万', source: '豆瓣' },
    { title: '音乐节排期', heat: '543万', source: '大麦' },
    { title: '动漫新番推荐', heat: '432万', source: 'B站' },
  ],
  finance: [
    { title: 'A股行情分析', heat: '876万', source: '东方财富' },
    { title: '基金投资策略', heat: '765万', source: '天天基金' },
    { title: '数字货币动态', heat: '654万', source: '币安' },
    { title: '银行理财新规', heat: '543万', source: '财联社' },
    { title: '房产市场走势', heat: '432万', source: '贝壳' },
  ],
  sports: [
    { title: '欧洲杯赛程预测', heat: '876万', source: '懂球帝' },
    { title: 'NBA总决赛分析', heat: '765万', source: '虎扑' },
    { title: '马拉松赛事报名', heat: '654万', source: '悦跑圈' },
    { title: '健身训练计划', heat: '543万', source: 'Keep' },
    { title: '奥运会备战动态', heat: '432万', source: '央视体育' },
  ],
  education: [
    { title: '高考志愿填报指南', heat: '987万', source: '知乎' },
    { title: '考研复习规划', heat: '876万', source: '研招网' },
    { title: '在线课程推荐', heat: '765万', source: 'B站' },
    { title: '留学申请攻略', heat: '654万', source: '一亩三分地' },
    { title: '职业资格考试', heat: '543万', source: '中国教育在线' },
  ],
  health: [
    { title: '夏季养生指南', heat: '765万', source: '丁香医生' },
    { title: '睡眠质量改善方法', heat: '654万', source: '好大夫' },
    { title: '心理健康关注', heat: '543万', source: '简单心理' },
    { title: '体检报告解读', heat: '432万', source: '春雨医生' },
    { title: '中医养生调理', heat: '321万', source: '知乎' },
  ],
}

const categoryAliases: Record<string, string> = {
  美食: 'food', food: 'food',
  旅行: 'travel', 旅游: 'travel', travel: 'travel',
  科技: 'tech', technology: 'tech', tech: 'tech',
  娱乐: 'entertainment', entertainment: 'entertainment',
  财经: 'finance', finance: 'finance', 金融: 'finance',
  体育: 'sports', sports: 'sports',
  教育: 'education', education: 'education',
  健康: 'health', health: 'health', 医疗: 'health',
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

    const { category, time_range } = await req.json()

    if (!category) {
      return new Response(JSON.stringify({
        error: '缺少必要参数: category',
        available_categories: Object.keys(categoryAliases).filter(k => categoryAliases[k] === k),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const key = categoryAliases[category.toLowerCase()]
    if (!key || !verticalData[key]) {
      return new Response(JSON.stringify({
        error: `不支持的分类: ${category}`,
        available_categories: ['美食', '旅行', '科技', '娱乐', '财经', '体育', '教育', '健康'],
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // time_range affects mock data slightly (in production would filter real data)
    let items = [...verticalData[key]]
    if (time_range === '1h') {
      items = items.slice(0, 3)
    } else if (time_range === '3h') {
      items = items.slice(0, 4)
    }

    return new Response(JSON.stringify({
      category: key,
      time_range: time_range || '7d',
      items,
      updated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('get-vertical-trending error:', e)
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
