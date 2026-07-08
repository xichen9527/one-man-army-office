import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Plus, Send, Trash2, MessageSquare, Search, Sparkles, Bot,
  FileText, Languages, Globe, Image, PenTool, ChevronLeft,
  BarChart3, Menu, X, Copy, RotateCcw, Loader2, Download, Check,
  BotIcon, Settings, ChevronDown, AlertCircle, CheckCircle
} from 'lucide-react'
import { useStore } from '@/store'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'

const featureTypes = [
  { value: 'text_generation', label: '文本生成', icon: PenTool, desc: '智能生成各类文本内容', dbType: 'chat' as const },
  { value: 'ai_search', label: 'AI 搜索', icon: Search, desc: 'AI 驱动的智能搜索', dbType: 'analysis' as const },
  { value: 'translation', label: '翻译助手', icon: Languages, desc: '多语言互译', dbType: 'translate' as const },
  { value: 'web_summary', label: '网页摘要', icon: Globe, desc: '提取网页核心内容', dbType: 'summary' as const },
  { value: 'multimodal_analysis', label: '多模态分析', icon: Image, desc: '图片/文档智能分析', dbType: 'analysis' as const },
  { value: 'writing_assistant', label: '写作助手', icon: FileText, desc: '周报、文案自动生成', dbType: 'writing' as const },
]

// Simple inline toast component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <Check className="w-4 h-4 text-green-400" />
      {message}
    </div>
  )
}

