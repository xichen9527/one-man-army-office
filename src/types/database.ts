// 鐢?supabase gen types 鐢熸垚锛屾墜鍔ㄥ榻?schema.sql
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      projects: { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate }
      tasks: { Row: Task; Insert: TaskInsert; Update: TaskUpdate }
      documents: { Row: Document; Insert: DocumentInsert; Update: DocumentUpdate }
      channel_id: { Row: Channel; Insert: ChannelInsert; Update: ChannelUpdate }
      messages: { Row: Message; Insert: MessageInsert; Update: MessageUpdate }
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate }
      ai_conversations: { Row: AIConversation; Insert: AIConversationInsert; Update: AIConversationUpdate }
      ai_messages: { Row: AIMessage; Insert: AIMessageInsert; Update: AIMessageUpdate }
      customers: { Row: Customer; Insert: CustomerInsert; Update: CustomerUpdate }
      sales_opportunities: { Row: SalesOpportunity; Insert: SalesOpportunityInsert; Update: SalesOpportunityUpdate }
      social_accounts: { Row: SocialAccount; Insert: SocialAccountInsert; Update: SocialAccountUpdate }
      social_posts: { Row: SocialPost; Insert: SocialPostInsert; Update: SocialPostUpdate }
      trending_topics: { Row: TrendingTopic; Insert: TrendingTopicInsert; Update: TrendingTopicUpdate }
      video_conferences: { Row: Conference; Insert: ConferenceInsert; Update: ConferenceUpdate }
      team_members: { Row: TeamMember; Insert: TeamMemberInsert; Update: TeamMemberUpdate }
      invitations: { Row: Invitation; Insert: InvitationInsert; Update: InvitationUpdate }
      files: { Row: DBFile; Insert: DBFileInsert; Update: DBFileUpdate }
      followups: { Row: Followup; Insert: FollowupInsert; Update: FollowupUpdate }
      task_reports: { Row: TaskReport; Insert: TaskReportInsert; Update: TaskReportUpdate }
      workspace_members: { Row: WorkspaceMember; Insert: WorkspaceMemberInsert; Update: WorkspaceMemberUpdate }
      workspace_templates: { Row: WorkspaceTemplate; Insert: WorkspaceTemplateInsert; Update: WorkspaceTemplateUpdate }
      content_templates: { Row: ContentTemplate; Insert: ContentTemplateInsert; Update: ContentTemplateUpdate }
      automation_workflows: { Row: AutomationWorkflow; Insert: AutomationWorkflowInsert; Update: AutomationWorkflowUpdate }
      marketing_campaigns: { Row: MarketingCampaign; Insert: MarketingCampaignInsert; Update: MarketingCampaignUpdate }
      audit_logs: { Row: AuditLog; Insert: AuditLogInsert; Update: AuditLogUpdate }
      user_roles: { Row: UserRole; Insert: UserRoleInsert; Update: UserRoleUpdate }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// ==================== Profiles ====================
export interface Profile {
  id: string
  email: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member' | 'viewer'
  phone: string | null
  company: string | null
  bio: string | null
  settings: Json
  two_factor_enabled: boolean
  two_factor_secret: string | null
  created_at: string
  updated_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>

// ==================== Projects ====================
export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  status: 'active' | 'completed' | 'archived'
  color: string | null
  is_public: boolean
  metadata: Json
  created_at: string
  updated_at: string
}
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>

// ==================== Tasks ====================
export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string | null
  creator_id: string
  project_id: string | null
  due_date: string | null
  completed_at: string | null
  tags: string[] | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
export type TaskUpdate = Partial<Omit<Task, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>

// ==================== Documents ====================
export interface Document {
  id: string
  title: string
  content: string | null
  type: 'markdown' | 'richtext' | 'code' | 'word' | 'excel' | 'ppt' | 'mindmap' | 'flowchart' | 'other'
  project_id: string | null
  task_id: string | null
  creator_id: string
  is_public: boolean
  is_archived: boolean
  version: number
  metadata: Json
  created_at: string
  updated_at: string
}
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'version'>
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>

