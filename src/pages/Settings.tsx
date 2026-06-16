import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Upload,
  AlertCircle,
  Check,
  Bot,
  Plus,
  Trash2,
  Edit3,
  Key,
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  Save
} from 'lucide-react'
import { useStore } from '@/store'

// 密码强度类型
type PasswordStrength = 'weak' | 'medium' | 'strong'

// 主题类型
type Theme = 'light' | 'dark' | 'auto'

export default function Settings() {
  const { currentUser } = useStore()
  const [fullName, setFullName] = useState(currentUser?.full_name || '')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '')
  
  // 密码强度状态
  const [newPassword, setNewPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak')
  const [strengthText, setStrengthText] = useState('')
  
  // 浏览器通知状态
  const [browserNotification, setBrowserNotification] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  
  // 主题状态
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    return savedTheme || 'auto'
  })

  // 通知设置状态
  const [emailNotification, setEmailNotification] = useState(true)
  const [soundNotification, setSoundNotification] = useState(true)
  // 通知类型细分开关
  const [notifTask, setNotifTask] = useState(() => localStorage.getItem('notif_task') !== 'false')
  const [notifMeeting, setNotifMeeting] = useState(() => localStorage.getItem('notif_meeting') !== 'false')
  const [notifMessage, setNotifMessage] = useState(() => localStorage.getItem('notif_message') !== 'false')
  const [notifSystem, setNotifSystem] = useState(() => localStorage.getItem('notif_system') !== 'false')
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [twoStepEnabled, setTwoStepEnabled] = useState(false)
  const [twoStepSetupStep, setTwoStepSetupStep] = useState<'intro' | 'confirm' | 'verify'>('intro')
  const [twoStepCode, setTwoStepCode] = useState('')

  // 语言设置状态
  const [language, setLanguage] = useState('zh-CN')

  // 主题色状态
  const [accentColor, setAccentColor] = useState('#3B82F6')

  // 初始化时检查通知权限
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      setBrowserNotification(Notification.permission === 'granted')
    }
  }, [])

  // 应用主题
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // 自动模式：跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // 监听系统主题变化（自动模式）
  useEffect(() => {
    if (theme !== 'auto') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // 计算密码强度
  const calculatePasswordStrength = useCallback((password: string) => {
    if (!password) {
      setPasswordStrength('weak')
      setStrengthText('')
      return
    }

    let score = 0
    const suggestions: string[] = []

    // 长度检查
    if (password.length < 8) {
      setPasswordStrength('weak')
      setStrengthText('密码长度至少8位')
      return
    } else if (password.length >= 8) {
      score += 1
    }

    // 包含字母
    if (/[a-zA-Z]/.test(password)) {
      score += 1
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 1
    }

    // 包含特殊字符
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1
    }

    // 判断强度
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

  // 处理密码输入变化
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setNewPassword(password)
    calculatePasswordStrength(password)
  }

  // 头像裁切为200×200圆形
  const cropAvatar = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const size = 200
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        // 圆形裁切
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        // 居中裁切正方形区域
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('裁切失败'))
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = URL.createObjectURL(file)
    })
  }

  // 头像上传处理
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('请选择要上传的图片')
      }

      const file = event.target.files[0]
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        throw new Error('请上传图片文件')
      }

      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('图片大小不能超过 5MB')
      }

      // 裁切为200×200圆形
      const croppedBlob = await cropAvatar(file)

      const { supabase: sb } = await import('@/db/supabase')
      
      // 生成唯一文件名
      const fileName = `${currentUser?.id}-avatar.png`
      const filePath = `${fileName}`

      // 上传裁切后的图片到 Supabase Storage
      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png'
        })

      if (uploadError) {
        throw uploadError
      }

      // 获取公共 URL
      const { data: { publicUrl } } = sb.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 更新 profiles 表的 avatar_url
      if (currentUser?.id) {
        const { error: updateError } = await sb
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', currentUser.id)

        if (updateError) {
          throw updateError
        }

        // 更新本地状态
        setAvatarUrl(publicUrl)
        
        // 重新加载用户信息
        const storeState = (await import('@/store')).useStore.getState()
        await storeState.loadUser()
      }

      alert('头像上传成功！')
    } catch (error: any) {
      alert('上传失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 处理浏览器通知开关
  const handleBrowserNotificationChange = async (checked: boolean) => {
    if (!('Notification' in window)) {
      alert('您的浏览器不支持通知功能')
      return
    }

    if (checked) {
      // 请求权限
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        setBrowserNotification(true)
        // 发送测试通知
        new Notification('通知已启用', {
          body: '您已成功启用浏览器通知',
          icon: '/favicon.ico'
        })
      } else if (permission === 'denied') {
        alert('通知权限被拒绝，请在浏览器设置中允许通知')
        setBrowserNotification(false)
      } else {
        setBrowserNotification(false)
      }
    } else {
      setBrowserNotification(false)
      alert('已关闭浏览器通知。如需重新启用，请点击开关并允许通知权限。')
    }
  }

  // 发送浏览器通知的辅助函数
  const sendBrowserNotification = (title: string, body: string) => {
    if (browserNotification && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'one-man-army-notification'
      })
    }
  }

  // 处理两步验证开关
  const handle2FAToggle = async (checked: boolean) => {
    if (checked) {
      // 启用：显示设置对话框
      setTwoStepSetupStep('intro')
      setShow2FADialog(true)
    } else {
      // 禁用：需要确认
      if (confirm('确定要关闭两步验证吗？这将降低账户安全性。')) {
        await handleDisable2FA()
      }
    }
  }

  const handleEnable2FA = async () => {
    try {
      const { supabase: sb } = await import('@/db/supabase')
      // 更新 profiles 表的 2FA 设置
      const { error } = await sb
        .from('profiles')
        .update({ two_factor_enabled: true })
        .eq('id', currentUser?.id)
      
      if (error) throw error
      
      setTwoStepEnabled(true)
      setShow2FADialog(false)
      alert('两步验证已启用！下次登录时需要输入验证码。')
    } catch (error: any) {
      alert('启用两步验证失败: ' + error.message)
    }
  }

  const handleDisable2FA = async () => {
    try {
      const { supabase: sb } = await import('@/db/supabase')
      const { error } = await sb
        .from('profiles')
        .update({ two_factor_enabled: false })
        .eq('id', currentUser?.id)
      
      if (error) throw error
      
      setTwoStepEnabled(false)
      alert('两步验证已关闭。')
    } catch (error: any) {
      alert('关闭两步验证失败: ' + error.message)
    }
  }

  // 保存个人资料
  const handleSaveProfile = async () => {
    const { supabase: sb } = await import('@/db/supabase')
    const updates: Record<string, string> = {}
    if (fullName !== currentUser?.full_name) updates.full_name = fullName
    if (username !== currentUser?.username) updates.username = username
    if (Object.keys(updates).length > 0 && currentUser?.id) {
      await sb.from('profiles').update(updates).eq('id', currentUser.id)
      const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single()
      if (data) {
        const storeState = (await import('@/store')).useStore.getState()
        storeState.loadUser()
      }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 修改密码
  const handleChangePassword = async () => {
    const cp = (document.getElementById('currentPassword') as HTMLInputElement)?.value
    const np = (document.getElementById('newPassword') as HTMLInputElement)?.value
    const cfp = (document.getElementById('confirmPassword') as HTMLInputElement)?.value
    
    if (!cp || !np || !cfp) { 
      alert('请填写所有密码字段') 
      return 
    }
    if (np !== cfp) { 
      alert('两次输入的新密码不一致') 
      return 
    }
    if (np.length < 6) { 
      alert('密码长度至少6位') 
      return 
    }
    
    const { supabase: sb } = await import('@/db/supabase')
    const { error } = await sb.auth.updateUser({ password: np })
    if (error) { 
      alert('修改失败: ' + error.message) 
    } else {
      alert('密码修改成功')
      ;(document.getElementById('currentPassword') as HTMLInputElement).value = ''
      ;(document.getElementById('newPassword') as HTMLInputElement).value = ''
      ;(document.getElementById('confirmPassword') as HTMLInputElement).value = ''
      setNewPassword('')
    }
  }

  // 密码强度指示器组件
  const PasswordStrengthIndicator = () => {
    if (!newPassword) return null

    const strengthConfig = {
      weak: {
        color: 'bg-red-500',
        width: '33%',
        textColor: 'text-red-500'
      },
      medium: {
        color: 'bg-yellow-500',
        width: '66%',
        textColor: 'text-yellow-500'
      },
      strong: {
        color: 'bg-green-500',
        width: '100%',
        textColor: 'text-green-500'
      }
    }

    const config = strengthConfig[passwordStrength]

    return (
      <div className="mt-2 space-y-1">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
          <div 
            className={`h-full ${config.color} transition-all duration-300 ease-in-out`}
            style={{ width: config.width }}
          />
        </div>
        <p className={`text-xs ${config.textColor}`}>
          {strengthText}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">系统设置</h2>
        <p className="text-muted-foreground">
          管理您的账户和系统偏好
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            个人资料
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            通知设置
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            安全设置
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            外观设置
          </TabsTrigger>
          <TabsTrigger value="language">
            <Globe className="mr-2 h-4 w-4" />
            语言设置
          </TabsTrigger>
          <TabsTrigger value="ai-models">
            <Bot className="mr-2 h-4 w-4" />
            AI 模型
          </TabsTrigger>
        </TabsList>

        {/* 个人资料 */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>
                管理您的个人信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 头像 */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || currentUser?.avatar_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? '上传中...' : '上传头像'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 JPG、PNG 格式，最大 5MB
                  </p>
                </div>
              </div>

              {/* 表单 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">姓名</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                {saved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    已保存
                  </>
                ) : (
                  '保存修改'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>
                管理您接收通知的方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>邮件通知</Label>
                  <p className="text-sm text-muted-foreground">
                    接收邮件通知
                  </p>
                </div>
                <Switch checked={emailNotification} onCheckedChange={v => setEmailNotification(v)} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>浏览器通知</Label>
                  <p className="text-sm text-muted-foreground">
                    在浏览器中显示通知
                    {notificationPermission === 'denied' && (
                      <span className="text-red-500 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        通知权限已被拒绝
                      </span>
                    )}
                  </p>
                </div>
                <Switch 
                  checked={browserNotification}
                  onCheckedChange={handleBrowserNotificationChange}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>声音提醒</Label>
                  <p className="text-sm text-muted-foreground">
                    收到通知时播放声音
                  </p>
                </div>
                <Switch checked={soundNotification} onCheckedChange={v => setSoundNotification(v)} />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3">通知类型</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">任务通知</Label>
                      <p className="text-xs text-muted-foreground">任务分配、截止提醒、状态变更</p>
                    </div>
                    <Switch checked={notifTask} onCheckedChange={v => { setNotifTask(v); localStorage.setItem('notif_task', String(v)) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">会议提醒</Label>
                      <p className="text-xs text-muted-foreground">会议开始前提醒、会议变更通知</p>
                    </div>
                    <Switch checked={notifMeeting} onCheckedChange={v => { setNotifMeeting(v); localStorage.setItem('notif_meeting', String(v)) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">消息通知</Label>
                      <p className="text-xs text-muted-foreground">频道消息、@提及、私信</p>
                    </div>
                    <Switch checked={notifMessage} onCheckedChange={v => { setNotifMessage(v); localStorage.setItem('notif_message', String(v)) }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">系统通知</Label>
                      <p className="text-xs text-muted-foreground">系统更新、安全提醒、公告</p>
                    </div>
                    <Switch checked={notifSystem} onCheckedChange={v => { setNotifSystem(v); localStorage.setItem('notif_system', String(v)) }} />
                  </div>
                </div>
              </div>

              {/* 通知测试按钮 */}
              {browserNotification && (
                <Button 
                  variant="outline" 
                  onClick={() => sendBrowserNotification('测试通知', '这是一条测试通知消息')}
                  className="w-full"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  发送测试通知
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>
                定期修改密码以保护账户安全
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">当前密码</Label>
                <Input id="currentPassword" type="password" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword}
                  onChange={handlePasswordChange}
                />
                <PasswordStrengthIndicator />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              
              <Button onClick={handleChangePassword}>修改密码</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>两步验证</CardTitle>
              <CardDescription>
                增强账户安全性
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用两步验证</Label>
                  <p className="text-sm text-muted-foreground">
                    登录时需要额外验证
                  </p>
                </div>
                <Switch checked={twoStepEnabled} onCheckedChange={handle2FAToggle} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外观设置 */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>主题设置</CardTitle>
              <CardDescription>
                自定义界面外观
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>主题模式</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('light')}
                  >
                    {theme === 'light' && <Check className="mr-2 h-4 w-4" />}
                    浅色
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('dark')}
                  >
                    {theme === 'dark' && <Check className="mr-2 h-4 w-4" />}
                    深色
                  </Button>
                  <Button 
                    variant={theme === 'auto' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('auto')}
                  >
                    {theme === 'auto' && <Check className="mr-2 h-4 w-4" />}
                    自动
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>主题色</Label>
                <div className="flex space-x-2">
                  {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setAccentColor(color)
                        document.documentElement.style.setProperty('--accent-color', color)
                      }}
                      className={`w-8 h-8 rounded-full border-2 ${accentColor === color ? 'border-primary ring-2 ring-offset-2' : 'border-muted hover:border-primary'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 语言设置 */}
        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>语言设置</CardTitle>
              <CardDescription>
                选择界面语言
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="language">界面语言</Label>
                <select
                  id="language"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁体中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 模型 */}
        <TabsContent value="ai-models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 模型配置</CardTitle>
              <CardDescription>
                添加自定义 API 连接，支持 OpenAI 兼容格式（OpenAI、Claude、硅基流动等）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AIModelSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 两步验证设置对话框 */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>启用两步验证</DialogTitle>
            <DialogDescription>
              两步验证可以为您的账户提供额外的安全保护。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {twoStepSetupStep === 'intro' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  启用两步验证后，每次登录时需要输入由身份验证器应用（如 Microsoft Authenticator、Google Authenticator）生成的6位验证码。
                </p>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-yellow-700">请确保您已安装身份验证器应用</span>
                </div>
              </div>
            )}
            {twoStepSetupStep === 'confirm' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">点击下方按钮完成设置：</p>
                <Input
                  placeholder="输入验证码"
                  value={twoStepCode}
                  onChange={e => setTwoStepCode(e.target.value)}
                />
                <p className="text-xs text-gray-400">演示模式：输入任意6位数字即可通过</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {twoStepSetupStep === 'intro' && (
              <>
                <Button variant="outline" onClick={() => setShow2FADialog(false)}>取消</Button>
                <Button onClick={() => setTwoStepSetupStep('confirm')}>继续设置</Button>
              </>
            )}
            {twoStepSetupStep === 'confirm' && (
              <>
                <Button variant="outline" onClick={() => { setShow2FADialog(false); setTwoStepSetupStep('intro') }}>取消</Button>
                <Button onClick={handleEnable2FA} disabled={twoStepCode.length !== 6}>完成设置</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ AI 模型设置子组件 ============
type AIAPIConfig = {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  isDefault: boolean
}

function AIModelSettings() {
  const [apis, setApis] = useState<AIAPIConfig[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ai_api_configs') || '[]')
    } catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' })
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const saveToLs = (configs: AIAPIConfig[]) => {
    localStorage.setItem('ai_api_configs', JSON.stringify(configs))
    setApis(configs)
  }

  const handleAdd = () => {
    if (!form.name || !form.baseUrl || !form.apiKey || !form.model) return
    const newConfigs = [...apis]
    if (editingId) {
      const idx = newConfigs.findIndex(c => c.id === editingId)
      if (idx !== -1) newConfigs[idx] = { ...form, id: editingId, isDefault: newConfigs[idx].isDefault }
    } else {
      newConfigs.push({ ...form, id: `api-${Date.now()}`, isDefault: apis.length === 0 })
    }
    saveToLs(newConfigs)
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', baseUrl: '', apiKey: '', model: '' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleEdit = (config: AIAPIConfig) => {
    setForm({ name: config.name, baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model })
    setEditingId(config.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    const filtered = apis.filter(c => c.id !== id)
    if (filtered.length > 0 && !filtered.some(c => c.isDefault)) filtered[0].isDefault = true
    saveToLs(filtered)
  }

  const handleSetDefault = (id: string) => {
    const updated = apis.map(c => ({ ...c, isDefault: c.id === id }))
    saveToLs(updated)
  }

  const handleTest = async (config: AIAPIConfig) => {
    setTesting(config.id)
    setTestResult(null)
    try {
      const resp = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
        signal: AbortSignal.timeout(10000),
      })
      if (resp.ok) {
        setTestResult({ id: config.id, ok: true, msg: '连接成功 ✅' })
      } else {
        const err = await resp.json().catch(() => ({}))
        setTestResult({ id: config.id, ok: false, msg: `失败: ${err.error?.message || resp.statusText || resp.status}` })
      }
    } catch (e: any) {
      setTestResult({ id: config.id, ok: false, msg: `连接失败: ${e.message || '网络错误'}` })
    } finally {
      setTesting(null)
    }
  }

  const defaultConfig = apis.find(c => c.isDefault)

  return (
    <div className="space-y-4">
      {/* 当前默认 API */}
      {defaultConfig && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800">{defaultConfig.name}</p>
            <p className="text-xs text-green-600 truncate">{defaultConfig.baseUrl} · {defaultConfig.model}</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded shrink-0">默认</span>
        </div>
      )}

      {/* API 列表 */}
      {apis.filter(c => !c.isDefault).map(api => (
        <div key={api.id} className="flex items-center gap-3 p-3 rounded-lg border">
          <Bot className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{api.name}</p>
            <p className="text-xs text-gray-500 truncate">{api.baseUrl} · {api.model}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetDefault(api.id)}>设为默认</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleTest(api)} title="测试连接">
              {testing === api.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(api)}><Edit3 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-500" onClick={() => handleDelete(api.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      ))}

      {/* 测试结果 */}
      {testResult && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.msg}
          <button onClick={() => setTestResult(null)} className="ml-auto"><XCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* 新增/编辑表单 */}
      {showForm ? (
        <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">连接名称 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：OpenAI GPT-4" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">默认模型 *</Label>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="如：gpt-4o、claude-3-opus" className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">API Base URL * <span className="text-gray-400 font-normal">(OpenAI兼容格式)</span></Label>
            <div className="flex items-center gap-2 mt-1">
              <Link className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.openai.com/v1" className="h-8 text-sm" />
            </div>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {['https://api.openai.com/v1', 'https://open.aiapi.top/v1', 'https://api.siliconflow.cn/v1', 'https://api.deepseek.com/v1'].map(tmpl => (
                <button key={tmpl} onClick={() => setForm(f => ({ ...f, baseUrl: tmpl }))} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors">{tmpl}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">API Key *</Label>
            <Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." className="h-8 text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!form.name || !form.baseUrl || !form.apiKey || !form.model}>
              <Save className="w-3.5 h-3.5 mr-1" />{editingId ? '保存修改' : '添加连接'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: '', baseUrl: '', apiKey: '', model: '' }) }}>取消</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', baseUrl: '', apiKey: '', model: '' }) }}>
            <Plus className="w-3.5 h-3.5 mr-1" />添加 API 连接
          </Button>
          {apis.length === 0 && (
            <p className="text-xs text-gray-400 ml-2">暂无 API 连接，AI 将以演示模式运行</p>
          )}
        </div>
      )}

      {saved && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />已保存</p>}

      {/* 快速参考 */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
        <p className="text-xs font-medium text-gray-700 mb-2">常用 API 快速配置</p>
        <div className="space-y-1.5 text-[10px] text-gray-500">
          {[
            { name: 'OpenAI GPT-4o', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
            { name: '硅基流动 (免费额度)', url: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
            { name: 'DeepSeek V3', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            { name: '阿里通义', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
            { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash' },
          ].map(item => (
            <div key={item.name} className="flex items-center gap-2">
              <Bot className="w-3 h-3 shrink-0" />
              <span className="w-32 shrink-0">{item.name}</span>
              <span className="truncate">{item.url}</span>
              <span className="text-blue-600 shrink-0">{item.model}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
