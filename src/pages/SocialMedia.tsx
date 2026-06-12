import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Plus, Trash2 as Trash2Icon, Edit3 as Edit3Icon, RefreshCw, ExternalLink, Search,
  TrendingUp, TrendingDown, Minus, BarChart3, Users, Eye,
  FileText, Copy, Heart, MessageCircle, Share2, Calendar, CheckCircle, XCircle,
  Clock, MoreVertical, ArrowUpRight, Globe
} from 'lucide-react'
import { useStore } from '@/store'
import type { SocialPostStatus } from '@/types/database'
import type { SocialAccount } from '@/types/database'
import type { TrendingTopic } from '@/types/database'
import { format, parseISO } from 'date-fns'

const platformIcons: Record<string, { icon: string; color: string; bg: string }> = {
  weibo: { icon: '微博', color: 'text-red-500', bg: 'bg-red-50' },
  wechat: { icon: '微信', color: 'text-green-500', bg: 'bg-green-50' },
  douyin: { icon: '抖音', color: 'text-gray-800', bg: 'bg-gray-100' },
  xiaohongshu: { icon: '小红书', color: 'text-red-600', bg: 'bg-red-50' },
  bilibili: { icon: 'B站', color: 'text-blue-500', bg: 'bg-blue-50' },
  zhihu: { icon: '知乎', color: 'text-blue-600', bg: 'bg-blue-50' },
  toutiao: { icon: '头条', color: 'text-red-600', bg: 'bg-red-50' },
}

const postStatusLabels: Record<SocialPostStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: '已预约', color: 'bg-blue-100 text-blue-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
}

const platformNames: Record<string, string> = {
  weibo: '微博', wechat: '微信公众号', douyin: '抖音',
  xiaohongshu: '小红书', bilibili: 'B站', zhihu: '知乎',
  toutiao: '头条', other: '其他',
}

const platformCharLimits: Record<string, number> = {
  weibo: 140,
  wechat: 1000,
  xiaohongshu: 1000,
}
const defaultCharLimit = 2000

function highlightHashtags(text: string): React.ReactNode[] {
  const parts = text.split(/(\s+)/)
  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return <span key={i} className="text-blue-600 font-medium">{part}</span>
    }
    return part
  })
}

