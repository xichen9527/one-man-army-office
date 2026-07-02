'use client'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Search, ExternalLink,
  Star, StarOff, Loader2, AlertCircle, Bookmark, Clock,
  ArrowUpRight, Zap, ChevronRight, Wand2, Eye, Flame, TrendingUp as Hot,
} from 'lucide-react'
import { useStore } from '@/store'
import type { TrendingTopic } from '@/types/database'
import { format } from 'date-fns'

// ==================== Platform Config ====================
export const TRENDING_PLATFORMS = [
  { key: 'all', label: '全部平台', icon: '🌐', color: 'text-gray-600', bg: 'bg-gray-100' },
  { key: 'weibo', label: '微博', icon: '微博', color: 'text-red-500', bg: 'bg-red-50' },
  { key: 'bilibili', label: 'B站', icon: 'B站', color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'baidu', label: '百度', icon: '百度', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'zhihu', label: '知乎', icon: '知乎', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'douyin', label: '抖音', icon: '抖音', color: 'text-gray-800', bg: 'bg-gray-100' },
  { key: 'toutiao', label: '头条', icon: '头条', color: 'text-red-600', bg: 'bg-red-50' },
]

const FAVORITES_KEY = 'trending_materials_favorites'

function getFavorites(): TrendingTopic[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveFavorites(items: TrendingTopic[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
}

// ==================== Skeleton Card ====================
function SkeletonCard({ platform }: { platform: string }) {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5">
            <div className="w-5 h-3 bg-gray-100 rounded" />
            <div className="flex-1 h-3 bg-gray-100 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ==================== Trending Item Row ====================
interface TrendingItemRowProps {
  topic: TrendingTopic
  rank: number
  favorites: TrendingTopic[]
  onToggleFavorite: (topic: TrendingTopic) => void
  onWrite: (topic: TrendingTopic) => void
  onOpen: (topic: TrendingTopic) => void
  allPlatforms?: string[]
}

function TrendingItemRow({ topic, rank, favorites, onToggleFavorite, onWrite, onOpen, allPlatforms }: TrendingItemRowProps) {
  const isFav = favorites.some(f => f.id === topic.id)
  const isHot = rank <= 3
  const heatDisplay = topic.heat > 1000000
    ? `${(topic.heat / 1000000).toFixed(1)}M`
    : topic.heat > 10000
      ? `${(topic.heat / 10000).toFixed(1)}万`
      : topic.heat.toString()

  return (
    <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
      {/* 排名 */}
      <span className={`text-xs font-bold w-6 text-center shrink-0 ${isHot ? 'text-red-500' : 'text-gray-400'}`}>
        {rank <= 3 ? '🔥' : rank}
      </span>

      {/* 内容 */}
      <div className="flex-1 min-w-0" onClick={() => onOpen(topic)}>
        <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors leading-tight">
          {topic.title}
        </p>
        {topic.description && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{topic.description}</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 热度 */}
        <span className="text-[10px] text-gray-400 hidden sm:inline-flex items-center gap-0.5">
          {isHot ? <Flame className="w-3 h-3 text-orange-400" /> : <Hot className="w-3 h-3" />}
          {heatDisplay}
        </span>

        {/* 趋势箭头 */}
        {topic.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
        {topic.trend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
        {topic.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}

        {/* 收藏 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(topic) }}
          className={`p-1 rounded hover:bg-amber-50 transition-colors ${isFav ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
          title={isFav ? '取消收藏' : '收藏'}
        >
          {isFav ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
        </button>

        {/* 写文案 */}
        <button
          onClick={(e) => { e.stopPropagation(); onWrite(topic) }}
          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
          title="基于此热点写文案"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 移动端显示热度 */}
      <span className="sm:hidden text-[10px] text-gray-400 shrink-0">
        {heatDisplay}
      </span>
    </div>
  )
}

// ==================== Main Component ====================
interface TrendingMaterialsProps {
  onWriteFromTrending: (title: string) => void
  setActiveTab: (tab: string) => void
  setShowNewPost: (show: boolean) => void
}

export default function TrendingMaterials({ onWriteFromTrending, setActiveTab, setShowNewPost }: TrendingMaterialsProps) {
  const { trendingTopics, refreshTrendingTopics } = useStore()

  const [search, setSearch] = useState('')
  const [activePlatform, setActivePlatform] = useState('all')
  const [favorites, setFavorites] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rank' | 'heat'>('rank')
  const [showFavorites, setShowFavorites] = useState(false)

  // Load favorites from localStorage
  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  // Refresh trending
  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await refreshTrendingTopics()
      setLastRefresh(new Date())
      if (result?.usedFallback) {
        toast({ title: '实时数据获取受限', description: '当前显示模拟数据，实际数据需要网络访问权限', variant: 'default' })
      } else {
        toast({ title: '热点数据已更新', description: `获取到 ${trendingTopics.length} 条热点` })
      }
    } catch (e: any) {
      setError(e?.message || '获取热点失败')
      toast({ title: '获取热点失败', description: e?.message || '请稍后重试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [refreshTrendingTopics, trendingTopics.length])

  // Auto-refresh on mount if needed
  useEffect(() => {
    if (trendingTopics.length === 0) {
      handleRefresh()
    } else {
      setLastRefresh(new Date())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter and search
  const filteredTopics = useMemo(() => {
    let topics = trendingTopics

    // Platform filter
    if (activePlatform !== 'all') {
      topics = topics.filter(t => t.platform === activePlatform)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      topics = topics.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      )
    }

    // Sort
    if (sortBy === 'heat') {
      topics = [...topics].sort((a, b) => b.heat - a.heat)
    }

    return topics
  }, [trendingTopics, activePlatform, search, sortBy])

  // Toggle favorite
  const handleToggleFavorite = useCallback((topic: TrendingTopic) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.id === topic.id)
      const next = isFav
        ? prev.filter(f => f.id !== topic.id)
        : [...prev, topic]
      saveFavorites(next)
      return next
    })
  }, [])

  // Open topic URL
  const handleOpen = useCallback((topic: TrendingTopic) => {
    if (topic.url) {
      window.open(topic.url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  // Write from topic
  const handleWrite = useCallback((topic: TrendingTopic) => {
    onWriteFromTrending(topic.title)
    setActiveTab('content')
    setShowNewPost(true)
    toast({ title: '已创建草稿', description: `以 #${topic.title} 为话题创建了内容草稿` })
  }, [onWriteFromTrending, setActiveTab, setShowNewPost])

  // Platform statistics
  const platformStats = useMemo(() => {
    const stats: Record<string, { count: number; totalHeat: number }> = {}
    for (const t of trendingTopics) {
      if (!stats[t.platform]) stats[t.platform] = { count: 0, totalHeat: 0 }
      stats[t.platform].count++
      stats[t.platform].totalHeat += t.heat
    }
    return stats
  }, [trendingTopics])

  const activePlatformInfo = TRENDING_PLATFORMS.find(p => p.key === activePlatform)

  return (
    <div className="space-y-4">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
              <Hot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">热点素材库</h2>
              <p className="text-[10px] text-gray-400">
                {trendingTopics.length > 0 ? (
                  <>覆盖 {Object.keys(platformStats).length} 个平台 · 共 {trendingTopics.length} 条</>
                ) : '正在加载...'}
              </p>
            </div>
          </div>
          {lastRefresh && (
            <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
              <Clock className="w-2.5 h-2.5" />
              {format(lastRefresh, 'HH:mm')} 更新
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* 收藏筛选 */}
          <Button
            variant={showFavorites ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
            className={`gap-1.5 text-xs ${showFavorites ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            我的收藏 {favorites.length > 0 && `(${favorites.length})`}
          </Button>

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '抓取中...' : '刷新热点'}
          </Button>
        </div>
      </div>

      {/* ===== Search & Sort Bar ===== */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索热点话题..."
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

        {/* Sort */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">排序：</span>
          <button
            onClick={() => setSortBy('rank')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${sortBy === 'rank' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            排名
          </button>
          <button
            onClick={() => setSortBy('heat')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${sortBy === 'heat' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            热度
          </button>
        </div>

        {/* Result count */}
        <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
          <span>找到 <strong className="text-gray-600">{filteredTopics.length}</strong> 条</span>
        </div>
      </div>

      {/* ===== Error Banner ===== */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {/* ===== Main Content ===== */}
      {showFavorites ? (
        /* ===== Favorites View ===== */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">我的收藏</h3>
            <Badge variant="secondary" className="text-[10px]">{favorites.length} 条</Badge>
          </div>

          {favorites.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center text-center text-gray-400 gap-3">
                <Bookmark className="w-10 h-10 text-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-500">暂无收藏</p>
                  <p className="text-xs mt-1">点击热点旁边的 ⭐ 将话题添加到收藏</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFavorites(false)}>
                  浏览热点素材
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-3">
                {favorites.map((topic, i) => (
                  <TrendingItemRow
                    key={topic.id}
                    topic={topic}
                    rank={i + 1}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onWrite={handleWrite}
                    onOpen={handleOpen}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* ===== Platform Tabs + Grid View ===== */
        <>
          {/* Platform Filter Tabs */}
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex gap-1.5 min-w-max">
              {TRENDING_PLATFORMS.map(platform => {
                const stat = platformStats[platform.key]
                const isActive = activePlatform === platform.key
                return (
                  <button
                    key={platform.key}
                    onClick={() => setActivePlatform(platform.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs ${isActive ? platform.color : 'text-gray-400'}`}>{platform.icon}</span>
                    <span>{platform.label}</span>
                    {stat && platform.key !== 'all' && (
                      <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                        {stat.count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content Area */}
          {loading && filteredTopics.length === 0 ? (
            /* Loading Skeletons */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePlatform === 'all' ? (
                TRENDING_PLATFORMS.slice(1, 7).map(p => (
                  <SkeletonCard key={p.key} platform={p.key} />
                ))
              ) : (
                <SkeletonCard platform={activePlatform} />
              )}
            </div>
          ) : filteredTopics.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-gray-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {search ? '没有找到匹配的热点' : '暂无热点数据'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {search ? '换个关键词试试' : '点击「刷新热点」获取最新数据'}
                  </p>
                </div>
                {search ? (
                  <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                    清除搜索
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} mr-1`} />
                    刷新热点
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Grid View - per platform cards */
            activePlatform === 'all' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {TRENDING_PLATFORMS.slice(1).map(platform => {
                  const platformTopics = filteredTopics.filter(t => t.platform === platform.key)
                  if (platformTopics.length === 0 && search === '') return null
                  const pStat = platformStats[platform.key]
                  return (
                    <Card key={platform.key} className="overflow-hidden">
                      <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${platform.bg} ${platform.color} font-bold`}>
                            {platform.icon}
                          </span>
                          <CardTitle className="text-sm">{platform.label}热搜</CardTitle>
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {search === '' ? (pStat?.count || 0) : platformTopics.length} 条
                          </Badge>
                          {/* Platform heat total */}
                          {pStat && pStat.totalHeat > 0 && search === '' && (
                            <span className="text-[10px] text-orange-500 hidden lg:inline-flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />
                              {pStat.totalHeat > 1000000
                                ? `${(pStat.totalHeat / 1000000).toFixed(1)}M`
                                : `${(pStat.totalHeat / 10000).toFixed(0)}万`}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-2">
                        {loading && platformTopics.length === 0 ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {platformTopics.map((topic, i) => (
                              <TrendingItemRow
                                key={topic.id}
                                topic={topic}
                                rank={i + 1}
                                favorites={favorites}
                                onToggleFavorite={handleToggleFavorite}
                                onWrite={handleWrite}
                                onOpen={handleOpen}
                              />
                            ))}
                            {platformTopics.length === 0 && (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {search ? '搜索结果为空' : '暂无数据'}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              /* Single Platform List View */
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {activePlatformInfo && (
                      <>
                        <span className={`text-xs px-2 py-0.5 rounded ${activePlatformInfo.bg} ${activePlatformInfo.color} font-bold`}>
                          {activePlatformInfo.icon}
                        </span>
                        <CardTitle className="text-sm">{activePlatformInfo.label}热搜</CardTitle>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {filteredTopics.length} 条
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                          <Clock className="w-2.5 h-2.5" />
                          {lastRefresh ? format(lastRefresh, 'HH:mm') : '—'}
                        </Badge>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredTopics.map((topic, i) => (
                        <TrendingItemRow
                          key={topic.id}
                          topic={topic}
                          rank={i + 1}
                          favorites={favorites}
                          onToggleFavorite={handleToggleFavorite}
                          onWrite={handleWrite}
                          onOpen={handleOpen}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {/* ===== Quick Tips ===== */}
      <div className="text-center">
        <p className="text-xs text-gray-400">
          💡 点击热点打开详情 · ⭐ 收藏话题 · <span className="inline-flex items-center gap-0.5"><Wand2 className="w-3 h-3" />写文案</span> 基于热点快速创作
        </p>
      </div>
    </div>
  )
}
