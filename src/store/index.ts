import { create } from 'zustand'
import { supabase } from '@/db/supabase'
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
  TrendingTopic, TrendingTopicInsert, TrendingTopicUpdate,
  Conference, ConferenceInsert, ConferenceUpdate,
  TeamMember, TeamMemberInsert, TeamMemberUpdate,
  Invitation, InvitationInsert, InvitationUpdate,
  DBFile, DBFileInsert, DBFileUpdate,
} from '@/types/database'

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
  fetchDocuments: (projectId?: string) => Promise<void>
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
  trendingTopics: TrendingTopic[]
  fetchSocialAccounts: () => Promise<void>
  fetchSocialPosts: (accountId?: string) => Promise<void>
  fetchTrendingTopics: () => Promise<void>
  addSocialAccount: (a: Omit<SocialAccountInsert, 'user_id'>) => Promise<void>
  updateSocialAccount: (id: string, updates: SocialAccountUpdate) => Promise<void>
  deleteSocialAccount: (id: string) => Promise<void>
  syncSocialAccount: (id: string, credentials: object) => Promise<void>
  addSocialPost: (p: SocialPostInsert) => Promise<void>
  updateSocialPost: (id: string, updates: SocialPostUpdate) => Promise<void>
  deleteSocialPost: (id: string) => Promise<void>
  connectPlatform: (accountId: string, platform: string) => Promise<{ auth_url?: string; error?: string; needs_credentials?: boolean }>
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

  // Files
  files: DBFile[]
  fetchFiles: (projectId?: string) => Promise<void>
  uploadFile: (file: File, projectId?: string, onProgress?: (pct: number) => void) => Promise<DBFile | null>
  deleteFile: (id: string) => Promise<void>
}

export type ConferenceStatus = Conference['status']

