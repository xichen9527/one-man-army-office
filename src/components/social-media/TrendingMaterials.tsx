'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import {
  TrendingUp, RefreshCw, Search, ExternalLink, Loader2,
  AlertCircle, Copy, CheckCircle, Flame
} from 'lucide-react'

// ==================== Types ====================
interface TrendingItem {
  rank: number
  title: string
  heat: number
  url: string
  platform: 'weibo' | 'zhihu'
}

// ==================== Static Fallback Data ====================
const WEIBO_FALLBACK: TrendingItem[] = [
  { rank: 1, title: '2026年高考成绩公布', heat: 5800000, url: 'https://s.weibo.com/weibo?q=%E9%AB%98%E8%80%83%E6%88%90%E7%BB%A9', platform: 'weibo' },
  { rank: 2, title: 'AI人工智能最新突破', heat: 4200000, url: 'https://s.weibo.com/weibo?q=AI%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD', platform: 'weibo' },
  { rank: 3, title: '夏季奥运会筹备进展', heat: 3500000, url: 'https://s.weibo.com/weibo?q=%E5%A5%A5%E8%BF%90%E4%BC%9A', platform: 'weibo' },
  { rank: 4, title: '科技创新推动经济发展', heat: 2800000, url: 'https://s.weibo.com/weibo?q=%E7%A7%91%E6%8A%80%E5%88%9B%E6%96%B0', platform: 'weibo' },
  { rank: 5, title: '健康生活方式分享', heat: 2100000, url: 'https://s.weibo.com/weibo?q=%E5%81%A5%E5%BA%B7%E7%94%9F%E6%B4%BB', platform: 'weibo' },
  { rank: 6, title: '电影票房创新高', heat: 1800000, url: 'https://s.weibo.com/weibo?q=%E7%94%B5%E5%BD%B1%E7%A5%A8%E6%88%BF', platform: 'weibo' },
  { rank: 7, title: '环保行动全民参与', heat: 1500000, url: 'https://s.weibo.com/weibo?q=%E7%8E%AF%E4%BF%9D%E8%A1%8C%E5%8A%A8', platform: 'weibo' },
  { rank: 8, title: '旅行攻略推荐', heat: 1200000, url: 'https://s.weibo.com/weibo?q=%E6%97%85%E8%A1%8C%E6%94%BB%E7%95%A5', platform: 'weibo' },
  { rank: 9, title: '美食制作教程', heat: 980000, url: 'https://s.weibo.com/weibo?q=%E7%BE%8E%E9%A3%9F%E5%88%B6%E4%BD%9C', platform: 'weibo' },
  { rank: 10, title: '职场技能提升', heat: 850000, url: 'https://s.weibo.com/weibo?q=%E8%81%8C%E5%9C%BA%E6%8A%80%E8%83%BD', platform: 'weibo' },
]

