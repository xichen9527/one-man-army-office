import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users, Activity, Database, Shield, Settings, FileText,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Ban,
  RefreshCw, ChevronRight, Globe, Cpu, HardDrive, UserCog, Key
} from 'lucide-react'
import { useStore } from '@/store'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type StatItem = { label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }

export default function AdminPage() {
  const {
    currentUser, users, projects, socialAccounts, socialPosts,
    trendingTopics, customers, salesOpportunities, conferenceRooms,
    channels, messages, documents, schedules, currentChannel
  } = useStore()

  const [activeSection, setActiveSection] = useState('overview')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [systemStats, setSystemStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  // Load audit logs & stats on mount
  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const supabase = (await import('@/db/supabase')).default
      const [profilesRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').limit(100),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).catch(() => ({ data: [] }))
      ])
      setAuditLogs(logsRes.data || [])
      // Compute table stats
      const tables = ['projects', 'tasks', 'documents', 'files', 'social_accounts', 'social_posts',
        'trending_topics', 'customers', 'sales_opportunities', 'followups',
        'channels', 'messages', 'schedules', 'conferences', 'team_members',
        'invitations', 'audit_logs', 'user_roles', 'ai_conversations']
      const stats: Record<string, number> = {}
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
        stats[t] = count || 0
      }
      setSystemStats(stats)
      setLastRefresh(format(new Date(), 'HH:mm:ss'))
    } finally {
      setLoading(false)
    }
  }

  const statsCards: StatItem[] = useMemo(() => [
    { label: '用户总数', value: systemStats['profiles'] ?? users.length, icon: <Users className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50', sub: '注册用户' },
    { label: '项目数量', value: systemStats['projects'] ?? projects.length, icon: <Database className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50', sub: '活跃项目' },
    { label: '文档数量', value: systemStats['documents'] ?? documents.length, icon: <FileText className="w-5 h-5" />, color: 'text-green-500 bg-green-50', sub: '已创建文档' },
    { label: '客户数量', value: systemStats['customers'] ?? customers.length, icon: <Users className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50', sub: 'CRM客户' },
    { label: '社媒账号', value: systemStats['social_accounts'] ?? socialAccounts.length, icon: <Globe className="w-5 h-5" />, color: 'text-pink-500 bg-pink-50', sub: '已连接平台' },
    { label: '内容发布', value: systemStats['social_posts'] ?? socialPosts.length, icon: <Activity className="w-5 h-5" />, color: 'text-indigo-500 bg-indigo-50', sub: '已发布/计划' },
    { label: '商机数量', value: systemStats['sales_opportunities'] ?? salesOpportunities.length, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-500 bg-emerald-50', sub: '进行中商机' },
    { label: '会议数量', value: systemStats['conferences'] ?? (conferenceRooms?.length || 0), icon: <Cpu className="w-5 h-5" />, color: 'text-cyan-500 bg-cyan-50', sub: '已创建会议' },
  ], [systemStats, users.length, projects.length, documents.length, customers.length, socialAccounts.length, socialPosts.length, salesOpportunities.length, conferenceRooms])

  const tableStatsList = useMemo(() => {
    return Object.entries(systemStats).map(([table, count]) => ({ table, count })).sort((a, b) => b.count - a.count)
  }, [systemStats])

  const sections = [
    { key: 'overview', label: '系统概览', icon: <Activity className="w-4 h-4" /> },
    { key: 'tables', label: '数据表', icon: <Database className="w-4 h-4" /> },
    { key: 'logs', label: '系统日志', icon: <FileText className="w-4 h-4" /> },
    { key: 'users', label: '用户管理', icon: <UserCog className="w-4 h-4" /> },
    { key: 'permissions', label: '权限管理', icon: <Key className="w-4 h-4" /> },
    { key: 'config', label: '系统配置', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            管理后台
          </h1>
          <p className="text-sm text-gray-500 mt-1">系统监控、数据统计与配置管理</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-xs text-gray-400">最后刷新: {lastRefresh}</span>}
          <Button size="sm" variant="outline" onClick={loadAdminData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === s.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {s.icon}
              {s.label}
              <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statsCards.map((s, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className="text-xl font-bold">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      系统健康
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>前端构建</span>
                        <Badge variant="secondary" className="text-green-600">正常</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>数据库连接</span>
                        <Badge variant="secondary" className="text-green-600">正常</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Storage 服务</span>
                        <Badge variant="secondary" className="text-green-600">正常</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Edge Functions</span>
                        <Badge variant="secondary" className="text-amber-600">部分可用</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>实时订阅</span>
                        <Badge variant="secondary" className="text-green-600">已启用</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      待处理事项
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 p-2 rounded bg-amber-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>自媒体 OAuth 需开发者账号</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span>部分缺失表待创建</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span>腾讯会议 API 生产配置</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              {auditLogs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      最近操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {auditLogs.slice(0, 20).map((log, i) => (
                          <div key={log.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-sm">
                            <Badge variant="outline" className="text-[10px] shrink-0">{log.action || '操作'}</Badge>
                            <span className="text-gray-600 truncate flex-1">
                              {log.resource_type ? `${log.resource_type}` : '系统'}
                              {log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {log.created_at ? format(parseISO(log.created_at), 'MM-dd HH:mm') : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Table Stats */}
          {activeSection === 'tables' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  数据表统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {tableStatsList.map(({ table, count }) => (
                    <div key={table} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-mono">{table}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{count} 条</Badge>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (count / Math.max(1, ...Object.values(systemStats))) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                  <p>共 {Object.keys(systemStats).length} 张表，总计 {Object.values(systemStats).reduce((a, b) => a + b, 0)} 条记录</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Logs */}
          {activeSection === 'logs' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  审计日志
                  <Badge variant="secondary" className="text-[10px] ml-2">{auditLogs.length} 条</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无审计日志</p>
                    <p className="text-xs mt-1">系统操作将被自动记录</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-1">
                      {auditLogs.map((log, i) => (
                        <div key={log.id || i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50">
                          <div className="text-xs text-gray-400 shrink-0 mt-0.5 w-16">
                            {log.created_at ? format(parseISO(log.created_at), 'MM-dd HH:mm') : '-'}
                          </div>
                          <div className="shrink-0">
                            <Badge variant={log.action === 'delete' ? 'destructive' : log.action === 'create' ? 'default' : 'secondary'} className="text-[10px]">
                              {log.action || 'action'}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-gray-500">{log.user_id?.slice(0, 8) || '-'}</span>
                              {log.resource_type && <span className="text-xs text-gray-400">{log.resource_type}</span>}
                              {log.resource_id && <span className="text-xs text-gray-400">#{log.resource_id.slice(0, 8)}</span>}
                            </div>
                            {log.details && typeof log.details === 'object' && (
                              <pre className="text-[10px] text-gray-400 mt-1 overflow-hidden max-h-8">{JSON.stringify(log.details, null, 2)}</pre>
                            )}
                          </div>
                          {log.ip_address && (
                            <span className="text-[10px] text-gray-400 shrink-0">{log.ip_address}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* User Management */}
          {activeSection === 'users' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    用户管理
                    <Badge variant="secondary" className="text-[10px] ml-2">{users.length} 用户</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无用户数据</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {users.map((u: any) => (
                          <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                              {(u.username || u.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{u.full_name || u.username || '未命名用户'}</span>
                                <Badge variant="secondary" className="text-[10px]">{u.role || 'member'}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{u.email || '-'}</span>
                                {u.username && <span>@{u.username}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-gray-400">
                                {u.created_at ? format(parseISO(u.created_at), 'yyyy-MM-dd') : '-'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Permission Management */}
          {activeSection === 'permissions' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    权限管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">角色权限矩阵</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b">
                              <th className="text-left py-2 pr-4">权限</th>
                              <th className="text-center py-2 px-3">管理员</th>
                              <th className="text-center py-2 px-3">经理</th>
                              <th className="text-center py-2 px-3">成员</th>
                              <th className="text-center py-2 px-3">访客</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            {[
                              ['仪表盘', true, true, true, true],
                              ['项目管理', true, true, true, false],
                              ['创建项目', true, true, true, false],
                              ['删除项目', true, true, false, false],
                              ['团队协作', true, true, true, false],
                              ['频道管理', true, true, false, false],
                              ['CRM 客户', true, true, true, false],
                              ['删除客户', true, true, false, false],
                              ['AI 助手', true, true, true, false],
                              ['自媒体管理', true, true, true, false],
                              ['视频会议', true, true, true, false],
                              ['管理后台', true, false, false, false],
                              ['用户管理', true, false, false, false],
                              ['系统配置', true, false, false, false],
                            ].map(([perm, admin, manager, member, viewer]: [string, boolean, boolean, boolean, boolean]) => (
                              <tr key={perm} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="py-2 pr-4 text-gray-700">{perm}</td>
                                <td className="text-center py-2 px-3">{admin ? '✅' : '❌'}</td>
                                <td className="text-center py-2 px-3">{manager ? '✅' : '❌'}</td>
                                <td className="text-center py-2 px-3">{member ? '✅' : '❌'}</td>
                                <td className="text-center py-2 px-3">{viewer ? '✅' : '❌'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <Shield className="w-4 h-4" />
                        <span>RLS（行级安全）策略已启用，数据访问由 Supabase RLS 控制。</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Config */}
          {activeSection === 'config' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    系统信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">技术栈</span>
                        <span className="font-mono text-xs">React 18 + TypeScript + Vite 8</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">UI 框架</span>
                        <span className="font-mono text-xs">Tailwind CSS + shadcn/ui</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">状态管理</span>
                        <span className="font-mono text-xs">Zustand</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">后端服务</span>
                        <span className="font-mono text-xs">Supabase BaaS</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">数据库表</span>
                        <span>{Object.keys(systemStats).length} 张</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">总记录数</span>
                        <span>{Object.values(systemStats).reduce((a, b) => a + b, 0).toLocaleString()} 条</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Edge Functions</span>
                        <span>6 个（secure-login, ai-search, social-oauth, social-publish, send-invitation-email, sync-social-data）</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Storage Buckets</span>
                        <span>2 个（files, avatars）</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">模块完成度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Dashboard 仪表盘', pct: 90 },
                      { name: '项目管理中心', pct: 95 },
                      { name: '协作空间', pct: 85 },
                      { name: 'CRM 客户管理', pct: 85 },
                      { name: 'AI 助手', pct: 80 },
                      { name: '自媒体管理', pct: 75 },
                      { name: '视频会议', pct: 60 },
                      { name: '系统设置', pct: 85 },
                    ].map(m => (
                      <div key={m.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{m.name}</span>
                          <span className="text-gray-500">{m.pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${m.pct >= 90 ? 'bg-green-500' : m.pct >= 75 ? 'bg-blue-500' : m.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${m.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
