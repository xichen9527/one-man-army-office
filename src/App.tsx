import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import MainLayout from '@/components/layouts/MainLayout'

// 懒加载页面
const Login = lazy(() => import('@/pages/Login'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AIAssistant = lazy(() => import('@/pages/AIAssistant'))
const ProjectManagement = lazy(() => import('@/pages/ProjectManagement'))
const Collaboration = lazy(() => import('@/pages/Collaboration'))
const CRM = lazy(() => import('@/pages/CRM'))
const SocialMedia = lazy(() => import('@/pages/SocialMedia'))
const VideoConference = lazy(() => import('@/pages/VideoConference'))
const Settings = lazy(() => import('@/pages/Settings'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
// Projects merged into ProjectManagement
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Invite = lazy(() => import('@/pages/Invite'))

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
    <Router basename="/one-man-army-office">
      <Routes>
        {/* 公开路由 - 已登录则跳转 */}
        <Route path="/login" element={<RedirectIfAuth><Suspense fallback={<LoadingFallback />}><Login /></Suspense></RedirectIfAuth>} />
        <Route path="/reset-password" element={<RedirectIfAuth><Suspense fallback={<LoadingFallback />}><ResetPassword /></Suspense></RedirectIfAuth>} />
        <Route path="/register" element={<RedirectIfAuth><Suspense fallback={<LoadingFallback />}><Register /></Suspense></RedirectIfAuth>} />
        <Route path="/invite/:token" element={<Suspense fallback={<LoadingFallback />}><Invite /></Suspense>} />

        {/* 受保护路由 */}
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
          <Route path="ai" element={<Suspense fallback={<LoadingFallback />}><AIAssistant /></Suspense>} />
          <Route path="project-management" element={<Suspense fallback={<LoadingFallback />}><ProjectManagement /></Suspense>} />
          <Route path="collaboration" element={<Suspense fallback={<LoadingFallback />}><Collaboration /></Suspense>} />
          <Route path="crm" element={<Suspense fallback={<LoadingFallback />}><CRM /></Suspense>} />
          <Route path="social-media" element={<Suspense fallback={<LoadingFallback />}><SocialMedia /></Suspense>} />
            <Route path="projects/:id" element={<Suspense fallback={<LoadingFallback />}><ProjectDetail /></Suspense>} />
          <Route path="video-conference" element={<Suspense fallback={<LoadingFallback />}><VideoConference /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<LoadingFallback />}><AdminPage /></Suspense>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
