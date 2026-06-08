// ============================================================
// ProjectManagement.tsx — 项目管理中心
// 合并自 Projects.tsx + Workspace.tsx
// Tab 结构：项目管理 | 任务看板 | 文档中心 | 文件管理
// ============================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus, ListTodo, KanbanSquare, Search, Filter,
  MoreHorizontal, Edit, Trash2, UserPlus, Calendar,
  AlertCircle, CheckCircle2, Clock, ArrowRight, GripVertical,
  ChevronUp, ChevronDown, Users, X, AlertTriangle,
  FolderOpen, FileText, Upload, Eye, FolderKanban, File, Download,
  History, FolderTree, Grid, List, HardDrive, RotateCcw,
  Save, Edit3, ChevronRight, Share2,
} from 'lucide-react'
import ShareModal from '@/components/ui/share-modal'
import { useStore } from '@/store'
import { supabase } from '@/db/supabase'
import type { ProjectStatus, TaskStatus, TaskPriority } from '@/store'
import type { Task, DBFile } from '@/types/database'
import ReactMarkdown from 'react-markdown'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'


// ==================== Helper Constants ====================

const priorityMap: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: '紧急', color: 'text-red-700', bg: 'bg-red-100' },
  high: { label: '高', color: 'text-orange-700', bg: 'bg-orange-100' },
  medium: { label: '中', color: 'text-blue-700', bg: 'bg-blue-100' },
  low: { label: '低', color: 'text-green-700', bg: 'bg-green-100' },
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: '待办', color: 'text-gray-700', bg: 'bg-gray-100' },
  in_progress: { label: '进行中', color: 'text-blue-700', bg: 'bg-blue-100' },
  review: { label: '审核中', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
}

const projectStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '进行中', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
  archived: { label: '已归档', color: 'text-gray-700', bg: 'bg-gray-100' },
}

const projectPriorityMap: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: '紧急', color: 'text-red-700', bg: 'bg-red-100' },
  high: { label: '高', color: 'text-orange-700', bg: 'bg-orange-100' },
  medium: { label: '中', color: 'text-blue-700', bg: 'bg-blue-100' },
  low: { label: '低', color: 'text-green-700', bg: 'bg-green-100' },
}

const taskTagOptions = ['前端', '后端', '设计', '测试']

const statusColumns = [
  { key: 'todo', label: '待办', color: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-700' },
  { key: 'review', label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'completed', label: '已完成', color: 'bg-green-100 text-green-700' },
]

const statusFlow: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'todo'],
  review: ['completed', 'in_progress'],
  completed: ['in_progress'],
}

type SortKey = 'name' | 'status' | 'progress' | 'due_date'
type SortDir = 'asc' | 'desc'

// From Workspace.tsx
const statusLabels: Record<TaskStatus, string> = { todo: '待办', in_progress: '进行中', review: '审核中', completed: '已完成', cancelled: '已取消' }
const statusColors: Record<TaskStatus, string> = { todo: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700', review: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }
const priorityColors: Record<TaskPriority, string> = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-blue-100 text-blue-700', low: 'bg-green-100 text-green-700' }
const projStatusLabels: Record<ProjectStatus, string> = { active: '进行中', completed: '已完成', archived: '已归档' }
const projStatusColors: Record<ProjectStatus, string> = { active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-600' }


// ==================== Document Templates ====================
const docTemplates: { key: string; label: string; desc: string; content: string }[] = [
  { key: 'blank', label: '空白文档', desc: '从零开始', content: '' },
  { key: 'meeting', label: '会议记录', desc: '标准会议纪要模板', content: `# 会议记录\n**日期**: ${new Date().toLocaleDateString('zh-CN')}\n**地点**: _______________\n**参会人**: _______________\n**记录人**: _______________\n\n## 议题\n\n1. \n2. \n3. \n\n## 讨论内容\n\n### 议题一\n\n### 议题二\n\n### 议题三\n\n## 决议事项\n\n| 序号 | 决议内容 | 责任人 | 截止日期 |\n|------|----------|--------|----------|\n| 1    |          |        |          |\n\n## 下次会议\n\n**时间**: _______________` },
  { key: 'prd', label: 'PRD', desc: '产品需求文档模板', content: `# 产品需求文档 (PRD)\n\n## 1. 文档信息\n\n| 字段   | 内容       |\n|--------|------------|\n| 版本   | v1.0       |\n| 作者   |            |\n| 日期   | ${new Date().toLocaleDateString('zh-CN')} |\n| 状态   | 草稿       |\n\n## 2. 项目背景\n\n## 3. 用户需求\n\n### 3.1 目标用户\n\n### 3.2 用户痛点\n\n### 3.3 使用场景\n\n## 4. 功能需求\n\n### 4.1 功能模块一\n- 需求描述：\n- 验收标准：\n\n### 4.2 功能模块二\n- 需求描述：\n- 验收标准：\n\n## 5. 非功能需求\n\n## 6. 里程碑与排期\n\n| 阶段 | 内容       | 计划完成日期 |\n|------|------------|--------------|\n| V1.0 | MVP 核心功能 |              |` },
  { key: 'api', label: 'API 文档', desc: '接口文档模板', content: `# API 接口文档\n\n## 基础信息\n\n- **Base URL**: \n- **认证方式**: Bearer Token\n- **Content-Type**: application/json\n\n---\n\n## 接口列表\n\n### 1. 获取列表\n\n\`\`\`\nGET /api/items\n\n#### 请求参数\n| 参数 | 类型   | 必填 | 说明     |\n|------|--------|------|----------|\n| page | number | 否   | 页码     |\n| size | number | 否   | 每页数量 |\n\n#### 响应示例\n\`\`\`json\n{\n  "code": 200,\n  "data": {\n    "items": [],\n    "total": 0\n  }\n}\n\`\`\`\n\n### 2. 创建\n\n\`\`\`\nPOST /api/items\n\n#### 请求体\n\`\`\`json\n{\n  "name": "",\n  "description": ""\n}\n\`\`\`\n\n### 3. 更新\n\n\`\`\`\nPUT /api/items/:id\n\n### 4. 删除\n\n\`\`\`\nDELETE /api/items/:id` },
]

// ==================== Helper Functions ====================
function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function isImageFile(file: DBFile): boolean {
  return file.mime_type?.startsWith('image/') ?? false
}

function generateVersionHistory(doc: any) {
  if (!doc) return []
  const versions = []
  const baseDate = new Date(doc.updated_at)
  const numVersions = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < numVersions; i++) {
    const versionDate = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000)
    versions.push({
      id: `version-${doc.id}-${i}`,
      timestamp: versionDate.toISOString(),
      content: i === 0 ? doc.content : `[历史版本 ${i}] ${doc.content?.slice(0, 100) || '文档内容'}...`,
      label: i === 0 ? '当前版本' : `版本 ${numVersions - i}`
    })
  }
  return versions
}