export default function AIAssistant() {
  const navigate = useNavigate()
  const {
    aiConversations, aiMessages, activeAIConv,
    setActiveAIConv, createAIConv, sendAIMessage, deleteAIConv, deleteAIMessage,
    fetchAIMessages,
  } = useStore()

  const [inputValue, setInputValue] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState('text_generation')
  const [newTitle, setNewTitle] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isThinking, setIsThinking] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null)
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [apiStatus, setApiStatus] = useState<{ name: string; model: string } | null>(null)
  const [showModelSwitch, setShowModelSwitch] = useState(false)
  const modelSwitchRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭模型切换下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelSwitchRef.current && !modelSwitchRef.current.contains(e.target as Node)) {
        setShowModelSwitch(false)
      }
    }
    if (showModelSwitch) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showModelSwitch])

  // 读取当前 API 配置
  const refreshApiStatus = () => {
    try {
      const configs = JSON.parse(localStorage.getItem('ai_api_configs') || '[]')
      const active = configs.find((c: any) => c.isDefault) || configs[0]
      if (active) setApiStatus({ name: active.name, model: active.model })
      else setApiStatus(null)
    } catch { setApiStatus(null) }
  }

  // 初始化 + 每次标签页重新可见时刷新 API 状态（用户在 Settings 配置后切回来能立即看到）
  useEffect(() => {
    refreshApiStatus()
    const onVisible = () => { if (document.visibilityState === 'visible') refreshApiStatus() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [activeAIConv])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentMessages = aiMessages[activeAIConv] || []
  const currentConv = aiConversations.find(c => c.id === activeAIConv)

  // 切换对话时加载消息
  useEffect(() => {
    if (activeAIConv) {
      fetchAIMessages(activeAIConv)
    }
  }, [activeAIConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages.length, isThinking])

  // Cleanup toast timer
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, visible: true })
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 2500)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !activeAIConv || isThinking) return
    const msg = inputValue.trim()
    setLastUserMessage(msg)
    setIsThinking(true)
    setInputValue('')
    try {
      await sendAIMessage(activeAIConv, msg)
    } catch (e: any) {
      showToast('发送失败：' + (e?.message || '未知错误'))
    } finally {
      setIsThinking(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const featureSystemPrompts: Record<string, string> = {
    text_generation: '你是一个专业的文本创作助手，擅长生成各类高质量文本内容。请根据用户需求，提供结构清晰、语言流畅的文本。',
    ai_search: '你是一个AI驱动的智能搜索助手，擅长从海量信息中提取关键内容并给出精准回答。请基于事实和逻辑进行分析。',
    translation: '你是一个专业翻译，精通多语言互译。请准确传达原文含义，保持语言自然流畅，必要时提供多种译法供选择。',
    web_summary: '你是一个网页内容摘要专家，擅长提取网页核心信息。请用简洁清晰的语言概括要点，突出关键信息。',
    multimodal_analysis: '你是一个多模态分析助手，擅长图片和文档的智能分析。请从多个维度进行专业解读，提供有价值的洞察。',
    writing_assistant: '你是一个写作助手，擅长周报、文案、公文等各类文体的自动生成。请根据用户需求，生成格式规范、内容专业的文档。',
  }

  // dbType to system prompt mapping
  const dbTypeSystemPrompts: Record<string, string> = {
    chat: '你是一个专业的文本创作助手，擅长生成各类高质量文本内容。',
    writing: '你是一个写作助手，擅长周报、文案、公文等各类文体的自动生成。',
    translate: '你是一个专业翻译，精通多语言互译。',
    summary: '你是一个内容摘要专家，擅长提取核心信息。',
    analysis: '你是一个智能分析助手，擅长数据和信息分析。',
    code: '你是一个编程助手，擅长代码生成和问题解答。',
  }

  const handleCreate = async () => {
    const ft = featureTypes.find(f => f.value === selectedFeature)
    const title = newTitle.trim() || ft?.label || '新对话'
    try {
      const convId = await createAIConv(title, (ft?.dbType || 'chat') as any)
      if (!convId) throw new Error('创建对话失败')
      // Inject system prompt based on feature type
      const sysPrompt = featureSystemPrompts[selectedFeature] || dbTypeSystemPrompts[ft?.dbType || 'chat'] || ''
      if (sysPrompt && convId) {
        sendAIMessage(convId, sysPrompt).catch((e: any) => {
          console.warn('系统提示词注入失败:', e?.message)
        })
      }
      setShowNewDialog(false)
      setNewTitle('')
      setSelectedFeature('text_generation')
    } catch (e: any) {
      showToast('创建对话失败：' + (e?.message || '未知错误'))
    }
  }

  const getFeatureIcon = (type: string) => {
    const f = featureTypes.find(ft => ft.value === type)
    if (f) return f.icon
    const dbMap: Record<string, any> = {
      'chat': PenTool, 'writing': FileText, 'translate': Languages,
      'summary': Globe, 'code': FileText, 'analysis': Search,
    }
    return dbMap[type] || MessageSquare
  }

  const getFeatureLabel = (type: string) => {
    const f = featureTypes.find(ft => ft.value === type)
    if (f) return f.label
    const dbMap: Record<string, string> = {
      'chat': '文本生成', 'writing': '写作助手', 'translate': '翻译助手',
      'summary': '网页摘要', 'code': '文本生成', 'analysis': 'AI 搜索',
    }
    return dbMap[type] || '对话'
  }

  // 复制回复
  const handleCopy = async (content: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(msgId)
      showToast('已复制到剪贴板')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showToast('复制失败，请重试')
    }
  }

  // 重新生成
  const handleRegenerate = async () => {
    if (!activeAIConv || !lastUserMessage || isRegenerating) return
    setIsRegenerating(true)
    // 删除最后一条 AI 回复（如果有）
    const msgs = aiMessages[activeAIConv] || []
    const lastAiMsg = msgs.filter(m => m.role === 'assistant').pop()
    if (lastAiMsg) {
      // 直接重新调用即可，store 内部会追加新消息
    }
    try {
      if (lastAiMsg) {
        await deleteAIMessage(lastAiMsg.id, activeAIConv)
      }
      await sendAIMessage(activeAIConv, lastUserMessage)
    } catch {
      showToast('重新生成失败，请重试')
    } finally {
      setIsRegenerating(false)
    }
  }

  // 插入文档
  const handleInsertDocument = (content: string) => {
    localStorage.setItem('prefill_doc', content)
    navigate('/workspace?tab=documents')
  }

  // 导出对话为 Markdown
  const handleExportConversation = (conv: typeof currentConv) => {
    if (!conv) return
    const msgs = aiMessages[conv.id] || []
    const lines: string[] = [
      `# ${conv.title}`,
      `> ${getFeatureLabel(conv.feature_type)} · ${new Date(conv.updated_at || conv.created_at).toLocaleString('zh-CN')}`,
      '',
      '---',
      '',
    ]
    msgs.forEach(msg => {
      if (msg.role === 'user') {
        lines.push(`## 👤 你`, '')
        lines.push(msg.content, '')
      } else {
        lines.push(`## 🤖 AI 助手`, '')
        lines.push(msg.content, '')
      }
      lines.push('', '---', '')
    })

    const md = lines.join('\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${conv.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('对话已导出为 Markdown')
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Toast notification */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 border-r bg-gray-50/50 flex flex-col shrink-0">
          <div className="p-3 border-b">
            <Button onClick={() => setShowNewDialog(true)} className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />新建对话
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {aiConversations.map(conv => {
                const Icon = getFeatureIcon(conv.feature_type)
                const isActive = conv.id === activeAIConv
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveAIConv(conv.id)}
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-60" />
                    {renamingConvId === conv.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && renameValue.trim()) {
                            useStore.setState(s => ({ aiConversations: s.aiConversations.map(c => c.id === conv.id ? { ...c, title: renameValue.trim() } : c) }))
                            setRenamingConvId(null)
                          } else if (e.key === 'Escape') {
                            setRenamingConvId(null)
                          }
                        }}
                        onBlur={() => {
                          if (renameValue.trim()) {
                            useStore.setState(s => ({ aiConversations: s.aiConversations.map(c => c.id === conv.id ? { ...c, title: renameValue.trim() } : c) }))
                          }
                          setRenamingConvId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 min-w-0 text-sm bg-white border border-blue-300 rounded px-1 py-0.5 outline-none"
                      />
                    ) : (
                      <span
                        className="flex-1 truncate"
                        onDoubleClick={e => { e.stopPropagation(); setRenamingConvId(conv.id); setRenameValue(conv.title) }}
                        title="双击重命名"
                      >{conv.title}</span>
                    )}
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0 opacity-60">
                      {getFeatureLabel(conv.feature_type)}
                    </Badge>
                    {/* 导出按钮 - hover 显示 */}
                    <button
                      onClick={e => { e.stopPropagation(); handleExportConversation(conv) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-50 hover:text-green-600 transition-all"
                      title="导出为 Markdown"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {/* 删除按钮 */}
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteConvId(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-12 border-b flex items-center px-4 gap-2 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <Menu className="w-4 h-4" />
          </button>
          {currentConv ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(() => { const Icon = getFeatureIcon(currentConv.feature_type); return <Icon className="w-4 h-4 text-blue-500 shrink-0" /> })()}
              <span className="font-medium text-sm text-gray-800 truncate">{currentConv.title}</span>
              <Badge variant="secondary" className="text-[10px] shrink-0">{getFeatureLabel(currentConv.feature_type)}</Badge>
            </div>
          ) : (
            <span className="text-sm text-gray-400 flex-1">选择或创建一个对话</span>
          )}

          {/* API 状态显示 */}
          <div className="relative shrink-0" ref={modelSwitchRef}>
            <button
              onClick={() => { refreshApiStatus(); setShowModelSwitch(!showModelSwitch) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                apiStatus
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${apiStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
              {apiStatus ? `${apiStatus.name} · ${apiStatus.model}` : '演示模式'}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {showModelSwitch && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-2 border-b bg-gray-50 rounded-t-lg">
                  <p className="text-[10px] font-medium text-gray-500">API 配置</p>
                </div>
                {(() => {
                  const configs = JSON.parse(localStorage.getItem('ai_api_configs') || '[]')
                  const active = configs.find((c: any) => c.isDefault) || configs[0]
                  if (configs.length === 0) {
                    return (
                      <div className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-2">暂无 API 配置</p>
                        <button
                          onClick={() => { navigate('/settings?tab=ai-models'); setShowModelSwitch(false) }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          去设置 →
                        </button>
                      </div>
                    )
                  }
                  return (
                    <div className="p-1.5 max-h-48 overflow-y-auto">
                      {configs.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer" onClick={() => {
                          const updated = configs.map((x: any) => ({ ...x, isDefault: x.id === c.id }))
                          localStorage.setItem('ai_api_configs', JSON.stringify(updated))
                          refreshApiStatus()
                          setShowModelSwitch(false)
                        }}>
                          <div className={`w-2 h-2 rounded-full ${c.isDefault ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">{c.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{c.model}</p>
                          </div>
                          {c.isDefault && <span className="text-[10px] text-green-600">默认</span>}
                        </div>
                      ))}
                      <div className="border-t mt-1 pt-1">
                        <button
                          onClick={() => { navigate('/settings?tab=ai-models'); setShowModelSwitch(false) }}
                          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Settings className="w-3 h-3" /> 管理 API 连接
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {activeAIConv ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {currentMessages.length === 0 && !isThinking && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Sparkles className="w-12 h-12 mb-3 text-blue-300" />
                    <p className="font-medium text-gray-600">开始一段新的 AI 对话</p>
                    <p className="text-sm mt-1">输入您的问题或需求，我会尽力帮助您</p>
                    {!apiStatus && (
                      <div className="mt-6 w-full max-w-md">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>AI 功能需要配置 API Key 才能使用</span>
                        </div>
                        <button
                          onClick={() => navigate('/settings?tab=ai-models')}
                          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          前往设置 AI 模型
                        </button>
                        <p className="mt-2 text-[10px] text-gray-400 text-center">支持 OpenAI、DeepSeek、硅基流动、通义千问等 OpenAI 兼容格式</p>
                      </div>
                    )}
                    {apiStatus && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{apiStatus.name} · {apiStatus.model}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {['写一篇营销文案', '翻译一段英文', '生成周报', '分析竞品'].map(hint => (
                        <button
                          key={hint}
                          onClick={() => setInputValue(hint)}
                          className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thinking animation */}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-[80%]">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-400 to-purple-500 text-white">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-gray-100 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '160ms' }} />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '320ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                          : 'bg-gradient-to-br from-violet-400 to-purple-500 text-white'
                      }`}>
                        {msg.role === 'user' ? '你' : <Bot className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        {/* 消息气泡 */}
                        <div className={`group relative rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-gray-800 prose-pre:text-gray-100">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}

                          {/* AI 消息气泡操作按钮 - hover 显示 */}
                          {msg.role === 'assistant' && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="p-1.5 rounded-md bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm transition-colors"
                                title="复制"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={handleRegenerate}
                                disabled={isRegenerating || !lastUserMessage}
                                className="p-1.5 rounded-md bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="重新生成"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 插入文档按钮 - 仅 AI 消息显示 */}
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleInsertDocument(msg.content)}
                            className="self-start text-xs px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200 transition-colors flex items-center gap-1 ml-1"
                          >
                            <FileText className="w-3 h-3" />
                            插入文档
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 p-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题... (Shift+Enter 换行)"
                    rows={1}
                    className="flex-1 bg-transparent resize-none outline-none text-sm px-2 py-1 max-h-32 min-h-[36px]"
                    style={{ height: 'auto' }}
                    onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px' }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isThinking}
                    size="sm"
                    className="rounded-lg shrink-0"
                  >
                    {isThinking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  {apiStatus ? `当前模型: ${apiStatus.name} · ${apiStatus.model}` : 'AI 助手运行在演示模式，请在「设置 → AI 模型」中添加 API 连接'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="font-medium">选择一个对话或创建新的对话</p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete conversation dialog */}
      <Dialog open={!!confirmDeleteConvId} onOpenChange={() => setConfirmDeleteConvId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除对话</DialogTitle>
            <DialogDescription>删除后无法恢复，确定要删除该对话吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteConvId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmDeleteConvId) { deleteAIConv(confirmDeleteConvId); setConfirmDeleteConvId(null) }
            }}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New conversation dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建 AI 对话</DialogTitle>
            <DialogDescription>选择功能类型并输入对话标题</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {featureTypes.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => setSelectedFeature(ft.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                    selectedFeature === ft.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <ft.icon className={`w-4 h-4 shrink-0 ${selectedFeature === ft.value ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium">{ft.label}</p>
                    <p className="text-[10px] text-gray-400">{ft.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <Input
              placeholder="对话标题（可选）"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
