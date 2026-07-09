import { create } from 'zustand'
import { supabase } from '@/db/supabase'
import { toast } from 'sonner'
import type {
  Profile, ProfileInsert, ProfileUpdate,
  Project, ProjectInsert, ProjectUpdate,
  Task, TaskInsert, TaskUpdate,
  Document, DocumentInsert, DocumentUpdate,
  Channel, ChannelInsert, ChannelUpdate,
  Message, MessageInsert, MessageUpdate,
  Notification, NotificationInsert, NotificationUpdate,
  AIConversation, AIConversationInsert, AIConversationUpdate,
  AIMessage, AIMessageInsert, AIMessageUpdate,
  Customer, CustomerInsert, CustomerUpdate,
  SalesOpportunity, SalesOpportunityInsert, SalesOpportunityUpdate,
  SocialAccount, SocialAccountInsert, SocialAccountUpdate,
  SocialPost, SocialPostInsert, SocialPostUpdate,
  SocialPostPlatform, SocialPostPlatformInsert, SocialPostPlatformUpdate,
  TrendingTopic, TrendingTopicInsert, TrendingTopicUpdate,
  Conference, ConferenceInsert, ConferenceUpdate,
  TeamMember, TeamMemberInsert, TeamMemberUpdate,
  Invitation, InvitationInsert, InvitationUpdate,
  DBFile, DBFileInsert, DBFileUpdate,
  ApprovalRequest, ApprovalRequestInsert, ApprovalRequestUpdate, ApprovalStatus,
  Followup, FollowupInsert, FollowupUpdate,
} from '@/types/database'

// ==================== Cached getUser (avoid concurrent auth lock) ====================
let _userCache: Promise<{ data: { user: any }; error: any }> | null = null
const getCachedUser = async () => {
  if (!_userCache) {
    _userCache = supabase.auth.getUser().then(result => {
      setTimeout(() => { _userCache = null }, 5000)
      return result
    })
  }
  return _userCache
}

// ==================== 403 / RLS Error Handler ====================
// Detects Supabase RLS 403 errors and shows a user-friendly toast.
// Returns true if the error was a 403 (caller should return/gracefully degrade).
// 会话级别去重：每个错误类型只提示一次
const _toastDedup = new Set<string>()
function _dedupToast(key: string, message: string) {
  if (_toastDedup.has(key)) return
  _toastDedup.add(key)
  toast.error(message)
}

function handleRLSError(context: string, error: any): boolean {
  const code = error?.code || ''
  const is403 = code === '403' || code === 'PGRST301' || code === '42501' || error?.message?.includes('403')
  const isNetwork = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.message?.includes('net::')
  if (is403) {
    console.warn(`[store] RLS 403 for ${context}:`, error?.message)
    _dedupToast('rls-403', `数据加载失败（${context}），请检查 Supabase RLS 策略设置`)
    return true
  }
  if (isNetwork) {
    _dedupToast('network', `网络连接失败，请检查网络后刷新页面`)
    return true
  }
  // 非 403/网络错误仍然显示，但带上下文
  const msg = error?.message || '[unknown error]'
  _dedupToast(`err-${context}`, `${context} failed: ${msg}`)
  return false
}

// 清除会话级别去重记录（登录/登出时调用）
function clearToastDedup() { _toastDedup.clear() }

// ==================== Store State ====================
interface AppState {
  // Auth
  currentUser: (Profile & { avatar?: string }) | null
  isAuthenticated: boolean
  loading: boolean
  loadUser: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: any }>

  // Projects
  projects: Project[]
  fetchProjects: () => Promise<void>
  addProject: (p: Omit<ProjectInsert, 'owner_id'>) => Promise<void>
  updateProject: (id: string, updates: ProjectUpdate) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Tasks
  tasks: Task[]
  fetchTasks: () => Promise<void>
  addTask: (t: Omit<TaskInsert, 'creator_id'>) => Promise<void>
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  // Documents
  documents: Document[]
  fetchDocuments: (projectId?: string, taskId?: string) => Promise<void>
  addDocument: (d: Omit<DocumentInsert, 'creator_id'>) => Promise<void>
  updateDocument: (id: string, updates: DocumentUpdate) => Promise<void>
  deleteDocument: (id: string) => Promise<void>

  // Messages & Channels
  channels: Channel[]
  messages: Record<string, Message[]>
  activeChannel: string | null
  fetchChannels: () => Promise<void>
  fetchMessages: (channelId: string) => Promise<void>
  setActiveChannel: (id: string | null) => void
  sendMessage: (channelId: string, content: string, senderId: string, senderName: string, replyTo?: string | null) => Promise<void>
  sendFileMessage: (channelId: string, fileUrl: string, fileName: string, senderId: string, senderName: string, replyTo?: string | null) => Promise<void>
  updateMessage: (id: string, channelId: string, updates: MessageUpdate) => Promise<void>
  deleteMessage: (id: string, channelId: string) => Promise<void>
  addNotification: (userId: string, title: string, content: string, type: string) => Promise<void>
  createChannel: (name: string, description: string, isPrivate: boolean) => Promise<void>
  updateChannel: (id: string, updates: ChannelUpdate) => Promise<void>
  deleteChannel: (id: string) => Promise<void>

  // Team
  members: TeamMember[]
  invitations: Invitation[]
  fetchTeamMembers: () => Promise<void>
  fetchInvitations: () => Promise<void>
  addMember: (email: string, role: TeamMember['role']) => Promise<void>
  updateMember: (id: string, updates: TeamMemberUpdate) => Promise<void>
  removeMember: (id: string) => Promise<void>

  // CRM
  customers: Customer[]
  fetchCustomers: () => Promise<void>
  addCustomer: (c: CustomerInsert) => Promise<void>
  updateCustomer: (id: string, updates: CustomerUpdate) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  salesOpportunities: SalesOpportunity[]
  fetchSalesOpportunities: () => Promise<void>
  addOpportunity: (o: SalesOpportunityInsert) => Promise<void>
  updateOpportunity: (id: string, updates: SalesOpportunityUpdate) => Promise<void>

  // AI
  aiConversations: AIConversation[]
  aiMessages: Record<string, AIMessage[]>
  activeAIConv: string | null
  fetchAIConversations: () => Promise<void>
  fetchAIMessages: (convId: string) => Promise<void>
  setActiveAIConv: (id: string | null) => void
  createAIConv: (title: string, featureType: AIConversationInsert['feature_type']) => Promise<string>
  sendAIMessage: (convId: string, content: string) => Promise<void>
  deleteAIConv: (id: string) => Promise<void>
  deleteAIMessage: (id: string, convId: string) => Promise<void>

  // CRM Followups
  followups: Record<string, Followup[]>
  fetchFollowups: (customerId: string) => Promise<void>
  addFollowup: (data: FollowupInsert) => Promise<void>
  deleteFollowup: (id: string, customerId: string) => Promise<void>

  // Social Media
  socialAccounts: SocialAccount[]
  socialPosts: SocialPost[]
  socialPostPlatforms: SocialPostPlatform[]
  trendingTopics: TrendingTopic[]
  fetchSocialAccounts: () => Promise<void>
  fetchSocialPosts: (accountId?: string) => Promise<void>
  fetchSocialPostPlatforms: (postId?: string) => Promise<void>
  fetchTrendingTopics: () => Promise<void>
  refreshTrendingTopics: () => Promise<void>
  addSocialAccount: (a: Omit<SocialAccountInsert, 'user_id'>) => Promise<void>
  updateSocialAccount: (id: string, updates: SocialAccountUpdate) => Promise<void>
  deleteSocialAccount: (id: string) => Promise<void>
  syncSocialAccount: (id: string, credentials: object) => Promise<void>
  addSocialPost: (p: SocialPostInsert) => Promise<string | null>
  updateSocialPost: (id: string, updates: SocialPostUpdate) => Promise<void>
  deleteSocialPost: (id: string) => Promise<void>
  addSocialPostPlatform: (pp: SocialPostPlatformInsert) => Promise<void>
  updateSocialPostPlatform: (id: string, updates: SocialPostPlatformUpdate) => Promise<void>
  deleteSocialPostPlatform: (id: string) => Promise<void>
  initiateOAuth: (accountId: string, platform: string) => Promise<{ auth_url?: string; error?: string; needs_credentials?: boolean }>
  publishPost: (postId: string, accountId: string, content: string, title?: string, platform?: string) => Promise<{ success: boolean; error?: string; post_url?: string; post_id?: string }>

  // Video Conference
  conferences: Conference[]
  fetchConferences: () => Promise<void>
  addConference: (c: Omit<ConferenceInsert, 'host_id'>) => Promise<void>
  updateConference: (id: string, updates: ConferenceUpdate) => Promise<void>
  deleteConference: (id: string) => Promise<void>

  // Notifications
  notifications: Notification[]
  fetchNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  // Approvals
  approvals: ApprovalRequest[]
  fetchApprovals: () => Promise<void>
  createApproval: (data: Omit<ApprovalRequestInsert, 'requester_id'>) => Promise<void>
  approveRequest: (id: string) => Promise<void>
  rejectRequest: (id: string) => Promise<void>
  // Approvals
  files: DBFile[]
  fetchFiles: (projectId?: string, taskId?: string) => Promise<void>
  uploadFile: (file: File, projectId?: string, taskId?: string, onProgress?: (pct: number) => void) => Promise<DBFile | null>
  moveFile: (fileId: string, newProjectId?: string, newTaskId?: string) => Promise<void>
  deleteFile: (id: string) => Promise<void>
  // Realtime
  __messageChannel: any
  __conferenceChannel: any
  __notificationChannel: any
  __socialPostsChannel: any
  subscribeToMessages: (channelId: string) => void
  unsubscribeMessages: () => void
  subscribeToConferences: () => void
  subscribeToNotifications: (userId: string) => void
  subscribeToSocialPosts: () => void
  unsubscribeSocialPosts: () => void
}