const ZHIHU_FALLBACK: TrendingItem[] = [
  { rank: 1, title: '如何评价2026年的科技发展？', heat: 5200000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 2, title: '人工智能对未来工作的影响', heat: 3800000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 3, title: '怎样提高个人效率？', heat: 3100000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 4, title: '推荐一本改变思维的书', heat: 2400000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 5, title: '如何平衡工作与生活？', heat: 1900000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 6, title: '炒股小白入门指南', heat: 1600000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 7, title: '编程学习路径推荐', heat: 1300000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 8, title: '健康饮食的科学依据', heat: 1050000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 9, title: '如何有效管理时间？', heat: 880000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
  { rank: 10, title: '旅行中的文化体验', heat: 720000, url: 'https://www.zhihu.com/hot', platform: 'zhihu' },
]

// ==================== Main Component ====================
interface TrendingMaterialsProps {
  onWriteFromTrending: (title: string) => void
  setActiveTab: (tab: string) => void
  setShowNewPost: (show: boolean) => void
}

export default function TrendingMaterials({ onWriteFromTrending }: TrendingMaterialsProps) {
  const [activePlatform, setActivePlatform] = useState<'weibo' | 'zhihu'>('weibo')
  const [trendingData, setTrendingData] = useState<TrendingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)
  const [copiedItem, setCopiedItem] = useState<number | null>(null)

  // Fetch Weibo hot search
  const fetchWeibo = async (): Promise<TrendingItem[]> => {
    try {
      const response = await fetch('https://weibo.com/ajax/side/hotSearch', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data && data.data && Array.isArray(data.data.realtime)) {
        return data.data.realtime.slice(0, 20).map((item: any, index: number) => ({
          rank: index + 1,
          title: item.word || item.note || `热点${index + 1}`,
          heat: item.num ? parseInt(item.num) : 0,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
          platform: 'weibo' as const,
        }))
      }

      throw new Error('数据格式错误')
    } catch (err) {
      console.error('Failed to fetch Weibo:', err)
      throw err
    }
  }

  // Fetch Zhihu hot list
  const fetchZhihu = async (): Promise<TrendingItem[]> => {
    try {
      const response = await fetch('https://www.zhihu.com/hot', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // Zhihu API response structure may vary
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.slice(0, 20).map((item: any, index: number) => ({
          rank: index + 1,
          title: item.target?.title || item.title || `热点${index + 1}`,
          heat: item.detail_text ? parseInt(item.detail_text.replace(/[^0-9]/g, '')) : 0,
          url: item.target?.url || 'https://www.zhihu.com/hot',
          platform: 'zhihu' as const,
        }))
      }

      throw new Error('数据格式错误')
    } catch (err) {
      console.error('Failed to fetch Zhihu:', err)
      throw err
    }
  }

  // Load trending data
  const loadTrending = useCallback(async () => {
    setLoading(true)
    setError(null)
    setUsingFallback(false)

    try {
      let data: TrendingItem[]

      if (activePlatform === 'weibo') {
        try {
          data = await fetchWeibo()
        } catch {
          console.log('使用微博静态数据')
          data = WEIBO_FALLBACK
          setUsingFallback(true)
        }
      } else {
        try {
          data = await fetchZhihu()
        } catch {
          console.log('使用知乎静态数据')
          data = ZHIHU_FALLBACK
          setUsingFallback(true)
        }
      }

      setTrendingData(data)
    } catch (err: any) {
      setError(err?.message || '获取热点失败')
      setTrendingData(activePlatform === 'weibo' ? WEIBO_FALLBACK : ZHIHU_FALLBACK)
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [activePlatform])

  // Load data on mount and platform change
  useEffect(() => {
    loadTrending()
  }, [loadTrending])

  // Filter by search
  const filteredData = search.trim()
    ? trendingData.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
    : trendingData

  // Copy to clipboard
  const handleCopy = async (item: TrendingItem) => {
    try {
      await navigator.clipboard.writeText(`#${item.title}`)
      setCopiedItem(item.rank)
      toast({ title: '已复制', description: `"#${item.title}" 已复制到剪贴板` })
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err) {
      toast({ title: '复制失败', description: '请手动复制', variant: 'destructive' })
    }
  }

  // Write from trending
  const handleWrite = (item: TrendingItem) => {
    onWriteFromTrending(item.title)
    toast({ title: '已创建草稿', description: `以 #${item.title} 为话题创建了内容草稿` })
  }

  // Open URL
  const handleOpen = (item: TrendingItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  // Format heat
  const formatHeat = (heat: number): string => {
    if (heat > 1000000) {
      return `${(heat / 1000000).toFixed(1)}M`
    } else if (heat > 10000) {
      return `${(heat / 10000).toFixed(1)}万`
    }
    return heat.toString()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">热点素材</h2>
            <p className="text-[10px] text-gray-400">
              从 {activePlatform === 'weibo' ? '微博' : '知乎'} 获取最新热点
              {usingFallback && ' (静态数据)'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTrending}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '加载中...' : '刷新'}
        </Button>
      </div>

      {/* Platform Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Platform Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activePlatform === 'weibo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePlatform('weibo')}
            className="gap-1.5 text-xs"
          >
            <Flame className="w-3.5 h-3.5" />
            微博热搜
          </Button>
          <Button
            variant={activePlatform === 'zhihu' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePlatform('zhihu')}
            className="gap-1.5 text-xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            知乎热榜
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索热点..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Fallback Notice */}
      {usingFallback && !error && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>当前使用静态示例数据（API 无法访问），点击"刷新"重试</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-sm text-gray-500">正在加载热点数据...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredData.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {search ? '没有找到匹配的热点' : '暂无热点数据'}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-3">
              清除搜索
            </Button>
          )}
        </div>
      )}

      {/* Trending List */}
      {!loading && filteredData.length > 0 && (
        <div className="space-y-2">
          {filteredData.map((item) => (
            <div
              key={item.rank}
              className="group flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-all"
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                item.rank <= 3
                  ? 'bg-red-500 text-white'
                  : item.rank <= 10
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {item.rank}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleOpen(item)}
                >
                  {item.title}
                </p>
                {item.heat > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    <Flame className="w-3 h-3 inline mr-0.5 text-orange-400" />
                    热度: {formatHeat(item.heat)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Copy */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(item)}
                  className="h-8 w-8 p-0"
                  title="复制标题"
                >
                  {copiedItem === item.rank ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </Button>

                {/* Write */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleWrite(item)}
                  className="h-8 px-2 text-xs"
                  title="写文案"
                >
                  写文案
                </Button>

                {/* Open */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpen(item)}
                  className="h-8 w-8 p-0"
                  title="打开链接"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && filteredData.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
          <span>
            共 {filteredData.length} 条热点
            {search && ` (过滤自 ${trendingData.length} 条)`}
          </span>
          <span>
            点击热点打开详情 · 点击"写文案"快速创作
          </span>
        </div>
      )}
    </div>
  )
}