// ========== Content Templates Tab ==========
function ContentTemplatesTab() {
  const { contentTemplates, fetchContentTemplates, addContentTemplate, deleteContentTemplate } = useStore()
  const [showDialog, setShowDialog] = useState(false)
  const [tName, setTName] = useState('')
  const [tCategory, setTCategory] = useState<'social' | 'email' | 'document' | 'presentation' | 'blog'>('social')
  const [tContent, setTContent] = useState('')
  const [tVariables, setTVariables] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => { fetchContentTemplates() }, [])

  const catLabels: Record<string, string> = { social: '社交媒体', email: '邮件', document: '文档', presentation: '演示', blog: '博客' }

  const handleSave = async () => {
    if (!tName.trim()) return
    try {
      const vars = tVariables.split(',').map(v => v.trim()).filter(Boolean)
      await addContentTemplate({ name: tName, category: tCategory, content: tContent, variables: vars, created_by: '', usage_count: 0 })
      setShowDialog(false); setTName(''); setTCategory('social'); setTContent(''); setTVariables('')
    } catch (e: any) { toast({ title: '错误', description: e.message, variant: 'destructive' }) }
  }

  const preview = (t: any) => {
    const vars = (t.variables || []).map((v: string) => ({ name: v, value: `[${v}]` }))
    return { ...t, content: vars.reduce((acc: string, vr: any) => acc.replace(new RegExp(`{{${vr.name}}}`, 'g'), vr.value), t.content || '') }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => { setTName(''); setTCategory('social'); setTContent(''); setTVariables(''); setShowDialog(true) }}>
          <Plus className="w-4 h-4 mr-1" /> 创建模板
        </Button>
      </div>
      {contentTemplates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无内容模板，点击右上角创建</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contentTemplates.map(t => {
            const p = preview(t)
            return (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{t.name}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">{catLabels[t.category] || t.category}</Badge>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard?.writeText(t.content || '')}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm('确认删除？')) deleteContentTemplate(t.id) }}><Trash2Icon className="w-3.5 h-3.5 text-red-400" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-3">{t.content || '—'}</p>
                  {t.variables?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(t.variables as string[]).map((v: string) => <Badge key={v} variant="outline" className="text-[10px] px-1.5">{`{${v}}`}</Badge>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">使用 {t.usage_count || 0} 次</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                      {previewId === t.id ? '收起' : '预览'}
                    </Button>
                  </div>
                  {previewId === t.id && (
                    <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 whitespace-pre-wrap font-mono">{p.content}</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建内容模板</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">名称</label><Input value={tName} onChange={e => setTName(e.target.value)} placeholder="模板名称" /></div>
            <div><label className="text-sm font-medium">分类</label>
              <select value={tCategory} onChange={e => setTCategory(e.target.value as any)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                <option value="social">社交媒体</option><option value="email">邮件</option><option value="document">文档</option><option value="presentation">演示</option><option value="blog">博客</option>
              </select>
            </div>
            <div><label className="text-sm font-medium">内容</label><textarea value={tContent} onChange={e => setTContent(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm h-24" placeholder="模板内容，可使用变量 {{变量名}}" /></div>
            <div><label className="text-sm font-medium">变量（逗号分隔）</label><Input value={tVariables} onChange={e => setTVariables(e.target.value)} placeholder="如: 标题, 链接, 日期" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function SocialMedia() {
  const {
    socialAccounts, socialPosts, trendingTopics, currentUser,
    addSocialAccount, updateSocialAccount, deleteSocialAccount,
    initiateOAuth, publishPost,
    addSocialPost, updateSocialPost, deleteSocialPost,
    syncSocialAccount,
    contentTemplates, fetchContentTemplates, addContentTemplate, deleteContentTemplate,
  } = useStore()

  const [search, setSearch] = useState('')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showConnectPlatform, setShowConnectPlatform] = useState(false)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [confirmUnbindId, setConfirmUnbindId] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set())
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [showPostDetail, setShowPostDetail] = useState<string | null>(null)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('accounts')

  // Trending state
  const [trendingFilter, setTrendingFilter] = useState<string>('all')
  const [trendingSort, setTrendingSort] = useState<'heat' | 'time'>('heat')
  const [trendingRefreshing, setTrendingRefreshing] = useState(false)
  const [trendingLastRefresh, setTrendingLastRefresh] = useState<string | null>(null)
  const [showTrendingDetail, setShowTrendingDetail] = useState<TrendingTopic | null>(null)

  // Account form
  const [af, setAf] = useState({ platform: 'weibo', account_name: '', account_id: '', auto_sync: true })

  // Post form
  const [pf, setPf] = useState({ title: '', content: '', platform: 'weibo', account_id: '' })
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')

  const filteredPosts = useMemo(() =>
    socialPosts.filter(p => !search || p.title.includes(search) || p.content.includes(search)),
    [socialPosts, search])

  const totalFollowers = useMemo(() =>
    socialAccounts.reduce((s, a) => s + a.follower_count, 0),
    [socialAccounts])

  const totalEngagement = useMemo(() =>
    socialPosts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0),
    [socialPosts])

  // Platform credentials form — per-platform fields and docs
  const platformCredentialFields: Record<string, {
    fields: { label: string; key: string; type?: string; placeholder?: string }[]
    docUrl: string
    docHint: string
    customEndpoints?: { label: string; key: string; defaultUrl: string }[]
  }> = {
    weibo: {
      fields: [
        { label: 'App Key', key: 'app_key', placeholder: '微博开放平台 App Key' },
        { label: 'App Secret', key: 'app_secret', type: 'password', placeholder: '微博开放平台 App Secret' },
      ],
      docUrl: 'https://open.weibo.com/wiki/%E6%8E%88%E6%9D%83%E6%9C%BA%E5%88%B6',
      docHint: '前往微博开放平台创建应用获取',
      customEndpoints: [
        { label: '自定义授权端点', key: 'custom_authorize_url', defaultUrl: 'https://api.weibo.com/oauth2/authorize' },
      ],
    },
    wechat: {
      fields: [
        { label: 'AppID', key: 'app_id', placeholder: '微信公众平台 AppID' },
        { label: 'AppSecret', key: 'app_secret', type: 'password', placeholder: '微信公众平台 AppSecret' },
      ],
      docUrl: 'https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html',
      docHint: '前往微信公众平台获取',
    },
    douyin: {
      fields: [
        { label: 'Client Key', key: 'client_key', placeholder: '抖音开放平台 Client Key' },
        { label: 'Client Secret', key: 'client_secret', type: 'password', placeholder: '抖音开放平台 Client Secret' },
      ],
      docUrl: 'https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/',
      docHint: '前往抖音开放平台创建应用获取',
      customEndpoints: [
        { label: '自定义授权端点', key: 'custom_authorize_url', defaultUrl: 'https://open.douyin.com/platform/oauth/connect/' },
      ],
    },
    xiaohongshu: {
      fields: [
        { label: 'App Key', key: 'app_key', placeholder: '小红书开放平台 App Key' },
        { label: 'App Secret', key: 'app_secret', type: 'password', placeholder: '小红书开放平台 App Secret' },
      ],
      docUrl: 'https://open.xiaohongshu.com/document/doc',
      docHint: '前往小红书开放平台创建应用获取',
    },
    bilibili: {
      fields: [
        { label: 'App Key', key: 'app_key', placeholder: 'B站开放平台 App Key' },
        { label: 'App Secret', key: 'app_secret', type: 'password', placeholder: 'B站开放平台 App Secret' },
      ],
      docUrl: 'https://openhome.bilibili.com/',
      docHint: '前往B站开放平台创建应用获取',
    },
    zhihu: {
      fields: [
        { label: 'Client ID', key: 'client_id', placeholder: '知乎开放平台 Client ID' },
        { label: 'Client Secret', key: 'client_secret', type: 'password', placeholder: '知乎开放平台 Client Secret' },
      ],
      docUrl: 'https://www.zhihu.com/api',
      docHint: '前往知乎开放平台创建应用获取',
    },
  }
  const [connectPlatform, setConnectPlatform] = useState<string>('weibo')
  const [credForm, setCredForm] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [showAccountConfig, setShowAccountConfig] = useState(false)

  const isConnected = (acc: SocialAccount) => {
    return !!acc.access_token
  }

  const hasCredentials = (acc: SocialAccount) => {
    const meta = acc.metadata as Record<string, unknown> | null
    const fields = platformCredentialFields[acc.platform]
    if (!fields || !meta) return false
    return fields.fields.some(f => meta[f.key])
  }

  // Open OAuth popup window and poll for completion
  const openOAuthPopup = (authUrl: string) => {
    const popup = window.open(authUrl, 'oauth_popup', 'width=600,height=700,scrollbars=yes')
    if (!popup) {
      setOauthError('弹窗被拦截了，请允许本页面弹出窗口（地址栏右侧会有提示）')
      return
    }
    const pollTimer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer)
          setOauthLoading(false)
          fetchSocialAccounts()
        }
      } catch { clearInterval(pollTimer) }
    }, 1000)
  }

  const handleConnectPlatform = async () => {
    const fields = platformCredentialFields[connectPlatform]
    if (!fields) return
    // Validate required fields
    const hasRequired = fields.fields.every(f => credForm[f.key]?.trim())
    if (!hasRequired) return

    setOauthLoading(true)
    setOauthError(null)

    const existing = socialAccounts.find(a => a.platform === connectPlatform)
    if (!existing) {
      setOauthError('请先在「绑定账号」中添加该平台的账号，然后再连接')
      setOauthLoading(false)
      return
    }

    // Build metadata with credentials + custom endpoints
    const newMeta: Record<string, unknown> = { ...(existing.metadata as Record<string, unknown> || {}) }
    fields.fields.forEach(f => {
      if (credForm[f.key]?.trim()) newMeta[f.key] = credForm[f.key].trim()
    })
    if (fields.customEndpoints) {
      fields.customEndpoints.forEach(ep => {
        const val = credForm[ep.key]?.trim()
        if (val && val !== ep.defaultUrl) newMeta[ep.key] = val
        else delete newMeta[ep.key] // remove if same as default
      })
    }

    await updateSocialAccount(existing.id, {
      metadata: newMeta,
      check_status: 'pending',
    } as any)

    // Call Edge Function to get OAuth URL
    const result = await initiateOAuth(existing.id, connectPlatform)
    if (result.error) {
      setOauthError(result.error)
      setOauthLoading(false)
      return
    }
    if (result.auth_url) {
      openOAuthPopup(result.auth_url)
    }
    setShowConnectPlatform(false)
    setCredForm({})
    setShowAdvanced(false)
  }

  const handleSync = useCallback(async (accountId: string, credentials?: object) => {
    const acc = socialAccounts.find(a => a.id === accountId)
    if (!acc) return
    if (!credentials) {
      const meta = acc.metadata as Record<string, unknown> | null
      const fields = platformCredentialFields[acc.platform]
      if (meta && fields) {
        credentials = {}
        fields.fields.forEach(f => { if (meta[f.key]) (credentials as Record<string, unknown>)[f.key] = meta[f.key] })
      }
    }
    setSyncingIds(prev => new Set(prev).add(accountId))
    try {
      await syncSocialAccount(accountId, credentials || {})
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev)
        next.delete(accountId)
        return next
      })
    }
  }, [socialAccounts, syncSocialAccount])

  // Auto-sync on mount for accounts with auto_sync and credentials
  useEffect(() => {
    socialAccounts.forEach(acc => {
      if (acc.auto_sync && isConnected(acc)) {
        handleSync(acc.id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateAccount = () => {
    if (!af.account_name.trim()) return
    // 从 localStorage 读取平台凭证，写入 metadata
    let platformCreds: Record<string, string> = {}
    try {
      const tpCreds = JSON.parse(localStorage.getItem('third_party_credentials') || '{}')
      platformCreds = (tpCreds[`social-${af.platform}`] as Record<string, string>) || {}
    } catch {}
    addSocialAccount({
      platform: af.platform,
      account_name: af.account_name,
      account_id: af.account_id || af.account_name,
      follower_count: 0,
      status: 'active',
      check_status: 'pending',
      auto_sync: af.auto_sync,
      metadata: platformCreds,
    })
    setShowNewAccount(false)
    setAf({ platform: 'weibo', account_name: '', account_id: '', auto_sync: true })
  }

  const charLimit = platformCharLimits[pf.platform] ?? defaultCharLimit
  const charCount = pf.content.length
  const overLimit = charCount > charLimit

  const handleCreatePost = (status?: SocialPostStatus, scheduledAt?: string | null) => {
    if (!pf.content.trim()) return
    addSocialPost({
      account_id: pf.account_id || socialAccounts[0]?.id || 'acc-001',
      title: pf.title,
      content: pf.content,
      platform: pf.platform,
      status: status || 'draft',
      likes: 0, comments: 0, shares: 0, views: 0,
      scheduled_at: scheduledAt || null,
      published_at: scheduledAt ? null : new Date().toISOString(),
    })
    setShowNewPost(false)
    setPf({ title: '', content: '', platform: 'weibo', account_id: '' })
    setScheduleEnabled(false)
    setScheduledTime('')
  }

  const handlePublishDirect = async () => {
    if (!pf.content.trim()) return
    const accountId = pf.account_id || socialAccounts[0]?.id
    if (!accountId) {
      setPublishError('请先绑定一个社交账号')
      return
    }
    const acc = socialAccounts.find(a => a.id === accountId)
    if (!acc?.access_token) {
      setPublishError(`${platformNames[acc?.platform || 'weibo']} 未完成授权连接，请先点击「连接平台」完成OAuth授权`)
      return
    }
    // Step 1: Create post as draft in DB
    await addSocialPost({
      account_id: accountId,
      title: pf.title,
      content: pf.content,
      platform: pf.platform,
      status: 'draft',
      likes: 0, comments: 0, shares: 0, views: 0,
      scheduled_at: null,
      published_at: null,
    })
    // Step 2: Find the just-created post (most recent for this account)
    const newPost = socialPosts.find(p => p.account_id === accountId)
    if (!newPost) { setPublishError('发布失败：无法创建草稿'); return }
    // Step 3: Publish to platform
    setPublishError(null)
    setPublishSuccess(null)
    const result = await publishPost(newPost.id, accountId, pf.content, pf.title || undefined, pf.platform)
    if (result.success) {
      setPublishSuccess(result.post_url || `${platformNames[pf.platform]} 发布成功！`)
    } else {
      setPublishError(result.error || '发布失败，请重试')
    }
    setShowNewPost(false)
    setPf({ title: '', content: '', platform: 'weibo', account_id: '' })
    setScheduleEnabled(false)
    setScheduledTime('')
  }

  const handleWriteFromTrending = (topicTitle: string) => {
    setPf({ title: '', content: `#${topicTitle}`, platform: 'weibo', account_id: '' })
    setActiveTab('content')
    setShowNewPost(true)
  }

  const formatHeat = (heat: number): string => {
    if (heat >= 10000000) return (heat / 10000000).toFixed(1) + '千万'
    if (heat >= 10000) return (heat / 10000).toFixed(1) + '万'
    return heat.toLocaleString()
  }

  const handleRefreshTrending = async () => {
    setTrendingRefreshing(true)
    try {
      const { fetchTrendingTopics } = useStore.getState()
      await fetchTrendingTopics()
      setTrendingLastRefresh(format(new Date(), 'HH:mm:ss'))
    } finally {
      setTrendingRefreshing(false)
    }
  }

  const handlePublish = (id: string) => {
    updateSocialPost(id, { status: 'published', published_at: new Date().toISOString(), views: Math.floor(Math.random() * 5000) + 100 })
  }

  const detailPost = socialPosts.find(p => p.id === showPostDetail)

  return (
    <div className="space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { title: '绑定账号', value: socialAccounts.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: '总粉丝', value: totalFollowers.toLocaleString(), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: '内容数', value: socialPosts.length, icon: Edit3, color: 'text-green-600', bg: 'bg-green-50' },
          { title: '总互动', value: totalEngagement.toLocaleString(), icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
          { title: '总阅读', value: socialPosts.reduce((s, p) => s + p.views, 0).toLocaleString(), icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <Card key={s.title}><CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-gray-500">{s.title}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-1.5"><Users className="w-4 h-4" />账号管理</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5"><Edit3Icon className="w-4 h-4" />内容管理</TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5"><TrendingUp className="w-4 h-4" />热点追踪</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" />数据分析</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="w-4 h-4" />内容模板</TabsTrigger>
        </TabsList>

        {/* ========== Accounts ========== */}
        <TabsContent value="accounts">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={() => setShowConnectPlatform(true)}><Globe className="w-4 h-4 mr-1" />连接平台</Button>
            <Button size="sm" onClick={() => setShowNewAccount(true)}><Plus className="w-4 h-4 mr-1" />绑定账号</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {socialAccounts.map(acc => {
              const pi = platformIcons[acc.platform] || { icon: acc.platform, color: 'text-gray-500', bg: 'bg-gray-50' }
              return (
                <Card key={acc.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${pi.bg} flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${pi.color}`}>{pi.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{acc.account_name}</p>
                          <p className="text-xs text-gray-400">@{acc.account_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isConnected(acc) ? (
                          <Badge className="text-[10px] bg-green-50 text-green-600 border-green-200">已连接</Badge>
                        ) : hasCredentials(acc) ? (
                          <Badge className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">待授权</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-400">未配置</Badge>
                        )}
                        <button
                          onClick={() => { setEditingAccountId(acc.id); setConnectPlatform(acc.platform); setCredForm({}); setShowAdvanced(false); setShowAccountConfig(true) }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="配置"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSync(acc.id)}
                          disabled={syncingIds.has(acc.id)}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 disabled:opacity-50"
                          title="同步数据"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingIds.has(acc.id) ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setConfirmUnbindId(acc.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-sm font-bold">{(acc.follower_count / 10000).toFixed(1)}万</p>
                        <p className="text-[10px] text-gray-400">粉丝</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{acc.post_count || 0}</p>
                        <p className="text-[10px] text-gray-400">内容</p>
                      </div>
                      <div className="text-center">
                        <Badge variant="secondary" className={`text-[10px] ${acc.auto_sync ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {acc.auto_sync ? '已同步' : '未同步'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========== Content ========== */}
        <TabsContent value="content">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="搜索内容..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Button size="sm" onClick={() => setShowNewPost(true)}><Plus className="w-4 h-4 mr-1" />创建内容</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredPosts.map(post => {
              const pi = platformIcons[post.platform] || { icon: post.platform, color: 'text-gray-500', bg: 'bg-gray-50' }
              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setShowPostDetail(post.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pi.bg} ${pi.color} font-medium`}>{pi.icon}</span>
                          {post.title && <span className="text-sm font-medium truncate">{post.title}</span>}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{post.content}</p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] shrink-0 ${postStatusLabels[post.status].color}`}>
                        {postStatusLabels[post.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.likes}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.comments}</span>
                        <span className="flex items-center gap-0.5"><Share2 className="w-3 h-3" />{post.shares}</span>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {post.status === 'draft' && (
                          <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => handlePublish(post.id)}>
                            发布
                          </Button>
                        )}
                        <button onClick={() => setConfirmDeletePostId(post.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2Icon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {post.published_at && (
                      <p className="text-[10px] text-gray-400 mt-2">发布于 {format(parseISO(post.published_at), 'yyyy-MM-dd HH:mm')}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========== Trending ========== */}
        <TabsContent value="trending">
          {/* Header: filters & refresh */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">热点追踪</h3>
              <Badge variant="secondary" className="text-[10px]">{trendingTopics.length} 条话题</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Platform filter */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setTrendingFilter('all')}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${trendingFilter === 'all' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >全部</button>
                {['weibo', 'douyin', 'zhihu', 'bilibili'].map(p => {
                  const pi = platformIcons[p]
                  if (!pi) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setTrendingFilter(p)}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${trendingFilter === p ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >{pi.icon}</button>
                  )
                })}
              </div>
              {/* Sort */}
              <select
                value={trendingSort}
                onChange={e => setTrendingSort(e.target.value as 'heat' | 'time')}
                className="text-xs border rounded-md px-2 py-1 bg-white"
              >
                <option value="heat">按热度</option>
                <option value="time">按时间</option>
              </select>
              {/* Refresh */}
              <button
                onClick={handleRefreshTrending}
                disabled={trendingRefreshing}
                className="flex items-center gap-1 text-xs px-2 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${trendingRefreshing ? 'animate-spin' : ''}`} />
                {trendingRefreshing ? '刷新中...' : '刷新'}
              </button>
              {trendingLastRefresh && (
                <span className="text-[10px] text-gray-400">
                  {trendingLastRefresh}
                </span>
              )}
            </div>
          </div>

          {/* Topic detail dialog */}
          {showTrendingDetail && (
            <Dialog open={!!showTrendingDetail} onOpenChange={() => setShowTrendingDetail(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">{showTrendingDetail.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {(() => { const pi = platformIcons[showTrendingDetail.platform]; return pi ? <span className={`text-xs px-2 py-0.5 rounded ${pi.bg} ${pi.color} font-bold`}>{pi.icon}</span> : null })()}
                    <Badge variant="secondary">{formatHeat(showTrendingDetail.heat)}</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      {showTrendingDetail.trend === 'up' && <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> 上升</span>}
                      {showTrendingDetail.trend === 'down' && <span className="text-xs text-green-500 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> 下降</span>}
                      {showTrendingDetail.trend === 'stable' && <span className="text-xs text-gray-400">平稳</span>}
                    </div>
                  </div>
                  {showTrendingDetail.description && (
                    <p className="text-sm text-gray-600">{showTrendingDetail.description}</p>
                  )}
                  {showTrendingDetail.url && (
                    <a href={showTrendingDetail.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> 查看原文
                    </a>
                  )}
                  <p className="text-[10px] text-gray-400">
                    采集时间：{showTrendingDetail.captured_at ? format(parseISO(showTrendingDetail.captured_at), 'yyyy-MM-dd HH:mm') : '-'}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { handleWriteFromTrending(showTrendingDetail.title); setShowTrendingDetail(null) }}
                      className="flex-1 text-xs px-3 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                    >✨ 基于此话题写文案</button>
                    {showTrendingDetail.url && (
                      <a
                        href={showTrendingDetail.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-xs px-3 py-2 border rounded-md hover:bg-gray-50 text-center transition-colors"
                      >前往查看</a>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Topic list */}
          <div className="grid gap-4 md:grid-cols-2">
            {(trendingFilter === 'all' ? ['weibo', 'douyin', 'zhihu', 'bilibili'] : [trendingFilter]).map(platform => {
              const allPlatformTopics = trendingTopics.filter(t => t.platform === platform)
              const topics = trendingSort === 'heat'
                ? allPlatformTopics
                : [...allPlatformTopics].sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
              const pi = platformIcons[platform]
              if (!pi) return null
              return (
                <Card key={platform} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${pi.bg} ${pi.color} font-bold`}>{pi.icon}</span>
                      <CardTitle className="text-sm">热点话题</CardTitle>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{topics.length} 条</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {topics.map((topic, i) => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setShowTrendingDetail(topic)}
                        >
                          <span className={`text-sm font-bold w-5 text-center ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{topic.title}</p>
                            {topic.description && (
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{topic.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); handleWriteFromTrending(topic.title) }}
                              className="text-xs text-amber-500 hover:text-amber-600 whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-amber-50 transition-colors"
                              title="写文案"
                            >✨</button>
                            {topic.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                            {topic.trend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
                            {topic.trend === 'stable' && <Minus className="w-3 h-3 text-gray-400" />}
                            <Badge variant="secondary" className="text-[10px]">{formatHeat(topic.heat)}</Badge>
                          </div>
                        </div>
                      ))}
                      {topics.length === 0 && <p className="text-xs text-gray-400 text-center py-4">暂无数据</p>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========== Analytics ========== */}
        <ContentTemplatesTab />
        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Per-platform stats */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">各平台数据概览</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {socialAccounts.map(acc => {
                    const posts = socialPosts.filter(p => p.account_id === acc.id || p.platform === acc.platform)
                    const totalViews = posts.reduce((s, p) => s + p.views, 0)
                    const totalLikes = posts.reduce((s, p) => s + p.likes, 0)
                    const pi = platformIcons[acc.platform] || { icon: acc.platform, color: 'text-gray-500', bg: 'bg-gray-50' }
                    return (
                      <div key={acc.id} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pi.bg} ${pi.color} font-medium`}>{pi.icon}</span>
                          <span className="text-sm font-medium">{acc.account_name}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{acc.follower_count} 粉丝</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><p className="text-sm font-bold">{totalViews.toLocaleString()}</p><p className="text-[10px] text-gray-400">阅读</p></div>
                          <div><p className="text-sm font-bold">{totalLikes}</p><p className="text-[10px] text-gray-400">点赞</p></div>
                          <div><p className="text-sm font-bold">{posts.length}</p><p className="text-[10px] text-gray-400">内容</p></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Content performance */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">内容表现 TOP 5</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...socialPosts].sort((a, b) => b.views - a.views).slice(0, 5).map((post, i) => {
                    const engagement = post.likes + post.comments + post.shares
                    const maxViews = Math.max(...socialPosts.map(p => p.views), 1)
                    return (
                      <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <span className={`text-sm font-bold w-5 ${i < 3 ? 'text-blue-600' : 'text-gray-400'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{post.title || post.content.slice(0, 30)}</p>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${(post.views / maxViews) * 100}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold">{post.views}</p>
                          <p className="text-[10px] text-gray-400">阅读</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Engagement summary */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">互动数据汇总</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-red-50 text-center">
                    <p className="text-lg font-bold text-red-600">{socialPosts.reduce((s, p) => s + p.likes, 0).toLocaleString()}</p>
                    <p className="text-xs text-red-500 flex items-center justify-center gap-1"><Heart className="w-3 h-3" />总点赞</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-lg font-bold text-blue-600">{socialPosts.reduce((s, p) => s + p.comments, 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-500 flex items-center justify-center gap-1"><MessageCircle className="w-3 h-3" />总评论</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <p className="text-lg font-bold text-green-600">{socialPosts.reduce((s, p) => s + p.shares, 0).toLocaleString()}</p>
                    <p className="text-xs text-green-500 flex items-center justify-center gap-1"><Share2 className="w-3 h-3" />总转发</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-lg font-bold text-purple-600">{socialPosts.reduce((s, p) => s + p.views, 0).toLocaleString()}</p>
                    <p className="text-xs text-purple-500 flex items-center justify-center gap-1"><Eye className="w-3 h-3" />总阅读</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Connect Platform dialog */}
      <Dialog open={showConnectPlatform} onOpenChange={(v) => { setShowConnectPlatform(v); if (!v) { setOauthError(null); setShowAdvanced(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>连接平台</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-sm font-medium">选择平台</span>
              <div className="grid grid-cols-3 gap-2">
                {(['weibo', 'wechat', 'douyin', 'xiaohongshu', 'bilibili', 'zhihu'] as const).map(key => {
                  const pi = platformIcons[key]
                  const acc = socialAccounts.find(a => a.platform === key)
                  const conn = acc ? (isConnected(acc) ? 'connected' : hasCredentials(acc) ? 'partial' : 'none') : 'none'
                  return (
                    <button key={key} onClick={() => { setConnectPlatform(key); setCredForm({}); setShowAdvanced(false) }}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors relative ${connectPlatform === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}>
                      {pi?.icon || key}
                      {conn === 'connected' && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {conn === 'partial' && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                  )
                })}
              </div>
            </div>
            {(() => {
              const fields = platformCredentialFields[connectPlatform]
              if (!fields) return null
              const existing = socialAccounts.find(a => a.platform === connectPlatform)
              if (!existing) {
                return <p className="text-xs text-amber-600">请先在「绑定账号」中添加该平台的账号，然后再连接。</p>
              }
              const meta = existing.metadata as Record<string, unknown> || {}
              return (
                <>
                  {/* Doc hint */}
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <p className="text-xs text-blue-700">{fields.docHint}</p>
                    <a href={fields.docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> 查看开发文档
                    </a>
                  </div>
                  {/* Dynamic fields */}
                  {fields.fields.map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                      <Input
                        placeholder={f.placeholder || f.label}
                        type={f.type || 'text'}
                        value={credForm[f.key] || (meta[f.key] ? '••••••••' : '')}
                        onChange={e => setCredForm({ ...credForm, [f.key]: e.target.value })}
                        onFocus={e => { if (e.target.value === '••••••••') setCredForm({ ...credForm, [f.key]: '' }) }}
                      />
                    </div>
                  ))}
                  {/* Advanced toggle */}
                  {fields.customEndpoints && fields.customEndpoints.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <MoreVertical className="w-3 h-3" />
                        {showAdvanced ? '收起高级配置' : '展开高级配置（自定义 API 端点）'}
                      </button>
                      {showAdvanced && fields.customEndpoints.map(ep => (
                        <div key={ep.key}>
                          <label className="text-xs text-gray-500 mb-1 block">{ep.label}</label>
                          <Input
                            placeholder={ep.defaultUrl}
                            value={credForm[ep.key] || ''}
                            onChange={e => setCredForm({ ...credForm, [ep.key]: e.target.value })}
                          />
                          <p className="text-[10px] text-gray-400 mt-0.5">留空使用默认：{ep.defaultUrl}</p>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )
            })()}
          </div>
          {oauthError && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{oauthError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConnectPlatform(false); setOauthError(null); setShowAdvanced(false) }}>取消</Button>
            <Button onClick={handleConnectPlatform}
              disabled={oauthLoading || !platformCredentialFields[connectPlatform]?.fields.every(f => credForm[f.key]?.trim())}>
              {oauthLoading ? '正在跳转...' : '连接'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Config dialog — edit credentials & reconnect */}
      <Dialog open={showAccountConfig} onOpenChange={(v) => { setShowAccountConfig(v); if (!v) { setEditingAccountId(null); setOauthError(null); setShowAdvanced(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>平台配置 — {platformNames[connectPlatform]}</DialogTitle></DialogHeader>
          {(() => {
            const acc = socialAccounts.find(a => a.id === editingAccountId)
            if (!acc) return null
            const fields = platformCredentialFields[acc.platform]
            if (!fields) return <p className="text-xs text-gray-500">该平台暂不支持自定义配置</p>
            const meta = acc.metadata as Record<string, unknown> || {}
            return (
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  {isConnected(acc) ? (
                    <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-green-700">已授权连接</span></>
                  ) : hasCredentials(acc) ? (
                    <><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-amber-700">已填写凭证，待 OAuth 授权</span></>
                  ) : (
                    <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-500">未配置</span></>
                  )}
                </div>
                {/* Doc hint */}
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xs text-blue-700">{fields.docHint}</p>
                  <a href={fields.docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> 查看开发文档
                  </a>
                </div>
                {/* Dynamic credential fields */}
                {fields.fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                    <Input
                      placeholder={f.placeholder || f.label}
                      type={f.type || 'text'}
                      value={credForm[f.key] || (meta[f.key] ? '••••••••' : '')}
                      onChange={e => setCredForm({ ...credForm, [f.key]: e.target.value })}
                      onFocus={e => { if (e.target.value === '••••••••') setCredForm({ ...credForm, [f.key]: '' }) }}
                    />
                  </div>
                ))}
                {/* Advanced endpoints */}
                {fields.customEndpoints && fields.customEndpoints.length > 0 && (
                  <>
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <MoreVertical className="w-3 h-3" />{showAdvanced ? '收起高级配置' : '展开高级配置'}
                    </button>
                    {showAdvanced && fields.customEndpoints.map(ep => (
                      <div key={ep.key}>
                        <label className="text-xs text-gray-500 mb-1 block">{ep.label}</label>
                        <Input placeholder={ep.defaultUrl} value={credForm[ep.key] || ''} onChange={e => setCredForm({ ...credForm, [ep.key]: e.target.value })} />
                        <p className="text-[10px] text-gray-400 mt-0.5">默认：{ep.defaultUrl}</p>
                      </div>
                    ))}
                  </>
                )}
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      // Save credentials + reconnect
                      const newMeta: Record<string, unknown> = { ...meta }
                      fields.fields.forEach(f => {
                        if (credForm[f.key]?.trim()) newMeta[f.key] = credForm[f.key].trim()
                      })
                      if (fields.customEndpoints) {
                        fields.customEndpoints.forEach(ep => {
                          const val = credForm[ep.key]?.trim()
                          if (val && val !== ep.defaultUrl) newMeta[ep.key] = val
                          else delete newMeta[ep.key]
                        })
                      }
                      await updateSocialAccount(acc.id, { metadata: newMeta } as any)
                      // Initiate OAuth
                      setOauthLoading(true)
                      setOauthError(null)
                      const result = await initiateOAuth(acc.id, acc.platform)
                      if (result.error) {
                        setOauthError(result.error)
                        setOauthLoading(false)
                      } else if (result.auth_url) {
                        openOAuthPopup(result.auth_url)
                        setShowAccountConfig(false)
                      }
                      setOauthLoading(false)
                    }}
                    disabled={oauthLoading}
                  >
                    {oauthLoading ? '正在跳转...' : acc.access_token ? '重新授权' : '连接授权'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Just save credentials without OAuth
                      const newMeta: Record<string, unknown> = { ...meta }
                      fields.fields.forEach(f => {
                        if (credForm[f.key]?.trim()) newMeta[f.key] = credForm[f.key].trim()
                      })
                      await updateSocialAccount(acc.id, { metadata: newMeta } as any)
                      setShowAccountConfig(false)
                      setCredForm({})
                    }}
                  >
                    仅保存凭证
                  </Button>
                </div>
                {oauthError && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{oauthError}</p>}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* New account dialog */}
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>绑定社交账号</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-sm font-medium">平台</span>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(platformIcons).map(([key, val]) => (
                  <button key={key} onClick={() => setAf({ ...af, platform: key })}
                    className={`p-2 rounded-lg border text-xs font-medium transition-colors ${af.platform === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}>
                    {val.icon}
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="账号名称 *" value={af.account_name} onChange={e => setAf({ ...af, account_name: e.target.value })} />
            <Input placeholder="账号ID" value={af.account_id} onChange={e => setAf({ ...af, account_id: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={af.auto_sync} onCheckedChange={v => setAf({ ...af, auto_sync: v })} />
              自动同步数据
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccount(false)}>取消</Button>
            <Button onClick={handleCreateAccount} disabled={!af.account_name.trim()}>绑定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New post dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建内容</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="标题（可选）" value={pf.title} onChange={e => setPf({ ...pf, title: e.target.value })} />
            <div className="relative">
              <textarea placeholder="内容 *" value={pf.content} onChange={e => setPf({ ...pf, content: e.target.value })}
                className="w-full min-h-[150px] border rounded-md p-3 text-sm resize-y outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
              <div className="absolute bottom-2 left-3 pointer-events-none text-sm whitespace-pre-wrap break-all opacity-0 max-h-0 overflow-hidden">{highlightHashtags(pf.content)}</div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{pf.platform === 'weibo' ? '微博' : pf.platform === 'wechat' ? '微信' : pf.platform === 'xiaohongshu' ? '小红书' : '当前平台'}字数限制：{charLimit}</span>
              <span className={overLimit ? 'text-red-500 font-medium' : 'text-gray-400'}>{charCount}/{charLimit}{overLimit ? ' ⚠️ 超出限制' : ''}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(platformIcons).map(([key, val]) => (
                <button key={key} onClick={() => setPf({ ...pf, platform: key })}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${pf.platform === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}>
                  {val.icon}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={scheduleEnabled} onCheckedChange={v => setScheduleEnabled(v)} />
              定时发布
            </label>
            {scheduleEnabled && (
              <div className="space-y-1">
                <input type="datetime-local" value={scheduledTime}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => {
                    if (new Date(e.target.value) >= new Date()) setScheduledTime(e.target.value)
                  }}
                  className="w-full border rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                <p className="text-[10px] text-gray-400">选择一个未来的时间进行定时发布</p>
              </div>
            )}
          </div>
          {(publishError || publishSuccess) && (
            <div className={`text-xs rounded p-2 ${publishError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {publishError || publishSuccess}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewPost(false); setPublishError(null); setPublishSuccess(null) }}>取消</Button>
            <Button onClick={() => handleCreatePost('draft')} disabled={!pf.content.trim()}>保存草稿</Button>
            {scheduleEnabled && scheduledTime ? (
              <Button onClick={() => handleCreatePost('scheduled', new Date(scheduledTime).toISOString())} disabled={!pf.content.trim() || overLimit} className="bg-amber-600 hover:bg-amber-700">定时发布</Button>
            ) : (
              <Button onClick={() => handlePublishDirect()} disabled={!pf.content.trim() || overLimit || publishingIds.size > 0} className="bg-blue-600 hover:bg-blue-700">
                {publishingIds.size > 0 ? '发布中...' : '立即发布'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm unbind account dialog */}
      <Dialog open={!!confirmUnbindId} onOpenChange={() => setConfirmUnbindId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认解绑账号</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">确定要解绑该社交账号吗？解绑后相关数据将被清除，此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnbindId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { if (confirmUnbindId) { deleteSocialAccount(confirmUnbindId); setConfirmUnbindId(null) } }}>确认解绑</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete post dialog */}
      <Dialog open={!!confirmDeletePostId} onOpenChange={() => setConfirmDeletePostId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除内容</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">确定要删除该内容吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeletePostId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeletePostId) { deleteSocialPost(confirmDeletePostId); setConfirmDeletePostId(null) } }}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post detail dialog */}
      <Dialog open={!!showPostDetail} onOpenChange={() => setShowPostDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailPost?.title || '内容详情'}</DialogTitle>
          </DialogHeader>
          {detailPost && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailPost.content}</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded-lg"><p className="text-sm font-bold">{detailPost.views}</p><p className="text-[10px] text-gray-400">阅读</p></div>
                <div className="text-center p-2 bg-gray-50 rounded-lg"><p className="text-sm font-bold">{detailPost.likes}</p><p className="text-[10px] text-gray-400">点赞</p></div>
                <div className="text-center p-2 bg-gray-50 rounded-lg"><p className="text-sm font-bold">{detailPost.comments}</p><p className="text-[10px] text-gray-400">评论</p></div>
                <div className="text-center p-2 bg-gray-50 rounded-lg"><p className="text-sm font-bold">{detailPost.shares}</p><p className="text-[10px] text-gray-400">转发</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
