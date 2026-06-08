import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Bot, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useStore } from '@/store'

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useStore()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email || !password || !fullName) {
      setError('请填写所有必填项')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (password.length < 6) {
      setError('密码长度不能少于6位')
      return
    }
    if (!agree) {
      setError('请先同意用户协议和隐私政策')
      return
    }
    setLoading(true)
    const { error: err } = await signUp(email, password, fullName, username || email.split('@')[0])
    setLoading(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('already registered')) setError('该邮箱已被注册')
      else if (msg.includes('Password')) setError('密码格式不正确')
      else setError(msg || '注册失败，请重试')
    } else {
      setSuccess('注册成功！请查收验证邮件，验证后即可登录。')
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            创建您的账号
          </h1>
          <p className="text-sm text-gray-500">加入一人成军，开启高效办公</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">注册账号</CardTitle>
            <CardDescription>填写以下信息创建您的账号</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200 mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">姓名 *</Label>
                <Input id="fullName" placeholder="您的姓名" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" placeholder="用于显示（可选）" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址 *</Label>
                <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码 *</Label>
                <Input id="password" type="password" placeholder="至少6位" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">确认密码 *</Label>
                <Input id="confirm" type="password" placeholder="再次输入密码" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="agree" checked={agree} onCheckedChange={checked => setAgree(checked as boolean)} />
                <Label htmlFor="agree" className="text-sm font-normal cursor-pointer">
                  我已阅读并同意<button type="button" className="text-blue-600 hover:underline">用户协议</button>和<button type="button" className="text-blue-600 hover:underline">隐私政策</button>
                </Label>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
                {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />注册中...</span> : '注册账号'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">已有账号？</span>
              <Link to="/login" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">立即登录</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
