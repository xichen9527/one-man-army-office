import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  Plus, Trash2, Edit3, RefreshCw, ExternalLink, Search,
  TrendingUp, TrendingDown, Minus, BarChart3, Users, Eye,
  Heart, MessageCircle, Share2, Calendar, CheckCircle, XCircle,
  Clock, MoreVertical, ArrowUpRight, Globe, Upload, Image, Video, X, Loader2,
  Maximize2, Sparkles, Download
} from 'lucide-react'
import { useStore } from '@/store'
import { supabase } from '@/db/supabase'
import TrendingMaterials from '@/components/social-media/TrendingMaterials'
import type { SocialPostStatus } from '@/types/database'
import type { SocialAccount, SocialPostPlatform } from '@/types/database'
import { format, parseISO } from 'date-fns'
import {
  WeiboPreview,
  BilibiliPreview,
  XiaohongshuPreview,
  DouyinPreview,
  WechatPreview,
  ZhihuPreview,
  KuaishouPreview,
} from '@/components/social-previews'

const platformIcons: Record<string, { icon: string; color: string; bg: string }> = {
  weibo: { icon: '微博', color: 'text-red-500', bg: 'bg-red-50' },
  wechat: { icon: '微信', color: 'text-green-500', bg: 'bg-green-50' },
  douyin: { icon: '抖音', color: 'text-gray-800', bg: 'bg-gray-100' },
  xiaohongshu: { icon: '小红书', color: 'text-red-600', bg: 'bg-red-50' },
  bilibili: { icon: 'B站', color: 'text-blue-500', bg: 'bg-blue-50' },
  zhihu: { icon: '知乎', color: 'text-blue-600', bg: 'bg-blue-50' },
  toutiao: { icon: '头条', color: 'text-red-600', bg: 'bg-red-50' },
  kuaishou: { icon: '快手', color: 'text-orange-500', bg: 'bg-orange-50' },
}

const postStatusLabels: Record<SocialPostStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: '已预约', color: 'bg-blue-100 text-blue-700' },
  published: { label: '已发布', color: 'bg-green-100 text-green-700' },
}

const platformNames: Record<string, string> = {
  weibo: '微博', wechat: '微信公众号', douyin: '抖音',
  xiaohongshu: '小红书', bilibili: 'B站', zhihu: '知乎',
  toutiao: '头条', kuaishou: '快手', other: '其他',
}

import { platformRules, getStrictestRule, getImageLimit, getContentTypeConflicts, getContentRecommendations } from '@/config/platform-rules'
import type { ContentType } from '@/config/platform-rules'

// 文件大小格式化
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function highlightHashtags(text: string): React.ReactNode[] {
  const parts = text.split(/(\s+)/)
  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return <span key={i} className="text-blue-600 font-medium">{part}</span>
    }
    return part
  })
}

// ============ Content Templates (module-level constant — avoid re-creation per render) ============
const SOCIAL_MEDIA_TEMPLATES: readonly {
  id: string; name: string; platform: string; content: string;
}[] = Object.freeze([
  { id: 'weibo', name: '微博模板', platform: 'weibo', content: '#[话题]# [您的微博内容，最多140字]\n\n#[热点]# #[每日分享]#' },
  { id: 'wechat', name: '微信模板', platform: 'wechat', content: '【标题】[文章标题]\n\n【摘要】[文章摘要，吸引读者点击]\n\n【正文】\n[您的文章内容]\n\n【标签】#[标签1]# #[标签2]#' },
  { id: 'douyin', name: '抖音模板', platform: 'douyin', content: '【视频标题】[吸引人的标题，包含关键词]\n\n【话题标签】\n#[热门话题]# #[您的行业]# #[相关内容]#' },
  { id: 'xiaohongshu', name: '小红书模板', platform: 'xiaohongshu', content: '📝 [标题：分享我的...经验/心得]\n\n✨ [开头：吸引眼球的描述]\n\n[正文内容，分段描述]\n\n💡 [实用tips或建议]\n\n#[标签1]# #[标签2]# #[标签3]#' },
  { id: 'bilibili', name: 'B站模板', platform: 'bilibili', content: '【视频标题】[标题要吸引人]\n\n【视频简介】\n[视频内容简介]\n\n【章节目录】\n00:00 开头\n01:30 第一部分\n03:00 第二部分\n05:00 结尾\n\n【标签】#[标签1]# #[标签2]#' },
  { id: 'zhihu', name: '知乎模板', platform: 'zhihu', content: '**问题：** [您的问题]\n\n**回答：**\n[您的回答内容]\n\n---\n**参考资料：**\n- [参考资料1]\n- [参考资料2]' },
  { id: 'kuaishou', name: '快手模板', platform: 'kuaishu', content: '【作品标题】[简短有力的标题]\n\n【作品描述】\n[描述内容，贴近生活]\n\n【话题】\n#[热门话题]# #[生活记录]#' },
])

