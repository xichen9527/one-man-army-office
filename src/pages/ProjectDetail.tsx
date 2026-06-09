import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, FolderOpen, ListTodo, FileText, Upload, Trash2, Edit3, Plus } from 'lucide-react'
import { useStore } from '@/store'
import type { Project, Task, Document, DBFile } from '@/types/database'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, tasks, documents, files, fetchProjects, fetchTasks, fetchDocuments, fetchFiles, addTask, updateTask, deleteTask, addDocument, updateDocument, deleteDocument, uploadFile, deleteFile } = useStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'files'>('overview')
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [taskDue, setTaskDue] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [docType, setDocType] = useState<string>('markdown')

  const project = projects.find(p => p.id === id)

  useEffect(() => {
    if (id) {
      fetchTasks()
      fetchDocuments(id)
      fetchFiles(id)
    }
  }, [id])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>项目不存在或已被删除</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>
        </div>
      </div>
    )
  }

  const projectTasks = tasks.filter(t => t.project_id === id)
  const projectDocs = documents.filter(d => d.project_id === id)
  const projectFiles = files.filter(f => f.project_id === id)
  const doneTasks = projectTasks.filter(t => t.status === 'completed').length

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !id) return
    await addTask({
      title: taskTitle,
      description: taskDesc,
      status: 'todo',
      priority: taskPriority,
      assignee_id: null,
      creator_id: '',
      project_id: id,
      due_date: taskDue || null,
      completed_at: null,
    })
    setShowNewTask(false)
    setTaskTitle('')
    setTaskDesc('')
    setTaskPriority('medium')
    setTaskDue('')
  }

  const handleAddDoc = async () => {
    if (!docTitle.trim() || !id) return
    await addDocument({
      title: docTitle,
      content: '',
      type: docType as any,
      project_id: id,
      task_id: null,
      creator_id: '',
      is_public: false,
      is_archived: false,
      version: 1,
      metadata: {},
    })
    setShowNewDoc(false)
    setDocTitle('')
    setDocType('markdown')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
        </div>
        <Badge variant="secondary" className={
          project.status === 'active' ? 'bg-green-100 text-green-700' :
          project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }>
          {project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '已归档'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{projectTasks.length}</p>
                <p className="text-xs text-gray-500">任务总数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold">{doneTasks}/{projectTasks.length}</p>
                <p className="text-xs text-gray-500">完成进度</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{projectDocs.length}</p>
                <p className="text-xs text-gray-500">文档</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{projectFiles.length}</p>
                <p className="text-xs text-gray-500">文件</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'overview', label: '概览' },
          { key: 'tasks', label: '任务' },
          { key: 'documents', label: '文档' },
          { key: 'files', label: '文件' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' :
                      task.status === 'review' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${
                      task.priority === 'urgent' ? 'border-red-300 text-red-600' :
                      task.priority === 'high' ? 'border-orange-300 text-orange-600' :
                      task.priority === 'medium' ? 'border-blue-300 text-blue-600' :
                      'border-green-300 text-green-600'
                    }`}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
                {projectTasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无任务</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近文档</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectDocs.slice(0, 5).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm flex-1 truncate">{doc.title}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(doc.updated_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                ))}
                {projectDocs.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无文档</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowNewTask(true)}>
              <Plus className="w-4 h-4 mr-1" />新建任务
            </Button>
          </div>
          <div className="space-y-2">
            {projectTasks.map(task => (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${
                          task.status === 'completed' ? 'bg-green-50' :
                          task.status === 'in_progress' ? 'bg-blue-50' :
                          task.status === 'review' ? 'bg-yellow-50' :
                          'bg-gray-50'
                        }`}>
                          {task.status}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                          task.priority === 'urgent' ? 'border-red-300 text-red-600' :
                          task.priority === 'high' ? 'border-orange-300 text-orange-600' :
                          task.priority === 'medium' ? 'border-blue-300 text-blue-600' :
                          'border-green-300 text-green-600'
                        }`}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-[10px] text-gray-400">截止: {task.due_date}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowNewDoc(true)}>
              <Plus className="w-4 h-4 mr-1" />新建文档
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {projectDocs.map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{doc.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">
                        更新于 {new Date(doc.updated_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div>
          <div className="space-y-2">
            {projectFiles.map(file => (
              <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {(file.file_size || 0 / 1024).toFixed(1)} KB · {new Date(file.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button onClick={() => deleteFile(file.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {projectFiles.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">暂无文件</p>
            )}
          </div>
        </div>
      )}

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建任务</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="任务标题" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
            <textarea placeholder="任务描述" value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
              className="w-full min-h-[80px] border rounded-md p-2 text-sm resize-y outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)}
                className="border rounded-md px-3 py-2 text-sm">
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
                <option value="urgent">紧急</option>
              </select>
              <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTask(false)}>取消</Button>
            <Button onClick={handleAddTask} disabled={!taskTitle.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Document Dialog */}
      <Dialog open={showNewDoc} onOpenChange={setShowNewDoc}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建文档</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="文档标题" value={docTitle} onChange={e => setDocTitle(e.target.value)} />
            <div className="space-y-2">
              <Label className="text-sm text-gray-500">文档类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'markdown', label: 'Markdown', icon: '📝' },
                  { value: 'richtext', label: '富文本', icon: '📄' },
                  { value: 'code', label: '代码', icon: '💻' },
                  { value: 'word', label: 'Word', icon: '📊' },
                  { value: 'excel', label: 'Excel', icon: '📈' },
                  { value: 'ppt', label: 'PPT', icon: '🎯' },
                  { value: 'mindmap', label: '思维导图', icon: '🧠' },
                  { value: 'flowchart', label: '流程图', icon: '🔀' },
                  { value: 'other', label: '其他', icon: '📎' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDocType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${docType === t.value ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDoc(false)}>取消</Button>
            <Button onClick={handleAddDoc} disabled={!docTitle.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
