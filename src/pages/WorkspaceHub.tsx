import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus, Hash, Lock, Send, Users, UserPlus, Mail, Crown, Shield, UserCheck,
  Trash2, Edit3, X, MoreVertical, Reply, Paperclip, Download, File, FileText,
  Image, GripVertical, AlertCircle, ListTodo, FolderOpen, MessageSquare,
  ChevronDown, ChevronRight, MoreHorizontal, Edit, AlertTriangle
} from 'lucide-react'
import { useStore } from '@/store'
import { supabase } from '@/db/supabase'
import { toast } from '@/components/ui/toast'
import { format, parseISO, differenceInMinutes, isToday, isYesterday } from 'date-fns'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types/database'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

// ==================== Constants ====================
const priorityMap: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: '紧急', color: 'text-red-700', bg: 'bg-red-100' },
  high: { label: '高', color: 'text-orange-700', bg: 'bg-orange-100' },
  medium: { label: '中', color: 'text-blue-700', bg: 'bg-blue-100' },
  low: { label: '低', color: 'text-green-700', bg: 'bg-green-100' },
}

const statusColumns = [
  { key: 'todo', label: '待办', color: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-700' },
  { key: 'review', label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'completed', label: '已完成', color: 'bg-green-100 text-green-700' },
]

const taskTagOptions = ['前端', '后端', '设计', '测试']

const roleLabels: Record<string, string> = { admin: '管理员', manager: '经理', member: '成员' }
const roleIcons: Record<string, React.ReactNode> = {
  admin: <Crown className="w-3 h-3 text-yellow-500" />,
  manager: <Shield className="w-3 h-3 text-blue-500" />,
  member: <UserCheck className="w-3 h-3 text-gray-400" />,
}

// ==================== Main Component ====================
export default function WorkspaceHub() {
  const {
    currentUser, tasks, projects, channels, messages, activeChannel, setActiveChannel,
    createChannel, sendMessage, sendFileMessage, updateMessage, deleteMessage,
    addProject, updateProject, deleteProject, addTask, updateTask, deleteTask,
    members, addMember, addNotification,
  } = useStore()

  // ---- Left sidebar state ----
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [membersOpen, setMembersOpen] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // ---- Right content tab ----
  const [activeTab, setActiveTab] = useState<'kanban' | 'collab'>('kanban')

  // ---- Modals ----
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingProject, setEditingProject] = useState<Record<string, unknown> | null>(null)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ---- Channel form ----
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [newChannelPrivate, setNewChannelPrivate] = useState(false)

  // ---- Invite form ----
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // ---- Message state (from Collaboration.tsx) ----
  const [msgInput, setMsgInput] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionRef = useRef<HTMLDivElement>(null)
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deleteMsgConfirmId, setDeleteMsgConfirmId] = useState<string | null>(null)
  const [replyToMsg, setReplyToMsg] = useState<{ id: string; content: string; senderName: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  // ---- Channel edit/delete ----
  const [editChannelId, setEditChannelId] = useState<string | null>(null)
  const [editChannelName, setEditChannelName] = useState('')
  const [editChannelDesc, setEditChannelDesc] = useState('')
  const [deleteChannelConfirmId, setDeleteChannelConfirmId] = useState<string | null>(null)

  const currentMessages = messages[activeChannel || ''] || []

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [currentMessages.length])

  // ========== Realtime subscription ==========
  useEffect(() => {
    if (!activeChannel) return
    const channel = supabase.channel(`messages:${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, (payload) => {
        const msg = payload.new as any
        if (msg.sender_id !== currentUser?.id) {
          useStore.setState((s) => ({
            messages: {
              ...s.messages,
              [activeChannel]: [...(s.messages[activeChannel] || []), msg],
            },
          }))
          const prevTitle = document.title
          if (!document.hasFocus()) {
            document.title = '(1) 新消息 - 一人成军'
            const restore = () => { document.title = prevTitle; window.removeEventListener('focus', restore) }
            window.addEventListener('focus', restore, { once: true })
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeChannel, currentUser?.id])

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
    if (!msgInput.trim() || !activeChannel) return
    const userId = currentUser?.id || ''
    const userName = currentUser?.full_name || currentUser?.username || '匿名用户'
    const content = msgInput.trim()
    await sendMessage(activeChannel, content, userId, userName, replyToMsg?.id || null)
    setMsgInput('')
    setReplyToMsg(null)
    msgInputRef.current?.focus()

    const mentionMatches = content.match(/@([^\s@]+)/g) || []
    for (const match of mentionMatches) {
      const name = match.slice(1)
      const mentioned = members.find(m => m.full_name === name || m.full_name.startsWith(name))
      if (mentioned && mentioned.id !== currentUser?.id) {
        await addNotification(mentioned.id, '你被提及了', `${userName} 在频道中提及了你`, 'mention')
      }
    }
  }

  const handleEditStart = (msgId: string, content: string, createdAt: string) => {
    const mins = differenceInMinutes(new Date(), parseISO(createdAt))
    if (mins > 15) { toast('超过15分钟，无法编辑', 'warning'); return }
    setEditingMsgId(msgId)
    setEditingContent(content)
  }

  const handleEditSave = async () => {
    if (!editingMsgId || !activeChannel) return
    await updateMessage(editingMsgId, activeChannel, { content: editingContent })
    setEditingMsgId(null)
    setEditingContent('')
  }

  const handleDeleteMsg = async (msgId: string) => {
    if (!activeChannel) return
    await deleteMessage(msgId, activeChannel)
    setDeleteMsgConfirmId(null)
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
      await addMember(inviteEmail, inviteRole as any)
      setInviteResult({ ok: true, msg: `邀请邮件已发送到 ${inviteEmail}` })
      setTimeout(() => { setShowInvite(false); setInviteEmail(''); setInviteResult(null) }, 2000)
    } catch {
      setInviteResult({ ok: false, msg: '邀请失败，请重试' })
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
      const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) { toast('文件上传失败: ' + uploadError.message, 'error'); return }
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
      const fileUrl = urlData.publicUrl
      const userName = currentUser?.full_name || currentUser?.username || '匿名用户'
      await sendFileMessage(activeChannel, fileUrl, file.name, userId, userName, replyToMsg?.id || null)
      setReplyToMsg(null)
    } catch {
      toast('文件上传失败', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ========== Project progress ==========
  function getProjectProgress(projectId: string) {
    const projectTasks = tasks.filter(t => t.project_id === projectId)
    if (projectTasks.length === 0) return 0
    const completed = projectTasks.filter(t => t.status === 'completed').length
    return Math.round((completed / projectTasks.length) * 100)
  }

  function getMemberName(userId: string) {
    const member = members.find(m => m.user_id === userId || m.id === userId)
    return member?.full_name || '成员'
  }

  function getMemberInitials(userId: string) {
    const name = getMemberName(userId)
    return name.slice(0, 1).toUpperCase()
  }

  function getAvatarColor(userId: string) {
    const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400', 'bg-teal-400']
    let hash = 0
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  // ========== Filtered tasks for selected project ==========
  const filteredTasks = useMemo(() => {
    if (!selectedProject) return tasks
    return tasks.filter(t => t.project_id === selectedProject)
  }, [tasks, selectedProject])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], in_progress: [], review: [], completed: [] }
    filteredTasks.forEach(task => {
      if (grouped[task.status]) grouped[task.status].push(task)
      else grouped.todo.push(task)
    })
    return grouped
  }, [filteredTasks])

  // ========== DnD ==========
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(event: DragStartEvent) {
    const task = filteredTasks.find(t => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const taskId = active.id as string
    const overId = over.id as string
    const targetColumn = statusColumns.find(c => c.key === overId) ? overId : filteredTasks.find(t => t.id === overId)?.status
    if (targetColumn) {
      const task = filteredTasks.find(t => t.id === taskId)
      if (task && task.status !== targetColumn) {
        updateTask(taskId, { status: targetColumn as Task['status'] })
      }
    }
  }

  function confirmDeleteProject(id: string) {
    deleteProject(id)
    if (selectedProject === id) setSelectedProject(null)
    setDeleteConfirmId(null)
  }

  // ========== Message rendering helpers ==========
  const formatMessageTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm')}`
    return format(date, 'MM-dd HH:mm')
  }

  const renderContent = (content: string) => {
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

  const isMyMessage = (msg: any) => msg.sender_id === currentUser?.id

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return <Image className="w-5 h-5 text-purple-500" />
    if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-red-500" />
    if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-5 h-5 text-blue-600" />
    if (['xls', 'xlsx'].includes(ext || '')) return <FileText className="w-5 h-5 text-green-600" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ========== Header title ==========
  const headerTitle = useMemo(() => {
    if (activeTab === 'kanban') {
      if (selectedProject) {
        const proj = projects.find(p => p.id === selectedProject)
        return proj ? `项目: ${proj.name}` : '看板'
      }
      return '全部任务'
    } else {
      const ch = channels.find(c => c.id === activeChannel)
      return ch ? `# ${ch.name}` : '协作'
    }
  }, [activeTab, selectedProject, activeChannel, projects, channels])

  // ========== Render ==========
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ========== Left Sidebar ========== */}
      <div className="w-[280px] bg-white border-r flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">工作空间</h2>
          <p className="text-xs text-gray-400 mt-0.5">项目管理 + 团队协作</p>
        </div>

        <ScrollArea className="flex-1">
          {/* ---- Projects Section ---- */}
          <div className="p-2">
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => setProjectsOpen(!projectsOpen)}
            >
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" />
                项目
              </span>
              {projectsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {projectsOpen && (
              <div className="mt-1 space-y-0.5">
                {projects.map(proj => {
                  const progress = getProjectProgress(proj.id)
                  const isSelected = selectedProject === proj.id
                  return (
                    <div key={proj.id} className="group relative">
                      <button
                        onClick={() => setSelectedProject(isSelected ? null : proj.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#3B82F6' }} />
                        <span className="flex-1 truncate text-left">{proj.name}</span>
                      </button>
                      {/* Progress bar */}
                      <div className="px-2 pb-1">
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${progress}%`, backgroundColor: proj.color || '#3B82F6' }}
                          />
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50"
                        onClick={() => setDeleteConfirmId(proj.id)}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  )
                })}
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-1" onClick={() => { setEditingProject(null); setShowNewProject(true) }}>
                  <Plus className="w-3 h-3 mr-1" /> 新建项目
                </Button>
              </div>
            )}
          </div>

          {/* ---- Channels Section ---- */}
          <div className="p-2 border-t">
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => setChannelsOpen(!channelsOpen)}
            >
              <span className="flex items-center gap-1.5">
                <Hash className="w-4 h-4" />
                频道
              </span>
              {channelsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {channelsOpen && (
              <div className="mt-1 space-y-0.5">
                {channels.map(ch => {
                  const isActive = activeChannel === ch.id
                  const isCreator = ch.created_by === currentUser?.id
                  return (
                    <div key={ch.id} className="group flex items-center">
                      <button
                        onClick={() => { setActiveChannel(ch.id); setActiveTab('collab') }}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        {ch.is_private ? <Lock className="w-3 h-3 opacity-60" /> : <Hash className="w-3 h-3 opacity-60" />}
                        <span className="flex-1 truncate text-left">{ch.name}</span>
                        {ch.id !== activeChannel && (messages[ch.id]?.length || 0) > 0 && (
                          <span className="min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center px-1">
                            {messages[ch.id]?.length}
                          </span>
                        )}
                      </button>

                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className={`p-0.5 rounded hover:bg-gray-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <MoreVertical className="w-3 h-3 text-gray-500" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className="min-w-[120px] bg-white rounded-lg shadow-lg border py-1 z-50" sideOffset={5}>
                            {isCreator && (
                              <>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                                  onSelect={() => { setEditChannelId(ch.id); setEditChannelName(ch.name); setEditChannelDesc(ch.description || '') }}
                                >
                                  <Edit3 className="w-3 h-3" /> 编辑
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                                  onSelect={() => setDeleteChannelConfirmId(ch.id)}
                                >
                                  <Trash2 className="w-3 h-3" /> 删除
                                </DropdownMenu.Item>
                              </>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  )
                })}
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-1" onClick={() => setShowNewChannel(true)}>
                  <Plus className="w-3 h-3 mr-1" /> 新建频道
                </Button>
              </div>
            )}
          </div>

          {/* ---- Members Section ---- */}
          <div className="p-2 border-t">
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => setMembersOpen(!membersOpen)}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                成员 ({members.length})
              </span>
              {membersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {membersOpen && (
              <div className="mt-1 space-y-0.5">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {m.full_name?.[0] || '?'}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${m.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <span className="text-xs flex-1 truncate">{m.full_name}</span>
                    {roleIcons[m.role]}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-1" onClick={() => { setInviteEmail(''); setInviteResult(null); setShowInvite(true) }}>
                  <Mail className="w-3 h-3 mr-1" /> 邮件邀请
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ========== Right Main Content ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <div className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'kanban' ? <ListTodo className="w-4 h-4 text-gray-400" /> : <MessageSquare className="w-4 h-4 text-gray-400" />}
            <span className="font-medium text-sm text-gray-800">{headerTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'kanban' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setActiveTab('kanban')}
            >
              <ListTodo className="w-3.5 h-3.5 mr-1" />看板
            </Button>
            <Button
              variant={activeTab === 'collab' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setActiveTab('collab')}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />协作
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'kanban' ? (
          /* ===== KANBAN TAB ===== */
          <div className="flex-1 overflow-auto p-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { setEditingTask(null); setShowNewTask(true) }} className="text-xs h-7">
                  <Plus className="w-3.5 h-3.5 mr-1" />新建任务
                </Button>
                {selectedProject && (
                  <Badge variant="secondary" className="text-xs">
                    筛选: {projects.find(p => p.id === selectedProject)?.name}
                    <button onClick={() => setSelectedProject(null)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>

            {/* Kanban Board */}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-4 gap-3 min-h-[60vh]">
                {statusColumns.map(col => (
                  <KanbanColumn key={col.key} col={col} tasks={tasksByStatus[col.key] || []}>
                    {(tasksByStatus[col.key] || []).map(task => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => { setEditingTask(task); setShowNewTask(true) }}
                        onDelete={() => deleteTask(task.id)}
                        memberName={task.assignee_id ? getMemberName(task.assignee_id) : undefined}
                        memberInitials={task.assignee_id ? getMemberInitials(task.assignee_id) : undefined}
                        avatarColor={task.assignee_id ? getAvatarColor(task.assignee_id) : undefined}
                      />
                    ))}
                  </KanbanColumn>
                ))}
              </div>
              <DragOverlay>
                {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          /* ===== COLLABORATION TAB ===== */
          <div className="flex-1 flex flex-col min-h-0">
            {activeChannel ? (
              <>
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="max-w-3xl mx-auto space-y-3">
                    {currentMessages.map(msg => {
                      const isMe = isMyMessage(msg)
                      const canEdit = isMe && differenceInMinutes(new Date(), parseISO(msg.created_at)) <= 15
                      const isFile = msg.message_type === 'file'
                      const replyMsg = msg.reply_to ? currentMessages.find(m => m.id === msg.reply_to) : null
                      return (
                        <div key={msg.id} className="flex gap-2 group">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                            isMe ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                          }`}>
                            {msg.sender_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${isMe ? 'text-blue-600' : 'text-gray-800'}`}>{msg.sender_name}</span>
                              <span className="text-[10px] text-gray-400">{formatMessageTime(msg.created_at)}</span>
                              {canEdit && (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditStart(msg.id, msg.content, msg.created_at)} className="text-[10px] text-gray-400 hover:text-blue-500 px-0.5 rounded hover:bg-blue-50">
                                    <Edit3 className="w-2.5 h-2.5 inline" />
                                  </button>
                                  <button onClick={() => setDeleteMsgConfirmId(msg.id)} className="text-[10px] text-gray-400 hover:text-red-500 px-0.5 rounded hover:bg-red-50">
                                    <Trash2 className="w-2.5 h-2.5 inline" />
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => setReplyToMsg({ id: msg.id, content: msg.content, senderName: msg.sender_name || '匿名用户' })}
                                className="text-[10px] text-gray-400 hover:text-blue-500 px-0.5 rounded hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Reply className="w-2.5 h-2.5 inline mr-0.5" />回复
                              </button>
                            </div>

                            {/* Reply reference */}
                            {replyMsg && (
                              <div className="text-xs text-gray-400 mb-0.5 pl-2 border-l-2 border-gray-300">
                                <span className="font-medium">{replyMsg.sender_name}:</span> {replyMsg.content.slice(0, 50)}{replyMsg.content.length > 50 ? '...' : ''}
                              </div>
                            )}

                            {editingMsgId === msg.id ? (
                              <div className="flex gap-1 mt-0.5">
                                <Input
                                  value={editingContent}
                                  onChange={e => setEditingContent(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingMsgId(null) }}
                                  className="text-xs flex-1 h-7"
                                  autoFocus
                                />
                                <Button size="sm" className="h-7 text-xs" onClick={handleEditSave}>保存</Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingMsgId(null)}><X className="w-3 h-3" /></Button>
                              </div>
                            ) : isFile ? (
                              <a
                                href={msg.file_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors mt-0.5"
                              >
                                {getFileIcon(msg.file_name || '')}
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-700 font-medium">{msg.file_name}</span>
                                  {msg.metadata?.size && <span className="text-[10px] text-gray-400">{formatFileSize(msg.metadata.size)}</span>}
                                </div>
                                <Download className="w-3 h-3 text-gray-400 ml-2" />
                              </a>
                            ) : (
                              <p className="text-xs text-gray-700 mt-0.5">{renderContent(msg.content)}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {currentMessages.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                        <p className="text-xs">开始对话吧</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* @mention dropdown */}
                {mentionOpen && (
                  <div ref={mentionRef} className="absolute left-4 z-50 bg-white border rounded-lg shadow-lg w-52 overflow-hidden" style={{ bottom: 64 }}>
                    <div className="p-1.5 border-b bg-gray-50"><p className="text-[10px] text-gray-500">选择要提及的成员</p></div>
                    <div className="max-h-36 overflow-y-auto">
                      {filteredMembers.length === 0 ? (
                        <p className="p-2 text-[10px] text-gray-400 text-center">无匹配成员</p>
                      ) : filteredMembers.map(m => (
                        <button key={m.id} onClick={() => insertMention(m.full_name)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 text-left">
                          <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">{m.full_name[0]}</div>
                          <span className="text-xs truncate">{m.full_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="max-w-3xl mx-auto">
                    {replyToMsg && (
                      <div className="flex items-center gap-2 mb-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                        <Reply className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-700 flex-1">回复 <span className="font-medium">{replyToMsg.senderName}</span>: {replyToMsg.content.slice(0, 30)}{replyToMsg.content.length > 30 ? '...' : ''}</span>
                        <button onClick={() => setReplyToMsg(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} disabled={uploading || !activeChannel} title="上传附件">
                        {uploading ? <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" /> : <Paperclip className="w-3 h-3 text-gray-400" />}
                      </Button>
                      <Input
                        ref={msgInputRef}
                        value={msgInput}
                        onChange={handleMsgInputChange}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (mentionOpen) { setMentionOpen(false); return }; handleSend() }
                          if (e.key === 'Escape' && mentionOpen) setMentionOpen(false)
                          if (e.key === 'Escape' && replyToMsg) setReplyToMsg(null)
                        }}
                        placeholder="输入消息... (Enter 发送，@ 提及成员)"
                        className="flex-1 h-7 text-xs"
                      />
                      <Button onClick={handleSend} disabled={!msgInput.trim() || mentionOpen || uploading} size="sm" className="h-7 w-7 p-0">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Hash className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">请从左侧选择一个频道开始协作</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== Modals ========== */}

      {/* New/Edit Task Modal */}
      {showNewTask && (
        <TaskModal
          onClose={() => { setShowNewTask(false); setEditingTask(null) }}
          onSave={async (data) => {
            if (editingTask) {
              await updateTask(editingTask.id, data)
            } else {
              await addTask({ ...data, project_id: data.project_id || selectedProject || projects[0]?.id || '' })
            }
            setShowNewTask(false)
            setEditingTask(null)
          }}
          task={editingTask}
          projects={projects}
          members={members}
          currentUser={currentUser}
        />
      )}

      {/* New/Edit Project Modal */}
      {showNewProject && (
        <ProjectModal
          onClose={() => { setShowNewProject(false); setEditingProject(null) }}
          onSave={async (data) => {
            if (editingProject) {
              await updateProject(editingProject.id as string, data)
            } else {
              await addProject(data)
            }
            setShowNewProject(false)
            setEditingProject(null)
          }}
          project={editingProject}
        />
      )}

      {/* New Channel Dialog */}
      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建频道</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="频道名称" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
            <Input placeholder="频道描述（可选）" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newChannelPrivate} onChange={e => setNewChannelPrivate(e.target.checked)} className="rounded" />
              设为私有频道
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChannel(false)}>取消</Button>
            <Button onClick={async () => { await createChannel(newChannelName.trim(), newChannelDesc.trim(), newChannelPrivate); setShowNewChannel(false); setNewChannelName(''); setNewChannelDesc(''); setNewChannelPrivate(false) }} disabled={!newChannelName.trim()}>创建</Button>
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
            <Button onClick={async () => { if (!editChannelId) return; await useStore.getState().updateChannel(editChannelId, { name: editChannelName.trim(), description: editChannelDesc.trim() }); setEditChannelId(null) }} disabled={!editChannelName.trim()}>保存</Button>
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
            <Button variant="destructive" onClick={async () => { if (!deleteChannelConfirmId) return; await useStore.getState().deleteChannel(deleteChannelConfirmId); setDeleteChannelConfirmId(null) }}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>邀请成员</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="邮箱地址" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteResult(null) }} type="email" />
            <div>
              <label className="text-sm text-gray-600 mb-1 block">角色</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="member">成员</option>
                <option value="manager">经理</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            {inviteResult && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${inviteResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <span className={inviteResult.ok ? 'text-green-500' : 'text-red-500'}>✓</span> {inviteResult.msg}
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

      {/* Delete Project Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <DialogTitle className="text-base">确认删除</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-gray-600">确定要删除此项目吗？关联的任务也会一并删除，此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>取消</Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteConfirmId && confirmDeleteProject(deleteConfirmId)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirm Dialog */}
      <Dialog open={!!deleteMsgConfirmId} onOpenChange={(v) => { if (!v) setDeleteMsgConfirmId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">确定要删除这条消息吗？此操作无法撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMsgConfirmId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteMsgConfirmId && handleDeleteMsg(deleteMsgConfirmId)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Kanban Components ====================

function KanbanColumn({ col, tasks, children }: {
  col: typeof statusColumns[number]
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  return (
    <div className="flex flex-col">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${col.color.split(' ')[0]} ${col.color.split(' ')[1]}`}>
        <span className="font-medium text-xs">{col.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">{tasks?.length || 0}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors ${isOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

function DraggableTaskCard({ task, onEdit, onDelete, memberName, memberInitials, avatarColor }: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  memberName?: string
  memberInitials?: string
  avatarColor?: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { status: task.status } })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
    transition: 'box-shadow 0.2s, opacity 0.2s',
  }
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  return (
    <Card ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1 flex-1">
            <GripVertical className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
            <span className="font-medium text-xs">{task.title}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit() }} className="flex-shrink-0 h-5 w-5 p-0">
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>

        {task.description && (
          <p className="text-[10px] text-gray-500 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <Badge className={`${priorityMap[task.priority]?.bg} ${priorityMap[task.priority]?.color} text-[10px] h-4`}>
            {priorityMap[task.priority]?.label}
          </Badge>
          {task.tags && task.tags.length > 0 && task.tags.map(tag => (
            <Badge key={tag} className="bg-gray-100 text-gray-600 text-[10px] h-4">{tag}</Badge>
          ))}
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700 text-[10px] h-4">
              <AlertCircle className="w-2.5 h-2.5 mr-0.5" />逾期
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5">
            {task.due_date && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                {new Date(task.due_date).toLocaleDateString('zh-CN')}
              </span>
            )}
            {memberName && (
              <div className="flex items-center gap-0.5">
                <div className={`w-3.5 h-3.5 rounded-full ${avatarColor || 'bg-blue-400'} flex items-center justify-center text-white text-[8px] font-bold`}>
                  {memberInitials}
                </div>
                <span className="text-gray-400">{memberName}</span>
              </div>
            )}
          </div>
          <div className="flex gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-0.5 rounded hover:bg-blue-50"><Edit className="w-2.5 h-2.5 text-gray-400" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-0.5 rounded hover:bg-red-50"><Trash2 className="w-2.5 h-2.5 text-red-500" /></button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TaskCardOverlay({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  return (
    <Card className="shadow-xl opacity-90 rotate-2">
      <CardContent className="p-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <GripVertical className="w-2.5 h-2.5 text-gray-300" />
          <span className="font-medium text-xs">{task.title}</span>
        </div>
        {task.description && <p className="text-[10px] text-gray-500 line-clamp-2">{task.description}</p>}
        <div className="flex items-center gap-1">
          <Badge className={`${priorityMap[task.priority]?.bg} ${priorityMap[task.priority]?.color} text-[10px] h-4`}>
            {priorityMap[task.priority]?.label}
          </Badge>
          {isOverdue && <Badge className="bg-red-100 text-red-700 text-[10px] h-4"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />逾期</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Task Modal ====================
function TaskModal({ onClose, onSave, task, projects, members, currentUser }: {
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  task: Task | null
  projects: any[]
  members: any[]
  currentUser: any
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [status, setStatus] = useState(task?.status || 'todo')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [projectId, setProjectId] = useState(task?.project_id || '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || currentUser?.id || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(task?.tags || [])

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function handleSave() {
    onSave({ title, description, status, priority, due_date: dueDate || null, project_id: projectId || null, assignee_id: assigneeId || null, tags: selectedTags.length > 0 ? selectedTags : null })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{task ? '编辑任务' : '新建任务'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1"><X className="w-4 h-4" /></Button>
          </div>
          <CardDescription>填写任务信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">标题 *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="任务标题" />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <textarea className="w-full border rounded-md p-2 text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="任务描述..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">状态</label>
              <select className="w-full border rounded-md p-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="todo">待办</option>
                <option value="in_progress">进行中</option>
                <option value="review">审核中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">优先级</label>
              <select className="w-full border rounded-md p-2 text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">截止日期</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">负责人</label>
              <select className="w-full border rounded-md p-2 text-sm" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">未分配</option>
                {currentUser && <option value={currentUser.id}>我（{currentUser.full_name || currentUser.username || '我'}）</option>}
                {members.filter(m => m.user_id !== currentUser?.id).map(m => (
                  <option key={m.id || m.user_id} value={m.user_id || m.id}>{m.full_name || m.email || '成员'}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">标签</label>
            <div className="flex gap-2 flex-wrap">
              {taskTagOptions.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedTags.includes(tag) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">所属项目</label>
            <select className="w-full border rounded-md p-2 text-sm" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">无项目</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>{task ? '保存' : '创建'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== Project Modal ====================
function ProjectModal({ onClose, onSave, project }: {
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  project: Record<string, unknown> | null
}) {
  const meta = (project?.metadata as Record<string, unknown>) || {}
  const [name, setName] = useState((project?.name as string) || '')
  const [description, setDescription] = useState((project?.description as string) || '')
  const [color, setColor] = useState((project?.color as string) || '#3B82F6')
  const [client, setClient] = useState((meta.client as string) || '')
  const [dueDate, setDueDate] = useState((meta.due_date as string) || '')
  const [priority, setPriority] = useState((meta.priority as string) || 'medium')
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>((project?.status as any) || 'active'))

  function handleSave() {
    const metadata: Record<string, unknown> = { ...meta }
    if (client) metadata.client = client
    if (dueDate) metadata.due_date = dueDate
    if (priority) metadata.priority = priority
    onSave({ name, description, color, status, is_public: project ? (project.is_public as boolean) : true, metadata })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{project ? '编辑项目' : '新建项目'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1"><X className="w-4 h-4" /></Button>
          </div>
          <CardDescription>填写项目信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">项目名称 *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="项目名" />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <textarea className="w-full border rounded-md p-2 text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="项目描述..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">客户</label><Input value={client} onChange={e => setClient(e.target.value)} placeholder="客户名称" /></div>
            <div><label className="text-sm font-medium">截止日期</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">优先级</label>
              <select className="w-full border rounded-md p-2 text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <select className="w-full border rounded-md p-2 text-sm" value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">颜色</label>
            <div className="flex items-center gap-3">
              <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
              <span className="text-xs text-gray-500">{color}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>{project ? '保存' : '创建'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