// ==================== Store Implementation ====================
export const useStore = create<AppState>((set, get) => ({
  // ========== Auth ==========
  currentUser: null,
  isAuthenticated: false,
  loading: true,

  loadUser: async () => {
    set({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        set({ currentUser: profile ? { ...profile, avatar: profile.avatar_url || undefined } : null, isAuthenticated: true, loading: false })
        get().fetchProjects()
        get().fetchTasks()
        get().fetchDocuments()
        get().fetchChannels()
        get().fetchNotifications()
        get().fetchCustomers()
        get().fetchSalesOpportunities()
        get().fetchSocialAccounts()
        get().fetchSocialPosts()
        get().fetchConferences()
        get().fetchAIConversations()
        get().fetchTeamMembers()
        get().fetchInvitations()
        get().fetchFiles()
        get().fetchTrendingTopics()
        // 登录后自动建立 realtime 订阅
        get().subscribeToConferences()
        get().subscribeToNotifications(session.user.id)
        get().subscribeToProjects()
        get().subscribeToTasks()
        get().subscribeToDocuments()
        get().subscribeToCRM()
        if (get().activeChannel) get().subscribeToMessages(get().activeChannel)
      } else {
        set({ currentUser: null, isAuthenticated: false, loading: false })
      }
    } catch {
      set({ currentUser: null, isAuthenticated: false, loading: false })
    }
  },

  signUp: async (email, password, fullName, username) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username } } })
    if (!error) await get().loadUser()
    return { error }
  },

  signIn: async (email, password, remember = false) => {
    // Use secure-login Edge Function for login security (5 failures → 30min lock)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ identifier: email, password }),
      })
      const data = await res.json()
      if (data.locked) {
        return { error: { message: data.error } }
      }
      if (data.error) {
        return { error: { message: data.error } }
      }
      if (data.success && data.session) {
        // Set the session from secure-login response
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (!sessionError) await get().loadUser()
        return { error: sessionError }
      }
    } catch {
      // Fallback: if Edge Function not deployed, use direct auth
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await get().loadUser()
    return { error }
  },

  signOut: async () => {
    get().unsubscribeMessages()
    get().unsubscribeData()
    set((s: any) => {
      if (s.__conferenceChannel) supabase.removeChannel(s.__conferenceChannel)
      if (s.__notificationChannel) supabase.removeChannel(s.__notificationChannel)
      return { __conferenceChannel: null, __notificationChannel: null } as any
    })
    await supabase.auth.signOut()
    set({
      currentUser: null, isAuthenticated: false,
      projects: [], tasks: [], documents: [], channels: [], messages: {},
      notifications: [], aiConversations: [], socialAccounts: [], socialPosts: [],
      conferences: [], customers: [], salesOpportunities: [], members: [], invitations: [], files: [],
    })
  },

  // ========== Projects ==========
  projects: [],
  fetchProjects: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('projects')
      .select('*').eq('owner_id', user.user.id)
      .order('created_at', { ascending: false })
    set({ projects: (data as Project[] | null) || [] })
  },
  addProject: async (p) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('projects').insert({ ...p, owner_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ projects: [data as Project, ...s.projects] }))
    } catch (e) { console.error('addProject failed:', e) }
  },
  updateProject: async (id, updates) => {
    try {
      const { data } = await supabase.from('projects').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ projects: s.projects.map((p: Project) => p.id === id ? data as Project : p) }))
    } catch (e) { console.error('updateProject failed:', e) }
  },
  deleteProject: async (id) => {
    try {
      await supabase.from('projects').delete().eq('id', id)
      set((s) => ({ projects: s.projects.filter((p: Project) => p.id !== id) }))
    } catch (e) { console.error('deleteProject failed:', e) }
  },

  // ========== Tasks ==========
  tasks: [],
  fetchTasks: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('tasks')
      .select('*').eq('creator_id', user.user.id)
      .order('created_at', { ascending: false })
    set({ tasks: (data as Task[] | null) || [] })
  },
  addTask: async (t) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('tasks').insert({ ...t, creator_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ tasks: [data as Task, ...s.tasks] }))
    } catch (e) { console.error('addTask failed:', e) }
  },
  updateTask: async (id, updates) => {
    try {
      const { data } = await supabase.from('tasks').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ tasks: s.tasks.map((t: Task) => t.id === id ? data as Task : t) }))
    } catch (e) { console.error('updateTask failed:', e) }
  },
  deleteTask: async (id) => {
    try {
      await supabase.from('tasks').delete().eq('id', id)
      set((s) => ({ tasks: s.tasks.filter((t: Task) => t.id !== id) }))
    } catch (e) { console.error('deleteTask failed:', e) }
  },

  // ========== Documents ==========
  documents: [],
  fetchDocuments: async (projectId) => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    let query = supabase.from('documents')
      .select('*').eq('creator_id', user.user.id)
      .order('updated_at', { ascending: false })
    if (projectId) query = query.eq('project_id', projectId)
    const { data } = await query
    set({ documents: (data as Document[] | null) || [] })
  },
  addDocument: async (d) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('documents').insert({ ...d, creator_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ documents: [data as Document, ...s.documents] }))
    } catch (e) { console.error('addDocument failed:', e) }
  },
  updateDocument: async (id, updates) => {
    try {
      const { data } = await supabase.from('documents').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ documents: s.documents.map((d: Document) => d.id === id ? data as Document : d) }))
    } catch (e) { console.error('updateDocument failed:', e) }
  },
  deleteDocument: async (id) => {
    try {
      await supabase.from('documents').delete().eq('id', id)
      set((s) => ({ documents: s.documents.filter((d: Document) => d.id !== id) }))
    } catch (e) { console.error('deleteDocument failed:', e) }
  },

  // ========== Messages & Channels ==========
  channels: [],
  messages: {},
  activeChannel: null,
  fetchChannels: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('channels')
      .select('*').eq('created_by', user.user.id)
      .order('created_at')
    set({ channels: (data as Channel[] | null) || [] })
    const state = get()
    if (data && data.length > 0 && !state.activeChannel) {
      set({ activeChannel: data[0].id })
      get().fetchMessages(data[0].id)
    }
  },
  createChannel: async (name, description, isPrivate) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('channels').insert({
        name, description, is_private: isPrivate, created_by: user.user.id,
      } as ChannelInsert).select().single()
      if (data) set((s) => ({ channels: [...s.channels, data as Channel] }))
    } catch (e) { console.error('createChannel failed:', e) }
  },
  updateChannel: async (id, updates) => {
    try {
      const { data } = await supabase.from('channels').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ channels: s.channels.map((c: Channel) => c.id === id ? data as Channel : c) }))
    } catch (e) { console.error('updateChannel failed:', e) }
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
    } catch (e) { console.error('deleteChannel failed:', e) }
  },
  fetchMessages: async (channelId) => {
    const { data } = await supabase.from('messages').select('*').eq('channel_id', channelId).order('created_at').limit(200)
    set((s) => ({ messages: { ...s.messages, [channelId]: (data as Message[] | null) || [] } }))
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
    } catch (e) { console.error('sendMessage failed:', e); throw e }
  },
  sendFileMessage: async (channelId, fileUrl, fileName, senderId, senderName, replyTo = null) => {
    try {
      await supabase.from('messages').insert({
        channel_id: channelId, sender_id: senderId, sender_name: senderName, content: fileName, message_type: 'file', file_url: fileUrl, file_name: fileName, reply_to: replyTo,
      } as any).select().single()
    } catch (e) { console.error('sendFileMessage failed:', e); throw e }
  },
  updateMessage: async (id, channelId, updates) => {
    try {
      const { data } = await supabase.from('messages').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).map((m: Message) => m.id === id ? data as Message : m) } }))
    } catch (e) { console.error('updateMessage failed:', e); throw e }
  },
  deleteMessage: async (id, channelId) => {
    try {
      await supabase.from('messages').delete().eq('id', id)
      set((s) => ({ messages: { ...s.messages, [channelId]: (s.messages[channelId] || []).filter((m: Message) => m.id !== id) } }))
    } catch (e) { console.error('deleteMessage failed:', e); throw e }
  },
  addNotification: async (userId, title, content, type) => {
    try {
      const { data } = await supabase.from('notifications').insert({
        user_id: userId, title, content, type, read: false,
      } as any).select().single()
      if (data) set((s) => ({ notifications: [data as Notification, ...s.notifications] }))
    } catch (e) { console.error('addNotification failed:', e) }
  },

  // ========== Team ==========
  members: [],
  invitations: [],
  fetchTeamMembers: async () => {
    const { data: user } = await supabase.auth.getUser()
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
  },
  fetchInvitations: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('invitations').select('*').eq('team_owner_id', user.user.id)
    set({ invitations: (data as Invitation[] | null) || [] })
  },
  addMember: async (email, role) => {
    try {
      const { data: user } = await supabase.auth.getUser()
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
        } catch (e) { console.warn('发送邀请邮件失败:', e) }
      }
    } catch (e) { console.error('addMember failed:', e) }
  },
  removeMember: async (id) => {
    try {
      await supabase.from('team_members').delete().eq('id', id)
      set((s) => ({ members: s.members.filter((m: TeamMember) => m.id !== id) }))
    } catch (e) { console.error('removeMember failed:', e) }
  },
  updateMember: async (id, updates) => {
    try {
      const { data } = await supabase.from('team_members').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ members: s.members.map((m: TeamMember) => m.id === id ? data as TeamMember : m) }))
    } catch (e) { console.error('updateMember failed:', e) }
  },

  // ========== CRM ==========
  customers: [],
  fetchCustomers: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('customers')
      .select('*').eq('owner_id', user.user.id)
      .order('created_at', { ascending: false })
    set({ customers: (data as Customer[] | null) || [] })
  },
  addCustomer: async (c) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('customers').insert({ ...c, owner_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ customers: [data as Customer, ...s.customers] }))
    } catch (e) { console.error('addCustomer failed:', e) }
  },
  updateCustomer: async (id, updates) => {
    try {
      const { data } = await supabase.from('customers').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ customers: s.customers.map((c: Customer) => c.id === id ? data as Customer : c) }))
    } catch (e) { console.error('updateCustomer failed:', e) }
  },
  deleteCustomer: async (id) => {
    try {
      await supabase.from('customers').delete().eq('id', id)
      set((s) => ({ customers: s.customers.filter((c: Customer) => c.id !== id) }))
    } catch (e) { console.error('deleteCustomer failed:', e) }
  },
  salesOpportunities: [],
  fetchSalesOpportunities: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('sales_opportunities')
      .select('*').eq('owner_id', user.user.id)
      .order('created_at', { ascending: false })
    set({ salesOpportunities: (data as SalesOpportunity[] | null) || [] })
  },
  addOpportunity: async (o) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('sales_opportunities').insert({ ...o, owner_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ salesOpportunities: [data as SalesOpportunity, ...s.salesOpportunities] }))
    } catch (e) { console.error('addOpportunity failed:', e) }
  },
  updateOpportunity: async (id, updates) => {
    try {
      const { data } = await supabase.from('sales_opportunities').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ salesOpportunities: s.salesOpportunities.map((o: SalesOpportunity) => o.id === id ? data as SalesOpportunity : o) }))
    } catch (e) { console.error('updateOpportunity failed:', e) }
  },

  // ========== AI ==========
  aiConversations: [],
  aiMessages: {},
  activeAIConv: null,
  fetchAIConversations: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('ai_conversations')
      .select('*').eq('user_id', user.user.id)
      .order('updated_at', { ascending: false })
    set({ aiConversations: (data as AIConversation[] | null) || [] })
  },
  fetchAIMessages: async (convId) => {
    const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', convId).order('created_at')
    set((s) => ({ aiMessages: { ...s.aiMessages, [convId]: (data as AIMessage[] | null) || [] } }))
  },
  setActiveAIConv: (id) => set({ activeAIConv: id }),
  createAIConv: async (title, featureType) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return ''
      const { data } = await supabase.from('ai_conversations').insert({
        user_id: user.user.id, feature_type: featureType, title,
      } as any).select().single()
      if (data) {
        set((s) => ({ aiConversations: [data as AIConversation, ...s.aiConversations], activeAIConv: data.id }))
        return data.id
      }
      return ''
    } catch (e) { console.error('createAIConv failed:', e); return '' }
  },
  sendAIMessage: async (convId, content) => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('请先登录')
    
    // 插入用户消息
    const { data: userMsg, error: userMsgError } = await supabase.from('ai_messages').insert({
      conversation_id: convId, role: 'user', content,
    } as any).select().single()
    if (userMsgError || !userMsg) throw new Error('发送用户消息失败: ' + (userMsgError?.message || '未知错误'))

    // 先添加一个空的 AI 消息占位符（用于流式更新）
    const { data: aiMsgPlaceholder, error: placeholderError } = await supabase.from('ai_messages').insert({
      conversation_id: convId, role: 'assistant', content: '', model: 'streaming...',
    } as any).select().single()
    if (placeholderError || !aiMsgPlaceholder) throw new Error('创建 AI 消息失败: ' + (placeholderError?.message || '未知错误'))

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
                // 实时更新本地状态（流式效果）
                set((s) => ({
                  aiMessages: {
                    ...s.aiMessages,
                    [convId]: (s.aiMessages[convId] || []).map(m =>
                      m.id === aiMsgPlaceholder.id ? { ...m, content: fullContent } : m
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

    let aiContent = ''
    let modelName = ''
    let streamOk = false

    // 优先：自定义 API（流式）
    if (activeConfig) {
      try {
        modelName = activeConfig.model
        const baseUrl = activeConfig.baseUrl.replace(/\/$/, '')
        aiContent = await tryStreamCall(
          `${baseUrl}/chat/completions`,
          {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeConfig.apiKey}`,
          },
          { model: activeConfig.model, messages: [{ role: 'user', content }] }
        )
        streamOk = true
      } catch (e: any) {
        console.warn('自定义 API 流式调用失败，尝试系统 API:', e.message)
      }
    }

    // 降级：Edge Function（流式）
    if (!streamOk) {
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-generation`
        aiContent = await tryStreamCall(
          edgeUrl,
          {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          { messages: [{ role: 'user', content }] }
        )
        modelName = 'system-default'
        streamOk = true
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
            body: JSON.stringify({ model: activeConfig.model, messages: [{ role: 'user', content }], stream: false }),
            signal: AbortSignal.timeout(60000),
          })
          const json = await resp.json()
          aiContent = json.choices?.[0]?.message?.content || ''
          modelName = activeConfig.model
        }
      } catch { /* ignore */ }

      if (!aiContent) {
        aiContent = `[开发模式] 已收到您的消息：${content}\n\n当前 AI 服务未配置。请在「设置 → AI 模型」中添加您的 API Key 以启用真实 AI 对话。`
        modelName = 'dev-mode'
      }
    }

    // 最终更新：把完整内容写入数据库
    const { data: aiMsgFinal, error: aiMsgError } = await supabase.from('ai_messages').update({
      content: aiContent, model: modelName,
    } as any).eq('id', aiMsgPlaceholder.id).select().single()
    if (aiMsgError) console.error('更新 AI 消息失败:', aiMsgError)

    // 更新本地状态为最终内容
    set((s) => ({
      aiMessages: {
        ...s.aiMessages,
        [convId]: (s.aiMessages[convId] || []).map(m =>
          m.id === aiMsgPlaceholder.id ? (aiMsgFinal || { ...aiMsgPlaceholder, content: aiContent, model: modelName }) : m
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

  // ========== CRM Followups ==========
  followups: {},
  fetchFollowups: async (customerId) => {
    const { data } = await supabase.from('followups').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
    set((s) => ({ followups: { ...s.followups, [customerId]: (data as Followup[] | null) || [] } }))
  },
  addFollowup: async (data) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      const { data: fol } = await supabase.from('followups').insert({ ...data, user_id: user?.id || '' }).select().single()
      if (fol) set((s) => ({ followups: { ...s.followups, [fol.customer_id]: [fol as Followup, ...(s.followups[fol.customer_id] || [])] } }))
    } catch (e) { console.error('addFollowup failed:', e) }
  },
  deleteFollowup: async (id, customerId) => {
    try {
      await supabase.from('followups').delete().eq('id', id)
      set((s) => ({ followups: { ...s.followups, [customerId]: (s.followups[customerId] || []).filter((f: Followup) => f.id !== id) } }))
    } catch (e) { console.error('deleteFollowup failed:', e) }
  },

  // ========== Social Media ==========
  socialAccounts: [],
  socialPosts: [],
  trendingTopics: [],
  fetchSocialAccounts: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('social_accounts')
      .select('*').eq('user_id', user.user.id)
      .order('created_at')
    set({ socialAccounts: (data as SocialAccount[] | null) || [] })
  },
  fetchSocialPosts: async (accountId) => {
    let query = supabase.from('social_posts').select('*').order('created_at', { ascending: false })
    if (accountId) query = query.eq('account_id', accountId)
    const { data } = await query
    set({ socialPosts: (data as SocialPost[] | null) || [] })
  },
  fetchTrendingTopics: async () => {
    const { data } = await supabase.from('trending_topics').select('*').order('heat', { ascending: false }).limit(50)
    set({ trendingTopics: (data as TrendingTopic[] | null) || [] })
  },
  addSocialAccount: async (a) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase.from('social_accounts').insert({ ...a, user_id: user.user.id } as any).select().single()
      if (data) set((s) => ({ socialAccounts: [data as SocialAccount, ...s.socialAccounts] }))
    } catch (e) { console.error('addSocialAccount failed:', e) }
  },
  updateSocialAccount: async (id, updates) => {
    try {
      const { data } = await supabase.from('social_accounts').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ socialAccounts: s.socialAccounts.map((a: SocialAccount) => a.id === id ? data as SocialAccount : a) }))
    } catch (e) { console.error('updateSocialAccount failed:', e) }
  },
  deleteSocialAccount: async (id) => {
    try {
      await supabase.from('social_accounts').delete().eq('id', id)
      set((s) => ({ socialAccounts: s.socialAccounts.filter((a: SocialAccount) => a.id !== id) }))
    } catch (e) { console.error('deleteSocialAccount failed:', e) }
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
      console.warn('同步失败:', e)
    }
  },
  addSocialPost: async (p) => {
    try {
      const { data } = await supabase.from('social_posts').insert(p as any).select().single()
      if (data) set((s) => ({ socialPosts: [data as SocialPost, ...s.socialPosts] }))
    } catch (e) { console.error('addSocialPost failed:', e) }
  },
  updateSocialPost: async (id, updates) => {
    try {
      const { data } = await supabase.from('social_posts').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ socialPosts: s.socialPosts.map((p: SocialPost) => p.id === id ? data as SocialPost : p) }))
    } catch (e) { console.error('updateSocialPost failed:', e) }
  },
  deleteSocialPost: async (id) => {
    try {
      await supabase.from('social_posts').delete().eq('id', id)
      set((s) => ({ socialPosts: s.socialPosts.filter((p: SocialPost) => p.id !== id) }))
    } catch (e) { console.error('deleteSocialPost failed:', e) }
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
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('video_conferences')
      .select('*').eq('host_id', user.user.id)
      .order('created_at', { ascending: false })
    set({ conferences: (data as Conference[] | null) || [] })
  },
  addConference: async (c) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const meetingId = 'meet-' + crypto.randomUUID().slice(0, 8)
      const { data } = await supabase.from('video_conferences').insert({
        ...c, host_id: user.user.id, meeting_id: meetingId,
      } as any).select().single()
      if (data) set((s) => ({ conferences: [data as Conference, ...s.conferences] }))
    } catch (e) { console.error('addConference failed:', e) }
  },
  updateConference: async (id, updates) => {
    try {
      const { data } = await supabase.from('video_conferences').update(updates as any).eq('id', id).select().single()
      if (data) set((s) => ({ conferences: s.conferences.map((c: Conference) => c.id === id ? data as Conference : c) }))
    } catch (e) { console.error('updateConference failed:', e) }
  },
  deleteConference: async (id) => {
    try {
      await supabase.from('video_conferences').delete().eq('id', id)
      set((s) => ({ conferences: s.conferences.filter((c: Conference) => c.id !== id) }))
    } catch (e) { console.error('deleteConference failed:', e) }
  },

  // ========== Notifications ==========
  notifications: [],
  fetchNotifications: async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.user.id).order('created_at', { ascending: false })
    set({ notifications: (data as Notification[] | null) || [] })
  },
  markNotificationRead: async (id) => {
    try {
      await supabase.from('notifications').update({ read: true } as any).eq('id', id)
      set((s) => ({ notifications: s.notifications.map((n: Notification) => n.id === id ? { ...n, read: true } : n) }))
    } catch (e) { console.error('markNotificationRead failed:', e) }
  },
  markAllNotificationsRead: async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.user.id).eq('read', false)
      set((s) => ({ notifications: s.notifications.map((n: Notification) => ({ ...n, read: true })) }))
    } catch (e) { console.error('markAllNotificationsRead failed:', e) }
  },

  // ========== Files ==========
  files: [],
  fetchFiles: async (projectId) => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return
    let query = supabase.from('files')
      .select('*').eq('uploaded_by', user.user.id)
      .order('created_at', { ascending: false })
    if (projectId) query = query.eq('project_id', projectId)
    const { data } = await query
    set({ files: (data as DBFile[] | null) || [] })
  },
  uploadFile: async (file, projectId, onProgress) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return null
      const ext = file.name.split('.').pop() || ''
      const filePath = `${user.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) return null
      onProgress?.(100)
      const { data } = await supabase.from('files').insert({
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        project_id: projectId || null,
        uploaded_by: user.user.id,
        is_public: true,
        metadata: {},
      } as any).select().single()
      if (data) set((s) => ({ files: [data as DBFile, ...s.files] }))
      return data as DBFile | null
    } catch (e) { console.error('uploadFile failed:', e); return null }
  },
  deleteFile: async (id) => {
    try {
      const file = get().files.find(f => f.id === id)
      if (file) await supabase.storage.from('files').remove([file.file_path]).catch(() => {})
      await supabase.from('files').delete().eq('id', id)
      set((s) => ({ files: s.files.filter(f => f.id !== id) }))
    } catch (e) { console.error('deleteFile failed:', e) }
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

  // ========== Data Realtime Subscriptions ==========
  // Projects realtime — refreshes project list on any project change
  subscribeToProjects: () => {
    set((s) => {
      if ((s as any).__projectsChannel) return s
      const ch = supabase
        .channel('projects-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
          get().fetchProjects()
        })
        .subscribe()
      return { __projectsChannel: ch } as any
    })
  },

  // Tasks realtime
  subscribeToTasks: () => {
    set((s) => {
      if ((s as any).__tasksChannel) return s
      const ch = supabase
        .channel('tasks-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          get().fetchTasks()
        })
        .subscribe()
      return { __tasksChannel: ch } as any
    })
  },

  // Documents realtime
  subscribeToDocuments: () => {
    set((s) => {
      if ((s as any).__documentsChannel) return s
      const ch = supabase
        .channel('documents-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
          get().fetchDocuments()
        })
        .subscribe()
      return { __documentsChannel: ch } as any
    })
  },

  // CRM realtime — customers and opportunities
  subscribeToCRM: () => {
    set((s) => {
      if ((s as any).__crmChannel) return s
      const ch = supabase
        .channel('crm-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          get().fetchCustomers()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_opportunities' }, () => {
          get().fetchSalesOpportunities()
        })
        .subscribe()
      return { __crmChannel: ch } as any
    })
  },

  // Cleanup all data realtime subscriptions
  unsubscribeData: () => {
    const state = get() as any
    const channels = ['__projectsChannel', '__tasksChannel', '__documentsChannel', '__crmChannel']
    channels.forEach(key => {
      const ch = state[key]
      if (ch) supabase.removeChannel(ch)
    })
    set({ __projectsChannel: null, __tasksChannel: null, __documentsChannel: null, __crmChannel: null } as any)
  },

}))

// 初始化：监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    useStore.getState().loadUser()
  }
  if (event === 'SIGNED_OUT') {
    useStore.getState().signOut()
  }
})