export default function SocialMedia() {
  const {
    socialAccounts, socialPosts, socialPostPlatforms, trendingTopics, currentUser,
    refreshTrendingTopics,
    addSocialAccount, updateSocialAccount, deleteSocialAccount,
    initiateOAuth, publishPost, fetchSocialAccounts,
    addSocialPost, updateSocialPost, deleteSocialPost,
    addSocialPostPlatform, updateSocialPostPlatform, deleteSocialPostPlatform,
    syncSocialAccount,
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
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingLastRefresh, setTrendingLastRefresh] = useState<Date | null>(null)

  // Account form
  const [af, setAf] = useState({ platform: 'weibo', account_name: '', account_id: '', auto_sync: true })

  // Post form
  const [pf, setPf] = useState({ title: '', content: '', account_id: '', summary: '', category: '', tags: '' })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]) // 多选平台
  
  // Template selection
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  // Media upload
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [mediaThumbnails, setMediaThumbnails] = useState<string[]>([]) // base64 thumbnails for videos
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const filteredPosts = useMemo(() =>
    socialPosts.filter(p => !search || p.title.includes(search) || p.content.includes(search)),
    [socialPosts, search])

  const totalFollowers = useMemo(() =>
    socialAccounts.reduce((s, a) => s + a.follower_count, 0),
    [socialAccounts])

  const totalEngagement = useMemo(() =>
    socialPosts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0),
    [socialPosts])

  // Platform credentials form
  const platformCredentialFields: Record<string, { label1: string; key1: string; label2: string; key2: string }> = {
    weibo: { label1: 'App Key', key1: 'app_key', label2: 'App Secret', key2: 'app_secret' },
    wechat: { label1: 'AppID', key1: 'app_id', label2: 'AppSecret', key2: 'app_secret' },
    douyin: { label1: 'Client Key', key1: 'client_key', label2: 'Client Secret', key2: 'client_secret' },
    xiaohongshu: { label1: 'App Key', key1: 'app_key', label2: 'App Secret', key2: 'app_secret' },
    bilibili: { label1: 'App Key', key1: 'app_key', label2: 'App Secret', key2: 'app_secret' },
    zhihu: { label1: 'Client ID', key1: 'client_id', label2: 'Client Secret', key2: 'client_secret' },
    kuaishou: { label1: 'App Key', key1: 'app_key', label2: 'App Secret', key2: 'app_secret' },
  }
  const [connectPlatform, setConnectPlatform] = useState<string>('weibo')
  const [credForm, setCredForm] = useState<Record<string, string>>({})

  const isConnected = (acc: SocialAccount) => {
    const meta = acc.metadata as Record<string, unknown> | null
    const fields = platformCredentialFields[acc.platform]
    if (!fields || !meta) return false
    return !!(meta[fields.key1] && meta[fields.key2])
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
    const value1 = credForm[fields.key1]?.trim()
    const value2 = credForm[fields.key2]?.trim()
    if (!value1 || !value2) return

    setOauthLoading(true)
    setOauthError(null)

    const existing = socialAccounts.find(a => a.platform === connectPlatform)
    if (!existing) {
      setOauthError('请先在「绑定账号」中添加该平台的账号，然后再连接')
      setOauthLoading(false)
      return
    }

    // Save credentials to DB first
    await updateSocialAccount(existing.id, {
      metadata: { ...(existing.metadata as Record<string, unknown> || {}), [fields.key1]: value1, [fields.key2]: value2 },
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
  }

  const handleSync = useCallback(async (accountId: string, credentials?: object) => {
    const acc = socialAccounts.find(a => a.id === accountId)
    if (!acc) return
    // Get credentials from metadata if not provided
    if (!credentials) {
      const meta = acc.metadata as Record<string, unknown> | null
      const fields = platformCredentialFields[acc.platform]
      if (meta && fields) {
        credentials = { [fields.key1]: meta[fields.key1], [fields.key2]: meta[fields.key2] }
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
    addSocialAccount({
      platform: af.platform,
      account_name: af.account_name,
      account_id: af.account_id || af.account_name,
      follower_count: 0,
      status: 'active',
      check_status: 'pending',
      auto_sync: af.auto_sync,
      user_id: currentUser.id,
    })
    setShowNewAccount(false)
    setAf({ platform: 'weibo', account_name: '', account_id: '', auto_sync: true })
  }

  // Platform-aware rules
  const selectedRules = selectedPlatforms.map(p => platformRules[p]).filter(Boolean)
  const strictTitleLimit = selectedRules.length > 0 ? getStrictestRule(selectedRules, 'title') : 0
  const strictContentLimit = selectedRules.length > 0 ? getStrictestRule(selectedRules, 'content') : Infinity
  const strictImageLimit = selectedRules.length > 0 ? getImageLimit(selectedRules) : 0
  const charCount = pf.content.length
  const overLimit = selectedPlatforms.length > 0 && charCount > strictContentLimit
  const titleRequired = selectedRules.some(r => r.title.required)
  const titleOverLimit = pf.title.length > 0 && strictTitleLimit > 0 && pf.title.length > strictTitleLimit
  const anyCoverRequired = selectedRules.some(r => r.images.coverRequired)
  const anyVideoRequired = selectedRules.some(r => r.video.required)
  const anyCategoryRequired = selectedRules.some(r => r.category.required)
  const anyTagsRequired = selectedRules.some(r => r.tags.required)
  const { recommended: recommendedPlatforms, warnings: contentWarnings } = getContentRecommendations(pf.content, mediaFiles.length > 0, mediaFiles.some(f => f.type.startsWith('video/')))

  const handleCreatePost = async (status?: SocialPostStatus, scheduledAt?: string | null) => {
    if (!pf.content.trim() || selectedPlatforms.length === 0) return

    // 先上传媒体文件
    const mediaUrls = await uploadMediaFiles()

    // 创建内容
    const newPostId = await addSocialPost({
      title: pf.title,
      content: pf.content,
      platform: null, // 已废弃
      status: status || 'draft',
      likes: 0, comments: 0, shares: 0, views: 0,
      scheduled_at: scheduledAt || null,
      published_at: scheduledAt ? null : new Date().toISOString(),
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    })

    if (!newPostId) return // 创建失败时直接退出

    // 为每个选中的平台创建关联记录
    for (const platform of selectedPlatforms) {
      const account = socialAccounts.find(a => a.platform === platform)
      if (account) {
        await addSocialPostPlatform({
          post_id: newPostId,
          account_id: account.id,
          platform: platform as any,
          status: status || 'draft',
          scheduled_at: scheduledAt || null,
          published_at: null,
        })
      }
    }

    setShowNewPost(false)
    setPf({ title: '', content: '', account_id: '', summary: '', category: '', tags: '' })
    setSelectedPlatforms([])
    setScheduleEnabled(false)
    setScheduledTime('')
    setMediaFiles([])
    setMediaPreviews([])
  }

  // Media upload handlers
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check file types and sizes
    const validFiles: File[] = []
    const previews: string[] = []

    for (const file of files) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: '文件过大', description: `${file.name} 超过50MB限制`, variant: 'destructive' })
        continue
      }

      // Check file type based on selected platforms
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (isImage || isVideo) {
        validFiles.push(file)
        previews.push(URL.createObjectURL(file))
      } else {
        toast({ title: '不支持的文件类型', description: `${file.name} 不是图片或视频`, variant: 'destructive' })
      }
    }

    if (validFiles.length > 0) {
      // 为视频文件生成缩略图
      const thumbnails: string[] = []
      for (const file of validFiles) {
        if (file.type.startsWith('video/')) {
          try {
            const thumb = await extractVideoThumbnail(file)
            thumbnails.push(thumb)
          } catch {
            thumbnails.push('') // 占位
          }
        } else {
          thumbnails.push('') // 图片不需要缩略图
        }
      }
      setMediaFiles(prev => [...prev, ...validFiles])
      setMediaPreviews(prev => [...prev, ...previews])
      setMediaThumbnails(prev => [...prev, ...thumbnails])
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
    setMediaThumbnails(prev => prev.filter((_, i) => i !== index))
  }

  // 从视频中截取第1秒的帧作为缩略图
  const extractVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      const url = URL.createObjectURL(file)
      video.src = url
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1) // 第1秒或视频开头
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 180
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumb = canvas.toDataURL('image/jpeg', 0.7)
          URL.revokeObjectURL(url)
          resolve(thumb)
        } else {
          URL.revokeObjectURL(url)
          resolve('')
        }
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('视频加载失败'))
      }
    })
  }

  const uploadMediaFiles = async (): Promise<string[]> => {
    if (mediaFiles.length === 0) return []

    setUploadingMedia(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of mediaFiles) {
        const ext = file.name.split('.').pop() || 'bin'
        const path = `social-media/${currentUser?.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          toast({ title: '上传失败', description: file.name, variant: 'destructive' })
          continue
        }

        const { data: urlData } = supabase.storage.from('files').getPublicUrl(path)
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      }
    } finally {
      setUploadingMedia(false)
    }

    return uploadedUrls
  }

  const handlePublishDirect = async () => {
    if (!pf.content.trim() || selectedPlatforms.length === 0) return

    // 先上传媒体文件
    const mediaUrls = await uploadMediaFiles()

    // 创建内容（使用返回的 ID，不再依赖 find 查找）
    const newPostId = await addSocialPost({
      title: pf.title,
      content: pf.content,
      platform: null,
      status: 'draft',
      likes: 0, comments: 0, shares: 0, views: 0,
      scheduled_at: null,
      published_at: null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    })

    if (!newPostId) {
      setPublishError('发布失败：内容创建失败，请重试')
      return
    }

    // 发布到选中的每个平台（内容已保存，平台 OAuth 失败不影响本地记录）
    let hasOAuthError = false
    let hasPublishError = false
    for (const platform of selectedPlatforms) {
      const account = socialAccounts.find(a => a.platform === platform)
      if (!account || !account.access_token) {
        hasOAuthError = true
        continue
      }

      setPublishError(null)
      setPublishSuccess(null)
      const result = await publishPost(newPostId, account.id, pf.content, pf.title || undefined, platform)
      if (result.success) {
        setPublishSuccess(prev => prev ? `${prev}；${platformNames[platform]} 发布成功！` : `${platformNames[platform]} 发布成功！`)
      } else {
        hasPublishError = true
        setPublishError(result.error || `${platformNames[platform]} 发布失败`)
      }
    }

    if (hasOAuthError) {
      setPublishError('部分平台未完成授权，内容已保存到草稿，可在「连接平台」完成授权后重新发布')
    }

    setShowNewPost(false)
    setPf({ title: '', content: '', account_id: '', summary: '', category: '', tags: '' })
    setSelectedPlatforms([])
    setScheduleEnabled(false)
    setScheduledTime('')
  }

  const handleWriteFromTrending = (topicTitle: string) => {
    setPf({ title: '', content: `#${topicTitle}`, account_id: '', summary: '', category: '', tags: '' })
    setSelectedPlatforms(['weibo']) // 默认选择微博
    setActiveTab('content')
    setShowNewPost(true)
  }

  const handleRefreshTrending = useCallback(async () => {
    setTrendingLoading(true)
    try {
      await refreshTrendingTopics()
      setTrendingLastRefresh(new Date())
    } finally {
      setTrendingLoading(false)
    }
  }, [refreshTrendingTopics])

  // Auto-refresh trending when tab is active
  useEffect(() => {
    if (activeTab !== 'trending') return
    // Refresh if no data or last refresh was > 10 min ago
    const shouldRefresh = trendingTopics.length === 0 ||
      (trendingLastRefresh && Date.now() - trendingLastRefresh.getTime() > 10 * 60 * 1000) ||
      !trendingLastRefresh
    if (shouldRefresh) {
      handleRefreshTrending()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <TabsTrigger value="content" className="gap-1.5"><Edit3 className="w-4 h-4" />内容管理</TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5"><TrendingUp className="w-4 h-4" />热点素材</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" />数据分析</TabsTrigger>
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
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-400">未连接</Badge>
                        )}
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
                          <Trash2 className="w-3.5 h-3.5" />
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
              // 获取该内容关联的所有平台
              const postPlatforms = socialPostPlatforms.filter(pp => pp.post_id === post.id)
              const pi = platformIcons[post.platform || 'weibo'] || { icon: post.platform || '未知', color: 'text-gray-500', bg: 'bg-gray-50' }
              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setShowPostDetail(post.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* 显示所有关联的平台 */}
                          <div className="flex gap-1 flex-wrap">
                            {postPlatforms.length > 0 ? (
                              postPlatforms.map(pp => {
                                const ppi = platformIcons[pp.platform] || { icon: pp.platform, color: 'text-gray-500', bg: 'bg-gray-50' }
                                return (
                                  <span key={pp.id} className={`text-xs px-1.5 py-0.5 rounded ${ppi.bg} ${ppi.color} font-medium`}>
                                    {ppi.icon}
                                  </span>
                                )
                              })
                            ) : (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${pi.bg} ${pi.color} font-medium`}>{pi.icon}</span>
                            )}
                          </div>
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
                          <Trash2 className="w-3 h-3" />
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
          <TrendingMaterials
            onWriteFromTrending={handleWriteFromTrending}
            setActiveTab={setActiveTab}
            setShowNewPost={setShowNewPost}
          />
        </TabsContent>        {/* ========== Analytics ========== */}
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
      <Dialog open={showConnectPlatform} onOpenChange={setShowConnectPlatform}>
        <DialogContent>
          <DialogHeader><DialogTitle>连接平台</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-sm font-medium">选择平台</span>
              <div className="grid grid-cols-3 gap-2">
                {(['weibo', 'wechat', 'douyin', 'xiaohongshu', 'bilibili', 'zhihu'] as const).map(key => {
                  const pi = platformIcons[key]
                  const connected = socialAccounts.some(a => a.platform === key && isConnected(a))
                  return (
                    <button key={key} onClick={() => { setConnectPlatform(key); setCredForm({}) }}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors relative ${connectPlatform === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}>
                      {pi?.icon || key}
                      {connected && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
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
              return (
                <>
                  <Input placeholder={fields.label1} value={credForm[fields.key1] || ''} onChange={e => setCredForm({ ...credForm, [fields.key1]: e.target.value })} />
                  <Input placeholder={fields.label2} type="password" value={credForm[fields.key2] || ''} onChange={e => setCredForm({ ...credForm, [fields.key2]: e.target.value })} />
                </>
              )
            })()}
          </div>
          {oauthError && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{oauthError}</p>}
          <p className="text-xs text-gray-500">填写完成后点击「连接」，会跳转到{platformNames[connectPlatform]}授权页面完成OAuth授权。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConnectPlatform(false); setOauthError(null) }}>取消</Button>
            <Button onClick={handleConnectPlatform} disabled={oauthLoading || !credForm[platformCredentialFields[connectPlatform]?.key1]?.trim() || !credForm[platformCredentialFields[connectPlatform]?.key2]?.trim()}>
              {oauthLoading ? '正在跳转...' : '连接'}
            </Button>
          </DialogFooter>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader><DialogTitle>创建内容</DialogTitle></DialogHeader>
          <div className="flex gap-6 min-h-[480px]">
            {/* 左侧：预览区 - 平台差异化预览 */}
            <div className="w-2/5 border rounded-lg p-4 bg-gray-50 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">📱 内容预览</span>
                {selectedPlatforms.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    已选 {selectedPlatforms.length} 个平台
                  </Badge>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {selectedPlatforms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 text-sm gap-2 bg-white rounded-lg border p-4">
                    <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>在右侧选择平台并填写内容</span>
                    <span>这里将显示真实的平台预览效果</span>
                  </div>
                ) : (
                  selectedPlatforms.map(platform => {
                    const platformName = platformNames[platform] || platform
                    const firstImage = mediaPreviews[0]
                    const allImages = mediaPreviews
                    
                    return (
                      <div key={platform} className="bg-white rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${platformIcons[platform]?.bg || 'bg-gray-50'} ${platformIcons[platform]?.color || 'text-gray-600'}`}>
                            {platformIcons[platform]?.icon || platformName}
                          </span>
                          <span className="text-xs text-gray-400">预览</span>
                        </div>
                        
                        {platform === 'weibo' && (
                          <WeiboPreview 
                            content={pf.content} 
                            images={allImages}
                            username={socialAccounts.find(a => a.platform === 'weibo')?.account_name}
                          />
                        )}
                        
                        {platform === 'bilibili' && (
                          <BilibiliPreview 
                            title={pf.title}
                            content={pf.content}
                            coverImage={firstImage}
                            username={socialAccounts.find(a => a.platform === 'bilibili')?.account_name}
                            category={pf.category}
                          />
                        )}
                        
                        {platform === 'xiaohongshu' && (
                          <XiaohongshuPreview 
                            title={pf.title}
                            content={pf.content}
                            images={allImages}
                            username={socialAccounts.find(a => a.platform === 'xiaohongshu')?.account_name}
                          />
                        )}
                        
                        {platform === 'douyin' && (
                          <DouyinPreview 
                            content={pf.content}
                            coverImage={firstImage}
                            username={socialAccounts.find(a => a.platform === 'douyin')?.account_name}
                          />
                        )}
                        
                        {platform === 'wechat' && (
                          <WechatPreview 
                            title={pf.title}
                            content={pf.content}
                            coverImage={firstImage}
                            username={socialAccounts.find(a => a.platform === 'wechat')?.account_name}
                          />
                        )}
                        
                        {platform === 'zhihu' && (
                          <ZhihuPreview 
                            title={pf.title}
                            content={pf.content}
                            images={allImages}
                            username={socialAccounts.find(a => a.platform === 'zhihu')?.account_name}
                          />
                        )}
                        
                        {platform === 'kuaishou' && (
                          <KuaishouPreview 
                            content={pf.content}
                            coverImage={firstImage}
                            username={socialAccounts.find(a => a.platform === 'kuaishou')?.account_name}
                          />
                        )}
                        
                        {platform === 'toutiao' && (
                          <div className="p-4 text-center text-sm text-gray-400">
                            头条预览（与微博类似）
                            <div className="mt-2 text-xs">{pf.content.slice(0, 100)}...</div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            {/* 右侧：编辑/发布区 */}
            <div className="w-3/5 space-y-3 overflow-y-auto max-h-[520px] pr-1">

            {/* 平台选择（支持多选）- 放在最前面 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">目标平台 *</span>
                <span className="text-xs text-gray-400">已选 {selectedPlatforms.length} 个</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(platformIcons).map(([key, val]) => {
                  const isSelected = selectedPlatforms.includes(key)
                  const account = socialAccounts.find(a => a.platform === key)
                  const hasAccount = !!account
                  const isConnectedAcc = hasAccount && isConnected(account)
                  return (
                    <button 
                      key={key} 
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPlatforms(selectedPlatforms.filter(p => p !== key))
                        } else {
                          setSelectedPlatforms([...selectedPlatforms, key])
                        }
                      }}
                      disabled={!hasAccount}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors relative ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : hasAccount
                            ? 'hover:bg-gray-50 text-gray-600'
                            : 'opacity-40 cursor-not-allowed text-gray-400'
                      }`}
                      title={!hasAccount ? '请先绑定该平台账号' : !isConnectedAcc ? '建议先连接平台' : ''}
                    >
                      {val.icon}
                      {isConnectedAcc && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </button>
                  )
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-xs text-amber-500">请至少选择一个目标平台，选择后编辑区将显示对应平台要求</p>
              )}

            {/* 模板选择 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">内容模板</span>
                <span className="text-xs text-gray-400">可选</span>
              </div>
              <select
                value={selectedTemplate || ''}
                onChange={(e) => {
                  const template = SOCIAL_MEDIA_TEMPLATES.find(t => t.id === e.target.value)
                  if (template) {
                    setPf({ ...pf, content: template.content })
                    setSelectedTemplate(template.id)
                  } else {
                    setSelectedTemplate(null)
                  }
                }}
                className="w-full border rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-white"
              >
                <option value="">无模板（空白内容）</option>
                {SOCIAL_MEDIA_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplate && (
                <p className="text-[10px] text-blue-600">✓ 已应用{selectedTemplate === 'weibo' ? '微博' : '知乎'}模板，可在下方编辑区修改</p>
              )}
            </div>
            </div>

            {/* ===== 根据平台动态渲染编辑字段 ===== */}
            {selectedPlatforms.length > 0 && (
              <>
                {/* 标题 - 根据平台要求显示 */}
                {titleRequired && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {selectedRules.length === 1 ? selectedRules[0].title.label : `标题（必填，${strictTitleLimit}字以内）`}
                    </label>
                    <Input 
                      placeholder={selectedRules.length === 1 ? selectedRules[0].title.label : `标题（${strictTitleLimit}字以内）`} 
                      value={pf.title} 
                      onChange={e => setPf({ ...pf, title: e.target.value.slice(0, strictTitleLimit || undefined)})} 
                    />
                    <div className="flex justify-between mt-1">
                      {titleOverLimit && <p className="text-[10px] text-red-500">标题超出限制 {strictTitleLimit} 字</p>}
                      <span className={`text-[10px] ml-auto ${pf.title.length > strictTitleLimit ? 'text-red-500' : 'text-gray-400'}`}>{pf.title.length}{strictTitleLimit > 0 ? `/${strictTitleLimit}` : ''}</span>
                    </div>
                  </div>
                )}

                {/* 摘要 - 微信公众号必填 */}
                {selectedRules.some(r => r.summary.required) && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {selectedRules.find(r => r.summary.required)?.summary.label || '摘要'}
                    </label>
                    <textarea 
                      placeholder={selectedRules.find(r => r.summary.required)?.summary.label || '请输入摘要'}
                      value={pf.summary} 
                      onChange={e => {
                        const maxLen = selectedRules.find(r => r.summary.maxLength)?.summary.maxLength || 999
                        setPf({ ...pf, summary: e.target.value.slice(0, maxLen) })
                      }}
                      className="w-full min-h-[60px] border rounded-md p-2 text-sm resize-y outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      rows={2}
                    />
                    <span className={`text-[10px] ${pf.summary.length > (selectedRules.find(r => r.summary.maxLength)?.summary.maxLength || 999) ? 'text-red-500' : 'text-gray-400'}`}>
                      {pf.summary.length}/{selectedRules.find(r => r.summary.maxLength)?.summary.maxLength || '无限'}
                    </span>
                  </div>
                )}

                {/* 分区/分类选择 - B站必选 */}
                {anyCategoryRequired && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {selectedRules.find(r => r.category.required)?.category.label || '分类'}
                    </label>
                    <select
                      value={pf.category}
                      onChange={e => setPf({ ...pf, category: e.target.value })}
                      className="w-full border rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-white"
                    >
                      <option value="">请选择{selectedRules.find(r => r.category.required)?.category.label || '分类'}</option>
                      {selectedRules.filter(r => r.category.required).flatMap(r => r.category.options).filter((v, i, a) => a.indexOf(v) === i).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {!pf.category && <p className="text-[10px] text-amber-500 mt-1">所选平台要求选择分类</p>}
                  </div>
                )}

                {/* 标签 - B站必填 */}
                {anyTagsRequired && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {selectedRules.find(r => r.tags.required)?.tags.label || '标签'}
                    </label>
                    <Input
                      placeholder="用逗号分隔多个标签"
                      value={pf.tags}
                      onChange={e => setPf({ ...pf, tags: e.target.value })}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      最多 {selectedRules.find(r => r.tags.required)?.tags.maxCount || 12} 个标签
                    </p>
                  </div>
                )}

                {/* 内容文本区 - 根据平台调整 */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block">
                    {selectedRules.length === 1 
                      ? selectedRules[0].content.label 
                      : `内容（${strictContentLimit < Infinity ? `最严${strictContentLimit}字` : '不限字数'}）`}
                  </label>
                  <textarea 
                    placeholder={selectedRules.length === 1 
                      ? `${selectedRules[0].name}内容...` 
                      : '请输入内容...'}
                    value={pf.content} 
                    onChange={e => setPf({ ...pf, content: e.target.value })}
                    className="w-full min-h-[150px] border rounded-md p-3 text-sm resize-y outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" 
                  />
                  {/* 字数统计 - 按平台分别显示 */}
                  <div className="mt-1 space-y-1">
                    {selectedPlatforms.map(p => {
                      const rule = platformRules[p]
                      if (!rule) return null
                      const exceeded = charCount > rule.content.maxLength
                      return (
                        <div key={p} className={`flex items-center justify-between text-xs ${exceeded ? 'text-red-500' : 'text-gray-400'}`}>
                          <span>{rule.name}</span>
                          <span className={exceeded ? 'font-medium' : ''}>{charCount}/{rule.content.maxLength} 字{exceeded && ' ⚠️'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 媒体上传 - 根据平台提示 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {anyVideoRequired ? '视频上传' : '媒体内容'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {anyVideoRequired 
                        ? '视频必填'
                        : strictImageLimit > 0 
                          ? `图片最多${strictImageLimit}张` 
                          : '图片或视频'}
                    </span>
                  </div>
                  
                  {/* 平台特定提示 */}
                  {anyVideoRequired && !mediaFiles.some(f => f.type.startsWith('video/')) && (
                    <div className="bg-red-50 rounded-lg p-2 text-xs text-red-700">
                      所选平台要求视频必填（如抖音、B站），请上传视频文件
                    </div>
                  )}
                  {anyCoverRequired && mediaFiles.length === 0 && (
                    <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700">
                      所选平台要求封面图必填
                    </div>
                  )}
                  
                  {/* 已上传的媒体预览 */}
                  {mediaPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaPreviews.map((preview, idx) => {
                        const isVideo = mediaFiles[idx]?.type.startsWith('video/')
                        const thumb = mediaThumbnails[idx]
                        return (
                          <div key={idx} className="relative group">
                            {isVideo ? (
                              // 视频：显示缩略图，点击打开全屏预览
                              <div
                                className="w-full h-20 rounded-md bg-gray-800 overflow-hidden relative cursor-pointer"
                                onClick={() => setVideoPreviewUrl(preview)}
                              >
                                {thumb ? (
                                  <img src={thumb} className="w-full h-full object-cover" alt={`视频${idx + 1}`} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <Video className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                {/* 播放按钮覆盖层 */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                                {/* 视频标识 */}
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] flex items-center gap-0.5">
                                  <Video className="w-2.5 h-2.5" /> {formatFileSize(mediaFiles[idx]?.size)}
                                </div>
                              </div>
                            ) : (
                              // 图片：直接显示
                              <div className="relative">
                                <img src={preview} className="w-full h-20 object-cover rounded-md" alt={`媒体${idx + 1}`} />
                              </div>
                            )}
                            {/* 删除按钮 */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveMedia(idx) }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* 上传按钮 */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleMediaSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg p-3 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex flex-col items-center gap-1"
                    disabled={uploadingMedia}
                  >
                    {uploadingMedia ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /><span>上传中...</span></>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>{anyVideoRequired ? '上传视频文件' : '上传图片或视频'}</span>
                        <span className="text-[10px] text-gray-400">
                          {anyVideoRequired 
                            ? '视频必填，建议竖屏9:16'
                            : `图片最多${strictImageLimit || 9}张，支持 JPG/PNG/MP4`}
                        </span>
                      </>
                    )}
                  </button>
                  {strictImageLimit > 0 && mediaFiles.length > strictImageLimit && (
                    <p className="text-[10px] text-red-500">⚠️ 部分平台图片数量超出限制（最严{strictImageLimit}张）</p>
                  )}
                </div>

                {/* 平台发布须知（精简版）*/}
                <details className="bg-blue-50 rounded-lg text-xs">
                  <summary className="p-2 cursor-pointer font-medium text-blue-700">📋 发布须知</summary>
                  <div className="px-3 pb-3 space-y-2">
                    {selectedPlatforms.map(p => {
                      const rule = platformRules[p]
                      if (!rule) return null
                      return (
                        <div key={p} className="space-y-0.5">
                          <p className="font-medium text-blue-700">{rule.name}：</p>
                          <ul className="text-blue-600 space-y-0.5 ml-2">
                            {rule.tips.map((tip, i) => <li key={i}>• {tip}</li>)}
                          </ul>
                        </div>
                      )
                    })}
                    {selectedPlatforms.some(p => platformRules[p]?.sensitiveTips.length > 0) && (
                      <div className="border-t border-blue-200 pt-1 mt-1">
                        <p className="font-medium text-red-600">⚠️ 注意：</p>
                        {[...new Set(selectedPlatforms.flatMap(p => platformRules[p]?.sensitiveTips || []))].map((tip, i) => (
                          <p key={i} className="text-red-600">• {tip}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

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
              </>
            )}
            </div>
          </div>
          {(publishError || publishSuccess) && (
            <div className={`text-xs rounded p-2 ${publishError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {publishError || publishSuccess}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewPost(false); setPublishError(null); setPublishSuccess(null) }}>取消</Button>
            <Button onClick={() => handleCreatePost('draft')} disabled={!pf.content.trim() || selectedPlatforms.length === 0}>保存草稿</Button>
            {scheduleEnabled && scheduledTime ? (
              <Button onClick={() => handleCreatePost('scheduled', new Date(scheduledTime).toISOString())} disabled={!pf.content.trim() || selectedPlatforms.length === 0 || overLimit || titleOverLimit} className="bg-amber-600 hover:bg-amber-700">定时发布</Button>
            ) : (
              <Button onClick={() => handlePublishDirect()} disabled={!pf.content.trim() || selectedPlatforms.length === 0 || overLimit || titleOverLimit || publishingIds.size > 0} className="bg-blue-600 hover:bg-blue-700">
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

      {/* 视频全屏预览模态框 */}
      <Dialog open={!!videoPreviewUrl} onOpenChange={(v) => { if (!v) setVideoPreviewUrl(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-black flex flex-col">
          <div className="flex items-center justify-between p-3 bg-gray-900 shrink-0">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-medium">视频预览</span>
            </div>
            <div className="flex items-center gap-2">
              {videoPreviewUrl && (
                <a
                  href={videoPreviewUrl}
                  download={`video_${Date.now()}.mp4`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载视频
                </a>
              )}
              <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0" onClick={() => setVideoPreviewUrl(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {videoPreviewUrl && (
            <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="max-w-full max-h-[70vh] w-auto h-auto"
                controls
                autoPlay
                playsInline
              />
            </div>
          )}
          <div className="p-3 bg-gray-900 shrink-0 text-center">
            <p className="text-xs text-gray-400">
              上传前预览效果，实际发布时请参考各平台支持的视频格式和大小限制
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
