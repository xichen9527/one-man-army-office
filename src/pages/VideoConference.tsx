import React, { useState, useMemo } from 'react'
import { toast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Video, Plus, Trash2, Users, Clock, Calendar, Copy,
  PhoneOff, Monitor, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useStore } from '@/store'
import type { ConferenceStatus } from '@/types/database'
import { format, parseISO, isFuture } from 'date-fns'
// supabase 不再需要，改为调用本地代理服务器

const statusLabels: Record<ConferenceStatus, { label: string; color: string }> = {
  scheduled: { label: '待开始', color: 'bg-blue-100 text-blue-700' },
  ongoing: { label: '进行中', color: 'bg-green-100 text-green-700' },
  ended: { label: '已结束', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
}

export default function VideoConference() {
  const { conferences, currentUser, addConference, updateConference, deleteConference } = useStore()

  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const clearFeedback = () => { setActionError(null); setActionSuccess(null) }

  const [showNew, setShowNew] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null)

  // New meeting form
  const [nf, setNf] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    max_participants: '10',
    recording_enabled: false,
  })

  // 参会人搜索
  const [participantSearch, setParticipantSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{id: string; email: string; full_name: string}>>([])
  const [selectedParticipants, setSelectedParticipants] = useState<Array<{id: string; email: string; full_name: string}>>([])
  const [searchingParticipants, setSearchingParticipants] = useState(false)

  const searchParticipants = async (query: string) => {
    setParticipantSearch(query)
    if (!query.trim() || query.length < 2) { setSearchResults([]); return }
    setSearchingParticipants(true)
    try {
      const { supabase: sb } = await import('@/db/supabase')
      const { data } = await sb.from('profiles').select('id, email, full_name').or(`email.ilike.%${query}%,full_name.ilike.%${query}%`).limit(10)
      setSearchResults(data || [])
    } catch { setSearchResults([]) }
    finally { setSearchingParticipants(false) }
  }

  const addParticipant = (p: {id: string; email: string; full_name: string}) => {
    if (!selectedParticipants.find(sp => sp.id === p.id)) {
      setSelectedParticipants(prev => [...prev, p])
    }
    setParticipantSearch('')
    setSearchResults([])
  }

  const removeParticipant = (id: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== id))
  }

  // Meeting room state
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenShare, setScreenShare] = useState(false)


  const sortedConferences = useMemo(() =>
    [...conferences].sort((a, b) => {
      const order: Record<ConferenceStatus, number> = { ongoing: 0, scheduled: 1, ended: 2, cancelled: 3 }
      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
    }),
    [conferences])

  const upcoming = sortedConferences.filter(c => c.status === 'scheduled' && c.scheduled_at && isFuture(parseISO(c.scheduled_at)))
  const ongoing = sortedConferences.filter(c => c.status === 'ongoing')
  const past = sortedConferences.filter(c => c.status === 'ended')

  const PROXY_URL = 'http://localhost:3000'
  const isLocalDev = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'

  // 读取用户自主配置的腾讯会议凭证
  const getTencentCreds = (): { app_id: string; secret_key: string } | null => {
    try {
      const all = JSON.parse(localStorage.getItem('third_party_credentials') || '{}')
      const tm = all['tencent-meeting']
      if (tm?.app_id && tm?.secret_key) return { app_id: tm.app_id, secret_key: tm.secret_key }
    } catch { /* ignore */ }
    return null
  }

  // 调用腾讯会议 API 创建会议
  const callTencentMeetingAPI = async (subject: string, startTime: string, endTime: string): Promise<{ meetingNumber: string; joinUrl: string }> => {
    const creds = getTencentCreds()
    if (!creds) return { meetingNumber: '', joinUrl: '' }
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const resp = await fetch(`${supabaseUrl}/functions/v1/tencent-meeting-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_meeting',
          credentials: creds,
          data: { subject, start_time: startTime, end_time: endTime, timezone: 'Asia/Shanghai' },
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (resp.ok) {
        const result = await resp.json()
        return {
          meetingNumber: result.meeting_number || result.meetingNumber || '',
          joinUrl: result.join_url || result.joinUrl || '',
        }
      }
    } catch { /* Edge Function unavailable */ }
    return { meetingNumber: '', joinUrl: '' }
  }

  const handleCreate = async () => {
    if (!nf.title.trim()) return
    clearFeedback()
    let meetingNumber = ''
    let joinUrl = ''

    try {
      const result = await callTencentMeetingAPI(
        nf.title,
        nf.scheduled_at ? new Date(nf.scheduled_at).toISOString() : new Date().toISOString(),
        nf.scheduled_at ? new Date(new Date(nf.scheduled_at).getTime() + 3600000).toISOString() : new Date(Date.now() + 3600000).toISOString()
      )
      meetingNumber = result.meetingNumber
      joinUrl = result.joinUrl
    } catch { /* API unavailable, use local mode */ }

    try {
      const newConf = {
        title: nf.title,
        description: nf.description,
        host_id: currentUser.id,
        scheduled_at: nf.scheduled_at || new Date().toISOString(),
        started_at: null,
        ended_at: null,
        duration: null,
        status: 'scheduled' as const,
        max_participants: parseInt(nf.max_participants) || 10,
        participants: [currentUser.id, ...selectedParticipants.map(p => p.id)],
        recording_enabled: nf.recording_enabled,
        recording_url: null,
        settings: {},
        meeting_number: meetingNumber || `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        join_url: joinUrl,
      }

      await addConference(newConf)

      setShowNew(false)
      setNf({ title: '', description: '', scheduled_at: '', max_participants: '10', recording_enabled: false })
      setSelectedParticipants([])
      setParticipantSearch('')
      setActionSuccess(`会议「${nf.title}」创建成功！${meetingNumber ? ` 会议号: ${meetingNumber}` : ''}`)
    } catch (err: any) {
      setActionError('创建会议失败: ' + (err?.message || '请重试'))
    }
  }

  const handleStartMeeting = async (confId: string) => {
    clearFeedback()
    try {
      await updateConference(confId, {
        status: 'ongoing',
        started_at: new Date().toISOString(),
      })
      setActiveMeeting(confId)
      setShowMeeting(true)
      const conf = conferences.find(c => c.id === confId)
      if (conf?.join_url) window.open(conf.join_url, '_blank')
    } catch (err: any) {
      setActionError('开始会议失败: ' + (err?.message || '请重试'))
    }
  }

  const handleEndMeeting = async () => {
    if (!activeMeeting) return
    clearFeedback()
    try {
      const conf = conferences.find(c => c.id === activeMeeting)
      if (conf?.started_at) {
        const duration = Math.round((new Date().getTime() - parseISO(conf.started_at).getTime()) / 60000)
        await updateConference(activeMeeting, {
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration,
          settings: { ...conf.settings, last_mic_state: micOn, last_cam_state: camOn, last_screen_share_state: screenShare },
        })
      }
    } catch (err: any) {
      setActionError('结束会议失败: ' + (err?.message || '请重试'))
    }
    setShowMeeting(false)
    setActiveMeeting(null)
    setMicOn(true)
    setCamOn(true)
    setScreenShare(false)
  }

  const handleQuickMeeting = async () => {
    clearFeedback()
    let meetingNumber = ''
    let joinUrl = ''

    try {
      const result = await callTencentMeetingAPI(
        '快速会议',
        new Date().toISOString(),
        new Date(Date.now() + 3600000).toISOString()
      )
      meetingNumber = result.meetingNumber
      joinUrl = result.joinUrl
    } catch { /* API unavailable */ }

    try {
      await addConference({
        title: '快速会议',
        description: '',
        host_id: currentUser.id,
        scheduled_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        ended_at: null,
        duration: null,
        status: 'ongoing',
        max_participants: 10,
        participants: [currentUser.id],
        recording_enabled: false,
        recording_url: null,
        settings: {},
        meeting_number: meetingNumber || `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        join_url: joinUrl,
      })
      setActionSuccess('快速会议已创建！')
    } catch (err: any) {
      setActionError('创建快速会议失败: ' + (err?.message || '请重试'))
    }
  }

  const meetingConf = conferences.find(c => c.id === activeMeeting)

  // 会议操作按钮逻辑
  const toggleMic = () => {
    setMicOn(!micOn)
  }

  const toggleCam = () => {
    setCamOn(!camOn)
  }

  const toggleScreenShare = async () => {
    if (!screenShare) {
      try {
        await navigator.mediaDevices.getDisplayMedia({ video: true })
        setScreenShare(true)
      } catch (err) {
        toast('屏幕共享失败', 'error')
      }
    } else {
      setScreenShare(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={handleQuickMeeting} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Video className="w-4 h-4 mr-2" />快速开会
          </Button>
          <Button variant="outline" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1" />预约会议
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Video className="w-4 h-4 text-green-500" />进行中: {ongoing.length}</span>
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-500" />待开始: {upcoming.length}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" />已结束: {past.length}</span>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        {actionError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
            <button onClick={clearFeedback} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}
        {actionSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
            <button onClick={clearFeedback} className="ml-auto text-green-400 hover:text-green-600">×</button>
          </div>
        )}
        <TabsList>
          <TabsTrigger value="upcoming">即将开始 ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="ongoing">进行中 ({ongoing.length})</TabsTrigger>
          <TabsTrigger value="past">历史会议 ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400"><Video className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>暂无即将开始的会议</p><p className="text-xs mt-1">点击"快速开会"或"预约会议"创建</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(conf => (
                <Card key={conf.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Video className="w-5 h-5 text-blue-600" /></div>
                        <CardTitle className="text-sm">{conf.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={statusLabels[conf.status].color}>{statusLabels[conf.status].label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {conf.description && <p className="text-xs text-gray-500 mb-2">{conf.description}</p>}
                    <div className="space-y-1 text-xs text-gray-500">
                      <p className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{conf.scheduled_at ? format(parseISO(conf.scheduled_at), 'yyyy年M月d日 HH:mm') : '待定'}</p>
                      <p className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{conf.participants.length}/{conf.max_participants} 人</p>
                      {conf.recording_enabled && <p className="flex items-center gap-1 text-blue-500">🔴 将录制</p>}
                      {conf.meeting_number && <p className="flex items-center gap-1 text-green-600 font-mono">📹 会议号: {conf.meeting_number}</p>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {conf.join_url ? (
                        <>
                          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => window.open(conf.join_url, '_blank')}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />加入会议
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(conf.meeting_number || ''); toast('会议号已复制', 'success') }}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="flex-1" onClick={() => handleStartMeeting(conf.id)}>
                          <Video className="w-3.5 h-3.5 mr-1" />开始会议
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => deleteConference(conf.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ongoing">
          {ongoing.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400"><p>暂无进行中的会议</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {ongoing.map(conf => (
                <Card key={conf.id} className="border-green-200 bg-green-50/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <CardTitle className="text-sm">{conf.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={statusLabels[conf.status].color}>{statusLabels[conf.status].label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      开始于 {conf.started_at ? format(parseISO(conf.started_at), 'HH:mm') : '-'}
                      {conf.participants.length > 0 && ` · ${conf.participants.length} 人参加`}
                    </p>
                    {conf.meeting_number && (
                      <p className="text-xs text-green-600 font-mono mt-1">会议号: {conf.meeting_number}</p>
                    )}
                    {conf.join_url ? (
                      <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => window.open(conf.join_url, '_blank')}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />加入会议
                      </Button>
                    ) : (
                      <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => { setActiveMeeting(conf.id); setShowMeeting(true) }}>
                        <Video className="w-3.5 h-3.5 mr-1" />加入
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {past.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400"><p>暂无历史会议</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="p-3 font-medium">会议名称</th>
                      <th className="p-3 font-medium">时间</th>
                      <th className="p-3 font-medium">时长</th>
                      <th className="p-3 font-medium">参与人</th>
                      <th className="p-3 font-medium">录制</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {past.map(conf => (
                      <tr key={conf.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{conf.title}</td>
                        <td className="p-3 text-gray-500">
                          {conf.scheduled_at ? format(parseISO(conf.scheduled_at), 'M/d HH:mm') : '-'}
                        </td>
                        <td className="p-3 text-gray-500">{conf.duration ? `${conf.duration}分钟` : '-'}</td>
                        <td className="p-3 text-gray-500">{conf.participants.length}人</td>
                        <td className="p-3">
                          {conf.recording_url ? (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-xs">可回放</Badge>
                          ) : conf.recording_enabled ? (
                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-600 text-xs">处理中</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">未录制</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New meeting dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>预约会议</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="会议主题 *" value={nf.title} onChange={e => setNf({ ...nf, title: e.target.value })} />
            <Input placeholder="会议描述" value={nf.description} onChange={e => setNf({ ...nf, description: e.target.value })} />
            <Input type="datetime-local" value={nf.scheduled_at} onChange={e => setNf({ ...nf, scheduled_at: e.target.value })} />
            <Input type="number" placeholder="最大参与人数" value={nf.max_participants} onChange={e => setNf({ ...nf, max_participants: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={nf.recording_enabled} onCheckedChange={v => setNf({ ...nf, recording_enabled: v })} />
              开启会议录制
            </label>
            {/* 参会人搜索 - 修复：确保参会人保存到数据库 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">添加参会人</label>
              <div className="relative">
                <Input 
                  placeholder="搜索邮箱或姓名..." 
                  value={participantSearch} 
                  onChange={e => searchParticipants(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      e.preventDefault()
                      addParticipant(searchResults[0])
                    }
                  }}
                />
                {searchingParticipants && <div className="absolute right-2 top-2.5"><svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2" onClick={() => addParticipant(p)}>
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{p.full_name || p.email}</span>
                        {p.email && <span className="text-xs text-gray-400 ml-auto">{p.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedParticipants.map(p => (
                    <Badge key={p.id} variant="secondary" className="gap-1">
                      {p.full_name || p.email}
                      <button type="button" onClick={() => removeParticipant(p.id)} className="ml-0.5 hover:text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setSelectedParticipants([]); setParticipantSearch('') }}>取消</Button>
            <Button onClick={handleCreate} disabled={!nf.title.trim()}>创建会议</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting room dialog */}
      {meetingConf && (
      <Dialog open={showMeeting} onOpenChange={(open) => { if (!open) handleEndMeeting() }}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          {/* Video area */}
          <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
            {camOn ? (
              <div className="text-center text-white">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-4xl font-bold mx-auto mb-3">
                  {currentUser?.full_name?.[0] || 'U'}
                </div>
                <p className="text-lg font-medium">{currentUser?.full_name || '用户'}</p>
                <p className="text-sm text-gray-400 mt-1">{meetingConf?.title || '会议中'}</p>
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-12 h-12 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400">摄像头已关闭</p>
              </div>
            )}
            
            {/* 屏幕共享显示区域 */}
            {screenShare && (
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                <div className="text-white text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-3 text-blue-400" />
                  <p>正在共享屏幕...</p>
                </div>
              </div>
            )}
            
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {meetingConf?.meeting_number || '会议中'} · {meetingConf?.participants.length || 1}人
            </div>
            
            {/* 会议状态指示器 */}
            <div className="absolute top-3 right-3 flex gap-2">
              {micOn && <Badge variant="secondary" className="bg-green-500/80 text-white text-xs">🎤 麦克风开启</Badge>}
              {camOn && <Badge variant="secondary" className="bg-blue-500/80 text-white text-xs">📹 摄像头开启</Badge>}
              {screenShare && <Badge variant="secondary" className="bg-purple-500/80 text-white text-xs">🖥️ 共享中</Badge>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 border-t">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-full ${micOn ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-100 hover:bg-red-200 text-red-600'} transition-colors`}
              title={micOn ? '关闭麦克风' : '开启麦克风'}
            >
              {micOn ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M12 19v3"/></svg>
              )}
            </button>
            
            <button
              onClick={toggleCam}
              className={`p-3 rounded-full ${camOn ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-100 hover:bg-red-200 text-red-600'} transition-colors`}
              title={camOn ? '关闭摄像头' : '开启摄像头'}
            >
              <Video className={`w-5 h-5 ${!camOn ? 'opacity-50' : ''}`} />
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full ${screenShare ? 'bg-blue-100 hover:bg-blue-200 text-blue-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
              title={screenShare ? '停止共享' : '共享屏幕'}
            >
              <Monitor className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {
                toast('添加参会人功能：可以在这里集成邀请链接或搜索功能', 'info')
              }}
              className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              title="添加参会人"
            >
              <Users className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleEndMeeting} 
              className="p-3 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-sm font-medium">离开会议</span>
            </button>
          </div>
          
          {/* 会议信息栏 */}
          <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-600 flex items-center justify-between">
            <span>会议号: {meetingConf?.meeting_number}</span>
            <span>开始时间: {meetingConf?.started_at ? format(parseISO(meetingConf.started_at), 'HH:mm:ss') : '-'}</span>
            {meetingConf?.join_url && (
              <a 
                href={meetingConf.join_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                在浏览器中打开
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}
