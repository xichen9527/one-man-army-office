import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import {
  Video, Plus, Trash2, Users, Clock, Calendar, Copy, Link2,
  PhoneOff, Monitor, Settings, CheckCircle2, AlertCircle, Mic, MicOff,
  VideoOff, ScreenShare, MessageSquare, Loader2
} from 'lucide-react'
import { useStore } from '@/store'
import type { ConferenceStatus } from '@/types/database'
import { format, parseISO, isFuture, addMinutes } from 'date-fns'
import { supabase } from '@/db/supabase'

// LiveKit Components
import {
  LiveKitRoom,
  VideoConference as LiveKitVideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  useRoomContext,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track, RoomEvent, Participant } from 'livekit-client'

const statusLabels: Record<ConferenceStatus, { label: string; color: string }> = {
  scheduled: { label: '待开始', color: 'bg-blue-100 text-blue-700' },
  ongoing: { label: '进行中', color: 'bg-green-100 text-green-700' },
  ended: { label: '已结束', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
}

// LiveKit 配置存储 key
const LIVEKIT_CONFIG_KEY = 'livekit_config'

interface LiveKitConfig {
  url: string      // 如: https://your-project.livekit.cloud
  apiKey: string
  apiSecret: string
}

// 生成随机房间名
function generateRoomName(): string {
  return `meeting-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// 会议中的 LiveKit 组件
function MeetingRoom({ onLeave }: { onLeave: () => void }) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { only: ['camera', 'microphone'] })

  return (
    <div className="flex flex-col h-full">
      {/* 视频网格 */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        <GridLayout tracks={tracks} className="h-full">
          <ParticipantTile className="w-full h-full" />
        </GridLayout>
      </div>

      {/* 控制栏 */}
      <div className="mt-4 flex justify-center">
        <ControlBar
          controls={{
            camera: true,
            microphone: true,
            screenShare: true,
            leave: true,
          }}
          onDeviceFailure={(error) => {
            console.error('Device failure:', error)
            toast({ title: '设备错误', description: error.message, variant: 'destructive' })
          }}
        />
      </div>
    </div>
  )
}

export default function VideoConference() {
  const { conferences, members, currentUser, addConference, updateConference, deleteConference } = useStore()

  const [showNew, setShowNew] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  // 新会议表单
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    scheduledAt: '',
    duration: 60,
    participantCount: 5,
  })

  // 加入会议
  const [joinRoomName, setJoinRoomName] = useState('')

  // LiveKit 状态
  const [liveKitConfig, setLiveKitConfig] = useState<LiveKitConfig>(() => {
    try {
      const saved = localStorage.getItem(LIVEKIT_CONFIG_KEY)
      return saved ? JSON.parse(saved) : { url: '', apiKey: '', apiSecret: '' }
    } catch { return { url: '', apiKey: '', apiSecret: '' } }
  })
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null)
  const [activeRoomName, setActiveRoomName] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // 加载配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIVEKIT_CONFIG_KEY)
      if (saved) setLiveKitConfig(JSON.parse(saved))
    } catch {}
  }, [])

  // 保存配置
  const saveConfig = () => {
    if (!liveKitConfig.url || !liveKitConfig.apiKey || !liveKitConfig.apiSecret) {
      toast({ title: '请填写完整配置', variant: 'destructive' })
      return
    }
    localStorage.setItem(LIVEKIT_CONFIG_KEY, JSON.stringify(liveKitConfig))
    toast({ title: 'LiveKit 配置已保存' })
    setShowApiConfig(false)
  }

  // 获取 LiveKit Token
  const getToken = async (roomName: string, action: 'join' | 'create'): Promise<{ token: string; url: string } | null> => {
    try {
      // 从 localStorage 读取 LiveKit 配置，传给 Edge Function 以绕过数据库依赖
      const savedConfig = localStorage.getItem(LIVEKIT_CONFIG_KEY)
      let clientConfig = {}
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig)
          if (parsed.url && parsed.apiKey && parsed.apiSecret) {
            clientConfig = {
              serverUrl: parsed.url,
              apiKey: parsed.apiKey,
              apiSecret: parsed.apiSecret,
            }
          }
        } catch {}
      }

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, action, ...clientConfig },
      })

      if (error) throw error
      // 检查返回的错误码
      if (data?.error) {
        const err = data as { error: string; code?: string; message?: string }
        if (err.code === 'CONFIG_NOT_FOUND') {
          toast({
            title: 'LiveKit 未配置',
            description: '请前往 设置 → 视频会议 配置 LiveKit Cloud 凭证',
            variant: 'destructive'
          })
        } else if (err.code === 'CONFIG_INCOMPLETE') {
          toast({
            title: 'LiveKit 配置不完整',
            description: '请检查 API Key、API Secret 和 Server URL 是否都已填写',
            variant: 'destructive'
          })
        } else if (err.error?.includes('401') || err.error?.toLowerCase().includes('unauthorized')) {
          toast({
            title: 'LiveKit 凭证无效（401）',
            description: '请检查 Settings → 视频会议 中的 LiveKit API Key 和 API Secret 是否正确',
            variant: 'destructive'
          })
        } else {
          toast({
            title: '获取会议 Token 失败',
            description: err.message || err.error || '请检查 LiveKit 配置',
            variant: 'destructive'
          })
        }
        return null
      }
      return data
    } catch (error: any) {
      console.error('Failed to get LiveKit token:', error)
      // 特殊处理 401 错误
      const errMsg = error?.message || ''
      if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized')) {
        toast({
          title: 'LiveKit 凭证无效（401）',
          description: '请检查 Settings → 视频会议 中的 LiveKit API Key 和 API Secret',
          variant: 'destructive'
        })
      } else if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('NetworkError')) {
        toast({
          title: '无法连接 LiveKit 服务器',
          description: '请检查 Server URL 是否正确（需包含 https:// 前缀）',
          variant: 'destructive'
        })
      } else {
        toast({
          title: '获取会议 Token 失败',
          description: error?.message || '请检查 LiveKit 配置',
          variant: 'destructive'
        })
      }
      return null
    }
  }

  // 快速会议
  const handleQuickMeeting = async () => {
    if (!liveKitConfig.url) {
      toast({ title: '请先配置 LiveKit', variant: 'destructive' })
      setShowApiConfig(true)
      return
    }

    setConnecting(true)
    const roomName = generateRoomName()
    const result = await getToken(roomName, 'create')

    if (result) {
      setLiveKitToken(result.token)
      setActiveRoomName(roomName)

      // 保存到数据库
      addConference({
        title: `快速会议 ${format(new Date(), 'HH:mm')}`,
        scheduled_at: new Date().toISOString(),
        duration: 60,
        status: 'ongoing',
        participants: [],
      })
    }
    setConnecting(false)
  }

  // 预约会议
  const handleScheduleMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduledAt) {
      toast({ title: '请填写完整信息', variant: 'destructive' })
      return
    }

    const roomName = generateRoomName()
    addConference({
      title: newMeeting.title,
      scheduled_at: newMeeting.scheduledAt,
      duration: newMeeting.duration,
      status: 'scheduled',
      participants: [],
    })

    toast({ title: '会议已预约' })
    setShowNew(false)
    setNewMeeting({ title: '', scheduledAt: '', duration: 60, participantCount: 5 })
  }

  // 加入会议
  const handleJoinMeeting = async () => {
    if (!joinRoomName.trim()) {
      toast({ title: '请输入会议号', variant: 'destructive' })
      return
    }

    setConnecting(true)
    const result = await getToken(joinRoomName.trim(), 'join')

    if (result) {
      setLiveKitToken(result.token)
      setActiveRoomName(joinRoomName.trim())
    }
    setConnecting(false)
    setShowJoin(false)
  }

  // 从列表加入
  const handleJoinFromList = async (roomName: string) => {
    setConnecting(true)
    const result = await getToken(roomName, 'join')

    if (result) {
      setLiveKitToken(result.token)
      setActiveRoomName(roomName)
    }
    setConnecting(false)
  }

  // 离开会议
  const handleLeaveMeeting = () => {
    setLiveKitToken(null)
    setActiveRoomName(null)
    toast({ title: '已离开会议' })
  }

  // 复制会议链接
  const copyMeetingLink = (roomName: string) => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomName}`
    navigator.clipboard.writeText(link)
    toast({ title: '会议链接已复制' })
  }

  // 删除会议
  const handleDelete = (id: string) => {
    deleteConference(id)
    toast({ title: '会议已删除' })
  }

  // 如果正在会议中，显示 LiveKit 房间
  if (liveKitToken && activeRoomName) {
    return (
      <div className="p-4 h-[calc(100vh-2rem)]">
        <LiveKitRoom
          token={liveKitToken}
          serverUrl={liveKitConfig.url}
          connect={true}
          onDisconnected={handleLeaveMeeting}
          className="h-full"
        >
          <MeetingRoom onLeave={handleLeaveMeeting} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    )
  }

  // 正常页面
  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-7 h-7 text-blue-500" />
            视频会议
          </h1>
          <p className="text-gray-500 text-sm mt-1">基于 LiveKit Cloud 的应用内视频会议</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
            <Settings className="w-4 h-4 mr-1" />
            LiveKit 配置
          </Button>
          {!liveKitConfig.url && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              未配置
            </Badge>
          )}
        </div>
      </div>

      {/* 快速操作卡片 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            {/* 快速会议 */}
            <Button
              className="h-20 flex flex-col gap-1 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              onClick={handleQuickMeeting}
              disabled={connecting || !liveKitConfig.url}
            >
              <Video className="w-6 h-6" />
              <span className="text-sm font-medium">快速会议</span>
            </Button>

            {/* 预约会议 */}
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-1 border-2"
              onClick={() => setShowNew(true)}
              disabled={!liveKitConfig.url}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-sm font-medium">预约会议</span>
            </Button>

            {/* 加入会议 */}
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-1 border-2"
              onClick={() => setShowJoin(true)}
              disabled={!liveKitConfig.url}
            >
              <Link2 className="w-6 h-6" />
              <span className="text-sm font-medium">加入会议</span>
            </Button>
          </div>

          {!liveKitConfig.url && (
            <p className="text-center text-amber-600 text-sm mt-4">
              请先点击右上角「LiveKit 配置」按钮，填写您的 LiveKit Cloud 信息
            </p>
          )}
        </CardContent>
      </Card>

      {/* 会议列表 */}
      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">待开始</TabsTrigger>
          <TabsTrigger value="history">历史会议</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-3 mt-4">
          {conferences.filter(c => c.status === 'scheduled' || c.status === 'ongoing').map(conf => (
            <Card key={conf.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{conf.title}</h3>
                    <Badge className={statusLabels[conf.status].color}>
                      {statusLabels[conf.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(conf.scheduled_at), 'MM-dd HH:mm')}
                    </span>
                    <span>{conf.duration} 分钟</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {conf.participants?.length || 0} 人
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleJoinFromList(conf.room_name)}
                    disabled={connecting}
                  >
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : '加入'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyMeetingLink(conf.room_name)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(conf.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {conferences.filter(c => c.status === 'scheduled' || c.status === 'ongoing').length === 0 && (
            <p className="text-center text-gray-400 py-8">暂无待开始的会议</p>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {conferences.filter(c => c.status === 'ended' || c.status === 'cancelled').map(conf => (
            <Card key={conf.id} className="opacity-60">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{conf.title}</h3>
                    <Badge className={statusLabels[conf.status].color}>
                      {statusLabels[conf.status].label}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {format(parseISO(conf.scheduled_at), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* 预约会议对话框 */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预约会议</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>会议主题</Label>
              <Input
                value={newMeeting.title}
                onChange={e => setNewMeeting(m => ({ ...m, title: e.target.value }))}
                placeholder="如：项目周会"
              />
            </div>
            <div>
              <Label>开始时间</Label>
              <Input
                type="datetime-local"
                value={newMeeting.scheduledAt}
                onChange={e => setNewMeeting(m => ({ ...m, scheduledAt: e.target.value }))}
              />
            </div>
            <div>
              <Label>时长（分钟）</Label>
              <Input
                type="number"
                value={newMeeting.duration}
                onChange={e => setNewMeeting(m => ({ ...m, duration: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>取消</Button>
            <Button onClick={handleScheduleMeeting}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 加入会议对话框 */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>加入会议</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>会议号</Label>
              <Input
                value={joinRoomName}
                onChange={e => setJoinRoomName(e.target.value)}
                placeholder="输入会议号或粘贴会议链接"
              />
            </div>
            <p className="text-xs text-gray-400">会议号格式：meeting-xxxx-xxxx</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoin(false)}>取消</Button>
            <Button onClick={handleJoinMeeting} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LiveKit 配置对话框 */}
      <Dialog open={showApiConfig} onOpenChange={setShowApiConfig}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>LiveKit Cloud 配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800 mb-1">如何获取配置？</p>
              <ol className="list-decimal list-inside text-blue-600 space-y-1">
                <li>访问 <a href="https://cloud.livekit.io" target="_blank" className="underline">cloud.livekit.io</a> 注册账号</li>
                <li>创建项目，复制 Project URL</li>
                <li>在 Settings → API Keys 创建新的 API Key</li>
                <li>将 URL、Key、Secret 填入下方</li>
              </ol>
              <p className="text-blue-500 text-xs mt-2">免费额度：10,000 分钟/月</p>
            </div>
            <div>
              <Label>Server URL *</Label>
              <Input
                value={liveKitConfig.url}
                onChange={e => setLiveKitConfig(c => ({ ...c, url: e.target.value }))}
                placeholder="https://your-project.livekit.cloud"
              />
            </div>
            <div>
              <Label>API Key *</Label>
              <Input
                value={liveKitConfig.apiKey}
                onChange={e => setLiveKitConfig(c => ({ ...c, apiKey: e.target.value }))}
                placeholder="APIxxxxxx"
              />
            </div>
            <div>
              <Label>API Secret *</Label>
              <Input
                type="password"
                value={liveKitConfig.apiSecret}
                onChange={e => setLiveKitConfig(c => ({ ...c, apiSecret: e.target.value }))}
                placeholder="xxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiConfig(false)}>取消</Button>
            <Button onClick={saveConfig}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
