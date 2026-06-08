import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Bot, Eye, EyeOff, AlertCircle, Loader2, Shield } from 'lucide-react'
import { useStore } from '@/store'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, verify2FA } = useStore()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false)
  const [userId2FA, setUserId2FA] = useState<string | null>(null)
  const [code2FA, setCode2FA] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier || !password) {
      setError('请输入账号和密码')
      return
    }
    setLoading(true)
    const result = await signIn(identifier, password, rememberMe)
    setLoading(false)
    
    if (result.error) {
      const msg = result.error.message || ''
      if (msg.includes('锁定')) setError(msg)
      else if (msg.includes('Invalid login credentials') || msg.includes('用户名或密码错误')) setError('用户名或密码错误')
      else if (msg.includes('Email not confirmed')) setError('请先验证邮箱')
      else if (msg.includes('Too many requests')) setError('登录尝试次数过多，请稍后再试')
      else setError(msg || '登录失败，请重试')
    } else if (result.requires2FA && result.userId) {
      // Show 2FA verification UI
      setShow2FA(true)
      setUserId2FA(result.userId)
      setCode2FA(['', '', '', '', '', ''])
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } else {
      navigate('/dashboard')
    }
  }

  const handle2FAChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code2FA]
    newCode[index] = digit
    setCode2FA(newCode)

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && digit) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        handle2FASubmit(fullCode)
      }
    }
  }

  const handle2FAKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code2FA[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handle2FASubmit = async (code?: string) => {
    const fullCode = code || code2FA.join('')
    if (fullCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    if (!userId2FA) {
      setError('登录会话已过期，请重新登录')
      setShow2FA(false)
      return
    }

    setLoading(true)
    setError('')
    const { error: err } = await verify2FA(userId2FA, fullCode)
    setLoading(false)

    if (err) {
      setError(err.message || '验证码错误')
      setCode2FA(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      navigate('/dashboard')
    }
  }

  const handleBackToLogin = () => {
    setShow2FA(false)
    setUserId2FA(null)
    setCode2FA(['', '', '', '', '', ''])
    setError('')
  }

  // 2FA Verification UI
  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              两步验证
            </h1>
            <p className="text-sm text-gray-500">请输入验证器应用中的6位验证码</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="pt-6">
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code2FA[i]}
                      onChange={(e) => handle2FAChange(i, e.target.value)}
                      onKeyDown={(e) => handle2FAKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-semibold border-2 focus:border-blue-500"
                      disabled={loading}
                    />
                  ))}
                </div>

                <Button
                  onClick={() => handle2FASubmit()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={loading || code2FA.some(c => !c)}
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />验证中...</span>
                  ) : '验证'}
                </Button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  返回登录
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Regular Login UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            一人成军办公平台
          </h1>
          <p className="text-sm text-gray-500">一人公司，一键搞定</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">登录账号</CardTitle>
            <CardDescription>输入您的账号信息继续</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier">账号</Label>
                <Input id="identifier" type="text" placeholder="用户名或邮箱" value={identifier} onChange={e => setIdentifier(e.target.value)} required autoComplete="username" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="输入密码" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">记住我</Label>
                </div>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  忘记密码？
                </button>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />登录中...</span>
                ) : '登录'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">还没有账号？</span>
              <Link to="/register" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
                立即注册
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
