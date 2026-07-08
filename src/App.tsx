import React, { Suspense, lazy, useEffect } from 'react'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/ErrorBoundary'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import MainLayout from '@/components/layouts/MainLayout'

// 懒加载页面
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AIAssistant = lazy(() => import('@/pages/AIAssistant'))
const ProjectManagement = lazy(() => import('@/pages/ProjectManagement'))
const Collaboration = lazy(() => import('@/pages/Collaboration'))
const CRM = lazy(() => import('@/pages/CRM'))
const SocialMedia = lazy(() => import('@/pages/SocialMedia'))
const VideoConference = lazy(() => import('@/pages/VideoConference'))
const Settings = lazy(() => import('@/pages/Settings'))
// Projects merged into ProjectManagement
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Invite = lazy(() => import('@/pages/Invite'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const ConfirmEmail = lazy(() => import('@/pages/ConfirmEmail'))

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    </div>
  )
}

// 需要登录的路由守卫
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, loadUser } = useStore()

  useEffect(() => {
    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">正在加载...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// 已登录用户跳转到 dashboard
function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useStore()

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      useStore.getState().loadUser()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Router basename={import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || undefined}>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* 公开路由 - 已登录则跳转 */}
        <Route path="/login" element={<RedirectIfAuth><Suspense fallback={<LoadingFallback />}><ErrorBoundary><Login /></ErrorBoundary></Suspense></RedirectIfAuth>} />
        <Route path="/register" element={<RedirectIfAuth><Suspense fallback={<LoadingFallback />}><ErrorBoundary><Register /></ErrorBoundary></Suspense></RedirectIfAuth>} />
        <Route path="/invite/:token" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><Invite /></Suspense></ErrorBoundary>} />
        <Route path="/reset-password" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><ResetPassword /></Suspense></ErrorBoundary>} />
        <Route path="/confirm-email" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><ConfirmEmail /></Suspense></ErrorBoundary>} />

        {/* 受保护路由 */}
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense></ErrorBoundary>} />
          <Route path="ai" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><AIAssistant /></Suspense></ErrorBoundary>} />
          <Route path="project-management" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><ProjectManagement /></Suspense></ErrorBoundary>} />
          <Route path="collaboration" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><Collaboration /></Suspense></ErrorBoundary>} />
          <Route path="crm" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><CRM /></Suspense></ErrorBoundary>} />
          <Route path="social-media" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><SocialMedia /></Suspense></ErrorBoundary>} />
          {/* projects route merged into project-management */}
          <Route path="projects/:id" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><ProjectDetail /></Suspense></ErrorBoundary>} />
          <Route path="video-conference" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><VideoConference /></Suspense></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Suspense fallback={<LoadingFallback />}><Settings /></Suspense></ErrorBoundary>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
