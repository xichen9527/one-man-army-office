import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus, Search, Trash2, Edit3, Phone, Mail, Building2, Tag,
  TrendingUp, DollarSign, Users, ArrowRight, ChevronRight,
  BarChart3, Target, X, Filter, Clock, MessageSquare, Video,
  FileText, GripVertical, Check, StickyNote, Loader2,
  Megaphone, Calendar, Settings as SettingsIcon, Trash2 as Trash2Icon
} from 'lucide-react'
import { useStore } from '@/store'
import type { CustomerStatus, SalesStage, Followup } from '@/types/database'
import { supabase } from '@/db/supabase'
import { toast } from '@/components/ui/toast'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const statusLabels: Record<CustomerStatus, string> = { active: '活跃', inactive: '非活跃', potential: '潜在' }
const statusColors: Record<CustomerStatus, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', potential: 'bg-yellow-100 text-yellow-700' }
// 销售漏斗5阶段
const stageLabels: Record<SalesStage, string> = { initial: '初步接触', qualified: '需求确认', proposal: '方案报价', negotiation: '谈判', won: '成交' }
const stageColors: Record<SalesStage, string> = { initial: 'bg-blue-100 text-blue-700', qualified: 'bg-indigo-100 text-indigo-700', proposal: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700' }
const funnelStages: SalesStage[] = ['initial', 'qualified', 'proposal', 'negotiation', 'won']
const funnelWidths = [100, 80, 60, 45, 35]

// 标签筛选
const tagFilters = ['VIP', '潜在', '合作中', '流失']

const followUpTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call: { label: '电话', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-100' },
  email: { label: '邮件', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-100' },
  meeting: { label: '会议', icon: Video, color: 'text-green-600', bg: 'bg-green-100' },
  other: { label: '其他', icon: StickyNote, color: 'text-gray-600', bg: 'bg-gray-100' },
}

// ============ Inline Edit Field Component ============
function EditableField({
  label,
  value,
  icon: Icon,
  onSave,
}: {
  label: string
  value: string
  icon?: React.ElementType
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="group flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
        <Input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          className="h-7 text-sm flex-1"
          autoFocus
        />
        <button onClick={save} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group cursor-pointer" onClick={startEdit} title="点击编辑">
      {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
      <span className="text-sm text-gray-700 flex-1 truncate">{value || <span className="text-gray-300 italic">未填写</span>}</span>
      <Edit3 className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ============ Follow-Up Timeline ============
function FollowUpTimeline({
  records,
  onAdd,
}: {
  records: Followup[]
  onAdd: (type: string, content: string) => void
}) {
  const [type, setType] = useState<string>('call')
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) return
    onAdd(type, content.trim())
    setContent('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline list */}
      <ScrollArea className="flex-1 min-h-0 px-1">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">暂无跟进记录</p>
            <p className="text-xs mt-1">添加第一条跟进记录吧</p>
          </div>
        ) : (
          <div className="relative pl-6 py-2">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gray-200" />
            {records.map((r, i) => {
              const cfg = followUpTypeConfig[r.type]
              const Icon = cfg.icon
              return (
                <div key={r.id} className="relative mb-4 last:mb-0">
                  {/* Dot */}
                  <div className={`absolute -left-[17px] top-1.5 w-5 h-5 rounded-full ${cfg.bg} flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                  </div>
                  <div className={`rounded-lg p-3 ${cfg.bg} bg-opacity-50`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-[10px] ${cfg.color} border-0 bg-white bg-opacity-70`}>
                        {cfg.label}
                      </Badge>
                      <span className="text-[10px] text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Add follow-up form */}
      <div className="border-t pt-3 mt-2 shrink-0">
        <p className="text-xs text-gray-500 mb-2 font-medium">添加跟进记录</p>
        <div className="flex gap-1 mb-2">
          {Object.keys(followUpTypeConfig).map(t => {
            const cfg = followUpTypeConfig[t]
            const Icon = cfg.icon
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${type === t ? `${cfg.bg} ${cfg.color} border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="输入跟进内容..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            className="flex-1 h-8 text-sm"
          />
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim()} className="h-8 px-3">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============ Draggable Opportunity Card ============
function DraggableOppCard({
  opp,
  customer,
  onStageChange,
  isDragging,
}: {
  opp: any
  customer?: any
  onStageChange: (id: string, stage: SalesStage) => void
  isDragging: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: opp.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    transition: 'opacity 0.15s',
  }

  return (
    <div ref={setNodeRef} style={style} className="p-2 rounded-lg bg-gray-50 text-xs">
      <div className="flex items-start gap-1.5">
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-0.5 shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{opp.title}</p>
          <p className="text-gray-400 truncate">{customer?.name || ''} · ¥{(opp.amount || 0).toLocaleString()}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {funnelStages.filter(s => s !== opp.stage && s !== 'lost').map(s => (
              <button key={s} onClick={() => onStageChange(opp.id, s)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white border hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-gray-400 transition-colors">
                →{stageLabels[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== Marketing Campaigns Tab ==========
function MarketingCampaignsTab() {
  const {
    marketingCampaigns, fetchMarketingCampaigns,
    addMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign,
  } = useStore()
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cBudget, setCBudget] = useState('')
  const [cStart, setCStart] = useState('')
  const [cEnd, setCEnd] = useState('')
  const [cAudience, setCAudience] = useState('')
  const [cChannel, setCChannel] = useState('')

  useEffect(() => { fetchMarketingCampaigns() }, [])

  const statusColor: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-blue-100 text-blue-700' }
  const statusLabel: Record<string, string> = { draft: '草稿', active: '进行中', paused: '已暂停', completed: '已完成' }

  const handleSave = async () => {
    if (!cName.trim()) return
    try {
      const data = {
        name: cName,
        description: cDesc,
        status: 'draft',
        budget: parseFloat(cBudget) || 0,
        spent: 0,
        start_date: cStart || null,
        end_date: cEnd || null,
        target_audience: cAudience,
        channels: cChannel,
      }
      if (editId) {
        await updateMarketingCampaign(editId, data)
      } else {
        await addMarketingCampaign(data)
      }
      setShowDialog(false); setEditId(null); setCName(''); setCDesc(''); setCBudget(''); setCStart(''); setCEnd(''); setCAudience(''); setCChannel('')
    } catch (e: any) { toast({ title: '错误', description: e.message, variant: 'destructive' }) }
  }

  const openEdit = (c: any) => {
    setEditId(c.id); setCName(c.name); setCDesc(c.description || ''); setCBudget(String(c.budget || '')); setCStart(c.start_date || ''); setCEnd(c.end_date || ''); setCAudience(c.target_audience || ''); setCChannel(c.channels || ''); setShowDialog(true)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => { setEditId(null); setCName(''); setCDesc(''); setCBudget(''); setCStart(''); setCEnd(''); setCAudience(''); setCChannel(''); setShowDialog(true) }}>
          <Plus className="w-4 h-4 mr-1" /> 创建活动
        </Button>
      </div>
      {marketingCampaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无营销活动，点击右上角创建</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {marketingCampaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <Badge className={`mt-1 text-xs ${statusColor[c.status] || statusColor.draft}`}>{statusLabel[c.status] || c.status}</Badge>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit3 className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { if (confirm('确认删除？')) { try { await deleteMarketingCampaign(c.id) } catch (e: any) { toast({ title: '错误', description: e.message, variant: 'destructive' }) } } }}><Trash2Icon className="w-3.5 h-3.5 text-red-400" /></Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{c.description || '—'}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>预算</span>
                    <span className="font-medium">¥{(c.budget || 0).toLocaleString()} / ¥{(c.spent || 0).toLocaleString()} 已花</span>
                  </div>
                  {c.budget > 0 && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((c.spent / c.budget) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {c.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.start_date}</span>}
                  {c.end_date && <span>~ {c.end_date}</span>}
                </div>
                {c.channels && <Badge variant="outline" className="text-xs">{c.channels}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? '编辑活动' : '创建活动'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">名称</label><Input value={cName} onChange={e => setCName(e.target.value)} placeholder="活动名称" /></div>
            <div><label className="text-sm font-medium">描述</label><Input value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="可选描述" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">预算</label><Input type="number" value={cBudget} onChange={e => setCBudget(e.target.value)} placeholder="预算金额" /></div>
              <div><label className="text-sm font-medium">渠道</label><Input value={cChannel} onChange={e => setCChannel(e.target.value)} placeholder="如: 微信, 微博" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">开始日期</label><Input type="date" value={cStart} onChange={e => setCStart(e.target.value)} /></div>
              <div><label className="text-sm font-medium">结束日期</label><Input type="date" value={cEnd} onChange={e => setCEnd(e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium">目标受众</label><Input value={cAudience} onChange={e => setCAudience(e.target.value)} placeholder="如: 25-35岁白领" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function CRM() {
  const {
    customers, salesOpportunities, currentUser,
    followups, fetchFollowups, addFollowup, deleteFollowup,
    addCustomer, updateCustomer, deleteCustomer,
    addOpportunity, updateOpportunity,
    marketingCampaigns, fetchMarketingCampaigns,
    addMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign,
  } = useStore()

  useEffect(() => {
    if (selectedCustomer) fetchFollowups(selectedCustomer)
  }, [selectedCustomer])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])  // 标签多选筛选
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showNewOpp, setShowNewOpp] = useState(false)
  const [detailTab, setDetailTab] = useState<'info' | 'followup'>('info')
  const [activeOppId, setActiveOppId] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // 标签筛选切换
  const toggleTagFilter = (tag: string) => {
    setTagFilter(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Follow-up records per customer
  // (loaded from store)

  const [cf, setCf] = useState({ name: '', email: '', phone: '', company: '', source: '', notes: '', tags: '' })

  // Opportunity form
  const [of, setOf] = useState({ customer_id: '', title: '', amount: '', stage: 'initial' as SalesStage, notes: '' })

  const filteredCustomers = useMemo(() =>
    customers.filter(c => {
      const matchSearch = !search || c.name.includes(search) || c.company.includes(search) || c.email?.includes(search)
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      // 标签多选AND逻辑：选中的标签必须全部匹配
      const matchTags = tagFilter.length === 0 || tagFilter.every(t => c.tags.includes(t))
      return matchSearch && matchStatus && matchTags
    }),
    [customers, search, statusFilter, tagFilter])

  const selected = customers.find(c => c.id === selectedCustomer)

  const funnelData = useMemo(() =>
    funnelStages.map(stage => {
      const opps = salesOpportunities.filter(o => o.stage === stage)
      return { stage, count: opps.length, amount: opps.reduce((s, o) => s + o.amount, 0), opportunities: opps }
    }),
    [salesOpportunities])

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    potential: customers.filter(c => c.status === 'potential').length,
    totalValue: customers.reduce((s, c) => s + c.value, 0),
    pipelineValue: salesOpportunities.filter(o => !['won', 'lost'].includes(o.stage)).reduce((s, o) => s + o.amount, 0),
    wonValue: salesOpportunities.filter(o => o.stage === 'won').reduce((s, o) => s + o.amount, 0),
  }), [customers, salesOpportunities])

  const handleSaveCustomer = async () => {
    const data = { name: cf.name, email: cf.email, phone: cf.phone, company: cf.company || cf.name, source: cf.source, notes: cf.notes, tags: cf.tags.split(',').map(t => t.trim()).filter(Boolean), status: 'potential' as CustomerStatus, assigned_to: currentUser.id, value: 0 }
    setLoading(prev => ({ ...prev, addCustomer: true }))
    try {
      await addCustomer(data)
      toast({ title: '成功', description: '客户创建成功', variant: 'default' })
      setShowNewCustomer(false); setCf({ name: '', email: '', phone: '', company: '', source: '', notes: '', tags: '' })
    } catch (err: any) {
      toast({ title: '错误', description: err?.message || '创建客户失败', variant: 'destructive' })
    } finally {
      setLoading(prev => ({ ...prev, addCustomer: false }))
    }
  }

  const handleSaveOpp = async () => {
    setLoading(prev => ({ ...prev, addOpportunity: true }))
    try {
      await addOpportunity({ customer_id: of.customer_id, title: of.title, amount: Number(of.amount), stage: of.stage, probability: 50, expected_close: new Date(Date.now() + 30 * 86400000).toISOString(), notes: of.notes })
      toast({ title: '成功', description: '销售机会创建成功', variant: 'default' })
      setShowNewOpp(false); setOf({ customer_id: '', title: '', amount: '', stage: 'initial', notes: '' })
    } catch (err: any) {
      toast({ title: '错误', description: err?.message || '创建销售机会失败', variant: 'destructive' })
    } finally {
      setLoading(prev => ({ ...prev, addOpportunity: false }))
    }
  }

  const formatMoney = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n.toLocaleString()}`
  const getMaxCount = () => Math.max(...funnelData.filter(f => f.stage !== 'lost').map(f => f.count), 1)

  // Inline edit save
  const handleFieldSave = async (field: string, value: string) => {
    if (!selectedCustomer) return
    try {
      await updateCustomer(selectedCustomer, { [field]: value } as any)
      toast({ title: '成功', description: '已更新', variant: 'default' })
    } catch (err: any) {
      toast({ title: '错误', description: err?.message || '更新失败', variant: 'destructive' })
    }
  }

  const handleAddFollowUp = async (type: string, content: string, file?: File) => {
    if (!selectedCustomer) return
    setLoading(prev => ({ ...prev, addFollowup: true }))
    try {
      let fileUrl = ''
      let fileName = ''
      if (file) {
        const ext = file.name.split('.').pop() || ''
        const filePath = `followups/${selectedCustomer}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { data, error } = await supabase.storage.from('files').upload(filePath, file)
        if (!error && data) {
          fileUrl = supabase.storage.from('files').getPublicUrl(data.path).data.publicUrl
          fileName = file.name
        }
      }
      await addFollowup({ customer_id: selectedCustomer, type, content, file_url: fileUrl || undefined, file_name: fileName || undefined })
      toast({ title: '成功', description: '跟进记录已添加', variant: 'default' })
    } catch (err: any) {
      toast({ title: '错误', description: err?.message || '添加跟进记录失败', variant: 'destructive' })
    } finally {
      setLoading(prev => ({ ...prev, addFollowup: false }))
    }
  }

  // DnD sensors
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const handleOppDragStart = (event: DragStartEvent) => {
    setActiveOppId(event.active.id as string)
  }

  const handleOppDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveOppId(null)
    if (!over) return

    const oppId = active.id as string
    const overId = over.id as string
    // Determine target stage: either the column key or from another opp
    const targetStage = funnelStages.find(s => s === overId)
      || salesOpportunities.find(o => o.id === overId)?.stage
    if (targetStage) {
      const opp = salesOpportunities.find(o => o.id === oppId)
      if (opp && opp.stage !== targetStage) {
        try {
          await updateOpportunity(oppId, { stage: targetStage })
          toast({ title: '成功', description: `已移至${stageLabels[targetStage]}`, variant: 'default' })
        } catch (err: any) {
          toast({ title: '错误', description: err?.message || '更新失败', variant: 'destructive' })
        }
      }
    }
  }

  const activeOpp = salesOpportunities.find(o => o.id === activeOppId)

  return (
    <div className="space-y-4">
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" />客户列表</TabsTrigger>
          <TabsTrigger value="funnel" className="gap-1.5"><TrendingUp className="w-4 h-4" />销售漏斗</TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="w-4 h-4" />客户统计</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="w-4 h-4" />营销活动</TabsTrigger>
        </TabsList>

        {/* ========== Customers ========== */}
        <TabsContent value="customers" className="mt-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="搜索客户..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['all', 'active', 'potential', 'inactive'] as const).map(s => (
                  <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                    onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? '全部' : statusLabels[s]}
                  </Button>
                ))}
              </div>
              <div className="flex border rounded-md overflow-hidden ml-auto">
                <button onClick={() => setViewMode('table')} className={`px-2 py-1 text-xs ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>列表</button>
                <button onClick={() => setViewMode('card')} className={`px-2 py-1 text-xs ${viewMode === 'card' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>卡片</button>
              </div>
              <Button size="sm" onClick={() => setShowNewCustomer(true)}><Plus className="w-4 h-4 mr-1" />新建客户</Button>
            </div>
          </div>

          <div className="flex gap-4 relative">
            <div className="flex-1 min-w-0">
              {viewMode === 'table' ? (
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500 text-xs">
                          <th className="p-3 font-medium">客户</th>
                          <th className="p-3 font-medium">联系信息</th>
                          <th className="p-3 font-medium">状态</th>
                          <th className="p-3 font-medium">价值</th>
                          <th className="p-3 font-medium">标签</th>
                          <th className="p-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCustomers.map(c => (
                          <tr key={c.id} className={`hover:bg-gray-50 cursor-pointer ${selectedCustomer === c.id ? 'bg-blue-50' : ''}`}
                            onClick={() => { setSelectedCustomer(c.id); setDetailTab('info') }}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{c.name}</p>
                                  <p className="text-xs text-gray-400 truncate">{c.company}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{c.email || '-'}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone || '-'}</p>
                              </div>
                            </td>
                            <td className="p-3"><Badge variant="secondary" className={`text-xs ${statusColors[c.status]}`}>{statusLabels[c.status]}</Badge></td>
                            <td className="p-3 text-xs font-medium">¥{formatMoney(c.value)}</td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                {c.tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                                {c.tags.length > 2 && <span className="text-[10px] text-gray-400">+{c.tags.length - 2}</span>}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 text-gray-400 hover:text-blue-500" onClick={() => { setSelectedCustomer(c.id); setDetailTab('info') }}><Edit3 className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={async () => { if(confirm('确定删除此客户？')) { try { await deleteCustomer(c.id); toast({ title: '成功', description: '客户已删除', variant: 'default' }) } catch (err: any) { toast({ title: '错误', description: err?.message || '删除失败', variant: 'destructive' }) } }}}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCustomers.map(c => (
                    <Card key={c.id} className={`hover:shadow-md transition-shadow cursor-pointer ${selectedCustomer === c.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => { setSelectedCustomer(c.id); setDetailTab('info') }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.company}</p>
                          </div>
                          <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColors[c.status]}`}>{statusLabels[c.status]}</Badge>
                        </div>
                        <div className="mt-3 space-y-1">
                          {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                          {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                        </div>
                        <div className="flex gap-1 flex-wrap mt-2">
                          {c.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t">
                          <span className="text-xs text-gray-400">{c.source}</span>
                          <span className="text-sm font-medium">¥{formatMoney(c.value)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* ========== Customer Detail Drawer ========== */}
            {selected && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedCustomer(null)} />
                {/* Drawer */}
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-40 flex flex-col">
                  {/* Drawer header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <h3 className="font-medium text-sm truncate">{selected.name}</h3>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Tabs */}
                  <Tabs value={detailTab} onValueChange={v => setDetailTab(v as 'info' | 'followup')} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="mx-4 mt-2 shrink-0">
                      <TabsTrigger value="info" className="text-xs gap-1"><FileText className="w-3 h-3" />基本信息</TabsTrigger>
                      <TabsTrigger value="followup" className="text-xs gap-1">
                        <MessageSquare className="w-3 h-3" />跟进记录
                        {(followups[selected?.id] || []).length > 0 && (
                          <span className="ml-1 bg-blue-100 text-blue-600 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                            {(followups[selected?.id] || []).length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Info Tab */}
                    <TabsContent value="info" className="flex-1 min-h-0 mt-0">
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                          {/* Editable fields */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">公司名称</span>
                            <EditableField
                              label="公司名称"
                              value={selected.company || ''}
                              icon={Building2}
                              onSave={v => handleFieldSave('company', v)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">联系人</span>
                            <EditableField
                              label="联系人"
                              value={selected.name}
                              icon={Users}
                              onSave={v => handleFieldSave('name', v)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">手机</span>
                            <EditableField
                              label="手机"
                              value={selected.phone || ''}
                              icon={Phone}
                              onSave={v => handleFieldSave('phone', v)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">邮箱</span>
                            <EditableField
                              label="邮箱"
                              value={selected.email || ''}
                              icon={Mail}
                              onSave={v => handleFieldSave('email', v)}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">客户来源</span>
                            <EditableField
                              label="来源"
                              value={selected.source || ''}
                              icon={TrendingUp}
                              onSave={v => handleFieldSave('source', v)}
                            />
                          </div>

                          {/* Status */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">状态</span>
                            <div className="flex gap-1">
                              {(['active', 'potential', 'inactive'] as CustomerStatus[]).map(s => (
                                <button key={s} onClick={() => handleFieldSave('status', s)}
                                  className={`px-2 py-1 rounded text-xs border transition-colors ${selected.status === s ? `${statusColors[s]} border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                  {statusLabels[s]}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">标签</span>
                            <div className="flex gap-1 flex-wrap">
                              {selected.tags.map(t => (
                                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                              ))}
                              {selected.tags.length === 0 && <span className="text-xs text-gray-300 italic">暂无标签</span>}
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">备注</span>
                            <EditableField
                              label="备注"
                              value={selected.notes || ''}
                              onSave={v => handleFieldSave('notes', v)}
                            />
                          </div>

                          {/* Value */}
                          <div className="pt-3 border-t space-y-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">客户价值</span>
                            <p className="text-lg font-bold text-blue-600">¥{formatMoney(selected.value)}</p>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* Follow-up Tab */}
                    <TabsContent value="followup" className="flex-1 min-h-0 mt-0 flex flex-col">
                      <div className="flex-1 min-h-0 px-4 pb-4 pt-2">
                        <FollowUpTimeline
                          records={followups[selected?.id] || []}
                          onAdd={(type, content) => handleAddFollowUp(type, content)}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ========== Sales Funnel with DnD ========== */}
        <TabsContent value="funnel" className="mt-0">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowNewOpp(true)}><Plus className="w-4 h-4 mr-1" />新建销售机会</Button>
          </div>

          {/* Visual funnel */}
          <Card className="mb-6">
            <CardHeader className="pb-3"><CardTitle className="text-base">销售漏斗</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-2 h-48">
                {funnelData.filter(f => f.stage !== 'lost').map((f, i) => (
                  <div key={f.stage} className="flex flex-col items-center gap-1 flex-1 max-w-[140px]">
                    <span className="text-xs font-medium">¥{formatMoney(f.amount)}</span>
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg flex items-center justify-center text-white transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer min-h-[20px]"
                      style={{ height: `${Math.max(20, (f.count / getMaxCount()) * 140)}px`, width: `${funnelWidths[i]}%` }}
                    >
                      <span className="text-xs font-bold">{f.count}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 text-center leading-tight">{stageLabels[f.stage]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities by stage - DnD enabled */}
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCorners}
            onDragStart={handleOppDragStart}
            onDragEnd={handleOppDragEnd}
          >
            <div className="grid gap-4 md:grid-cols-3">
              {funnelData.map(f => {
                const droppableId = f.stage
                return (
                  <DroppableStage
                    key={f.stage}
                    id={droppableId}
                    stage={f.stage}
                    opportunities={f.opportunities}
                    customers={customers}
                    onStageChange={(id, stage) => updateOpportunity(id, { stage })}
                    activeOppId={activeOppId}
                  />
                )
              })}
            </div>
            <DragOverlay>
              {activeOpp && (
                <div className="p-2 rounded-lg bg-white border-2 border-blue-400 shadow-xl text-xs w-56 opacity-95">
                  <p className="font-medium truncate">{activeOpp.title}</p>
                  <p className="text-gray-400 truncate">¥{(activeOpp.amount || 0).toLocaleString()}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <MarketingCampaignsTab />
        {/* ========== Stats ========== */}
        <TabsContent value="stats" className="mt-0">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[
              { title: '总客户数', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: '活跃客户', value: stats.active, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
              { title: '潜在客户', value: stats.potential, icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { title: '客户总价值', value: `¥${formatMoney(stats.totalValue)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(s => (
              <Card key={s.title}><CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.title}</p></div>
              </CardContent></Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Status distribution */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">客户状态分布</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(['active', 'potential', 'inactive'] as CustomerStatus[]).map(status => {
                    const count = customers.filter(c => c.status === status).length
                    const pct = customers.length ? Math.round((count / customers.length) * 100) : 0
                    const colorMap = { active: 'bg-green-500', potential: 'bg-yellow-500', inactive: 'bg-gray-400' }
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-sm w-12 shrink-0">{statusLabels[status]}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${colorMap[status]} rounded-full flex items-center justify-end pr-2 transition-all`} style={{ width: `${Math.max(pct, 8)}%` }}>
                            {pct > 15 && <span className="text-[10px] text-white font-medium">{pct}%</span>}
                          </div>
                        </div>
                        <span className="text-sm w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top customers by value */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">客户价值 TOP 5</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...customers].sort((a, b) => b.value - a.value).slice(0, 5).map((c, i) => {
                    const maxVal = customers.reduce((m, x) => Math.max(m, x.value), 1)
                    return (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-5 ${i < 3 ? 'text-blue-600' : 'text-gray-400'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${(c.value / maxVal) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-medium shrink-0">¥{formatMoney(c.value)}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Sales pipeline */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">销售管线</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-xs text-blue-600">管线总价值</p>
                    <p className="text-lg font-bold text-blue-700">¥{formatMoney(stats.pipelineValue)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <p className="text-xs text-green-600">已赢单价值</p>
                    <p className="text-lg font-bold text-green-700">¥{formatMoney(stats.wonValue)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <p className="text-xs text-purple-600">进行中机会</p>
                    <p className="text-lg font-bold text-purple-700">{salesOpportunities.filter(o => !['won', 'lost'].includes(o.stage)).length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 text-center">
                    <p className="text-xs text-orange-600">赢单率</p>
                    <p className="text-lg font-bold text-orange-700">{salesOpportunities.length ? Math.round((salesOpportunities.filter(o => o.stage === 'won').length / salesOpportunities.length) * 100) : 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建客户</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="客户名称 *" value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} />
            <Input placeholder="公司名称" value={cf.company} onChange={e => setCf({ ...cf, company: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="邮箱" value={cf.email} onChange={e => setCf({ ...cf, email: e.target.value })} type="email" />
              <Input placeholder="电话" value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} />
            </div>
            <Input placeholder="客户来源" value={cf.source} onChange={e => setCf({ ...cf, source: e.target.value })} />
            <Input placeholder="标签（逗号分隔）" value={cf.tags} onChange={e => setCf({ ...cf, tags: e.target.value })} />
            <textarea placeholder="备注" value={cf.notes} onChange={e => setCf({ ...cf, notes: e.target.value })} className="w-full min-h-[80px] border rounded-md p-2 text-sm resize-y outline-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>取消</Button>
            <Button onClick={handleSaveCustomer} disabled={!cf.name.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Opportunity Dialog */}
      <Dialog open={showNewOpp} onOpenChange={setShowNewOpp}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建销售机会</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <select value={of.customer_id} onChange={e => setOf({ ...of, customer_id: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder="机会标题 *" value={of.title} onChange={e => setOf({ ...of, title: e.target.value })} />
            <Input placeholder="金额" value={of.amount} onChange={e => setOf({ ...of, amount: e.target.value })} type="number" />
            <select value={of.stage} onChange={e => setOf({ ...of, stage: e.target.value as SalesStage })} className="w-full border rounded-md px-3 py-2 text-sm">
              {funnelStages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
            </select>
            <textarea placeholder="备注" value={of.notes} onChange={e => setOf({ ...of, notes: e.target.value })} className="w-full min-h-[60px] border rounded-md p-2 text-sm resize-y outline-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOpp(false)}>取消</Button>
            <Button onClick={handleSaveOpp} disabled={!of.title.trim() || !of.customer_id}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Droppable Stage Column ============
function DroppableStage({
  id, stage, opportunities, customers, onStageChange, activeOppId,
}: {
  id: string
  stage: SalesStage
  opportunities: any[]
  customers: any[]
  onStageChange: (id: string, stage: SalesStage) => void
  activeOppId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={`text-xs ${stageColors[stage]}`}>{stageLabels[stage]}</Badge>
          <span className="text-xs text-gray-400">{opportunities.length}个</span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={setNodeRef}
          className={`space-y-2 min-h-[80px] rounded-lg p-2 transition-all ${isOver ? 'ring-2 ring-blue-300 bg-blue-50/60' : 'bg-gray-50/60'}`}
        >
          {opportunities.map(opp => {
            const cust = customers.find(c => c.id === opp.customer_id)
            return (
              <DraggableOppCard
                key={opp.id}
                opp={opp}
                customer={cust}
                onStageChange={onStageChange}
                isDragging={activeOppId === opp.id}
              />
            )
          })}
          {opportunities.length === 0 && (
            <div className={`text-xs text-gray-300 text-center py-4 transition-colors ${isOver ? 'text-blue-400' : ''}`}>
              {isOver ? '拖拽到此处' : '暂无'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