export type ConferenceStatus = Conference['status']

// ==================== Store Implementation ====================
export const useStore = create<AppState>((set, get) => ({
  // ========== Auth ==========
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  dataLoadError: null as string | null,
  setDataLoadError: (msg: string | null) => set({ dataLoadError: msg }),
  clearDataLoadError: () => { clearToastDedup(); set({ dataLoadError: null }) },

  loadUser: async () => {
    set({ loading: true, dataLoadError: null })
    clearToastDedup()
    try {
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]) as Promise<T>
      }
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000)
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        set({ currentUser: profile ? { ...profile, avatar: profile.avatar_url || undefined } : null, isAuthenticated: true, loading: false })

        // 并发加载所有数据，统一 catch（不再每个都弹 toast）
        const fetches = [
          get().fetchProjects(),
          get().fetchTasks(),
          get().fetchDocuments(),
          get().fetchChannels(),
          get().fetchNotifications(),
          get().fetchCustomers(),
          get().fetchSalesOpportunities(),
          get().fetchSocialAccounts(),
          get().fetchSocialPosts(),
          get().fetchSocialPostPlatforms(),
          get().fetchConferences(),
          get().fetchAIConversations(),
          get().fetchTeamMembers(),
          get().fetchInvitations(),
          get().fetchApprovals(),
          get().fetchFiles(),
          get().fetchTrendingTopics(),
        ]

        const results = await Promise.allSettled(fetches)
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          console.warn(`[loadUser] ${failures.length}/${results.length} fetches failed`)
          // 仅在有失败时设置错误提示，UI 显示统一 banner
          set({ dataLoadError: `${failures.length} 个模块数据加载失败，请检查网络或 RLS 策略` })
        }

        // 登录后自动建立 realtime 订阅
        get().subscribeToConferences()
        get().subscribeToNotifications(session.user.id)
        if (get().activeChannel) get().subscribeToMessages(get().activeChannel)
      } else {
        set({ currentUser: null, isAuthenticated: false, loading: false })
      }
    } catch (e) {
      toast.error('[loadUser] failed: ' + (e?.message || '[loadUser] failed:'))
      set({ currentUser: null, isAuthenticated: false, loading: false })
    }
  },

  signUp: async (email, password, fullName, username) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username } } })
    if (!error) await get().loadUser()
    return { error }
  },

  signIn: async (email, password, remember = false) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await get().loadUser()
    return { error }
  },

  signOut: async () => {
    get().unsubscribeMessages()
    get().unsubscribeSocialPosts()
    set((s: any) => {
      if (s.__conferenceChannel) supabase.removeChannel(s.__conferenceChannel)
      if (s.__notificationChannel) supabase.removeChannel(s.__notificationChannel)
      if (s.__socialPostsChannel) supabase.removeChannel(s.__socialPostsChannel)
      return { __conferenceChannel: null, __notificationChannel: null, __socialPostsChannel: null } as any
    })
    await supabase.auth.signOut()
    clearToastDedup()
    set({
      currentUser: null, isAuthenticated: false,
      projects: [], tasks: [], documents: [], channels: [], messages: {},
      notifications: [], aiConversations: [], socialAccounts: [], socialPosts: [], socialPostPlatforms: [],
      conferences: [], customers: [], salesOpportunities: [], members: [], invitations: [], files: [],
      approvals: [], dataLoadError: null,
    })
  },
  updatePassword: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return { error }
    } catch (e: any) {
      return { error: e }
    }
  },

  // ========== Projects ==========
  projects: [],
  fetchProjects: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('projects').select('*').eq('owner_id', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchProjects', error); return }
      set({ projects: (data as Project[] | null) || [] })
    } catch (e) { toast.error('fetchProjects failed: ' + (e?.message || 'fetchProjects failed:')) }
  },
  addProject: async (p) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data } = await supabase.from('projects').insert({ ...p, owner_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ projects: [data as Project, ...s.projects] }))
    } catch (e) { toast.error('addProject failed: ' + (e?.message || 'addProject failed:')) }
  },
  updateProject: async (id, updates) => {
    try {
      const { data } = await supabase.from('projects').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ projects: s.projects.map((p: Project) => p.id === id ? data as Project : p) }))
    } catch (e) { toast.error('updateProject failed: ' + (e?.message || 'updateProject failed:')) }
  },
  deleteProject: async (id) => {
    try {
      await supabase.from('projects').delete().eq('id', id)
      set((s) => ({ projects: s.projects.filter((p: Project) => p.id !== id) }))
    } catch (e) { toast.error('deleteProject failed: ' + (e?.message || 'deleteProject failed:')) }
  },

  // ========== Tasks ==========
  tasks: [],
  fetchTasks: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('tasks').select('*').eq('creator_id', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchTasks', error); return }
      set({ tasks: (data as Task[] | null) || [] })
    } catch (e) { toast.error('fetchTasks failed: ' + (e?.message || 'fetchTasks failed:')) }
  },
  addTask: async (t) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data } = await supabase.from('tasks').insert({ ...t, creator_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ tasks: [data as Task, ...s.tasks] }))
    } catch (e) { toast.error('addTask failed: ' + (e?.message || 'addTask failed:')) }
  },
  updateTask: async (id, updates) => {
    try {
      const { data } = await supabase.from('tasks').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ tasks: s.tasks.map((t: Task) => t.id === id ? data as Task : t) }))
    } catch (e) { toast.error('updateTask failed: ' + (e?.message || 'updateTask failed:')) }
  },
  deleteTask: async (id) => {
    try {
      await supabase.from('tasks').delete().eq('id', id)
      set((s) => ({ tasks: s.tasks.filter((t: Task) => t.id !== id) }))
    } catch (e) { toast.error('deleteTask failed: ' + (e?.message || 'deleteTask failed:')) }
  },

  // ========== Documents ==========
  documents: [],
  fetchDocuments: async (projectId?, taskId?) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      let query = supabase.from('documents').select('*').order('updated_at', { ascending: false })
      if (projectId) query = query.eq('project_id', projectId)
      if (taskId) query = query.eq('task_id', taskId)
      const { data, error } = await query
      if (error) { handleRLSError('fetchDocuments', error); return }
      set({ documents: (data as Document[] | null) || [] })
    } catch (e) { toast.error('fetchDocuments failed: ' + (e?.message || 'fetchDocuments failed:')) }
  },
  addDocument: async (d) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data } = await supabase.from('documents').insert({ ...d, creator_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ documents: [data as Document, ...s.documents] }))
    } catch (e) { toast.error('addDocument failed: ' + (e?.message || 'addDocument failed:')) }
  },
  updateDocument: async (id, updates) => {
    try {
      const { data } = await supabase.from('documents').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ documents: s.documents.map((d: Document) => d.id === id ? data as Document : d) }))
    } catch (e) { toast.error('updateDocument failed: ' + (e?.message || 'updateDocument failed:')) }
  },
  deleteDocument: async (id) => {
    try {
      await supabase.from('documents').delete().eq('id', id)
      set((s) => ({ documents: s.documents.filter((d: Document) => d.id !== id) }))
    } catch (e) { toast.error('deleteDocument failed: ' + (e?.message || 'deleteDocument failed:')) }
  },

  // ========== Messages & Channels ==========
  channels: [],
  messages: {},
  activeChannel: null,
  fetchChannels: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('channels').select('*').or(`created_by.eq.${user.user.id}`).eq('is_private', true).order('created_at')
      const { data: publicData, error: publicError } = await supabase.from('channels').select('*').eq('is_private', false).order('created_at')
      const allData = [...(data || []), ...((publicData || [])).filter(p => !(data || []).some(c => c.id === p.id))]
      const mergedError = error || publicError
      if (mergedError) { handleRLSError('fetchChannels', mergedError); return }
      set({ channels: (allData as Channel[] | null) || [] })
      const state = get()
      if (allData && allData.length > 0 && !state.activeChannel) {
        set({ activeChannel: allData[0].id })
        get().fetchMessages(allData[0].id)
      }
    } catch (e) { toast.error('fetchChannels failed: ' + (e?.message || 'fetchChannels failed:')) }
  },
  createChannel: async (name, description, isPrivate) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data } = await supabase.from('channels').insert({
        name, description, is_private: isPrivate, created_by: user.user.id,
      } as ChannelInsert).select().single()
      if (data) set((s) => ({ channels: [...s.channels, data as Channel] }))
    } catch (e) { toast.error('createChannel failed: ' + (e?.message || 'createChannel failed:')) }
  },
  updateChannel: async (id, updates) => {
    try {
      const { data } = await supabase.from('channels').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ channels: s.channels.map((c: Channel) => c.id === id ? data as Channel : c) }))
    } catch (e) { toast.error('updateChannel failed: ' + (e?.message || 'updateChannel failed:')) }
  },
  deleteChannel: async (id) => {
    try {
      await supabase.from('channels').delete().eq('id', id)
      set((s) => {
        const newMessages = { ...s.messages }
        delete newMessages[id]
        const remaining = s.channels.filter((c: Channel) => c.id !== id)
        return {
          channels: remaining,
          messages: newMessages,
          activeChannel: s.activeChannel === id ? (remaining[0]?.id || null) : s.activeChannel
        }
      })
    } catch (e) { toast.error('deleteChannel failed: ' + (e?.message || 'deleteChannel failed:')) }
  },
  fetchMessages: async (channelId) => {
    try {
      const { data, error } = await supabase.from('messages').select('*').eq('channel_id', channelId).order('created_at').limit(200)
      if (error) { handleRLSError('fetchMessages', error); return }
      set((s) => ({ messages: { ...s.messages, [channelId]: (data as Message[] | null) || [] } }))
    } catch (e) { toast.error('fetchMessages failed: ' + (e?.message || 'fetchMessages failed:')) }
  },
  setActiveChannel: (id) => {
    set({ activeChannel: id })
    if (id) {
      get().fetchMessages(id)
      get().subscribeToMessages(id)
    } else {
      get().unsubscribeMessages()
    }
  },
  sendMessage: async (channelId, content, senderId, senderName, replyTo = null) => {
    try {
      const { data } = await supabase.from('messages').insert({
        channel_id: channelId, sender_id: senderId, sender_name: senderName, content, message_type: 'text', reply_to: replyTo,
      } as any).select().single()
    } catch (e) { toast.error('sendMessage failed: ' + (e?.message || 'sendMessage failed:')); throw e }
  },
  sendFileMessage: async (channelId, fileUrl, fileName, senderId, senderName, replyTo = null) => {
    try {
      await supabase.from('messages').insert({
        channel_id: channelId, sender_id: senderId, sender_name: senderName, content: fileName, message_type: 'file', file_url: fileUrl, file_name: fileName, reply_to: replyTo,
      } as any).select().single()
    } catch (e) { toast.error('sendFileMessage failed: ' + (e?.message || 'sendFileMessage failed:')); throw e }
  },
  updateMessage: async (id, channelId, updates) => {
    try {
      const { data } = await supabase.from('messages').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).map((m: Message) => m.id === id ? data as Message : m) } }))
    } catch (e) { toast.error('updateMessage failed: ' + (e?.message || 'updateMessage failed:')); throw e }
  },
  deleteMessage: async (id, channelId) => {
    try {
      await supabase.from('messages').delete().eq('id', id)
      set((s) => ({ messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).filter((m: Message) => m.id !== id) } }))
    } catch (e) { toast.error('deleteMessage failed: ' + (e?.message || 'deleteMessage failed:')); throw e }
  },
  addNotification: async (userId, title, content, type) => {
    try {
      const { data } = await supabase.from('notifications').insert({
        user_id: userId, title, content, type, read: false,
      } as any).select().single()
      if (data) set((s) => ({ notifications: [data as Notification, ...s.notifications] }))
    } catch (e) { toast.error('addNotification failed: ' + (e?.message || 'addNotification failed:')) }
  },

  // ========== Team ==========
  members: [],
  invitations: [],
  fetchTeamMembers: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data: members } = await supabase.from('team_members').select('user_id, role, status, joined_at').eq('owner_id', user.user.id)
      if (!members) return
      const userIds = members.map((m: any) => m.user_id).filter(Boolean)
    let profiles: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from('profiles').select('id, full_name, username, email').in('id', userIds)
      if (profileData) profileData.forEach((p: any) => { profiles[p.id] = p })
    }
    const enriched: TeamMember[] = members.map((m: any) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
      owner_id: user.user.id,
      full_name: profiles[m.user_id]?.full_name || profiles[m.user_id]?.username || m.user_id?.slice(0, 8) || '成员',
      email: profiles[m.user_id]?.email || '',
      invited_at: m.invited_at || new Date().toISOString(),
    }))
    set({ members: enriched })
    } catch (e: any) { handleRLSError('fetchTeamMembers', e) }
  },
  fetchInvitations: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('invitations').select('*').eq('team_owner_id', user.user.id)
      if (error) { handleRLSError('fetchInvitations', error); return }
      set({ invitations: (data as Invitation[] | null) || [] })
    } catch (e) { toast.error('fetchInvitations failed: ' + (e?.message || 'fetchInvitations failed:')) }
  },
  addMember: async (email, role) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const token = crypto.randomUUID()
      const { data } = await supabase.from('invitations').insert({
        team_owner_id: user.user.id, email, role, token,
      } as any).select().single()
      if (data) {
        set((s) => ({ invitations: [data as Invitation, ...s.invitations] }))
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              inviterName: user.user.user_metadata?.full_name || user.user.email || '团队管理员',
              inviteeRole: role,
              token,
            }),
          })
        } catch (e) { toast.error('发送邀请邮件失败: ' + (e?.message || e)) }
      }
    } catch (e) { toast.error('addMember failed: ' + (e?.message || 'addMember failed:')) }
  },
  removeMember: async (id) => {
    try {
      await supabase.from('team_members').delete().eq('id', id)
      set((s) => ({ members: s.members.filter((m: TeamMember) => m.id !== id) }))
    } catch (e) { toast.error('removeMember failed: ' + (e?.message || 'removeMember failed:')) }
  },
  updateMember: async (id, updates) => {
    try {
      const { data } = await supabase.from('team_members').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ members: s.members.map((m: TeamMember) => m.id === id ? data as TeamMember : m) }))
    } catch (e) { toast.error('updateMember failed: ' + (e?.message || 'updateMember failed:')) }
  },

  // ========== CRM ==========
  customers: [],
  fetchCustomers: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('customers').select('*').eq('assigned_to', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchCustomers', error); return }
      set({ customers: (data as Customer[] | null) || [] })
    } catch (e) { toast.error('fetchCustomers failed: ' + (e?.message || 'fetchCustomers failed:')) }
  },
  addCustomer: async (c) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('customers').insert({ ...c, assigned_to: user.user.id } as any).select().single()
      if (error) { toast.error('addCustomer failed: ' + (error?.message || 'addCustomer failed:')); return }
      if (data) set((s) => ({ customers: [data as Customer, ...s.customers] }))
    } catch (e) { toast.error('addCustomer failed: ' + (e?.message || 'addCustomer failed:')) }
  },
  updateCustomer: async (id, updates) => {
    try {
      const { data, error } = await supabase.from('customers').update(updates as any).eq('id', id).select().single()
      if (error) { toast.error('updateCustomer failed: ' + (error?.message || 'updateCustomer failed:')); return }
      if (data) set((s) => ({ customers: s.customers.map((c: Customer) => c.id === id ? data as Customer : c) }))
    } catch (e) { toast.error('updateCustomer failed: ' + (e?.message || 'updateCustomer failed:')) }
  },
  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) { toast.error('deleteCustomer failed: ' + (error?.message || 'deleteCustomer failed:')); return }
      set((s) => ({ customers: s.customers.filter((c: Customer) => c.id !== id) }))
    } catch (e) { toast.error('deleteCustomer failed: ' + (e?.message || 'deleteCustomer failed:')) }
  },
  salesOpportunities: [],
  fetchSalesOpportunities: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('sales_opportunities').select('*').eq('assigned_to', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchSalesOpportunities', error); return }
      set({ salesOpportunities: (data as SalesOpportunity[] | null) || [] })
    } catch (e) { toast.error('fetchSalesOpportunities failed: ' + (e?.message || 'fetchSalesOpportunities failed:')) }
  },
  addOpportunity: async (o) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('sales_opportunities').insert({ ...o, assigned_to: user.user.id } as any).select().single()
      if (error) { toast.error('addOpportunity failed: ' + (error?.message || 'addOpportunity failed:')); return }
      if (data) set((s) => ({ salesOpportunities: [data as SalesOpportunity, ...s.salesOpportunities] }))
    } catch (e) { toast.error('addOpportunity failed: ' + (e?.message || 'addOpportunity failed:')) }
  },
  updateOpportunity: async (id, updates) => {
    try {
      const { data, error } = await supabase.from('sales_opportunities').update(updates as any).eq('id', id).select().single()
      if (error) { toast.error('updateOpportunity failed: ' + (error?.message || 'updateOpportunity failed:')); return }
      if (data) set((s) => ({ salesOpportunities: s.salesOpportunities.map((o: SalesOpportunity) => o.id === id ? data as SalesOpportunity : o) }))
    } catch (e) { toast.error('updateOpportunity failed: ' + (e?.message || 'updateOpportunity failed:')) }
  },
  deleteOpportunity: async (id) => {
    try {
      const { error } = await supabase.from('sales_opportunities').delete().eq('id', id)
      if (error) { toast.error('deleteOpportunity failed: ' + (error?.message || 'deleteOpportunity failed:')); return }
      set((s) => ({ salesOpportunities: s.salesOpportunities.filter((o: SalesOpportunity) => o.id !== id) }))
    } catch (e) { toast.error('deleteOpportunity failed: ' + (e?.message || 'deleteOpportunity failed:')) }
  },

  // ========== Followups ==========
  followups: {},
  fetchFollowups: async (customerId: string) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('followups').select('*').eq('customer_id', customerId).eq('user_id', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchFollowups', error); return }
      set((s) => ({ followups: { ...s.followups, [customerId]: (data as Followup[] | null) || [] } }))
    } catch (e) { toast.error('fetchFollowups failed: ' + (e?.message || 'fetchFollowups failed:')) }
  },
  addFollowup: async (data: FollowupInsert) => {
    try {
      const { data: result, error } = await supabase.from('followups').insert(data as any).select().single()
      if (error) { toast.error('addFollowup failed: ' + (error?.message || 'addFollowup failed:')); return }
      if (result) {
        const customerId = result.customer_id
        set((s) => ({ followups: { ...s.followups, [customerId]: [result as Followup, ...(s.followups[customerId] || [])] } }))
      }
    } catch (e) { toast.error('addFollowup failed: ' + (e?.message || 'addFollowup failed:')) }
  },
  deleteFollowup: async (id: string, customerId: string) => {
    try {
      const { error } = await supabase.from('followups').delete().eq('id', id)
      if (error) { toast.error('deleteFollowup failed: ' + (error?.message || 'deleteFollowup failed:')); return }
      set((s) => ({ followups: { ...s.followups, [customerId]: (s.followups[customerId] || []).filter((f: Followup) => f.id !== id) } }))
    } catch (e) { toast.error('deleteFollowup failed: ' + (e?.message || 'deleteFollowup failed:')) }
  },

  // ========== AI ==========
  aiConversations: [],
  aiMessages: {},
  activeAIConv: null,
  fetchAIConversations: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('ai_conversations').select('*').eq('user_id', user.user.id).order('updated_at', { ascending: false })
      if (error) { handleRLSError('fetchAIConversations', error); return }
      set({ aiConversations: (data as AIConversation[] | null) || [] })
    } catch (e) { toast.error('fetchAIConversations failed: ' + (e?.message || 'fetchAIConversations failed:')) }
  },
  fetchAIMessages: async (convId) => {
    try {
      const { data, error } = await supabase.from('ai_messages').select('*').eq('conversation_id', convId).order('created_at')
      if (error) { handleRLSError('fetchAIMessages', error); return }
      set((s) => ({ aiMessages: { ...s.aiMessages, [convId]: (data as AIMessage[] | null) || [] } }))
    } catch (e) { toast.error('fetchAIMessages failed: ' + (e?.message || 'fetchAIMessages failed:')) }
  },
  setActiveAIConv: (id) => set({ activeAIConv: id }),
  createAIConv: async (title, featureType) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return ''
      const { data } = await supabase.from('ai_conversations').insert({
        user_id: user.user.id, feature_type: featureType, title,
      } as any).select().single()
      if (data) {
        set((s) => ({ aiConversations: [data as AIConversation, ...s.aiConversations], activeAIConv: data.id }))
        return data.id
      }
      return ''
    } catch (e) { toast.error('createAIConv failed: ' + (e?.message || 'createAIConv failed:')); return '' }
  },
  sendAIMessage: async (convId, content) => {
    const { data: user } = await getCachedUser()
    if (!user.user) throw new Error('请先登录')

    // ---- 插入用户消息（RLS 阻止时使用本地降级，不崩溃）----
    let userMsg: any = null
    try {
      const result = await supabase.from('ai_messages').insert({
        conversation_id: convId, role: 'user', content,
      } as any).select().single()
      userMsg = result.data
    } catch { /* ignore */ }
    if (!userMsg) {
      userMsg = {
        id: `local-user-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content,
        sender_id: user.user.id,
        sender_name: null,
        message_type: 'text',
        is_edited: false,
        created_at: new Date().toISOString(),
      }
    }

    // ---- 插入 AI 消息占位符（RLS 阻止时使用本地 ID，降级流式更新）----
    let dbPlaceholderId: string | null = null
    const localPlaceholderId = `local-ai-${Date.now()}`
    let placeholderId = localPlaceholderId
    try {
      const result = await supabase.from('ai_messages').insert({
        conversation_id: convId, role: 'assistant', content: '', model: 'streaming...',
      } as any).select().single()
      if (result.data) {
        dbPlaceholderId = result.data.id
        placeholderId = result.data.id
      }
    } catch { /* ignore */ }

    const aiMsgPlaceholder = { id: placeholderId, conversation_id: convId, role: 'assistant', content: '', model: 'streaming...', created_at: new Date().toISOString() }

    // 本地状态先加入用户消息和 AI 占位符
    set((s) => ({
      aiMessages: { ...s.aiMessages, [convId]: [...(s.aiMessages[convId] || []), userMsg, aiMsgPlaceholder] },
      aiConversations: s.aiConversations.map((c: AIConversation) => c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c),
    }))

    // 尝试获取自定义 API 配置
    let configs: any[] = []
    let activeConfig: any = null
    try {
      configs = JSON.parse(localStorage.getItem('ai_api_configs') || '[]')
      activeConfig = configs.find((c: any) => c.isDefault) || configs[0]
    } catch { /* ignore */ }

    // 尝试流式调用（自定义 API 或 Edge Function）
    const tryStreamCall = async (url: string, headers: Record<string, string>, body: any): Promise<string> => {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, stream: true }),
        signal: AbortSignal.timeout(activeConfig ? 120000 : 30000),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      if (!resp.body) throw new Error('响应无流式数据')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              const token = json.choices?.[0]?.delta?.content
              if (token) {
                fullContent += token
                // 实时更新本地状态（流式效果），支持本地降级 ID
                set((s) => ({
                  aiMessages: {
                    ...s.aiMessages,
                    [convId]: (s.aiMessages[convId] || []).map(m =>
                      m.id === placeholderId ? { ...m, content: fullContent } : m
                    ),
                  },
                }))
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
      return fullContent
    }

    // 构建上下文消息（带历史记录，最多保留最近20条）
    const historyMsgs = get().aiMessages[convId] || []
    const contextMessages = historyMsgs
      .filter((m: any) => m.content && m.role)
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content }))
    contextMessages.push({ role: 'user', content })

    let aiContent = ''
    let modelName = ''
    let streamOk = false

    // 优先：自定义 API（流式）
    if (activeConfig) {
      try {
        modelName = activeConfig.model
        const baseUrl = activeConfig.baseUrl.replace(/\/$/, '')
        if (!activeConfig.apiKey || !activeConfig.baseUrl || !activeConfig.model) {
          throw new Error('API 配置不完整，请检查 API Key、Base URL 和模型名称是否填写完整')
        }
        aiContent = await tryStreamCall(
          `${baseUrl}/chat/completions`,
          { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeConfig.apiKey}` },
          { model: activeConfig.model, messages: contextMessages }
        )
        streamOk = true
      } catch (e: any) {
        const errorMsg = e.message || ''
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          toast.error(`无法连接到 API 服务器（${activeConfig.baseUrl}），请检查 URL 和网络`)
        } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
          toast.error('API Key 无效或已过期，请前往「设置 → AI 模型」重新配置')
        } else if (errorMsg.includes('429')) {
          toast.error('API 调用次数已达上限，请检查账户余额或稍后重试')
        } else if (errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
          toast.error('请求超时，请稍后重试或缩短输入内容')
        } else {
          console.warn('自定义 API 流式调用失败:', errorMsg)
        }
      }
    }

    // 降级：Edge Function（流式）
    if (!streamOk) {
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-generation`
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.warn('Supabase 环境变量未配置，跳过 Edge Function')
        } else {
          aiContent = await tryStreamCall(
            edgeUrl,
            {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            { messages: contextMessages }
          )
          modelName = 'system-default'
          streamOk = true
        }
      } catch (e: any) {
        console.warn('Edge Function 流式调用失败:', e.message)
      }
    }

    // 最终降级：非流式 + 本地模拟
    if (!streamOk) {
      try {
        if (activeConfig) {
          const baseUrl = activeConfig.baseUrl.replace(/\/$/, '')
          const resp = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeConfig.apiKey}`,
            },
            body: JSON.stringify({ model: activeConfig.model, messages: contextMessages, stream: false }),
            signal: AbortSignal.timeout(60000),
          })
          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}))
            throw new Error(errData.error?.message || errData.message || `HTTP ${resp.status}`)
          }
          const json = await resp.json()
          aiContent = json.choices?.[0]?.message?.content || ''
          if (!aiContent) throw new Error('API 返回内容为空，请检查模型配置是否正确')
          modelName = activeConfig.model
        }
      } catch (e: any) {
        console.warn('非流式调用失败:', e.message)
        if (activeConfig) {
          // 只更新数据库中的占位符消息（本地降级 ID 跳过）
          if (dbPlaceholderId) {
            await supabase.from('ai_messages').update({
              content: `⚠️ AI 调用失败\n\n${e.message || '未知错误'}\n\n请检查 API 配置后重试`,
              model: 'error',
            } as any).eq('id', dbPlaceholderId).select().single()
          }
          throw new Error(`AI 调用失败：${e.message || '未知错误'}`)
        }
      }

      if (!aiContent && !activeConfig) {
        aiContent = `[开发模式] 已收到您的消息：${content}\n\n当前 AI 服务未配置。请在「设置 → AI 模型」中添加您的 API Key 以启用 AI 对话。`
        modelName = 'dev-mode'
      }
    }

    // 最终更新：把完整内容写入数据库（仅对 DB 记录的占位符，本地 ID 跳过）
    if (dbPlaceholderId) {
      await supabase.from('ai_messages').update({
        content: aiContent, model: modelName,
      } as any).eq('id', dbPlaceholderId).select().single()
    }

    // 更新本地状态为最终内容（统一路径，无论 DB 是否可用）
    set((s) => ({
      aiMessages: {
        ...s.aiMessages,
        [convId]: (s.aiMessages[convId] || []).map(m =>
          m.id === placeholderId ? { ...m, content: aiContent, model: modelName } : m
        ),
      },
    }))
  },
  deleteAIConv: async (id) => {
    await supabase.from('ai_conversations').delete().eq('id', id)
    set((s) => ({
      aiConversations: s.aiConversations.filter((c: AIConversation) => c.id !== id),
      activeAIConv: s.activeAIConv === id ? (s.aiConversations[0]?.id || null) : s.activeAIConv,
    }))
  },

  deleteAIMessage: async (id, convId) => {
    await supabase.from('ai_messages').delete().eq('id', id)
    set((s) => ({
      aiMessages: {
        ...s.aiMessages,
        [convId]: (s.aiMessages[convId] || []).filter((m: AIMessage) => m.id !== id),
      },
    }))
  },

  // ========== Social Media ==========
  socialAccounts: [],
  socialPosts: [],
  socialPostPlatforms: [],
  trendingTopics: [],
  fetchSocialAccounts: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('social_accounts').select('*').eq('user_id', user.user.id).order('created_at')
      if (error) { handleRLSError('fetchSocialAccounts', error); return }
      set({ socialAccounts: (data as SocialAccount[] | null) || [] })
    } catch (e) { toast.error('fetchSocialAccounts failed: ' + (e?.message || 'fetchSocialAccounts failed:')) }
  },
  fetchSocialPosts: async (accountId) => {
    try {
      let query = supabase.from('social_media_posts').select('*').order('created_at', { ascending: false })
      if (accountId) query = query.eq('account_id', accountId)
      const { data, error } = await query
      if (error) { handleRLSError('fetchSocialPosts', error); return }
      set({ socialPosts: (data as SocialPost[] | null) || [] })
    } catch (e) { toast.error('fetchSocialPosts failed: ' + (e?.message || 'fetchSocialPosts failed:')) }
  },
  fetchSocialPostPlatforms: async (postId) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      // 先获取用户的 social account ids
      const { data: accounts } = await supabase.from('social_accounts').select('id').eq('user_id', user.user.id)
      if (!accounts || accounts.length === 0) { set({ socialPostPlatforms: [] }); return }
      const accountIds = accounts.map(a => a.id)
      let query = supabase.from('social_post_platforms').select('*').in('account_id', accountIds)
      if (postId) query = query.eq('post_id', postId)
      const { data, error } = await query
      if (error) { handleRLSError('fetchSocialPostPlatforms', error); return }
      set({ socialPostPlatforms: (data as SocialPostPlatform[] | null) || [] })
    } catch (e) { toast.error('fetchSocialPostPlatforms failed: ' + (e?.message || 'fetchSocialPostPlatforms failed:')) }
  },
  fetchTrendingTopics: async () => {
    try {
      const { data, error } = await supabase.from('trending_topics').select('*').order('heat', { ascending: false }).limit(50)
      if (error) { handleRLSError('fetchTrendingTopics', error); return }
      set({ trendingTopics: (data as TrendingTopic[] | null) || [] })
    } catch (e) { toast.error('fetchTrendingTopics failed: ' + (e?.message || 'fetchTrendingTopics failed:')) }
  },
  refreshTrendingTopics: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { 
        toast.error('refreshTrendingTopics: not authenticated')
        throw new Error('未登录，请先登录')
      }
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-trending-lists`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) { 
        toast.error('refreshTrendingTopics: Edge Function error', res.status)
        throw new Error(`Edge Function 调用失败: ${res.status}`)
      }
      const result = await res.json()
      if (result.error) {
        throw new Error(result.error)
      }
      // Re-fetch from DB after refresh
      await get().fetchTrendingTopics()
      
      // 返回结果，让前端知道是否使用了 fallback
      return { success: true, usedFallback: result.usedFallback || false }
    } catch (e) { 
      toast.error('refreshTrendingTopics failed: ' + (e?.message || 'refreshTrendingTopics failed:'))
      throw e
    }
  },
  addSocialAccount: async (a) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data } = await supabase.from('social_accounts').insert({ ...a, user_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ socialAccounts: [data as SocialAccount, ...s.socialAccounts] }))
    } catch (e) { toast.error('addSocialAccount failed: ' + (e?.message || 'addSocialAccount failed:')) }
  },
  updateSocialAccount: async (id, updates) => {
    try {
      const { data } = await supabase.from('social_accounts').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ socialAccounts: s.socialAccounts.map((a: SocialAccount) => a.id === id ? data as SocialAccount : a) }))
    } catch (e) { toast.error('updateSocialAccount failed: ' + (e?.message || 'updateSocialAccount failed:')) }
  },
  deleteSocialAccount: async (id) => {
    try {
      await supabase.from('social_accounts').delete().eq('id', id)
      set((s) => ({ socialAccounts: s.socialAccounts.filter((a: SocialAccount) => a.id !== id) }))
    } catch (e) { toast.error('deleteSocialAccount failed: ' + (e?.message || 'deleteSocialAccount failed:')) }
  },
  syncSocialAccount: async (id, credentials) => {
    const account = get().socialAccounts.find((a: SocialAccount) => a.id === id)
    if (!account) return
    try {
      const session = await supabase.auth.getSession()
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-social-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.data.session?.access_token}` },
        body: JSON.stringify({
          platform: account.platform,
          account_id: id,
          credentials,
          current_followers: account.follower_count,
          current_post_count: account.post_count,
        }),
      })
      const json = await resp.json()
      if (json.success) {
        await get().updateSocialAccount(id, {
          follower_count: json.follower_count,
          following_count: json.following_count,
          post_count: json.post_count,
          check_status: 'active',
          metadata: { ...(account.metadata as Record<string, unknown> || {}), last_synced_at: json.synced_at },
        } as any)
      }
      return json
    } catch (e) {
      toast.error('同步失败: ' + (e?.message || e))
    }
  },
  addSocialPost: async (p) => {
    try {
      const { data } = await supabase.from('social_media_posts').insert(p as any).select().single()
      if (data) set((s) => ({ socialPosts: [data as SocialPost, ...s.socialPosts] }))
      return data?.id || null
    } catch (e) { toast.error('创建内容失败: ' + (e?.message || '未知错误')); return null }
  },
  updateSocialPost: async (id, updates) => {
    try {
      const { data } = await supabase.from('social_media_posts').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ socialPosts: s.socialPosts.map((p: SocialPost) => p.id === id ? data as SocialPost : p) }))
    } catch (e) { toast.error('updateSocialPost failed: ' + (e?.message || 'updateSocialPost failed:')) }
  },
  deleteSocialPost: async (id) => {
    try {
      await supabase.from('social_media_posts').delete().eq('id', id)
      set((s) => ({ socialPosts: s.socialPosts.filter((p: SocialPost) => p.id !== id) }))
    } catch (e) { toast.error('deleteSocialPost failed: ' + (e?.message || 'deleteSocialPost failed:')) }
  },

  addSocialPostPlatform: async (pp) => {
    try {
      const { data } = await supabase.from('social_post_platforms').insert(pp as any).select().single()
      if (data) set((s) => ({ socialPostPlatforms: [data as SocialPostPlatform, ...s.socialPostPlatforms] }))
    } catch (e) { toast.error('addSocialPostPlatform failed: ' + (e?.message || 'addSocialPostPlatform failed:')) }
  },
  updateSocialPostPlatform: async (id, updates) => {
    try {
      const { data } = await supabase.from('social_post_platforms').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ socialPostPlatforms: s.socialPostPlatforms.map((pp: SocialPostPlatform) => pp.id === id ? data as SocialPostPlatform : pp) }))
    } catch (e) { toast.error('updateSocialPostPlatform failed: ' + (e?.message || 'updateSocialPostPlatform failed:')) }
  },
  deleteSocialPostPlatform: async (id) => {
    try {
      await supabase.from('social_post_platforms').delete().eq('id', id)
      set((s) => ({ socialPostPlatforms: s.socialPostPlatforms.filter((pp: SocialPostPlatform) => pp.id !== id) }))
    } catch (e) { toast.error('deleteSocialPostPlatform failed: ' + (e?.message || 'deleteSocialPostPlatform failed:')) }
  },

  // Open OAuth authorization window for a platform account
  initiateOAuth: async (accountId, platform) => {
    try {
      const session = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ account_id: accountId, platform }),
        }
      )
      const json = await resp.json()
      if (json.needs_credentials) {
        return { error: '请先在平台设置中填写 App Key 和 App Secret，再点击「连接平台」' }
      }
      if (json.error) return { error: json.error }
      return { auth_url: json.auth_url }
    } catch (e) {
      return { error: '网络错误，请重试' }
    }
  },

  // Publish a saved post to a social platform
  publishPost: async (postId, accountId, content, title, platform) => {
    try {
      const session = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ post_id: postId, account_id: accountId, content, title, platform }),
        }
      )
      const json = await resp.json()
      // Update local post status
      if (json.success) {
        await get().updateSocialPost(postId, {
          status: 'published',
          published_at: new Date().toISOString(),
          post_url: json.post_url || null,
        })
      }
      return json
    } catch (e) {
      return { success: false, error: '网络错误，请重试' }
    }
  },

  // ========== Video Conference ==========
  conferences: [],
  fetchConferences: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      // RLS policy handles filtering: host or participant can see
      const { data, error } = await supabase.from('video_conferences').select('*').order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchConferences', error); return }
      set({ conferences: (data as Conference[] | null) || [] })
    } catch (e) { toast.error('fetchConferences failed: ' + (e?.message || 'fetchConferences failed:')) }
  },
  addConference: async (c) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const meetingId = 'meet-' + crypto.randomUUID().slice(0, 8)
      const { data } = await supabase.from('video_conferences').insert({
        ...c, host_id: user.user.id, meeting_id: meetingId,
      } as any).select().single()
      if (data) set((s) => ({ conferences: [data as Conference, ...s.conferences] }))
    } catch (e) { toast.error('addConference failed: ' + (e?.message || 'addConference failed:')) }
  },
  updateConference: async (id, updates) => {
    try {
      const { data } = await supabase.from('video_conferences').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ conferences: s.conferences.map((c: Conference) => c.id === id ? data as Conference : c) }))
    } catch (e) { toast.error('updateConference failed: ' + (e?.message || 'updateConference failed:')) }
  },
  deleteConference: async (id) => {
    try {
      await supabase.from('video_conferences').delete().eq('id', id)
      set((s) => ({ conferences: s.conferences.filter((c: Conference) => c.id !== id) }))
    } catch (e) { toast.error('deleteConference failed: ' + (e?.message || 'deleteConference failed:')) }
  },

  // ========== Notifications ==========
  notifications: [],
  fetchNotifications: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.user.id).order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchNotifications', error); return }
      set({ notifications: (data as Notification[] | null) || [] })
    } catch (e) { toast.error('fetchNotifications failed: ' + (e?.message || 'fetchNotifications failed:')) }
  },
  markNotificationRead: async (id) => {
    try {
      await supabase.from('notifications').update({ read: true } as any).eq('id', id)
      set((s) => ({ notifications: s.notifications.map((n: Notification) => n.id === id ? { ...n, read: true } : n) }))
    } catch (e) { toast.error('markNotificationRead failed: ' + (e?.message || 'markNotificationRead failed:')) }
  },
  markAllNotificationsRead: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.user.id).eq('read', false)
      set((s) => ({ notifications: s.notifications.map((n: Notification) => ({ ...n, read: true })) }))
    } catch (e) { toast.error('markAllNotificationsRead failed: ' + (e?.message || 'markAllNotificationsRead failed:')) }
  },

  // ========== Approvals ==========
  approvals: [],
  fetchApprovals: async () => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      // RLS 策略处理权限过滤，前端不做重复判断
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) { handleRLSError('fetchApprovals', error); return }
      set({ approvals: (data as ApprovalRequest[] | null) || [] })
    } catch (e) { toast.error('fetchApprovals failed: ' + (e?.message || 'fetchApprovals failed:')) }
  },
  createApproval: async (data) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const { data: result, error } = await supabase.from('approvals').insert({ ...data, requester_id: user.user.id } as any).select().single()
      if (error) { toast.error('createApproval failed: ' + (error?.message || 'createApproval failed:')); return }
      if (result) set((s) => ({ approvals: [result as ApprovalRequest, ...s.approvals] }))
    } catch (e) { toast.error('createApproval failed: ' + (e?.message || 'createApproval failed:')) }
  },
  approveRequest: async (id) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const now = new Date().toISOString()
      const { data, error } = await supabase.from('approvals').update({ status: 'approved' as ApprovalStatus, approver_id: user.user.id, resolved_at: now, updated_at: now } as any).eq('id', id).select().single()
      if (error) { toast.error('approveRequest failed: ' + (error?.message || 'approveRequest failed:')); return }
      if (data) set((s) => ({ approvals: s.approvals.map((a: ApprovalRequest) => a.id === id ? data as ApprovalRequest : a) }))
    } catch (e) { toast.error('approveRequest failed: ' + (e?.message || 'approveRequest failed:')) }
  },
  rejectRequest: async (id) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      const now = new Date().toISOString()
      const { data, error } = await supabase.from('approvals').update({ status: 'rejected' as ApprovalStatus, approver_id: user.user.id, resolved_at: now, updated_at: now } as any).eq('id', id).select().single()
      if (error) { toast.error('rejectRequest failed: ' + (error?.message || 'rejectRequest failed:')); return }
      if (data) set((s) => ({ approvals: s.approvals.map((a: ApprovalRequest) => a.id === id ? data as ApprovalRequest : a) }))
    } catch (e) { toast.error('rejectRequest failed: ' + (e?.message || 'rejectRequest failed:')) }
  },

  // ========== Files ==========
  files: [],
  fetchFiles: async (projectId?, taskId?) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return
      let query = supabase.from('files').select('*').order('created_at', { ascending: false })
      if (projectId) query = query.eq('project_id', projectId)
      if (taskId) query = query.eq('task_id', taskId)
      const { data, error } = await query
      if (error) { handleRLSError('fetchFiles', error); return }
      set({ files: (data as DBFile[] | null) || [] })
    } catch (e) { toast.error('fetchFiles failed: ' + (e?.message || 'fetchFiles failed:')) }
  },
  uploadFile: async (file, projectId, taskId, onProgress) => {
    try {
      const { data: user } = await getCachedUser()
      if (!user.user) return null
      const ext = file.name.split('.').pop() || ''
      const filePath = `${user.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) { toast.error('uploadFile storage error:', uploadError); return null }
      onProgress?.(100)
      const { data, error } = await supabase.from('files').insert({
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        project_id: projectId || null,
        task_id: taskId || null,
        uploader_id: user.user.id,
        is_public: true,
        metadata: {},
      } as any).select().single()
      if (error) { toast.error('uploadFile db error:: ' + (error?.message || 'uploadFile db error:')); return null }
      if (data) set((s) => ({ files: [data as DBFile, ...s.files] }))
      return data as DBFile | null
    } catch (e) { toast.error('uploadFile failed: ' + (e?.message || 'uploadFile failed:')); return null }
  },
  moveFile: async (fileId, newProjectId, newTaskId) => {
    try {
      const { data, error } = await supabase.from('files')
        .update({ project_id: newProjectId || null, task_id: newTaskId || null } as any)
        .eq('id', fileId)
        .select().single()
      if (error) { toast.error('moveFile failed: ' + (error?.message || 'moveFile failed:')); return }
      if (data) set((s) => ({ files: s.files.map(f => f.id === fileId ? data as DBFile : f) }))
    } catch (e) { toast.error('moveFile failed: ' + (e?.message || 'moveFile failed:')) }
  },
  deleteFile: async (id) => {
    try {
      const file = get().files.find(f => f.id === id)
      if (file) await supabase.storage.from('files').remove([file.file_path]).catch(() => {})
      await supabase.from('files').delete().eq('id', id)
      set((s) => ({ files: s.files.filter(f => f.id !== id) }))
    } catch (e) { toast.error('deleteFile failed: ' + (e?.message || 'deleteFile failed:')) }
  },

  // ========== Realtime Subscriptions ==========
  subscribeToMessages: (channelId: string) => {
    get().unsubscribeMessages()
    const ch = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload: any) => {
        const msg = payload.new as Message
        set((s) => {
          const existing = s.messages[channelId] || []
          if (existing.find((m: Message) => m.id === msg.id)) return s
          return {
            messages: {
              ...s.messages,
              [channelId]: [...existing, msg],
            },
          }
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload: any) => {
        const msg = payload.new as Message
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] || []).map((m: Message) => m.id === msg.id ? msg : m),
          },
        }))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload: any) => {
        const msg = payload.old as Partial<Message>
        if (msg.id) {
          set((s) => ({
            messages: {
              ...s.messages,
              [channelId]: (s.messages[channelId] || []).filter((m: Message) => m.id !== msg.id),
            },
          }))
        }
      })
      .subscribe()
    set((s) => ({ __messageChannel: ch }))
  },

  unsubscribeMessages: () => {
    set((s) => {
      const ch = (s as any).__messageChannel
      if (ch) supabase.removeChannel(ch)
      return { __messageChannel: null } as any
    })
  },

  subscribeToConferences: () => {
    set((s) => {
      if ((s as any).__conferenceChannel) return s
      const ch = supabase
        .channel('conferences')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'video_conferences' }, () => {
          get().fetchConferences()
        })
        .subscribe()
      return { __conferenceChannel: ch } as any
    })
  },

  subscribeToNotifications: (userId: string) => {
    set((s) => {
      if ((s as any).__notificationChannel) { supabase.removeChannel((s as any).__notificationChannel); return { __notificationChannel: null } as any }
      const ch = supabase.channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, (payload: any) => {
          const notif = payload.new as Notification
          set((s2) => ({ notifications: [notif, ...s2.notifications] }))
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, (payload: any) => {
          const notif = payload.new as Notification
          set((s2) => ({
            notifications: s2.notifications.map((n: Notification) => n.id === notif.id ? notif : n),
          }))
        })
        .subscribe()
      return { __notificationChannel: ch } as any
    })
  },

  // ========== Social Posts Realtime Subscription ==========
  unsubscribeSocialPosts: () => {
    set((s) => {
      const ch = (s as any).__socialPostsChannel
      if (ch) supabase.removeChannel(ch)
      return { __socialPostsChannel: null } as any
    })
  },

  subscribeToSocialPosts: () => {
    get().unsubscribeSocialPosts()
    const ch = supabase
      .channel('social-posts-realtime')
      // 监听 social_media_posts 表变化（主表状态同步）
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_media_posts',
      }, (payload: any) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          set((s) => ({
            socialPosts: s.socialPosts.map((p: SocialPost) =>
              p.id === updated.id ? { ...p, ...updated } : p
            ),
          }))
          // 同步到 socialPostPlatforms
          if (updated.status) {
            set((s) => ({
              socialPostPlatforms: s.socialPostPlatforms.map((pp: SocialPostPlatform) =>
                pp.post_id === updated.id && pp.status === 'scheduled'
                  ? { ...pp, status: updated.status as any }
                  : pp
              ),
            }))
          }
        } else if (payload.eventType === 'INSERT') {
          const newPost = payload.new
          set((s) => ({
            socialPosts: s.socialPosts.some((p: SocialPost) => p.id === newPost.id)
              ? s.socialPosts
              : [newPost, ...s.socialPosts],
          }))
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old
          set((s) => ({
            socialPosts: s.socialPosts.filter((p: SocialPost) => p.id !== deleted.id),
          }))
        }
      })
      // 监听 social_post_platforms 表变化（平台级别状态同步）
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_post_platforms',
      }, (payload: any) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          set((s) => ({
            socialPostPlatforms: s.socialPostPlatforms.map((pp: SocialPostPlatform) =>
              pp.id === updated.id ? { ...pp, ...updated } : pp
            ),
          }))
        } else if (payload.eventType === 'INSERT') {
          const newPp = payload.new
          set((s) => ({
            socialPostPlatforms: s.socialPostPlatforms.some((pp: SocialPostPlatform) => pp.id === newPp.id)
              ? s.socialPostPlatforms
              : [newPp, ...s.socialPostPlatforms],
          }))
        }
      })
      .subscribe()

    set((s) => ({ __socialPostsChannel: ch } as any))
  },

}))

// 初始化：监听认证状态变化
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useStore.getState().loadUser()
    useStore.getState().subscribeToSocialPosts()  // 实时同步定时发布状态
  }
  if (event === 'SIGNED_OUT') {
    useStore.getState().signOut()
  }
  // 邮箱变更确认后同步到 profiles 表
  if (event === 'USER_UPDATED' && session?.user) {
    const newEmail = session.user.email
    const userId = session.user.id
    if (newEmail) {
      await supabase.from('profiles').update({ email: newEmail }).eq('id', userId)
      // 重新加载用户数据
      useStore.getState().loadUser()
    }
  }
})

// 已移除 visibilitychange 监听器：此前注册的监听器会在页面切换回来时触发 loadUser()，
// 导致 loading 状态变化从而引发页面级重新渲染（表现为页面刷新）。
// 移除后切换到外部页面再切回时不再有任何刷新行为。



