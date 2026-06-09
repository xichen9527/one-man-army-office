import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bot, CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/db/supabase'

export default function Invite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<'loading' | 'valid' | 'invalid' | 'registering' | 'success' | 'error'>('loading')
  const [invitation, setInvitation] = useState<any>(null)
  const [inviterName, setInviterName] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setStep('invalid')
      return
    }
    validateInvite()
  }, [token])

  const validateInvite = async () => {
    try {
      const { data, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single()

      if (inviteError || !data) {
        setStep('invalid')
        return
      }

      // 检查是否已过期（7天）
      const created = new Date(data.created_at)
      const now = new Date()
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays > 7) {
        setStep('invalid')
        return
      }

      // 检查是否已被接受
      if (data.status === 'accepted') {
        setStep('invalid')
        return
      }

      setInvitation(data)

      // 获取邀请人名称
      if (data.team_owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', data.team_owner_id)
          .single()
        setInviterName(profile?.full_name || profile?.username || '团队管理员')
      }

      setEmail(data.email || '')
      setStep('valid')
    } catch {
      setStep('error')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !fullName) {
      setError('请填写所有必填项')
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    setLoading(true)
    setStep('registering')

    try {
      // 1. 注册账号（跳过邮件确认，因为邀请链接已是身份验证）
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: null,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setStep('valid')
        setLoading(false)
        return
      }

      // 2. 更新邀请状态
      if (invitation) {
        await supabase
          .from('invitations')
          .update({ status: 'accepted' })
          .eq('token', token)
      }

      // 3. 添加为团队成员
      if (invitation) {
        await supabase.from('team_members').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          owner_id: invitation.team_owner_id,
          role: invitation.role || 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        })
      }

      // 4. 尝试自动登录（如果邮箱确认已关闭）
      try {
        await supabase.auth.signInWithPassword({ email, password })
      } catch {
        // 邮箱确认已开启，需要用户先验证邮箱
        setError('注册成功！请检查邮箱并点击验证链接，然后登录。')
        setTimeout(() => navigate('/login'), 5000)
        return
      }

      setStep('success')
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
      setStep('valid')
    } finally {
      setLoading(false)
    }
  }

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
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-16 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-500">正在验证邀请链接...</p>
            </CardContent>
          </Card>
        )}

        {/* Invalid / Error */}
        {(step === 'invalid' || step === 'error') && (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">邀请链接无效</h2>
              <p className="text-gray-500 text-center text-sm">
                {step === 'invalid'
                  ? '此邀请链接已失效或已被使用，请联系邀请人重新发送。'
                  : '验证邀请时发生错误，请稍后重试。'}
              </p>
              <Button variant="outline" onClick={() => navigate('/login')}>前往登录</Button>
            </CardContent>
          </Card>
        )}

        {/* Register Form */}
        {(step === 'valid' || step === 'registering') && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">邀请链接有效</span>
              </div>
              <CardTitle className="text-xl">接受邀请，加入团队</CardTitle>
              <CardDescription>
                <span>{inviterName} 邀请您以 <strong>{invitation?.role === 'admin' ? '管理员' : invitation?.role === 'manager' ? '经理' : '成员'}</strong> 身份加入团队</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                  {invitation?.email && email !== invitation.email && (
                    <p className="text-xs text-amber-600">⚠️ 此邀请链接是为 {invitation.email} 生成的</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">您的姓名</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="张三"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">设置密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-400">密码至少6位，建议包含字母和数字</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在创建账号...</>
                  ) : (
                    '接受邀请并加入团队'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {step === 'success' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">注册成功！</h2>
              <p className="text-gray-500 text-center">正在跳转到工作台...</p>
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-gray-400">
          已有账号？<a href="/login" className="text-blue-500 hover:underline">直接登录</a>
        </p>
      </div>
    </div>
  )
}