// ==================== Channels ====================
export interface Channel {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type ChannelInsert = Omit<Channel, 'id' | 'created_at' | 'updated_at'>
export type ChannelUpdate = Partial<Omit<Channel, 'id' | 'created_at' | 'updated_at'>>

// ==================== Messages ====================
export interface Message {
  id: string
  channel_id: string
  sender_id: string | null
  sender_name: string | null
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  reply_to: string | null
  file_url: string | null
  file_name: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'updated_at'>
export type MessageUpdate = Partial<Omit<Message, 'id' | 'channel_id' | 'sender_id' | 'created_at' | 'updated_at'>>

// ==================== Notifications ====================
export interface Notification {
  id: string
  user_id: string
  title: string
  content: string | null
  type: 'system' | 'task' | 'project' | 'message' | 'ai' | 'crm' | 'social' | 'conference'
  read: boolean
  action_url: string | null
  metadata: Json
  created_at: string
}
export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>
export type NotificationUpdate = Partial<Pick<Notification, 'read' | 'metadata'>>

// ==================== AI ====================
export interface AIConversation {
  id: string
  user_id: string
  feature_type: 'chat' | 'writing' | 'translate' | 'summary' | 'code' | 'analysis' | 'text_generation' | 'ai_search' | 'web_summary' | 'multimodal_analysis'
  title: string | null
  model: string | null
  system_prompt: string | null
  is_pinned: boolean
  metadata: Json
  created_at: string
  updated_at: string
}
export type AIConversationInsert = Omit<AIConversation, 'id' | 'created_at' | 'updated_at'>
export type AIConversationUpdate = Partial<Omit<AIConversation, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface AIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used: number | null
  model: string | null
  metadata: Json
  created_at: string
}
export type AIMessageInsert = Omit<AIMessage, 'id' | 'created_at'>
export type AIMessageUpdate = Partial<Omit<AIMessage, 'id' | 'conversation_id' | 'created_at'>>

// ==================== Followups ====================
export interface Followup {
  id: string
  customer_id: string
  user_id: string
  type: 'call' | 'email' | 'meeting' | 'other'
  content: string
  contact: string | null
  created_at: string
}
export type FollowupInsert = Omit<Followup, 'id' | 'created_at'>
export type FollowupUpdate = Partial<Omit<Followup, 'id' | 'user_id' | 'created_at'>>

// ==================== CRM ====================
export interface Customer {
  id: string
  owner_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: 'active' | 'inactive' | 'potential'
  assigned_to: string | null
  tags: string[] | null
  source: string | null
  value: number
  address: string | null
  notes: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>

export interface SalesOpportunity {
  id: string
  owner_id: string
  customer_id: string
  title: string
  stage: 'initial' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  amount: number
  probability: number
  expected_close: string | null
  notes: string | null
  assigned_to: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type SalesOpportunityInsert = Omit<SalesOpportunity, 'id' | 'created_at' | 'updated_at'>
export type SalesOpportunityUpdate = Partial<Omit<SalesOpportunity, 'id' | 'owner_id' | 'customer_id' | 'created_at' | 'updated_at'>>

// ==================== Social ====================
export interface SocialAccount {
  id: string
  user_id: string
  platform: 'weibo' | 'wechat' | 'douyin' | 'xiaohongshu' | 'bilibili' | 'zhihu' | 'toutiao' | 'other'
  account_name: string
  account_id: string | null
  follower_count: number
  following_count: number
  post_count: number
  status: 'active' | 'inactive' | 'suspended'
  check_status: 'pending' | 'active' | 'error'
  auto_sync: boolean
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: Json
  created_at: string
  updated_at: string
}
export type SocialAccountInsert = Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'>
export type SocialAccountUpdate = Partial<Omit<SocialAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface SocialPost {
  id: string
  account_id: string
  title: string | null
  content: string
  platform: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  post_url: string | null
  media_urls: string[] | null
  tags: string[] | null
  likes: number
  comments: number
  shares: number
  views: number
  metadata: Json
  created_at: string
  updated_at: string
}
export type SocialPostInsert = Omit<SocialPost, 'id' | 'created_at' | 'updated_at'>
export type SocialPostUpdate = Partial<Omit<SocialPost, 'id' | 'account_id' | 'created_at' | 'updated_at'>>

export interface TrendingTopic {
  id: string
  title: string
  platform: string
  heat: number
  trend: 'up' | 'down' | 'stable'
  url: string | null
  description: string | null
  captured_at: string
}
export type TrendingTopicInsert = Omit<TrendingTopic, 'id' | 'captured_at'>
export type TrendingTopicUpdate = Partial<Omit<TrendingTopic, 'id' | 'captured_at'>>

// ==================== Video Conference ====================
export interface Conference {
  id: string
  meeting_id: string
  meeting_number: string | null
  join_url: string | null
  title: string
  description: string | null
  host_id: string
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  duration: number | null
  status: 'scheduled' | 'ongoing' | 'ended' | 'cancelled'
  max_participants: number
  participants: string[]
  recording_enabled: boolean
  recording_url: string | null
  settings: Json
  created_at: string
  updated_at: string
}
export type ConferenceInsert = Omit<Conference, 'id' | 'created_at' | 'updated_at'>
export type ConferenceUpdate = Partial<Omit<Conference, 'id' | 'host_id' | 'created_at' | 'updated_at'>>

// ==================== Team ====================
export interface TeamMember {
  id: string
  owner_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  invited_at: string
  joined_at: string | null
  full_name: string
  email: string
}
export type TeamMemberInsert = Omit<TeamMember, 'id' | 'invited_at'>
export type TeamMemberUpdate = Partial<Omit<TeamMember, 'id' | 'owner_id' | 'user_id' | 'invited_at'>>

export interface Invitation {
  id: string
  team_owner_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  created_at: string
}
export type InvitationInsert = Omit<Invitation, 'id' | 'created_at'>
export type InvitationUpdate = Partial<Omit<Invitation, 'id' | 'team_owner_id' | 'created_at'>>

// ==================== Files ====================
export interface DBFile {
  id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  project_id: string | null
  uploaded_by: string | null
  is_public: boolean
  metadata: Json
  created_at: string
}
export type DBFileInsert = Omit<DBFile, 'id' | 'created_at'>
export type DBFileUpdate = Partial<Omit<DBFile, 'id' | 'uploaded_by' | 'created_at'>>

// ==================== Team Calendar ====================
export interface Schedule {
  id: string
  user_id: string
  title: string
  description: string | null
  event_type: 'event' | 'meeting' | 'deadline' | 'reminder' | 'holiday'
  start_time: string
  end_time: string | null
  all_day: boolean
  color: string
  location: string | null
  meeting_url: string | null
  remind_before: number
  created_at: string
  updated_at: string
}
export type ScheduleInsert = Omit<Schedule, 'id' | 'created_at' | 'updated_at'>
export type ScheduleUpdate = Partial<Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ==================== Admin ====================
export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Json
  ip_address: string | null
  created_at: string
}

export interface SystemConfig {
  key: string
  value: Json
  description: string | null
  updated_by: string | null
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'user' | 'viewer'
  assigned_at: string
}

// ==================== Login Session ====================
export interface LoginSession {
  id: string
  user_id: string
  ip_address: string | null
  user_agent: string | null
  device_info: Json
  login_method: 'email' | 'oauth' | '2fa'
  is_current: boolean
  expires_at: string | null
  created_at: string
  last_active_at: string
}

// ==================== File Version ====================
export interface FileVersion {
  id: string
  file_id: string
  version_number: number
  storage_path: string
  file_size: number | null
  change_summary: string | null
  created_by: string
  created_at: string
}

// ==================== Customer Contact ====================
export interface CustomerContact {
  id: string
  customer_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ==================== Project Milestone ====================
export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  due_date: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ==================== Tag ====================
export interface Tag {
  id: string
  name: string
  color: string
  created_by: string
  created_at: string
}

export interface TagAssociation {
  id: string
  tag_id: string
  resource_type: 'project' | 'document' | 'customer' | 'social_post' | 'task'
  resource_id: string
  created_at: string
}

// ==================== Note ====================
export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  color: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

// ==================== Task Reports ====================
export interface TaskReport {
  id: string
  user_id: string
  project_id: string | null
  title: string
  report_type: 'weekly' | 'monthly' | 'custom'
  start_date: string
  end_date: string
  completion_rate: number
  summary: string | null
  metadata: Json
  created_at: string
}
export type TaskReportInsert = Omit<TaskReport, 'id' | 'created_at'>
export type TaskReportUpdate = Partial<Omit<TaskReport, 'id' | 'user_id' | 'created_at'>>

// ==================== Workspace Members ====================
export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joined_at: string
  invited_by: string | null
  full_name: string | null
  email: string | null
  metadata: Json
}
export type WorkspaceMemberInsert = Omit<WorkspaceMember, 'id' | 'joined_at'>
export type WorkspaceMemberUpdate = Partial<Omit<WorkspaceMember, 'id' | 'workspace_id' | 'user_id' | 'joined_at'>>

// ==================== Workspace Templates ====================
export interface WorkspaceTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  icon: string | null
  structure: Json
  usage_count: number
  is_public: boolean
  creator_id: string
  metadata: Json
  created_at: string
  updated_at: string
}
export type WorkspaceTemplateInsert = Omit<WorkspaceTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
export type WorkspaceTemplateUpdate = Partial<Omit<WorkspaceTemplate, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>

// ==================== Content Templates ====================
export interface ContentTemplate {
  id: string
  name: string
  description: string | null
  category: 'social' | 'email' | 'document' | 'presentation' | 'blog'
  content: string
  variables: string[] | null
  creator_id: string
  is_public: boolean
  usage_count: number
  metadata: Json
  created_at: string
  updated_at: string
}
export type ContentTemplateInsert = Omit<ContentTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
export type ContentTemplateUpdate = Partial<Omit<ContentTemplate, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>

// ==================== Automation Workflows ====================
export interface AutomationWorkflow {
  id: string
  name: string
  description: string | null
  trigger_type: 'schedule' | 'event' | 'webhook'
  trigger_config: Json
  action_config: Json
  is_active: boolean
  last_run_at: string | null
  run_count: number
  creator_id: string
  metadata: Json
  created_at: string
  updated_at: string
}
export type AutomationWorkflowInsert = Omit<AutomationWorkflow, 'id' | 'created_at' | 'updated_at' | 'run_count' | 'last_run_at'>
export type AutomationWorkflowUpdate = Partial<Omit<AutomationWorkflow, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>

// ==================== Marketing Campaigns ====================
export interface MarketingCampaign {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'paused' | 'completed'
  budget: number | null
  spent: number
  start_date: string | null
  end_date: string | null
  target_audience: string | null
  channels: string[] | null
  owner_id: string
  metadata: Json
  created_at: string
  updated_at: string
}
export type MarketingCampaignInsert = Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at' | 'spent'>
export type MarketingCampaignUpdate = Partial<Omit<MarketingCampaign, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>

// ==================== Task Report ====================

// ==================== Audit Log ====================
export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>
export type AuditLogUpdate = Partial<Omit<AuditLog, 'id' | 'created_at'>>

// ==================== User Role ====================
export interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'manager' | 'user'
  permissions: any
  assigned_by: string | null
  assigned_at: string
  created_at: string
  updated_at: string
}

export type UserRoleInsert = Omit<UserRole, 'id' | 'created_at' | 'updated_at'>
export type UserRoleUpdate = Partial<Omit<UserRole, 'id' | 'created_at' | 'updated_at'>>
