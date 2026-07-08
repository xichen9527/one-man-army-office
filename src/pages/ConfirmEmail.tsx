import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

type ConfirmState = 'loading' | 'success' | 'error' | 'expired' | 'invalid' | 'already_confirmed'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [state, setState] = useState<ConfirmState>('loading')
  const [message, setMessage] = useState('正在验证邮箱确认链接...')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (!token) {
      setState('invalid')
      setMessage('无效的确认链接：缺少确认令牌')
      return
    }

    const confirmEmailChange = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          setState('error')
          setMessage('系统配置错误，请联系管理员')
          return
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/confirm-email-change`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({ token }),
          }
        )

        const result = await response.json()

        if (response.ok && result.success) {
          setState('success')
          setNewEmail(result.newEmail || '新邮箱')
          setMessage(result.message || '邮箱修改成功')
        } else {
          const errMsg = result.message || result.error || '验证失败'
          if (errMsg.includes('过期')) {
            setState('expired')
          } else if (errMsg.includes('无效') || errMsg.includes('无待修改')) {
            setState('already_confirmed')
          } else {
            setState('error')
          }
          setMessage(errMsg)
        }
      } catch (err: any) {
        setState('error')
        setMessage('网络错误，请检查网络连接后重试')
      }
    }

    confirmEmailChange()
  }, [token])

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case 'expired':
        return <XCircle className="w-16 h-16 text-yellow-500" />
      case 'invalid':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />
      case 'already_confirmed':
        return <CheckCircle className="w-16 h-16 text-gray-400" />
    }
  }

  const getTitle = () => {
    switch (state) {
      case 'loading':
        return '验证中'
      case 'success':
        return '邮箱修改成功！'
      case 'expired':
        return '链接已过期'
      case 'invalid':
        return '无效链接'
      case 'error':
        return '验证失败'
      case 'already_confirmed':
        return '无需操作'
    }
  }

  const getDescription = () => {
    switch (state) {
      case 'success':
        return `您的邮箱已成功修改为 ${newEmail}，请使用新邮箱登录。`
      case 'already_confirmed':
        return '该邮箱修改已经完成或链接已失效，无需重复操作。'
      default:
        return message
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription className="text-sm mt-2">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {state === 'loading' && (
            <div className="flex justify-center">
              <div className="w-12 h-1 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg">
                <Mail className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">{newEmail}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate('/login')}
              >
                前往登录
              </Button>
            </div>
          )}

          {state === 'expired' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">
                确认链接有效期为 24 小时，请重新提交邮箱修改申请。
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate('/settings')}
              >
                返回设置页重新提交
              </Button>
            </div>
          )}

          {(state === 'error' || state === 'invalid' || state === 'already_confirmed') && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">
                {state === 'already_confirmed'
                  ? '您的邮箱修改已完成，无需担心。'
                  : '请检查链接是否正确，或重新提交邮箱修改申请。'}
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate(state === 'already_confirmed' ? '/dashboard' : '/settings')}
              >
                {state === 'already_confirmed' ? '返回首页' : '返回设置页'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
