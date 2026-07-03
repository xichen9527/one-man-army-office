import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare, Hash, Lock, Plus, Send, Users, UserPlus, Search,
  Trash2, Mail, Crown, Shield, UserCheck, ListTodo, FolderOpen, Edit3, X,
  MoreVertical, Reply, Paperclip, Download, File, FileText, Image, FileIcon,
  ClipboardCheck, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { supabase } from '@/db/supabase'
import { toast } from '@/components/ui/toast'
import { format, parseISO, differenceInMinutes, isToday, isYesterday } from 'date-fns'
import type { ApprovalStatus } from '@/types/database'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const roleLabels: Record<string, string> = { admin: '管理员', manager: '经理', member: '成员' }

export default function Collaboration() {
  const {
    currentUser, channels, messages, activeChannel, setActiveChannel, sendMessage, sendFileMessage,
    createChannel, updateChannel, deleteChannel, members, addMember, removeMember, tasks, projects,
    documents, files, fetchDocuments, fetchFiles,
    updateMessage, deleteMessage, addNotification,
    approvals, fetchApprovals, approveRequest, rejectRequest,
  } = useStore()

  const [msgInput, setMsgInput] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [newChannelPrivate, setNewChannelPrivate] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [memberPanel, setMemberPanel] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Document/File viewer state
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null)
  const [viewingFile, setViewingFile] = useState<DBFile | null>(null)

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const mentionRef = useRef<HTMLDivElement>(null)

  // Approval filter state
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | 'all'>('pending')

  // editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Reply state
  const [replyToMsg, setReplyToMsg] = useState<{ id: string; content: string; senderName: string } | null>(null)
  const [expandedReply, setExpandedReply] = useState<string | null>(null)

  // Channel name validation state
  const [channelNameError, setChannelNameError] = useState('')

  const navigate = useNavigate()

  const handleFileClick = (file) => {
    const { data, error } = supabase.storage.from('files').getPublicUrl(file.file_path)
    if (error) {
      toast({ title: '无法打开文件', description: error.message, variant: 'destructive' })
    } else if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank')
    } else {
      toast({ title: '无法打开文件', description: '文件URL获取失败', variant: 'destructive' })
    }
  }

  // Play beep sound for new messages
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (e) {
      console.warn('Failed to play beep:', e)
    }
  }, [])

  // Channel menu state
  const [editChannelId, setEditChannelId] = useState<string | null>(null)
  const [editChannelName, setEditChannelName] = useState('')
  const [editChannelDesc, setEditChannelDesc] = useState('')
  const [deleteChannelConfirmId, setDeleteChannelConfirmId] = useState<string | null>(null)

  // File upload state
  const [uploading, setUploading] = useState(false)

  const currentMessages = messages[activeChannel] || []

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [currentMessages.length])

  // ========== New message notification (beep + title) ==========
  // Realtime subscription is handled by store.subscribeToMessages
  // Here we only detect new messages from OTHER users and play beep / update title
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const count = currentMessages.length
    if (count > prevMsgCountRef.current && count > 0) {
      const lastMsg = currentMessages[count - 1]
      if (lastMsg && lastMsg.sender_id !== currentUser?.id) {
        playBeep()
        if (!document.hasFocus()) {
          const prevTitle = document.title
          document.title = '(1) 新消息 - 一人成军'
          const restore = () => { document.title = prevTitle; window.removeEventListener('focus', restore) }
          window.addEventListener('focus', restore, { once: true })
        }
      }
    }
    prevMsgCountRef.current = count
  }, [currentMessages, currentUser?.id])

  // ========== @mention ==========
  const filteredMembers = mentionQuery
    ? members.filter(m => m.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : members.slice(0, 5)

  const handleMsgInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMsgInput(val)
    const cursor = e.target.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)
    const atIdx = textBefore.lastIndexOf('@')
    if (atIdx !== -1) {
      const query = textBefore.slice(atIdx + 1)
      if (!query.includes(' ') && query.length < 20) {
        setMentionQuery(query)
        setMentionOpen(true)
        // compute dropdown position
        if (msgInputRef.current) {
          const rect = msgInputRef.current.getBoundingClientRect()
          setMentionPosition({ top: rect.top - 180, left: rect.left + 16 })
        }
        return
      }
    }
    setMentionOpen(false)
  }

  const insertMention = (name: string) => {
    const cursor = msgInputRef.current?.selectionStart ?? msgInput.length
    const textBefore = msgInput.slice(0, cursor)
    const atIdx = textBefore.lastIndexOf('@')
    const newVal = msgInput.slice(0, atIdx) + '@' + name + ' ' + msgInput.slice(cursor)
    setMsgInput(newVal)
    setMentionOpen(false)
    msgInputRef.current?.focus()
  }

  const handleSend = async () => {
    if (!msgInput.trim() || !activeChannel || !currentUser) return
    const userId = currentUser.id
    const userName = currentUser?.full_name || currentUser?.username || '匿名用户'
    const content = msgInput.trim()
    try {
      await sendMessage(activeChannel, content, userId, userName, replyToMsg?.id || null)
      setMsgInput('')
      setReplyToMsg(null)
      msgInputRef.current?.focus()
    } catch (err: any) {
      toast({ title: '发送失败', description: err?.message || '未知错误', variant: 'destructive' })
      return
    }

    // Notify mentioned users (fire-and-forget, don't block)
    const mentionMatches = content.match(/@([^\s@]+)/g) || []
    for (const match of mentionMatches) {
      const name = match.slice(1)
      const mentioned = members.find(m => m.full_name === name || m.full_name.startsWith(name))
      if (mentioned && mentioned.id !== currentUser?.id) {
        try { await addNotification(mentioned.id, '你被提及了', `${userName} 在频道中提及了你`, 'mention') } catch { /* swallow */ }
      }
    }
  }

  const handleEditStart = (msgId: string, content: string, createdAt: string) => {
    const mins = differenceInMinutes(new Date(), parseISO(createdAt))
    if (mins > 15) { toast({ title: '无法编辑', description: '消息已超过15分钟', variant: 'destructive' }); return }
    setEditingMsgId(msgId)
    setEditingContent(content)
  }

  const handleEditSave = async () => {
    if (!editingMsgId || !activeChannel) return
    try {
      await updateMessage(editingMsgId, activeChannel, { content: editingContent })
      setEditingMsgId(null)
      setEditingContent('')
    } catch (err: any) {
      toast({ title: '编辑失败', description: err?.message || '未知错误', variant: 'destructive' })
    }
  }

  const handleDeleteMsg = async (msgId: string) => {
    if (!activeChannel) return
    try {
      await deleteMessage(msgId, activeChannel)
    } catch (err: any) {
      toast({ title: '删除失败', description: err?.message || '未知错误', variant: 'destructive' })
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    if (!inviteEmail.includes('@')) {
      setInviteResult({ ok: false, msg: '请输入有效的邮箱地址' })
      return
    }
    setInviteSending(true)
    setInviteResult(null)
    try {
      await addMember(inviteEmail, inviteRole as TeamMember['role'])
      setInviteResult({ ok: true, msg: `邀请邮件已发送到 ${inviteEmail}` })
      setTimeout(() => {
        setShowInvite(false)
        setInviteEmail('')
        setInviteResult(null)
      }, 2000)
    } catch (error: any) {
      const errorMsg = error?.message || '邀请失败，请重试'
      setInviteResult({ ok: false, msg: errorMsg })
      toast({ title: '邀请失败', description: errorMsg, variant: 'destructive' })
    } finally {
      setInviteSending(false)
    }
  }

  // ========== File Upload ==========
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChannel) return

    setUploading(true)
    try {
      const userId = currentUser?.id || 'anonymous'
      const ext = file.name.split('.').pop() || ''
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        toast({ title: '文件上传失败', description: uploadError.message, variant: 'destructive' })
        return
      }

      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
      const fileUrl = urlData.publicUrl
      const userName = currentUser?.full_name || currentUser?.username || '匿名用户'

      await sendFileMessage(activeChannel, fileUrl, file.name, userId, userName, replyToMsg?.id || null)
      setReplyToMsg(null)
    } catch (err) {
      toast({ title: '文件上传失败', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ========== Time formatting ==========
  const formatMessageTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return `昨天 ${format(date, 'HH:mm')}`
    } else {
      return format(date, 'MM-dd HH:mm')
    }
  }

  // ========== Render message with @mention highlights ==========
  const renderContent = (content: string, senderId: string) => {
    const parts = content.split(/(@[^\s@]+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1)
        const isMentioned = members.some(m => m.full_name === name)
        return (
          <span key={i} className={isMentioned ? 'bg-blue-100 text-blue-700 rounded px-0.5 font-medium' : 'text-gray-600'}>
            @{name}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Crown className="w-3 h-3 text-yellow-500" />,
    manager: <Shield className="w-3 h-3 text-blue-500" />,
    member: <UserCheck className="w-3 h-3 text-gray-400" />,
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    todo: { label: '待办', color: 'bg-gray-100 text-gray-700' },
    in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
    review: { label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  }

  const isMyMessage = (msg: any) => msg.sender_id === currentUser?.id

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) {
      return <Image className="w-5 h-5 text-purple-500" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-red-500" />
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-blue-600" />
    }
    if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-green-600" />
    }
    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals" className="gap-1.5"><ClipboardCheck className="w-4 h-4" />审批中心</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="w-4 h-4" />即时聊天</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="w-4 h-4" />成员管理</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="w-4 h-4" />协同任务</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FileText className="w-4 h-4" />项目文件</TabsTrigger>
        </TabsList>

        {/* ========== Approval Center ========== */}
        <TabsContent value="approvals" className="mt-0">
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                <Button
                  key={f}
                  variant={approvalFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setApprovalFilter(f)}
                  className="text-xs"
                >
                  {f === 'pending' && <Clock className="w-3.5 h-3.5 mr-1" />}
                  {f === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  {f === 'rejected' && <XCircle className="w-3.5 h-3.5 mr-1" />}
                  {f === 'all' && '全部'}
                  {!['all'].includes(f) && {
                    pending: '待审批',
                    approved: '已通过',
                    rejected: '已驳回',
                  }[f]}
                </Button>
              ))}
            </div>

            {/* Approval Cards */}
            {approvals
              .filter(a => approvalFilter === 'all' || a.status === approvalFilter)
              .map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Type badge + status */}
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {{
                              file_upload: '📄 文件上传',
                              project_create: '📁 项目创建',
                              task_assign: '📋 任务分配',
                            }[approval.type]}
                          </Badge>
                          <Badge
                            variant={approval.status === 'pending' ? 'outline' : approval.status === 'approved' ? 'default' : 'destructive'}
                            className={`text-[10px] ${approval.status === 'approved' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                          >
                            {approval.status === 'pending' ? '⏳ 待审批' : approval.status === 'approved' ? '✅ 已通过' : '❌ 已驳回'}
                          </Badge>
                        </div>

                        {/* Title */}
                        <h4 className="font-medium text-sm mt-1">{approval.title}</h4>

                        {/* Description */}
                        {approval.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{approval.description}</p>
                        )}

                        {/* Time info */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(approval.created_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                          {approval.resolved_at && (
                            <span>
                              处理于 {format(parseISO(approval.resolved_at), 'yyyy-MM-dd HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (admin + pending only) */}
                      {currentUser?.role === 'admin' && approval.status === 'pending' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => approveRequest(approval.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => rejectRequest(approval.id)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />驳回
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

            {approvals.filter(a => approvalFilter === 'all' || a.status === approvalFilter).length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">暂无审批记录</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== Chat ========== */}
        <TabsContent value="chat" className="mt-0">
          <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Channel sidebar */}
            <div className="w-52 border-r bg-gray-50/50 flex flex-col shrink-0">
              <div className="p-2 border-b">
                <Button variant="outline" size="sm" onClick={() => setShowNewChannel(true)} className="w-full text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />新建频道
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-0.5">
                  {channels.map(ch => {
                    const isCreator = ch.created_by === currentUser?.id
                    return (
                      <div
                        key={ch.id}
                        className={`group relative flex items-center gap-1 rounded-lg transition-colors ${
                          ch.id === activeChannel ? 'bg-blue-50' : 'hover:bg-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => setActiveChannel(ch.id)}
                          className={`flex-1 flex items-center gap-2 px-2.5 py-2 text-sm text-left ${
                            ch.id === activeChannel ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {ch.is_private ? <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" /> : <Hash className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                          <span className="flex-1 truncate text-xs">{ch.name}</span>
                          {ch.id !== activeChannel && (messages[ch.id]?.length || 0) > 0 && (
                            <span className="min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center px-1">
                              {messages[ch.id]?.length}
                            </span>
                          )}
                        </button>
                        
                        {/* Channel menu button (show on hover or always for active) */}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              className={`p-1 rounded hover:bg-gray-200 transition-opacity ${
                                ch.id === activeChannel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="min-w-[140px] bg-white rounded-lg shadow-lg border py-1 z-50"
                              sideOffset={5}
                            >
                              {isCreator && (
                                <>
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    onSelect={() => {
                                      setEditChannelId(ch.id)
                                      setEditChannelName(ch.name)
                                      setEditChannelDesc(ch.description || '')
                                    }}
                                  >
                                    <Edit3 className="w-4 h-4" /> 编辑频道
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                                    onSelect={() => setDeleteChannelConfirmId(ch.id)}
                                  >
                                    <Trash2 className="w-4 h-4" /> 删除频道
                                  </DropdownMenu.Item>
                                </>
                              )}
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                onSelect={() => {
                                  if (confirm('确定要退出该频道吗？')) {
                                    // 实际退出频道逻辑
                                    removeMember(currentUser.id, ch.id)
                                      .then(() => {
                                        // 如果当前正在这个频道，切换到另一个
                                        if (activeChannel === ch.id) {
                                          const otherChannel = channels.find(c => c.id !== ch.id)
                                          setActiveChannel(otherChannel?.id || null)
                                        }
                                        addNotification({
                                          type: 'info',
                                          title: '已退出频道',
                                          message: `你已成功退出「${ch.name}」频道`,
                                          read: false,
                                          created_at: new Date().toISOString(),
                                        })
                                      })
                                      .catch((err) => {
                                        addNotification({
                                          type: 'error',
                                          title: '退出失败',
                                          message: '无法退出频道，请稍后重试',
                                          read: false,
                                          created_at: new Date().toISOString(),
                                        })
                                      })
                                  }
                                }}
                              >
                                <X className="w-4 h-4" /> 退出频道
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              <div className="h-11 border-b flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  {(() => {
                    const ch = channels.find(c => c.id === activeChannel)
                    return ch ? (
                      <>
                        {ch.is_private ? <Lock className="w-4 h-4 text-gray-400" /> : <Hash className="w-4 h-4 text-gray-400" />}
                        <span className="font-medium text-sm">{ch.name}</span>
                      </>
                    ) : null
                  })()}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMemberPanel(!memberPanel)}>
                  <Users className="w-4 h-4 text-gray-400" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                  {currentMessages.map(msg => {
                    const isMe = isMyMessage(msg)
                    const createdAt = msg.created_at
                    const canEdit = isMe && differenceInMinutes(new Date(), parseISO(createdAt)) <= 15
                    const isFile = msg.message_type === 'file'
                    const replyMsg = msg.reply_to ? currentMessages.find(m => m.id === msg.reply_to) : null
                    
                    return (
                      <div key={msg.id} className="flex gap-3 group">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                          isMe ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        }`}>
                          {msg.sender_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isMe ? 'text-blue-600' : 'text-gray-800'}`}>{msg.sender_name}</span>
                            <span className="text-[10px] text-gray-400">{formatMessageTime(createdAt)}</span>
                            {canEdit && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditStart(msg.id, msg.content, createdAt)}
                                  className="text-[10px] text-gray-400 hover:text-blue-500 px-1 rounded hover:bg-blue-50"
                                >
                                  <Edit3 className="w-3 h-3 inline" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(msg.id)}
                                  className="text-[10px] text-gray-400 hover:text-red-500 px-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3 inline" />
                                </button>
                              </div>
                            )}
                            {/* Reply button */}
                            <button
                              onClick={() => setReplyToMsg({ id: msg.id, content: msg.content, senderName: msg.sender_name || '匿名用户' })}
                              className="text-[10px] text-gray-400 hover:text-blue-500 px-1 rounded hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Reply className="w-3 h-3 inline mr-0.5" />回复
                            </button>
                          </div>

                          {/* Reply reference */}
                          {replyMsg && (
                            <div
                              className="text-xs text-gray-500 mb-1 pl-2 pr-2 py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors border-l-2 border-gray-300"
                              onClick={() => setExpandedReply(expandedReply === msg.id ? null : msg.id)}
                            >
                              <div className="flex items-center gap-1">
                                <Reply className="w-3 h-3 text-gray-400" />
                                <span className="font-medium text-gray-600">{replyMsg.sender_name}</span>
                              </div>
                              <div className={expandedReply === msg.id ? '' : 'truncate'}>
                                {expandedReply === msg.id ? replyMsg.content : replyMsg.content.slice(0, 50)}
                                {replyMsg.content.length > 50 && expandedReply !== msg.id && '...'}
                              </div>
                            </div>
                          )}

                          {editingMsgId === msg.id ? (
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={editingContent}
                                onChange={e => setEditingContent(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingMsgId(null) }}
                                className="text-sm flex-1"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleEditSave}>保存</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingMsgId(null)}><X className="w-3 h-3" /></Button>
                            </div>
                          ) : isFile ? (
                            <a
                              href={msg.file_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors mt-1"
                            >
                              {getFileIcon(msg.file_name || '')}
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-700 font-medium">{msg.file_name}</span>
                                {msg.metadata?.size && (
                                  <span className="text-xs text-gray-400">{formatFileSize(msg.metadata.size)}</span>
                                )}
                              </div>
                              <Download className="w-4 h-4 text-gray-400 ml-2" />
                            </a>
                          ) : (
                            <p className="text-sm text-gray-700 mt-0.5">{renderContent(msg.content, msg.sender_id)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {currentMessages.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm">开始对话吧</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => msgInputRef.current?.focus()}
                      >
                        发送第一条消息
                      </Button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* @mention dropdown */}
              {mentionOpen && (
                <div
                  ref={mentionRef}
                  className="absolute left-4 z-50 bg-white border rounded-lg shadow-lg w-56 overflow-hidden"
                  style={{ bottom: 72 }}
                >
                  <div className="p-2 border-b bg-gray-50">
                    <p className="text-xs text-gray-500">选择要提及的成员</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <p className="p-3 text-xs text-gray-400 text-center">无匹配成员</p>
                    ) : filteredMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => insertMention(m.full_name)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {m.full_name[0]}
                        </div>
                        <span className="text-sm truncate">{m.full_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t p-3">
                <div className="max-w-3xl mx-auto">
                  {/* Reply indicator */}
                  {replyToMsg && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-lg">
                      <Reply className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-700 flex-1">
                        回复 <span className="font-medium">{replyToMsg.senderName}</span>: {replyToMsg.content.slice(0, 30)}{replyToMsg.content.length > 30 ? '...' : ''}
                      </span>
                      <button
                        onClick={() => setReplyToMsg(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !activeChannel}
                      title="上传附件"
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Input
                      ref={msgInputRef}
                      value={msgInput}
                      onChange={handleMsgInputChange}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (mentionOpen) { setMentionOpen(false); return }
                          handleSend()
                        }
                        if (e.key === 'Escape' && mentionOpen) setMentionOpen(false)
                        if (e.key === 'Escape' && replyToMsg) setReplyToMsg(null)
                      }}
                      placeholder="输入消息... (Enter 发送，@ 提及成员)"
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!msgInput.trim() || mentionOpen || uploading} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Member panel */}
            {memberPanel && (
              <div className="w-52 border-l bg-gray-50/50 flex flex-col shrink-0 hidden md:flex">
                <div className="p-3 border-b">
                  <h3 className="font-medium text-xs">成员 ({members.length})</h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {[...members.filter(m => m.status === 'online'), ...members.filter(m => m.status !== 'online')].map(m => (
                      <div key={m.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white ${m.status === 'offline' ? 'opacity-50' : ''}`}>
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {m.full_name[0]}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-50 ${m.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.full_name}</p>
                        </div>
                        {roleIcons[m.role]}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t">
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowInvite(true)}>
                    <Mail className="w-3 h-3 mr-1" />邮件邀请成员
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== Team Management ========== */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">团队成员 ({members.length})</CardTitle>
              <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4 mr-1" />邮件邀请</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">成员</th>
                      <th className="pb-2 font-medium">邮箱</th>
                      <th className="pb-2 font-medium">角色</th>
                      <th className="pb-2 font-medium">状态</th>
                      <th className="pb-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{m.full_name[0]}</div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                            <span className="font-medium">{m.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-500">{m.email}</td>
                        <td className="py-3"><Badge variant="secondary" className="text-xs">{roleLabels[m.role] || m.role}</Badge></td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${m.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {m.status === 'online' ? '在线' : '离线'}
                          </span>
                        </td>
                        <td className="py-3">
                          {m.email !== currentUser?.email && (
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7"
                              onClick={() => removeMember(m.id)}>
                              <Trash2 className="w-3 h-3 mr-1" />移除
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Collaborative Tasks ========== */}
        <TabsContent value="tasks">
          <div className="space-y-4">
            {projects.map(proj => {
              const projTasks = tasks.filter(t => t.project_id === proj.id)
              // 显示所有项目（包括无任务的项目）
              return (
                <Card key={proj.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      <CardTitle className="text-sm">{proj.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{projTasks.length} 个任务</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusLabels[task.status]?.color || ''}`}>
                            {statusLabels[task.status]?.label || task.status}
                          </Badge>
                          <span className="text-sm flex-1 truncate">{task.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {task.assignee_id === currentUser?.id ? (currentUser?.full_name || '我') : members.find(m => m.id === task.assignee_id)?.full_name || '未分配'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========== Project Files ========== */}
        <TabsContent value="files">
          <div className="space-y-4">
            {projects.map(proj => {
              const projDocs = documents.filter(d => d.project_id === proj.id)
              const projFiles = files.filter(f => f.project_id === proj.id)
              if (projDocs.length === 0 && projFiles.length === 0) return null
              return (
                <Card key={proj.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      <CardTitle className="text-sm">{proj.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{projDocs.length} 文档 / {projFiles.length} 文件</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewingDoc(doc) }}>
                          <FileText className="w-4 h-4 text-green-500" />
                          <span className="text-sm flex-1 truncate">{doc.title}</span>
                          <span className="text-[10px] text-gray-400">{doc.file_type}</span>
                        </div>
                      ))}
                      {projFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewingFile(file) }}>
                          <File className="w-4 h-4 text-blue-500" />
                          <span className="text-sm flex-1 truncate">{file.file_name}</span>
                          <span className="text-[10px] text-gray-400">{file.file_type} {(file.file_size / 1024 / 1024).toFixed(2)}MB</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {projects.length === 0 && (
              <div className="text-center text-gray-400 py-8">暂无项目，请先在项目管理中创建项目</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Channel Dialog */}
      <Dialog open={showNewChannel} onOpenChange={(v) => { setShowNewChannel(v); if (!v) setChannelNameError('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建频道</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Input placeholder="频道名称" value={newChannelName} onChange={e => { setNewChannelName(e.target.value); setChannelNameError('') }} />
              {channelNameError && (
                <p className="text-sm text-red-500 mt-1">{channelNameError}</p>
              )}
            </div>
            <Input placeholder="频道描述（可选）" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newChannelPrivate} onChange={e => setNewChannelPrivate(e.target.checked)} className="rounded" />
              设为私有频道
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewChannel(false); setChannelNameError('') }}>取消</Button>
            <Button onClick={async () => {
              const name = newChannelName.trim()
              if (name.length < 2 || name.length > 50) {
                setChannelNameError('频道名称长度需在2-50个字符之间')
                return
              }
              try {
                await createChannel(name, newChannelDesc.trim(), newChannelPrivate)
                setShowNewChannel(false)
                setNewChannelName('')
                setNewChannelDesc('')
                setNewChannelPrivate(false)
                setChannelNameError('')
              } catch (err: any) {
                toast({ title: '创建频道失败', description: err?.message || '未知错误', variant: 'destructive' })
              }
            }} disabled={!newChannelName.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={!!editChannelId} onOpenChange={(v) => { if (!v) setEditChannelId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑频道</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="频道名称" value={editChannelName} onChange={e => setEditChannelName(e.target.value)} />
            <Input placeholder="频道描述" value={editChannelDesc} onChange={e => setEditChannelDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditChannelId(null)}>取消</Button>
            <Button onClick={async () => {
              if (!editChannelId) return
              try {
                await updateChannel(editChannelId, { name: editChannelName.trim(), description: editChannelDesc.trim() })
                setEditChannelId(null)
              } catch (err: any) {
                toast({ title: '编辑频道失败', description: err?.message || '未知错误', variant: 'destructive' })
              }
            }} disabled={!editChannelName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Confirm Dialog */}
      <Dialog open={!!deleteChannelConfirmId} onOpenChange={(v) => { if (!v) setDeleteChannelConfirmId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除频道</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">确定要删除这个频道吗？频道内的所有消息都将被删除，此操作无法撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChannelConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleteChannelConfirmId) return
              try {
                await deleteChannel(deleteChannelConfirmId)
                setDeleteChannelConfirmId(null)
              } catch (err: any) {
                toast({ title: '删除频道失败', description: err?.message || '未知错误', variant: 'destructive' })
              }
            }}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>邀请成员</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Input placeholder="邮箱地址" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteResult(null) }} type="email" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">角色</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="member">成员</option>
                <option value="manager">经理</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            {/* 发送结果提示 */}
            {inviteResult && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${inviteResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {inviteResult.ok ? (
                  <><span className="text-green-500">✓</span> {inviteResult.msg}</>
                ) : (
                  <><span className="text-red-500">✗</span> {inviteResult.msg}</>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">邀请邮件将发送至对方邮箱，对方点击链接即可注册并加入团队。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInvite(false); setInviteResult(null) }}>取消</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteSending}>
              {inviteSending ? '发送中...' : '发送邀请邮件'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">确定要删除这条消息吗？此操作无法撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteMsg(deleteConfirmId)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={(v) => { if (!v) setViewingDoc(null) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <DialogTitle>{viewingDoc?.title || '文档预览'}</DialogTitle>
                <Badge variant="secondary" className="text-[10px]">{viewingDoc?.file_type}</Badge>
              </div>
              <div className="flex gap-2">
                {viewingDoc?.file_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (viewingDoc?.file_url) window.open(viewingDoc.file_url, '_blank') }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />下载
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setViewingDoc(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {(() => {
              if (!viewingDoc) return null
              // 文本内容直接显示
              if (viewingDoc.content) {
                return (
                  <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {viewingDoc.content}
                  </div>
                )
              }
              // 文件URL，根据类型预览
              if (viewingDoc.file_url) {
                const ext = viewingDoc.file_type?.toLowerCase() || ''
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
                const isPdf = ext === 'pdf'
                if (isImage) {
                  return (
                    <div className="flex flex-col items-center p-4">
                      <img
                        src={viewingDoc.file_url}
                        alt={viewingDoc.title}
                        className="max-w-full max-h-[70vh] object-contain rounded"
                      />
                    </div>
                  )
                }
                if (isPdf) {
                  return (
                    <iframe
                      src={viewingDoc.file_url}
                      className="w-full h-[70vh] border-0"
                      title={viewingDoc.title}
                    />
                  )
                }
                // Word/Excel/其他：显示下载提示 + Office Online 预览链接
                const officeViewerUrl = viewingDoc.file_url
                  ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(viewingDoc.file_url)}`
                  : null
                return (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <FileText className="w-16 h-16 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      文件类型：{viewingDoc.file_type || '未知'}
                    </p>
                    <div className="flex gap-3">
                      {officeViewerUrl && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(officeViewerUrl, '_blank')}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />在线预览
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => window.open(viewingDoc.file_url, '_blank')}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />下载文件
                      </Button>
                    </div>
                  </div>
                )
              }
              // 无内容
              return (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">暂无内容预览</p>
                </div>
              )
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      <Dialog open={!!viewingFile} onOpenChange={(v) => { if (!v) setViewingFile(null) }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon(viewingFile?.file_name || '')}
                <DialogTitle>{viewingFile?.file_name || '文件预览'}</DialogTitle>
                <Badge variant="secondary" className="text-[10px]">{viewingFile?.file_type}</Badge>
                {viewingFile?.file_size && (
                  <Badge variant="outline" className="text-[10px]">
                    {formatFileSize(viewingFile.file_size)}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { if (viewingFile) handleFileClick(viewingFile) }}>
                  <Download className="w-3.5 h-3.5 mr-1" />下载
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setViewingFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center justify-center py-8">
              {(() => {
                if (!viewingFile) return null
                const ext = viewingFile.file_name?.split('.').pop()?.toLowerCase()
                let url = viewingFile.file_url
                if (!url && viewingFile.file_path) {
                  try {
                    const { data } = supabase.storage.from('files').getPublicUrl(viewingFile.file_path)
                    url = data?.publicUrl
                  } catch { /* ignore */ }
                }
                if (!url) {
                  return (
                    <div className="text-center">
                      <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-gray-500 mb-4">无法获取文件预览</p>
                    </div>
                  )
                }
                // 图片直接显示
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) {
                  return <img src={url} alt={viewingFile.file_name} className="max-w-full max-h-[70vh] object-contain" />
                }
                // PDF 直接用 iframe
                if (ext === 'pdf') {
                  return <iframe src={url} className="w-full h-[70vh]" title={viewingFile.file_name} />
                }
                // Word/Excel 使用 Office Online Viewer
                if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
                  const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
                  return (
                    <div className="w-full flex flex-col items-center gap-4">
                      <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                      <p className="text-sm text-gray-500">{viewingFile.file_type} 文件</p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => window.open(officeUrl, '_blank')}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />在线预览
                        </Button>
                        <Button variant="outline" onClick={() => handleFileClick(viewingFile)}>
                          <Download className="w-3.5 h-3.5 mr-1" />下载文件
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Office Online Viewer 无法加载时，请直接下载文件后在本地查看
                      </p>
                    </div>
                  )
                }
                // 其他类型
                return (
                  <div className="text-center">
                    <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-2">文件类型：{viewingFile.file_type}</p>
                    <p className="text-xs text-gray-400 mb-4">大小：{(viewingFile.file_size / 1024 / 1024).toFixed(2)}MB</p>
                    <Button variant="outline" onClick={() => handleFileClick(viewingFile)}>
                      <Download className="w-4 h-4 mr-1" />下载文件
                    </Button>
                  </div>
                )
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Module Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={(v) => { if (!v) { setMergeDialogOpen(false); setMergeName(''); setSelectedForMerge([]); setMergeMode(false) } }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-purple-500" />
              <DialogTitle>合并模块</DialogTitle>
            </div>
            <DialogDescription>
              将选中的 {selectedForMerge.length} 个模块合并为一个新项目，合并后原模块保留，仅创建一个新项目汇总。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 mb-2">选中的模块：</p>
              {selectedForMerge.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'project' ? 'bg-blue-500' : 'bg-purple-400'}`} />
                  <span className="truncate">{item.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {item.type === 'project' ? '项目' : '其他'}
                  </Badge>
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">新项目名称 *</label>
              <Input
                placeholder="例如：Q3季度总结合并"
                value={mergeName}
                onChange={e => setMergeName(e.target.value)}
              />
              {mergeName.trim().length > 0 && mergeName.trim().length < 2 && (
                <p className="text-xs text-red-500 mt-1">项目名称至少2个字符</p>
              )}
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700">
              ⚠️ 合并仅创建汇总项目，原有模块不会被删除或修改。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeDialogOpen(false); setMergeName('') }}>取消</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={mergeName.trim().length < 2 || selectedForMerge.length < 2}
              onClick={async () => {
                if (mergeName.trim().length < 2 || selectedForMerge.length < 2) return
                try {
                  const { addProject } = useStore.getState()
                  await addProject({
                    name: mergeName.trim(),
                    description: `由 ${selectedForMerge.length} 个模块合并而成：` + selectedForMerge.map(s => s.name).join('、'),
                    status: 'active',
                  })
                  toast({ title: '模块合并成功', description: `已创建「${mergeName.trim()}」项目`, variant: 'success' })
                  setMergeDialogOpen(false)
                  setMergeName('')
                  setSelectedForMerge([])
                  setMergeMode(false)
                } catch (err: any) {
                  toast({ title: '合并失败', description: err?.message || '未知错误', variant: 'destructive' })
                }
              }}
            >
              <Merge className="w-4 h-4 mr-1" />确认合并
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
