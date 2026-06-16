import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfDay, isBefore, isSameDay, format, subDays, isToday, isTomorrow, isPast, parseISO, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Bot, FolderOpen, MessageSquare, Contact, Share2, Video,
  TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowRight,
  Plus, ListTodo, FileText, Users, Calendar, Target
} from 'lucide-react'
import { useStore } from '@/store'
import type { Task } from '@/types/database'


const priorityMap: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  urgent: { label: '紧急', color: 'text-red-700', bg: 'bg-red-100', emoji: '🔴' },
  high: { label: '高', color: 'text-orange-700', bg: 'bg-orange-100', emoji: '🔴' },
  medium: { label: '中', color: 'text-blue-700', bg: 'bg-blue-100', emoji: '🟡' },
  low: { label: '低', color: 'text-green-700', bg: 'bg-green-100', emoji: '🟢' },
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: '待办', color: 'text-gray-700', bg: 'bg-gray-100' },
  in_progress: { label: '进行中', color: 'text-blue-700', bg: 'bg-blue-100' },
  review: { label: '审核中', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
}

function formatDue(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return '今天'
  if (isTomorrow(d)) return '明天'
  return format(d, 'M月d日')
}

function WeeklyBarChart({ tasks }: { tasks: Task[] }) {
  const weekData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      return {
        label: i === 6 ? '今天' : ['日','一','二','三','四','五','六'][date.getDay()],
        dateStr,
        count: tasks.filter(t => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(dateStr)).length,
      }
    })
    const maxCount = Math.max(...days.map(d => d.count), 1)
    return { days, maxCount }
  }, [tasks])

  return (
    <div className="flex items-end gap-2 h-[80px]">
      {weekData.days.map(d => (
        <div key={d.dateStr} className="group flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {d.count}
          </span>
          <div
            className="w-full max-w-[28px] rounded-t bg-gradient-to-t from-blue-500 to-indigo-400 transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-500"
            style={{ height: `${Math.max((d.count / weekData.maxCount) * 60, d.count > 0 ? 4 : 2)}px` }}
          />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

type ProjectFilterKey = 'all' | 'active' | 'completed' | 'overdue' | 'draft' | 'archived'

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentUser, tasks, projects, customers, conferences, notifications, addTask, updateTask } = useStore()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | 'overdue' | 'today' | 'in_progress'>('all')
  const [projectFilter, setProjectFilter] = useState<ProjectFilterKey>('all')

  const today = startOfDay(new Date())

  // ========== Project filtering with 6 status tabs ==========
  const filteredProjects = useMemo(() => {
    switch (projectFilter) {
      case 'active':
        return projects.filter(p => p.status === 'active')
      case 'completed':
        return projects.filter(p => p.status === 'completed')
      case 'overdue': {
        return projects.filter(p => {
          const meta = (p.metadata as Record<string, unknown>) || {}
          const dueDate = meta.due_date as string | null
          return p.status === 'active' && dueDate && isPast(parseISO(dueDate))
        })
      }
      case 'draft': {
        return projects.filter(p => {
          const meta = (p.metadata as Record<string, unknown>) || {}
          return meta.status === 'draft'
        })
      }
      case 'archived':
        return projects.filter(p => p.status === 'archived')
      default:
        return projects
    }
  }, [projects, projectFilter])

  const projectFilterCounts = useMemo(() => ({
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    overdue: projects.filter(p => {
      const meta = (p.metadata as Record<string, unknown>) || {}
      const dueDate = meta.due_date as string | null
      return p.status === 'active' && dueDate && isPast(parseISO(dueDate))
    }).length,
    draft: projects.filter(p => {
      const meta = (p.metadata as Record<string, unknown>) || {}
      return meta.status === 'draft'
    }).length,
    archived: projects.filter(p => p.status === 'archived').length,
  }), [projects])

  // ========== Weekly stats ==========
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 86400000)
    return {
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      dueSoon: tasks.filter(t =>
        t.status !== 'completed' && t.due_date &&
        !isPast(parseISO(t.due_date)) &&
        differenceInDays(parseISO(t.due_date), now) <= 3
      ).length,
      overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && isPast(parseISO(t.due_date))).length,
    }
  }, [tasks])

  const stats = useMemo(() => ({
    todayMeetings: conferences.filter(c => c.status === 'scheduled' && c.scheduled_at && isToday(parseISO(c.scheduled_at))).length,
    potentialCustomers: customers.filter(c => c.status === 'potential').length,
  }), [customers, conferences])

  // ========== Today's todo tasks ==========
  const recentTasks = useMemo(() => {
    const all = tasks.filter(t => t.status !== 'completed')

    let filtered: typeof tasks = all
    if (taskFilter === 'overdue') {
      filtered = all.filter(t => t.due_date && isBefore(parseISO(t.due_date), today))
    } else if (taskFilter === 'today') {
      filtered = all.filter(t => t.due_date && isSameDay(parseISO(t.due_date), today))
    } else if (taskFilter === 'in_progress') {
      filtered = all.filter(t => t.status === 'in_progress')
    }

    return filtered
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
      })
      .slice(0, 6)
  }, [tasks, taskFilter])

  const filterCounts = useMemo(() => {
    const all = tasks.filter(t => t.status !== 'completed')
    return {
      all: all.length,
      overdue: all.filter(t => t.due_date && isBefore(parseISO(t.due_date), today)).length,
      today: all.filter(t => t.due_date && isSameDay(parseISO(t.due_date), today)).length,
      in_progress: all.filter(t => t.status === 'in_progress').length,
    }
  }, [tasks])

  const activities = useMemo(() => [
    ...notifications.filter(n => !n.read).slice(0, 3).map(n => ({
      id: n.id, type: 'notification' as const, title: n.title, content: n.content, time: format(parseISO(n.created_at), 'HH:mm'),
      icon: n.type === 'message' ? MessageSquare : n.type === 'task' ? ListTodo : n.type === 'meeting' ? Video : FileText,
      color: n.type === 'task' ? 'text-orange-500' : n.type === 'message' ? 'text-blue-500' : n.type === 'meeting' ? 'text-purple-500' : 'text-green-500',
    })),
  ], [notifications])

  const upcomingConferences = useMemo(() =>
    conferences.filter(c => c.status === 'scheduled').sort((a, b) =>
      (a.scheduled_at || '').localeCompare(b.scheduled_at || '')
    ).slice(0, 3),
    [conferences]
  )

  const handleQuickAddTask = () => {
    if (!newTaskTitle.trim()) return
    addTask({
      title: newTaskTitle.trim(),
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: currentUser!.id,
      project_id: null,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      completed_at: null,
    })
    setNewTaskTitle('')
  }

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { status: 'completed', completed_at: new Date().toISOString() })
  }

  const quickActions = [
    { title: 'AI 写作助手', desc: '智能生成文章、报告、翻译', icon: Bot, href: '/ai', color: 'from-violet-500 to-purple-600' },
    { title: '创建新项目', desc: '开始新的工作项目', icon: FolderOpen, href: '/workspace', color: 'from-blue-500 to-cyan-600' },
    { title: '团队沟通', desc: '发送消息、协作讨论', icon: MessageSquare, href: '/collaboration', color: 'from-green-500 to-emerald-600' },
    { title: '发起视频会议', desc: '快速创建在线会议', icon: Video, href: '/video-conference', color: 'from-orange-500 to-red-500' },
    { title: '管理客户', desc: '查看和跟进客户', icon: Contact, href: '/crm', color: 'from-pink-500 to-rose-600' },
    { title: '发布内容', desc: '自媒体多平台发布', icon: Share2, href: '/social-media', color: 'from-amber-500 to-yellow-600' },
  ]

  const projectFilterTabs: { key: ProjectFilterKey; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '进行中' },
    { key: 'completed', label: '已完成' },
    { key: 'overdue', label: '逾期' },
    { key: 'draft', label: '草稿' },
    { key: 'archived', label: '已归档' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            欢迎回来，{currentUser?.full_name || '用户'} 👋
          </h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN })} · 让我们一起高效工作</p>
        </div>
        {weeklyStats.overdue > 0 && (
          <Badge variant="destructive" className="w-fit">
            <AlertCircle className="w-3 h-3 mr-1" />
            {weeklyStats.overdue} 个任务已逾期
          </Badge>
        )}
      </div>

      {/* 本周工作统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '完成任务', value: weeklyStats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { title: '进行中', value: weeklyStats.inProgress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { title: '即将到期', value: weeklyStats.dueSoon, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { title: '逾期', value: weeklyStats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(s => (
          <Card key={s.title} className={`${s.border} border`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 本周完成趋势 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">本周完成趋势</CardTitle>
          <CardDescription className="text-xs">过去 7 天每天完成的任务数</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <WeeklyBarChart tasks={tasks} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-6">
          {/* 快速添加任务 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="✨ 快速添加任务..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickAddTask()}
                  className="flex-1"
                />
                <Button onClick={handleQuickAddTask} size="sm" disabled={!newTaskTitle.trim()}>
                  <Plus className="w-4 h-4 mr-1" />添加
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 今日待办任务 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base">今日待办</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/project-management')} className="text-xs">
                  查看全部 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {([
                  { key: 'all', label: '全部' },
                  { key: 'overdue', label: '逾期' },
                  { key: 'today', label: '今天到期' },
                  { key: 'in_progress', label: '进行中' },
                ] as const).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTaskFilter(f.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      taskFilter === f.key
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                    <span className={`ml-1 text-[10px] ${
                      taskFilter === f.key ? 'opacity-80' : 'text-gray-400'
                    }`}>
                      {filterCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {recentTasks.map(task => {
                  const proj = projects.find(p => p.id === task.project_id)
                  const p = priorityMap[task.priority]
                  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), today) && task.status !== 'completed'
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        isOverdue ? 'bg-red-50' : ''
                      }`}
                    >
                      {/* 点击圆圈标记完成 */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="group shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors"
                        title="标记完成"
                      >
                        <CheckCircle2 className="w-3 h-3 text-gray-300 group-hover:text-green-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {proj && <span className="text-xs text-gray-400">{proj.name}</span>}
                          <span className="text-xs">{p.emoji}</span>
                          {task.due_date && (
                            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {formatDue(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {recentTasks.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 mb-3">今天没有待办任务 ✅</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/project-management')}>
                      <Plus className="w-4 h-4 mr-1" />新建任务
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 最近动态 */}
          {activities.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">最近动态</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="mt-0.5"><a.icon className={`w-4 h-4 ${a.color}`} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm"><span className="font-medium text-gray-800">{a.title}</span></p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{a.content}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{a.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-6">
          {/* 快捷操作 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">快捷操作</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto flex-col items-start gap-1.5 p-3 hover:shadow-md transition-all"
                  onClick={() => navigate(action.href)}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-800">{action.title}</span>
                  <span className="text-[10px] text-gray-400 text-left leading-tight">{action.desc}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* 即将开始的会议 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">即将开始的会议</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/video-conference')} className="text-xs">
                  全部 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {upcomingConferences.map(conf => (
                  <div key={conf.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Video className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{conf.title}</p>
                      <p className="text-xs text-gray-500">
                        {conf.scheduled_at ? format(parseISO(conf.scheduled_at), 'M月d日 HH:mm') : '待定'} · {conf.participants.length}人
                      </p>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => navigate('/video-conference')}>加入</Button>
                  </div>
                ))}
                {upcomingConferences.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无会议安排</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 项目进度总览 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">项目进度总览</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/project-management')} className="text-xs">
                  全部 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* 6个状态标签筛选 */}
              <div className="flex items-center gap-1 flex-wrap mb-3">
                {projectFilterTabs.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setProjectFilter(f.key)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      projectFilter === f.key
                        ? f.key === 'overdue'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                    <span className={`ml-1 text-[10px] ${projectFilter === f.key ? 'opacity-80' : 'text-gray-400'}`}>
                      {projectFilterCounts[f.key]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredProjects.slice(0, 5).map(proj => {
                  const projTasks = tasks.filter(t => t.project_id === proj.id)
                  const done = projTasks.filter(t => t.status === 'completed').length
                  const total = projTasks.length
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  const meta = (proj.metadata as Record<string, unknown>) || {}
                  const dueDate = meta.due_date as string | null
                  const isOverdue = proj.status === 'active' && dueDate && isPast(parseISO(dueDate))

                  return (
                    <div
                      key={proj.id}
                      className={`space-y-1.5 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isOverdue ? 'border-l-2 border-red-500 bg-red-50/50' : ''}`}
                      onClick={() => navigate('/project-management')}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{proj.name}</span>
                        <span className="text-xs text-gray-400">
                          {total === 0 ? '—' : `${done}/${total}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {filteredProjects.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无项目</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
