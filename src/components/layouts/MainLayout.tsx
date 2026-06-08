import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot, LayoutDashboard, FolderOpen, MessageSquare, Contact, Share2,
  Video, Settings, Search, Bell, ChevronLeft, ChevronRight, LogOut,
  Moon, Menu, X, Sparkles, KanbanSquare, Shield
} from 'lucide-react'
import { useStore } from '@/store'

const navItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/project-management', label: '项目管理中心', icon: KanbanSquare },
  { path: '/ai', label: 'AI 助手', icon: Bot },
  { path: '/collaboration', label: '团队协作', icon: MessageSquare },
  { path: '/crm', label: '客户管理', icon: Contact },
  { path: '/social-media', label: '自媒体运营', icon: Share2 },
  { path: '/video-conference', label: '视频会议', icon: Video },
  { path: '/settings', label: '系统设置', icon: Settings },
  { path: '/admin', label: '管理后台', icon: Shield },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, notifications, markAllNotificationsRead, markNotificationRead } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length
  const currentNav = navItems.find(item => location.pathname.startsWith(item.path))

  // Mark current path as active
  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative z-50 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
                一人成军
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => { setCollapsed(!collapsed); setMobileMenuOpen(false) }}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-400"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {navItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileMenuOpen(false) }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-600' : ''}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User section */}
        {!collapsed && (
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {currentUser?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.full_name || '用户'}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser?.email || ''}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="p-2 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-medium text-gray-700">
              {currentNav?.label || '工作台'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className={`relative ${searchOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus={searchOpen}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-4 h-4 text-gray-500" />
            </Button>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
              <Moon className="w-4 h-4 text-gray-500" />
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification dropdown */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h3 className="font-medium text-sm">通知</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          全部已读
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">暂无通知</div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationRead(notif.id)}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                              <div className={`flex-1 ${!notif.read ? '' : 'ml-5'}`}>
                                <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notif.content}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 text-center border-t border-gray-100">
                      <button className="text-xs text-blue-600 hover:text-blue-700">查看全部通知</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User avatar (mobile) */}
            <button className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold">
              {currentUser?.full_name?.[0] || 'U'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