// ==================== Main Component ====================
export default function ProjectManagement() {
  const navigate = useNavigate()
  const {
    currentUser, tasks, projects, members, documents, files,
    addTask, updateTask, deleteTask,
    addProject, updateProject, deleteProject,
    addDocument, updateDocument, deleteDocument,
    uploadFile, deleteFile,
  } = useStore()

  // ========== Tab State ==========
  const [activeTab, setActiveTab] = useState<string>('projects')

  // ========== Shared Search ==========
  const [searchQuery, setSearchQuery] = useState('')

  // ============================================================
  // Section 1: 项目管理 Tab State (from Projects.tsx project cards)
  // ============================================================
  const [projViewMode, setProjViewMode] = useState<'card' | 'list'>('card')
  const [showFilter, setShowFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Record<string, unknown> | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState<{ id: string; name: string } | null>(null)

  // Share modal state
  const [shareModal, setShareModal] = useState<{ open: boolean; itemType: 'project' | 'document' | 'file'; itemId: string; itemName: string; isPublic: boolean } | null>(null)

  // ============================================================
  // Section 2: 任务看板 Tab State (from Projects.tsx kanban/list/card)
  // ============================================================
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list' | 'card'>(() => {
    try { return (localStorage.getItem('projects_view_mode') as 'kanban' | 'list' | 'card') || 'kanban' } catch { return 'kanban' }
  })
  useEffect(() => {
    try { localStorage.setItem('projects_view_mode', taskViewMode) } catch {}
  }, [taskViewMode])

  const [showNewTask, setShowNewTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null)
  const [showProjectDetail, setShowProjectDetail] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // List view sorting
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // ============================================================
  // Section 3: 文档中心 Tab State (from Workspace.tsx documents)
  // ============================================================
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [docPreview, setDocPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Version History
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versionHistory, setVersionHistory] = useState<any[]>([])
  const [selectedVersion, setSelectedVersion] = useState<any>(null)
  const [previewVersionContent, setPreviewVersionContent] = useState<string | null>(null)

  // Folder Tree
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [folderList, setFolderList] = useState<{ id: string; name: string; projectId: string }[]>([
    { id: 'all', name: '全部文档', projectId: '' },
    { id: 'uncategorized', name: '未分类', projectId: '' },
  ])

  // Doc form
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')

  // ============================================================
  // Error / Feedback State (global, shared across tabs)
  // ============================================================
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const clearFeedback = () => { setActionError(null); setActionSuccess(null) }

  // Auto-clear feedback after 3s
  useEffect(() => {
    if (!actionError && !actionSuccess) return
    const t = setTimeout(clearFeedback, 3500)
    return () => clearTimeout(t)
  }, [actionError, actionSuccess])

  // ============================================================
  // Section 4: 文件管理 Tab State (from Workspace.tsx files)
  // ============================================================
  const [fileViewMode, setFileViewMode] = useState<'grid' | 'list'>('list')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<DBFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ========== Refs ==========
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ============================================================
  // Shared Computed Values
  // ============================================================

  // Project progress calculation
  function getProjectProgress(projectId: string) {
    const projectTasks = tasks.filter(t => t.project_id === projectId)
    if (projectTasks.length === 0) return 0
    const completed = projectTasks.filter(t => t.status === 'completed').length
    return Math.round((completed / projectTasks.length) * 100)
  }

  // Get task assignee info
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

  function getProjectMembers(projectId: string) {
    const assigned = tasks
      .filter(t => t.project_id === projectId && t.assignee_id)
      .map(t => t.assignee_id as string)
    const uniqueIds = [...new Set(assigned)]
    return uniqueIds.slice(0, 3)
  }

  // Filtered projects (for project cards tab)
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
    }
    if (statusFilter) result = result.filter(p => p.status === statusFilter)
    if (priorityFilter) {
      result = result.filter(p => {
        const meta = (p.metadata as Record<string, unknown>) || {}
        return (meta.priority as string) === priorityFilter
      })
    }
    return result
  }, [projects, searchQuery, statusFilter, priorityFilter])

  // Filtered tasks (for kanban tab)
  const filteredTasks = useMemo(() => {
    let result = tasks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      )
    }
    if (statusFilter) result = result.filter(t => t.status === statusFilter)
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter)
    if (tagFilter.length > 0) {
      result = result.filter(t => t.tags && tagFilter.some(tag => t.tags!.includes(tag)))
    }
    return result
  }, [tasks, searchQuery, statusFilter, priorityFilter, tagFilter])

  // Tasks grouped by status (for kanban)
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], in_progress: [], review: [], completed: [] }
    filteredTasks.forEach(task => {
      if (grouped[task.status]) grouped[task.status].push(task)
      else grouped.todo.push(task)
    })
    return grouped
  }, [filteredTasks])

  // Sorted projects (for list view)
  const sortedProjects = useMemo(() => {
    const list = [...projects].filter(p => {
      if (!searchQuery.trim()) return true
      return p.name.toLowerCase().includes(searchQuery.toLowerCase())
    })
    list.sort((a, b) => {
      let cmp = 0
      const metaA = (a.metadata as Record<string, unknown>) || {}
      const metaB = (b.metadata as Record<string, unknown>) || {}
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name, 'zh-CN'); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'progress': { const pa = getProjectProgress(a.id); const pb = getProjectProgress(b.id); cmp = pa - pb; break }
        case 'due_date': {
          const da = metaA.due_date as string | null
          const db = metaB.due_date as string | null
          if (!da && !db) cmp = 0
          else if (!da) cmp = 1
          else if (!db) cmp = -1
          else cmp = da.localeCompare(db)
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [projects, searchQuery, sortKey, sortDir])

  // Filtered documents (for document tab)
  const filteredDocs = useMemo(() => {
    let docs = documents.filter(d => !searchQuery || d.title.includes(searchQuery))
    if (selectedFolder === 'all' || !selectedFolder) return docs
    else if (selectedFolder === 'uncategorized') return docs.filter(d => !d.project_id)
    else if (selectedFolder.startsWith('project-')) {
      const projectId = selectedFolder.replace('project-', '')
      return docs.filter(d => d.project_id === projectId)
    }
    return docs
  }, [documents, searchQuery, selectedFolder])

  // Storage usage
  const storageUsage = useMemo(() => {
    const totalFiles = files.length
    const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
    return { totalFiles, totalSize, formattedSize: formatFileSize(totalSize) }
  }, [files])

  // ========== Effects ==========
  useEffect(() => {
    const projectFolders = projects
      .filter(p => p.status === 'active')
      .map(p => ({ id: `project-${p.id}`, name: p.name, projectId: p.id }))
    setFolderList([
      { id: 'all', name: '全部文档', projectId: '' },
      { id: 'uncategorized', name: '未分类', projectId: '' },
      ...projectFolders,
    ])
  }, [projects])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // ========== Handlers ==========

  // -- Project handlers --
  function confirmDeleteProject(id: string) {
    deleteProject(id)
    setDeleteConfirmId(null)
  }

  // -- Task handlers --
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
    const targetColumn = statusColumns.find(c => c.key === overId)
      ? overId
      : filteredTasks.find(t => t.id === overId)?.status
    if (targetColumn) {
      const task = filteredTasks.find(t => t.id === taskId)
      if (task && task.status !== targetColumn) {
        updateTask(taskId, { status: targetColumn as Task['status'] })
      }
    }
  }

  function moveTask(taskId: string, newStatus: string) {
    updateTask(taskId, { status: newStatus as Task['status'] })
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  // -- Document handlers --
  const autoSave = useCallback((docId: string, title: string, content: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      await updateDocument(docId, { title, content })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 2000)
  }, [updateDocument])

  function openDoc(docId: string) {
    setEditingDoc(docId)
    setSaveStatus('idle')
    setShowVersionHistory(false)
    setSelectedVersion(null)
    setPreviewVersionContent(null)
    const d = documents.find(dd => dd.id === docId)
    if (d) { setDocTitle(d.title); setDocContent(d.content) }
  }

  function handleShowVersionHistory() {
    if (editingDoc) {
      const doc = documents.find(d => d.id === editingDoc)
      if (doc) {
        const versions = generateVersionHistory(doc)
        setVersionHistory(versions)
        setShowVersionHistory(true)
      }
    }
  }

  function handlePreviewVersion(version: any) {
    setSelectedVersion(version)
    setPreviewVersionContent(version.content)
  }

  async function handleRestoreVersion() {
    if (selectedVersion && editingDoc) {
      setDocContent(selectedVersion.content)
      await updateDocument(editingDoc, { content: selectedVersion.content })
      setShowVersionHistory(false)
      setSelectedVersion(null)
      setPreviewVersionContent(null)
      const doc = documents.find(d => d.id === editingDoc)
      if (doc) setVersionHistory(generateVersionHistory(doc))
    }
  }

  // -- File handlers --
  const handleFileUpload = useCallback(async (fileList: FileList | File[]) => {
    const filesArr = Array.from(fileList)
    if (filesArr.length === 0) return
    setUploading(true)
    setUploadProgress(0)
    for (let i = 0; i < filesArr.length; i++) {
      const pct = Math.round(((i) / filesArr.length) * 100)
      setUploadProgress(pct)
      await uploadFile(filesArr[i], undefined, (p) => {
        setUploadProgress(Math.round(((i + p / 100) / filesArr.length) * 100))
      })
    }
    setUploading(false)
    setUploadProgress(100)
    setTimeout(() => setUploadProgress(0), 1000)
  }, [uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])


  // ==================== Render ====================
  return (
    <div className="p-6 space-y-6">
      {/* Error / Success Feedback Banner */}
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="shrink-0">❌</span>
          <span>{actionError}</span>
          <button onClick={clearFeedback} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          <span className="shrink-0">✅</span>
          <span>{actionSuccess}</span>
          <button onClick={clearFeedback} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">项目管理中心</h1>
        <p className="text-sm text-gray-500 mt-1">管理项目、任务、文档和文件</p>
      </div>

      {/* Search (shared) */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜索项目、任务、文档、文件..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects" className="gap-1.5"><FolderOpen className="w-4 h-4" />项目管理</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="w-4 h-4" />任务看板</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-4 h-4" />文档中心</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><Upload className="w-4 h-4" />文件管理</TabsTrigger>
        </TabsList>


        {/* =============== Tab: 项目管理 =============== */}
        <TabsContent value="projects" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={projViewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjViewMode('card')}
              >卡片</Button>
              <Button
                variant={projViewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProjViewMode('list')}
              >列表</Button>
            </div>
            <div className="flex gap-2">
              {/* Filter */}
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
                  <Filter className="w-4 h-4 mr-2" />
                  筛选
                  {(statusFilter || priorityFilter) && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                      {(statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
                {showFilter && (
                  <div className="absolute top-full mt-2 left-0 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">状态</label>
                        <select
                          value={statusFilter || ''}
                          onChange={e => setStatusFilter(e.target.value || null)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">全部</option>
                          {Object.entries(projectStatusMap).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">优先级</label>
                        <select
                          value={priorityFilter || ''}
                          onChange={e => setPriorityFilter(e.target.value || null)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">全部</option>
                          {Object.entries(projectPriorityMap).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">标签</label>
                        <div className="flex gap-1 flex-wrap">
                          {taskTagOptions.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setTagFilter(prev =>
                                  prev.includes(tag)
                                    ? prev.filter(t => t !== tag)
                                    : [...prev, tag]
                                )
                              }}
                              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                                tagFilter.includes(tag)
                                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(statusFilter || priorityFilter || tagFilter.length > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => { setStatusFilter(null); setPriorityFilter(null); setTagFilter([]) }}
                        >
                          清除筛选
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => { setEditingProject(null); setShowNewProject(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                新建项目
              </Button>
            </div>
          </div>

          {/* Content: Card View */}
          {projViewMode === 'card' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map(proj => {
                const projTasks = tasks.filter(t => t.project_id === proj.id)
                const done = projTasks.filter(t => t.status === 'completed').length
                const meta = (proj.metadata as Record<string, unknown>) || {}
                const dueDate = meta.due_date as string | null
                const priority = (meta.priority as string) || 'medium'
                const client = meta.client as string | null
                const progress = getProjectProgress(proj.id)
                const overdue = dueDate && new Date(dueDate) < new Date() && proj.status !== 'completed'
                return (
                  <Card key={proj.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{proj.name}</CardTitle>
                          {proj.description && (
                            <CardDescription className="mt-1 line-clamp-2">{proj.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setShareModal({ open: true, itemType: 'project', itemId: proj.id, itemName: proj.name, isPublic: proj.is_public }) }}>
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setEditingProject(proj as unknown as Record<string, unknown>); setShowNewProject(true) }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(proj.id) }}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={projectStatusMap[proj.status]?.bg + ' ' + projectStatusMap[proj.status]?.color}>
                            {projectStatusMap[proj.status]?.label}
                          </Badge>
                          <Badge variant="secondary" className={projectPriorityMap[priority]?.bg + ' ' + projectPriorityMap[priority]?.color}>
                            {projectPriorityMap[priority]?.label}
                          </Badge>
                          {overdue && (
                            <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />逾期</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{done}/{projTasks.length} 完成</span>
                      </div>
                      {client && <p className="text-xs text-gray-400 mt-2">客户：{client}</p>}
                      {dueDate && (
                        <p className={`text-xs mt-1 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          截止：{new Date(dueDate).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                      <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: projTasks.length ? `${(done / projTasks.length) * 100}%` : '0%' }} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Content: List View */}
          {projViewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                        onClick={() => handleSort('name')}>
                        <span className="flex items-center gap-1">项目名称 <SortIcon k="name" /></span>
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">状态</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">优先级</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">客户</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                        onClick={() => handleSort('progress')}>
                        <span className="flex items-center gap-1">进度 <SortIcon k="progress" /></span>
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                        onClick={() => handleSort('due_date')}>
                        <span className="flex items-center gap-1">截止日期 <SortIcon k="due_date" /></span>
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">暂无项目</td></tr>
                    )}
                    {sortedProjects.map(proj => {
                      const meta = (proj.metadata as Record<string, unknown>) || {}
                      const dueDate = meta.due_date as string | null
                      const priority = (meta.priority as string) || 'medium'
                      const client = meta.client as string | null
                      const progress = getProjectProgress(proj.id)
                      const projTasks = tasks.filter(t => t.project_id === proj.id)
                      const overdue = dueDate && new Date(dueDate) < new Date() && proj.status !== 'completed'
                      return (
                        <tr key={proj.id} className="border-b hover:bg-gray-50 group">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color || '#3B82F6' }} />
                              <span className="font-medium text-sm text-blue-600">{proj.name}</span>
                            </div>
                            {proj.description && <div className="text-xs text-gray-400 mt-0.5">{proj.description}</div>}
                          </td>
                          <td className="p-3">
                            <Badge className={projectStatusMap[proj.status]?.bg + ' ' + projectStatusMap[proj.status]?.color}>
                              {projectStatusMap[proj.status]?.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={projectPriorityMap[priority]?.bg + ' ' + projectPriorityMap[priority]?.color}>
                              {projectPriorityMap[priority]?.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-gray-600">{client || '-'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: proj.color || '#3B82F6' }} />
                              </div>
                              <span className="text-xs text-gray-500">{progress}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {dueDate ? (
                              <span className={overdue ? 'text-red-500 font-medium' : 'text-gray-600'}>
                                {new Date(dueDate).toLocaleDateString('zh-CN')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setShareModal({ open: true, itemType: 'project', itemId: proj.id, itemName: proj.name, isPublic: proj.is_public })}>
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingProject(proj as unknown as Record<string, unknown>); setShowNewProject(true) }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100"
                              onClick={() => setDeleteConfirmId(proj.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Delete confirm overlay */}
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <Card className="w-full max-w-sm mx-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <CardTitle className="text-base">确认删除</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">确定要删除此项目吗？关联的任务也会一并删除，此操作不可撤销。</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>取消</Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => confirmDeleteProject(deleteConfirmId)}>
                      确认删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* New/Edit Project Modal */}
          {showNewProject && (
            <ProjectModal
              onClose={() => { setShowNewProject(false); setEditingProject(null) }}
              onSave={async (data: Record<string, unknown>) => {
                clearFeedback()
                try {
                  if (editingProject) {
                    await updateProject(editingProject.id as string, data)
                  } else {
                    await addProject(data)
                  }
                  setShowNewProject(false)
                  setEditingProject(null)
                  setActionSuccess('项目保存成功')
                } catch (e: any) {
                  setActionError('项目保存失败：' + (e?.message || '数据库错误，请检查RLS策略或网络连接'))
                }
              }}
              project={editingProject}
            />
          )}
        </TabsContent>

        {/* =============== Tab: 任务看板 =============== */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (taskViewMode === 'kanban') setTaskViewMode('list')
                else if (taskViewMode === 'list') setTaskViewMode('card')
                else setTaskViewMode('kanban')
              }}>
                {taskViewMode === 'kanban' ? <><ListTodo className="w-4 h-4 mr-2" />列表视图</> :
                  taskViewMode === 'list' ? (
                    <div className="w-4 h-4 mr-2 grid grid-cols-2 gap-0.5">
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                    </div>
                  ) : <><KanbanSquare className="w-4 h-4 mr-2" />看板视图</>}
                {taskViewMode === 'kanban' ? '列表视图' : taskViewMode === 'list' ? '卡片视图' : '看板视图'}
              </Button>
            </div>
            <Button onClick={() => { setEditingTask(null); setShowNewTask(true) }}>
              <Plus className="w-4 h-4 mr-2" />新建任务
            </Button>
          </div>

          {/* Kanban View */}
          {taskViewMode === 'kanban' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                {statusColumns.map(col => (
                  <Card key={col.key}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{col.label}</span>
                        <Badge className={col.color}>{tasksByStatus[col.key]?.length || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
                  {statusColumns.map(col => (
                    <KanbanColumn key={col.key} col={col} tasks={tasksByStatus[col.key]}>
                      {tasksByStatus[col.key]?.map(task => (
                        <DraggableTaskCard
                          key={task.id}
                          task={task}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => deleteTask(task.id)}
                          onMove={(newStatus) => moveTask(task.id, newStatus)}
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
            </>
          )}

          {/* List View */}
          {taskViewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-medium text-gray-600">任务标题</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">状态</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">优先级</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">截止日期</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">负责人</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">暂无任务</td></tr>
                    )}
                    {filteredTasks.map(task => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
                      return (
                        <tr key={task.id} className="border-b hover:bg-gray-50 group">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3 text-gray-300" />
                              <span className="text-sm">{task.title}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={statusMap[task.status]?.bg + ' ' + statusMap[task.status]?.color}>
                              {statusMap[task.status]?.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={priorityMap[task.priority]?.bg + ' ' + priorityMap[task.priority]?.color}>
                              {priorityMap[task.priority]?.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {task.due_date ? (
                              <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'}>
                                {new Date(task.due_date).toLocaleDateString('zh-CN')}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-3">
                            {task.assignee_id && (
                              <div className="flex items-center gap-1">
                                <div className={`w-5 h-5 rounded-full ${getAvatarColor(task.assignee_id)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {getMemberInitials(task.assignee_id)}
                                </div>
                                <span className="text-xs text-gray-500">{getMemberName(task.assignee_id)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100"
                              onClick={() => deleteTask(task.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* New/Edit Task Modal */}
          {showNewTask && (
            <TaskModal
              onClose={() => { setShowNewTask(false); setEditingTask(null) }}
              onSave={async (data) => {
                clearFeedback()
                try {
                  if (editingTask) {
                    await updateTask(editingTask.id, data)
                  } else {
                    await addTask({ ...data, project_id: data.project_id || projects[0]?.id || null })
                  }
                  setShowNewTask(false)
                  setEditingTask(null)
                  setActionSuccess('任务保存成功')
                } catch (e: any) {
                  setActionError('任务保存失败：' + (e?.message || '数据库错误，请检查RLS策略或网络连接'))
                }
              }}
              task={editingTask}
              projects={projects}
              members={members}
              currentUser={currentUser}
            />
          )}
        </TabsContent>

        {/* =============== Tab: 文档中心 =============== */}
        <TabsContent value="documents">
          {editingDoc ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input value={docTitle} onChange={e => { setDocTitle(e.target.value); autoSave(editingDoc!, e.target.value, docContent) }}
                    className="font-medium" placeholder="文档标题" />
                  <span className="text-xs shrink-0 w-16 text-center">
                    {saveStatus === 'saving' && <span className="text-yellow-500">保存中</span>}
                    {saveStatus === 'saved' && <span className="text-green-500">✓ 已保存</span>}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <Button variant="outline" size="sm" onClick={handleShowVersionHistory}>
                    <History className="w-3.5 h-3.5 mr-1" />版本历史
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDocPreview(!docPreview)}>
                    {docPreview ? <><Edit3 className="w-3.5 h-3.5 mr-1" />编辑</> : <><Eye className="w-3.5 h-3.5 mr-1" />预览</>}
                  </Button>
                  <Button size="sm" onClick={() => { updateDocument(editingDoc, { title: docTitle, content: docContent }); setEditingDoc(null); setSaveStatus('idle') }}>
                    <Save className="w-3.5 h-3.5 mr-1" />保存
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDoc(null)}>取消</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`flex gap-4 ${showVersionHistory ? 'w-2/3' : 'w-full'}`}>
                  {/* Main Editor */}
                  <div className="flex-1">
                    {docPreview ? (
                      <div className="prose prose-sm max-w-none p-4 min-h-[400px] bg-gray-50 rounded-lg">
                        <ReactMarkdown>{docContent || '*暂无内容*'}</ReactMarkdown>
                      </div>
                    ) : (
                      <textarea
                        value={docContent}
                        onChange={e => { setDocContent(e.target.value); autoSave(editingDoc!, docTitle, e.target.value) }}
                        className="w-full min-h-[400px] p-4 border rounded-lg font-mono text-sm resize-y outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        placeholder="使用 Markdown 编写内容..."
                      />
                    )}
                  </div>

                  {/* Version History Sidebar */}
                  {showVersionHistory && (
                    <div className="w-1/3 border-l pl-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">版本历史</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {versionHistory.map((version, idx) => (
                            <div
                              key={version.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedVersion?.id === version.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                              }`}
                              onClick={() => handlePreviewVersion(version)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{version.label}</span>
                                {idx === 0 && <Badge variant="secondary" className="text-[10px]">当前</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(version.timestamp).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {previewVersionContent !== null && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">版本预览</h4>
                            {selectedVersion && !selectedVersion.id.endsWith('-0') && (
                              <Button size="sm" variant="outline" onClick={handleRestoreVersion}>
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />恢复此版本
                              </Button>
                            )}
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm max-h-[200px] overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-xs">{previewVersionContent}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Document list header */}
              <div className="flex justify-end mb-3">
                <Button size="sm" onClick={() => { setNewDocTitle(''); setNewDocContent(''); setSelectedTemplate('blank'); setShowNewDoc(true) }}>
                  <Plus className="w-4 h-4 mr-1" />新建文档
                </Button>
              </div>
              {/* Folder Tree + Document Grid */}
              <div className="flex gap-4">
                {/* Folder Tree */}
                <div className="w-64 shrink-0">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FolderTree className="w-4 h-4" />文件夹
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {folderList.map(folder => (
                          <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedFolder === folder.id
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FolderOpen className={`w-4 h-4 ${selectedFolder === folder.id ? 'text-blue-500' : 'text-gray-400'}`} />
                              <span className="truncate">{folder.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Document Grid */}
                <div className="flex-1">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDocs.map(doc => {
                      const proj = projects.find(p => p.id === doc.project_id)
                      return (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => openDoc(doc.id)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                  <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{doc.content?.slice(0, 80) || '暂无内容'}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); setShareModal({ open: true, itemType: 'document', itemId: doc.id, itemName: doc.title, isPublic: doc.is_public || false }) }}
                                  className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteDocument(doc.id) }}
                                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                              {proj && <span className="text-[10px] text-gray-400">{proj.name}</span>}
                              {doc.is_public && <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-600">公开</Badge>}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">更新于 {new Date(doc.updated_at).toLocaleDateString()}</p>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* New Document Modal */}
          {showNewDoc && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewDoc(false)}>
              <Card className="w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>新建文档</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewDoc(false)} className="p-1"><X className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>文档标题</Label>
                    <Input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="输入文档标题" autoFocus />
                  </div>
                  <div>
                    <Label>模板</Label>
                    <div className="flex gap-2 mt-1">
                      {['blank', 'meeting', 'report', 'proposal'].map(t => (
                        <Button key={t} variant={selectedTemplate === t ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTemplate(t)}>
                          {t === 'blank' ? '空白' : t === 'meeting' ? '会议纪要' : t === 'report' ? '报告' : '方案'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>内容</Label>
                    <textarea
                      value={newDocContent}
                      onChange={e => setNewDocContent(e.target.value)}
                      className="w-full min-h-[200px] p-3 border rounded-lg text-sm font-mono resize-y outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      placeholder={selectedTemplate === 'meeting' ? '# 会议主题\n\n## 参会人员\n\n## 议程\n\n## 决议' : selectedTemplate === 'report' ? '# 报告标题\n\n## 摘要\n\n## 详情' : selectedTemplate === 'proposal' ? '# 方案标题\n\n## 背景\n\n## 方案\n\n## 预期效果' : ''}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewDoc(false)}>取消</Button>
                    <Button size="sm" disabled={!newDocTitle.trim()} onClick={async () => {
                      if (!newDocTitle.trim()) return
                      clearFeedback()
                      try {
                        const template = selectedTemplate === 'blank' ? newDocContent : (selectedTemplate === 'meeting' ? '# 会议主题\n\n## 参会人员\n\n## 议程\n\n## 决议\n\n' + newDocContent : selectedTemplate === 'report' ? '# 报告标题\n\n## 摘要\n\n## 详情\n\n' + newDocContent : selectedTemplate === 'proposal' ? '# 方案标题\n\n## 背景\n\n## 方案\n\n## 预期效果\n\n' + newDocContent : newDocContent)
                        await addDocument({ title: newDocTitle.trim(), content: template })
                        setShowNewDoc(false)
                        setNewDocTitle('')
                        setNewDocContent('')
                        setActionSuccess('文档创建成功')
                      } catch (e: any) {
                        setActionError('文档创建失败：' + (e?.message || '数据库错误，请检查RLS策略或网络连接'))
                      }
                    }}>创建文档</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =============== Tab: 文件管理 =============== */}
        <TabsContent value="files" className="space-y-4">
          {/* Storage Usage */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">存储空间使用情况</p>
                    <p className="text-xs text-gray-500">总文件数: {storageUsage.totalFiles} | 总大小: {storageUsage.formattedSize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={fileViewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setFileViewMode('list')}>
                    <List className="w-4 h-4" />
                  </Button>
                  <Button variant={fileViewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setFileViewMode('grid')}>
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Zone */}
          <Card>
            <CardContent className="p-6">
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-300'}`} />
                <p className={`font-medium transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isDragging ? '放开以上传文件' : '拖拽文件到此处上传'}
                </p>
                <p className="text-sm text-gray-400 mt-1">或点击选择文件（支持所有常见格式）</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={e => e.stopPropagation()}>
                  选择文件
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files) handleFileUpload(e.target.files) }}
              />
              {uploadProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{uploading ? '上传中...' : '上传完成'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File List/Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">文件列表 ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <File className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">暂无文件</p>
                </div>
              ) : fileViewMode === 'list' ? (
                <div className="space-y-2">
                  {files.map(file => {
                    const isImg = isImageFile(file)
                    const publicUrl = file.file_path
                      ? supabase.storage.from('files').getPublicUrl(file.file_path).data.publicUrl
                      : ''
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group">
                        {isImg ? (
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0 cursor-pointer" onClick={() => setImagePreview(file)}>
                            <img src={publicUrl} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0">
                            <File className="w-5 h-5 text-blue-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>·</span>
                            <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isImg && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImagePreview(file)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <a href={publicUrl} target="_blank" rel="noreferrer" download={file.name}
                            className="flex items-center justify-center h-8 w-8 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500">
                            <Download className="w-4 h-4" />
                          </a>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => deleteFile(file.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {files.map(file => {
                    const isImg = isImageFile(file)
                    const publicUrl = file.file_path
                      ? supabase.storage.from('files').getPublicUrl(file.file_path).data.publicUrl
                      : ''
                    return (
                      <div key={file.id} className="group relative">
                        <div className="aspect-square rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden bg-gray-50">
                          {isImg ? (
                            <img src={publicUrl} alt={file.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setImagePreview(file)} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <File className="w-12 h-12 text-blue-400" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-start justify-between gap-1">
                          <p className="text-xs font-medium truncate flex-1" title={file.name}>{file.name}</p>
                          <button onClick={() => deleteFile(file.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400">{formatFileSize(file.file_size)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Preview Modal */}
          <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              {imagePreview && (
                <img src={supabase.storage.from('files').getPublicUrl(imagePreview.file_path).data.publicUrl}
                  alt={imagePreview.name} className="w-full max-h-[70vh] object-contain" />
              )}
            </DialogContent>
          </Dialog>

          {/* Share Modal */}
          {shareModal && (
            <ShareModal
              open={shareModal.open}
              onClose={() => setShareModal(null)}
              itemType={shareModal.itemType}
              itemId={shareModal.itemId}
              itemName={shareModal.itemName}
              isPublic={shareModal.isPublic}
              onVisibilityChange={async (isPublic) => {
                if (shareModal.itemType === 'project') {
                  try {
                    await updateProject(shareModal.itemId, { is_public: isPublic })
                    setActionSuccess(isPublic ? 'Project is now public' : 'Project is now private')
                  } catch (e) { console.error('share visibility update failed:', e); setActionError('Failed to update sharing settings') }
                } else if (shareModal.itemType === 'document') {
                  try {
                    await updateDocument(shareModal.itemId, { is_public: isPublic })
                    setActionSuccess(isPublic ? 'Document is now public' : 'Document is now private')
                  } catch (e) { console.error(e); setActionError('Failed to update sharing settings') }
                }
                setShareModal(s => s ? { ...s, isPublic } : null)
              }}
            />
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}

// ==================== Sub-components ====================

// Kanban Column (droppable)
function KanbanColumn({ col, tasks, children }: {
  col: typeof statusColumns[number]
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${col.color.split(' ')[0]} ${col.color.split(' ')[1]}`}>
        <span className="font-medium text-sm">{col.label}</span>
        <Badge variant="secondary" className="ml-auto">{tasks?.length || 0}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[200px] transition-colors ${
          isOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

// Draggable Task Card
function DraggableTaskCard({ task, onEdit, onDelete, onMove, memberName, memberInitials, avatarColor }: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onMove: (status: string) => void
  memberName?: string
  memberInitials?: string
  avatarColor?: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
    transition: 'box-shadow 0.2s, opacity 0.2s',
  }
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  return (
    <Card ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1 flex-1">
            <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span className="font-medium text-sm">{task.title}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit() }} className="flex-shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={priorityMap[task.priority]?.bg + ' ' + priorityMap[task.priority]?.color}>
            {priorityMap[task.priority]?.label}
          </Badge>
          {task.tags && task.tags.length > 0 && task.tags.map(tag => (
            <Badge key={tag} className="bg-gray-100 text-gray-600 text-xs">{tag}</Badge>
          ))}
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700">
              <AlertCircle className="w-3 h-3 mr-1" />逾期
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                {new Date(task.due_date).toLocaleDateString('zh-CN')}
              </span>
            )}
            {memberName && (
              <div className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-full ${avatarColor || 'bg-blue-400'} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {memberInitials}
                </div>
                <span className="text-gray-400">{memberName}</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Edit className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 className="w-3 h-3 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Drag Overlay Card
function TaskCardOverlay({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  return (
    <Card className="shadow-xl opacity-90 rotate-2">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3 text-gray-300" />
          <span className="font-medium text-sm">{task.title}</span>
        </div>
        {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
        <div className="flex items-center gap-2">
          <Badge className={priorityMap[task.priority]?.bg + ' ' + priorityMap[task.priority]?.color}>
            {priorityMap[task.priority]?.label}
          </Badge>
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />逾期</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== TaskModal ====================
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
  const [projectId, setProjectId] = useState(task?.project_id || projects[0]?.id || null)
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || currentUser?.id || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(task?.tags || [])

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function handleSave() {
    onSave({
      title, description, status, priority,
      due_date: dueDate || null,
      project_id: projectId || null,
      assignee_id: assigneeId || null,
      tags: selectedTags.length > 0 ? selectedTags : null,
    })
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
            <textarea className="w-full border rounded-md p-2 text-sm" rows={3}
              value={description} onChange={e => setDescription(e.target.value)} placeholder="任务描述..." />
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
                {currentUser && (
                  <option value={currentUser.id}>我（{currentUser.full_name || currentUser.username || '我'}）</option>
                )}
                {members.filter(m => m.user_id !== currentUser?.id).map(m => (
                  <option key={m.id || m.user_id} value={m.user_id || m.id}>
                    {m.full_name || m.email || '成员'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block">标签</label>
            <div className="flex gap-2 flex-wrap">
              {taskTagOptions.map(tag => (
                <button key={tag} type="button" onClick={toggleTag}
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
            <select className="w-full border rounded-md p-2 text-sm" value={projectId || ''} onChange={e => setProjectId(e.target.value || null)}>
              <option value="">无项目</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
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

// ==================== ProjectModal ====================
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
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>(
    (project?.status as 'active' | 'completed' | 'archived') || 'active'
  )

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
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="项目名称" />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <textarea className="w-full border rounded-md p-2 text-sm" rows={3}
              value={description} onChange={e => setDescription(e.target.value)} placeholder="项目描述..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">状态</label>
              <select className="w-full border rounded-md p-2 text-sm" value={status}
                onChange={e => setStatus(e.target.value as 'active' | 'completed' | 'archived')}>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="archived">已归档</option>
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
              <label className="text-sm font-medium">客户</label>
              <Input value={client} onChange={e => setClient(e.target.value)} placeholder="客户名称" />
            </div>
            <div>
              <label className="text-sm font-medium">截止日期</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">颜色</label>
            <div className="flex items-center gap-2">
              <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
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
