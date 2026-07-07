import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Bell, User, ChevronDown, Search, LogOut, Settings, FileText, HelpCircle, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

const navItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/project-management', label: '项目管理中心', icon: KanbanSquare },
  { path: '/ai', label: 'AI助手', icon: Bot },
  { path: '/collaboration', label: '团队协作', icon: MessageSquare },
  { path: '/crm', label: '客户管理', icon: Contact },
  { path: '/social-media', label: '自媒体运营', icon: Share2 },
  { path: '/video-conference', label: '视频会议', icon: Video },
  { path: '/settings', label: '系统设置', icon: Settings }
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  KanbanSquare: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>,
  Bot: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></svg>,
  MessageSquare: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  Contact: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Share2: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  Video: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  Settings: ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
};

export default function MainLayout() {
  const { currentUser, signOut, dataLoadError, clearDataLoadError, isLoading } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    setUserMenuOpen(false);
    await signOut();
  }, [signOut]);

  const activeItem = navItems.find(item => location.pathname.startsWith(item.path));
  const pageTitle = activeItem ? activeItem.label : '一人军办公室';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">O</span>
              </div>
              <h1 className="text-base font-semibold text-slate-800 hidden sm:block">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="搜索..."
                className="bg-transparent text-sm text-slate-700 outline-none w-full placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 ml-2">
              {!isOnline && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <span className="text-xs text-amber-700">离线</span>
                </div>
              )}
              {isLoading && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  <span className="text-xs text-blue-700">加载中</span>
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    {currentUser?.username ? (
                      <span className="text-white text-xs font-medium">
                        {currentUser.username.slice(0, 1).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200/80 z-50 py-1 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-800">{currentUser?.username || '用户'}</p>
                        <p className="text-xs text-slate-500">{currentUser?.email || ''}</p>
                      </div>
                      <NavLink
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        系统设置
                      </NavLink>
                      <NavLink
                        to="/help"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        帮助与反馈
                      </NavLink>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-slate-200/80 z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <nav className="p-3 space-y-0.5 overflow-y-auto h-full pb-20">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const IconComponent = iconMap[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {IconComponent && (
                  <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                )}
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Data Load Error Banner */}
      {dataLoadError && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-2xl border border-red-200 z-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-sm">⚠</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-red-800">部分数据加载失败</h4>
              <p className="text-xs text-red-600 mt-0.5">{dataLoadError}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={clearDataLoadError}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-56 pt-14 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
