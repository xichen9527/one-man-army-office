import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, KeyRound } from 'lucide-react'
import { useStore } from '@/store'
import { toast } from '@/components/ui/toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { updatePassword } = useStore()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
  const [strengthText, setStrengthText] = useState('')
  const [tokenError, setTokenError] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setTokenError('重置链接无效或已过期，请重新发起密码重置请求。')
    }
  }, [token])

  const calculatePasswordStrength = useCallback((password: string) => {
    if (!password) {
      setPasswordStrength('weak')
      setStrengthText('')
      return
    }
    if (password.length < 8) {
      setPasswordStrength('weak')
      setStrengthText('密码长度至少8位')
      return
    }
    let score = 0
    if (/[a-zA-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++
    if (score <= 1) {
      setPasswordStrength('weak')
      setStrengthText('弱 - 建议增加数字或特殊字符')
    } else if (score === 2) {
      setPasswordStrength('medium')
      setStrengthText('中 - 建议增加特殊字符')
    } else {
      setPasswordStrength('strong')
      setStrengthText('强 - 密码安全性良好')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({ title: '错误', description: '重置链接无效', variant: 'destructive' })
      return
    }
    if (!newPassword || !confirmPassword) {
      toast({ title: '请填写所有字段', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: '两次输入的密码不一致', variant: 'destructive' })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: '密码长度至少8位', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { error } = await updatePassword(newPassword)
      if (error) throw error
      toast({ title: '密码修改成功', description: '请使用新密码登录' })
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      toast({ title: '修改失败', description: err?.message || '未知错误', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const strengthConfig = {
    weak: { color: 'bg-red-500', width: '33%', textColor: 'text-red-500' },
    medium: { color: 'bg-yellow-500', width: '66%', textColor: 'text-yellow-600' },
    strong: { color: 'bg-green-500', width: '100%', textColor: 'text-green-600' },
  }
  const cfg = strengthConfig[passwordStrength]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">重置密码</CardTitle>
          <CardDescription>请输入您的新密码</CardDescription>
        </CardHeader>
        <CardContent>
          {tokenError ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-gray-600 text-center">{tokenError}</p>
              <Button variant="outline" onClick={() => navigate('/login')}>返回登录</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium">新密码</label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); calculatePasswordStrength(e.target.value) }}
                    placeholder="至少8位，含字母/数字/特殊字符"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.color} transition-all duration-300`} style={{ width: cfg.width }} />
                    </div>
                    <p className={`text-xs ${cfg.textColor}`}>{strengthText}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium">确认密码</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">两次输入的密码不一致</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />密码一致</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</> : '确认修改'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
