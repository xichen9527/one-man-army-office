-- =====================================================
-- 一人成军办公平台 - 完整数据库 Schema
-- 在 Supabase SQL Editor 中运行此文件
-- =====================================================

-- 启用必要扩展
create extension if not exists "uuid-ossp";

-- =====================================================
-- 0. 彻底清理（先删触发器，再删表）
-- =====================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_updated_at();
drop function if exists public.get_unread_notification_count();
drop function if exists public.get_user_stats();

drop table if exists public.task_comments cascade;
drop table if exists public.document_versions cascade;
drop table if exists public.customer_interactions cascade;
drop table if exists public.files cascade;
drop table if exists public.sales_opportunities cascade;
drop table if exists public.invitations cascade;
drop table if exists public.team_members cascade;
drop table if exists public.video_conferences cascade;
drop table if exists public.trending_topics cascade;
drop table if exists public.social_posts cascade;
drop table if exists public.social_accounts cascade;
drop table if exists public.customers cascade;
drop table if exists public.ai_messages cascade;
drop table if exists public.ai_conversations cascade;
drop table if exists public.notifications cascade;
drop table if exists public.messages cascade;
drop table if exists public.channel_id cascade;
drop table if exists public.documents cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.login_sessions cascade;
drop table if exists public.account_locks cascade;
drop table if exists public.login_attempts cascade;
drop table if exists public.profiles cascade;


-- =====================================================
-- 1. 用户资料表 (profiles)
-- =====================================================
create table public.profiles (
  id text primary key,
  email text unique not null,
  username text unique,
  full_name text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  phone text,
  company text,
  bio text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid()::text = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid()::text = id) with check (auth.uid()::text = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid()::text = id);


-- =====================================================
-- 2. 登录尝试记录 (login_attempts)
-- =====================================================
create table public.login_attempts (
  id text default gen_random_uuid()::text primary key,
  email text not null,
  ip_address inet,
  user_agent text,
  success boolean default false,
  failure_reason text,
  attempted_at timestamptz default now()
);

alter table public.login_attempts enable row level security;
create policy "login_attempts_admin_only" on public.login_attempts for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);


-- =====================================================
-- 3. 账号锁定记录 (account_locks)
-- =====================================================
create table public.account_locks (
  id text default gen_random_uuid()::text primary key,
  email text not null,
  ip_address inet,
  locked_at timestamptz default now(),
  unlocked_at timestamptz,
  lock_duration_minutes int default 30,
  reason text,
  is_active boolean default true
);

alter table public.account_locks enable row level security;
create policy "account_locks_admin_only" on public.account_locks for all using (
  exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin')
);


-- =====================================================
-- 4. 会话管理 (login_sessions)
-- =====================================================
create table public.login_sessions (
  id text default gen_random_uuid()::text primary key,
  user_id text not null,
  token_hash text not null,
  ip_address inet,
  user_agent text,
  remember_me boolean default false,
  expires_at timestamptz not null,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.login_sessions enable row level security;
create policy "sessions_own" on public.login_sessions for all using (auth.uid()::text = user_id);


-- =====================================================
-- 5. 项目表 (projects)
-- =====================================================
create table public.projects (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  description text,
  owner_id text not null,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  color text default '#3b82f6',
  is_public boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;
create policy "projects_select_team" on public.projects for select using (auth.uid()::text = owner_id or is_public = true);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid()::text = owner_id);
create policy "projects_update_own" on public.projects for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid()::text = owner_id);

create index idx_projects_owner on public.projects(owner_id);


-- =====================================================
-- 6. 任务表 (tasks)
-- =====================================================
create table public.tasks (
  id text default gen_random_uuid()::text primary key,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id text,
  creator_id text not null,
  project_id text references public.projects(id) on delete cascade,
  due_date date,
  completed_at timestamptz,
  tags text[],
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "tasks_select_own_or_assigned" on public.tasks for select using (
  auth.uid()::text = creator_id or auth.uid()::text = assignee_id
  or exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()::text)
);
create policy "tasks_insert" on public.tasks for insert with check (auth.uid()::text = creator_id);
create policy "tasks_update" on public.tasks for update using (
  auth.uid()::text = creator_id or auth.uid()::text = assignee_id
  or exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()::text)
);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid()::text = creator_id);

create index idx_tasks_assignee on public.tasks(assignee_id);
create index idx_tasks_creator on public.tasks(creator_id);
create index idx_tasks_project on public.tasks(project_id);


-- =====================================================
-- 7. 文档表 (documents)
-- =====================================================
create table public.documents (
  id text default gen_random_uuid()::text primary key,
  title text not null,
  content text default '',
  type text default 'markdown' check (type in ('markdown', 'richtext', 'code')),
  project_id text references public.projects(id) on delete cascade,
  task_id text references public.tasks(id) on delete set null,
  creator_id text not null,
  is_public boolean default false,
  is_archived boolean default false,
  version int default 1,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "documents_select_own_or_public" on public.documents for select using (
  auth.uid()::text = creator_id or is_public = true
  or exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()::text)
);
create policy "documents_insert" on public.documents for insert with check (auth.uid()::text = creator_id);
create policy "documents_update_own" on public.documents for update using (auth.uid()::text = creator_id) with check (auth.uid()::text = creator_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid()::text = creator_id);


-- =====================================================
-- 8. 聊天频道表 (channels)
-- =====================================================
create table public.channel_id (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  description text,
  is_private boolean default false,
  created_by text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.channel_id enable row level security;
create policy "channels_select_all" on public.channel_id for select using (true);
create policy "channels_insert_auth" on public.channel_id for insert with check (auth.uid()::text = created_by);
create policy "channels_update_own" on public.channel_id for update using (auth.uid()::text = created_by);


-- =====================================================
-- 9. 消息表 (messages)
-- =====================================================
create table public.messages (
  id text default gen_random_uuid()::text primary key,
  channel_id text references public.channel_id(id) on delete cascade not null,
  sender_id text,
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'file', 'image', 'system')),
  reply_to text references public.messages(id) on delete set null,
  file_url text,
  file_name text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "messages_select_channel" on public.messages for select using (true);
create policy "messages_insert_auth" on public.messages for insert with check (auth.uid()::text = sender_id);
create policy "messages_update_own" on public.messages for update using (auth.uid()::text = sender_id);
create policy "messages_delete_own" on public.messages for delete using (auth.uid()::text = sender_id);

create index idx_messages_channel on public.messages(channel_id, created_at desc);
create index idx_messages_sender on public.messages(sender_id);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.channel_id;


-- =====================================================
-- 10. 通知表 (notifications)
-- =====================================================
create table public.notifications (
  id text default gen_random_uuid()::text primary key,
  user_id text not null,
  title text not null,
  content text,
  type text default 'system' check (type in ('system', 'task', 'project', 'message', 'ai', 'crm', 'social', 'conference')),
  read boolean default false,
  action_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

alter publication supabase_realtime add table public.notifications;


-- =====================================================
-- 11. AI 对话表 (ai_conversations)
-- =====================================================
create table public.ai_conversations (
  id text default gen_random_uuid()::text primary key,
  user_id text not null,
  feature_type text not null check (feature_type in ('chat', 'writing', 'translate', 'summary', 'code', 'analysis')),
  title text,
  model text default 'ernie-bot',
  system_prompt text,
  is_pinned boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;
create policy "ai_conversations_own" on public.ai_conversations for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);


-- =====================================================
-- 12. AI 消息表 (ai_messages)
-- =====================================================
create table public.ai_messages (
  id text default gen_random_uuid()::text primary key,
  conversation_id text references public.ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used int,
  model text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.ai_messages enable row level security;
create policy "ai_messages_conversation_own" on public.ai_messages for all using (
  exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid()::text)
);

create index idx_ai_messages_conv on public.ai_messages(conversation_id, created_at);


-- =====================================================
-- 13. 客户表 (customers)
-- =====================================================
create table public.customers (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  email text,
  phone text,
  company text,
  status text default 'potential' check (status in ('active', 'inactive', 'potential')),
  assigned_to text,
  tags text[],
  source text,
  value numeric(12,2) default 0,
  address text,
  notes text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customers enable row level security;
create policy "customers_select_auth" on public.customers for select using (auth.uid() is not null);
create policy "customers_insert_auth" on public.customers for insert with check (auth.uid() is not null);
create policy "customers_update_auth" on public.customers for update using (auth.uid() is not null);
create policy "customers_delete_auth" on public.customers for delete using (auth.uid() is not null);

create index idx_customers_assigned on public.customers(assigned_to);


-- =====================================================
-- 14. 销售机会表 (sales_opportunities)
-- =====================================================
create table public.sales_opportunities (
  id text default gen_random_uuid()::text primary key,
  customer_id text references public.customers(id) on delete cascade not null,
  title text not null,
  stage text default 'initial' check (stage in ('initial', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  amount numeric(12,2) default 0,
  probability int default 0 check (probability >= 0 and probability <= 100),
  expected_close date,
  notes text,
  assigned_to text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sales_opportunities enable row level security;
create policy "sales_opportunities_auth" on public.sales_opportunities for all using (auth.uid() is not null);

create index idx_sales_customer on public.sales_opportunities(customer_id);


-- =====================================================
-- 15. 社交媒体账号表 (social_accounts)
-- =====================================================
create table public.social_accounts (
  id text default gen_random_uuid()::text primary key,
  user_id text not null,
  platform text not null check (platform in ('weibo', 'wechat', 'douyin', 'xiaohongshu', 'bilibili', 'zhihu', 'toutiao', 'other')),
  account_name text not null,
  account_id text,
  follower_count int default 0,
  following_count int default 0,
  post_count int default 0,
  status text default 'active' check (status in ('active', 'inactive', 'suspended')),
  check_status text default 'pending' check (check_status in ('pending', 'active', 'error')),
  auto_sync boolean default false,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.social_accounts enable row level security;
create policy "social_accounts_own" on public.social_accounts for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);


-- =====================================================
-- 16. 社交内容表 (social_posts)
-- =====================================================
create table public.social_posts (
  id text default gen_random_uuid()::text primary key,
  account_id text references public.social_accounts(id) on delete cascade not null,
  title text,
  content text not null,
  platform text not null,
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  post_url text,
  media_urls text[],
  tags text[],
  likes int default 0,
  comments int default 0,
  shares int default 0,
  views int default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.social_posts enable row level security;
create policy "social_posts_own" on public.social_posts for all using (
  exists (select 1 from public.social_accounts where id = account_id and user_id = auth.uid()::text)
);


-- =====================================================
-- 17. 热点话题表 (trending_topics)
-- =====================================================
create table public.trending_topics (
  id text default gen_random_uuid()::text primary key,
  title text not null,
  platform text not null,
  heat int default 0,
  trend text default 'stable' check (trend in ('up', 'down', 'stable')),
  url text,
  description text,
  captured_at timestamptz default now()
);

alter table public.trending_topics enable row level security;
create policy "trending_topics_all" on public.trending_topics for select using (true);
create policy "trending_topics_insert_auth" on public.trending_topics for insert with check (auth.uid() is not null);


-- =====================================================
-- 18. 视频会议表 (video_conferences)
-- =====================================================
create table public.video_conferences (
  id text default gen_random_uuid()::text primary key,
  meeting_id text unique not null,
  title text not null,
  description text,
  host_id text not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration int,
  status text default 'scheduled' check (status in ('scheduled', 'ongoing', 'ended', 'cancelled')),
  max_participants int default 10,
  participants text[] default '{}',
  recording_enabled boolean default false,
  recording_url text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.video_conferences enable row level security;
create policy "video_conferences_select" on public.video_conferences for select using (
  auth.uid()::text = host_id or auth.uid()::text = any(participants)
);
create policy "video_conferences_insert" on public.video_conferences for insert with check (auth.uid()::text = host_id);
create policy "video_conferences_update_own" on public.video_conferences for update using (auth.uid()::text = host_id);
create policy "video_conferences_delete_own" on public.video_conferences for delete using (auth.uid()::text = host_id);


-- =====================================================
-- 19. 团队成员表 (team_members)
-- =====================================================
create table public.team_members (
  id text default gen_random_uuid()::text primary key,
  owner_id text not null,
  user_id text,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  status text default 'active' check (status in ('active', 'inactive', 'pending')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique(owner_id, user_id)
);

alter table public.team_members enable row level security;
create policy "team_members_own" on public.team_members for all using (auth.uid()::text = owner_id or auth.uid()::text = user_id);


-- =====================================================
-- 20. 邀请表 (invitations)
-- =====================================================
create table public.invitations (
  id text default gen_random_uuid()::text primary key,
  team_owner_id text not null,
  email text not null,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  token text unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.invitations enable row level security;
create policy "invitations_own" on public.invitations for all using (auth.uid()::text = team_owner_id);


-- =====================================================
-- 21. 文档版本历史 (document_versions)
-- =====================================================
create table public.document_versions (
  id text default gen_random_uuid()::text primary key,
  document_id text references public.documents(id) on delete cascade not null,
  version int not null,
  content text not null,
  title text not null,
  changed_by text,
  change_summary text,
  created_at timestamptz default now()
);

alter table public.document_versions enable row level security;
create policy "document_versions_select" on public.document_versions for select using (
  exists (select 1 from public.documents where id = document_id and (creator_id = auth.uid()::text or is_public = true))
);


-- =====================================================
-- 22. 任务评论表 (task_comments)
-- =====================================================
create table public.task_comments (
  id text default gen_random_uuid()::text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  author_id text,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.task_comments enable row level security;
create policy "task_comments_select" on public.task_comments for select using (
  exists (select 1 from public.tasks where id = task_id and (creator_id = auth.uid()::text or assignee_id = auth.uid()::text))
);
create policy "task_comments_insert" on public.task_comments for insert with check (auth.uid()::text = author_id);


-- =====================================================
-- 23. 客户互动记录 (customer_interactions)
-- =====================================================
create table public.customer_interactions (
  id text default gen_random_uuid()::text primary key,
  customer_id text references public.customers(id) on delete cascade not null,
  user_id text,
  interaction_type text not null check (interaction_type in ('call', 'email', 'meeting', 'note', 'task')),
  subject text,
  content text,
  interaction_date timestamptz default now(),
  next_follow_up timestamptz,
  created_at timestamptz default now()
);

alter table public.customer_interactions enable row level security;
create policy "customer_interactions_auth" on public.customer_interactions for all using (auth.uid() is not null);


-- =====================================================
-- 24. 文件存储表 (files)
-- =====================================================
create table public.files (
  id text default gen_random_uuid()::text primary key,
  name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  project_id text references public.projects(id) on delete cascade,
  uploaded_by text,
  is_public boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.files enable row level security;
create policy "files_select" on public.files for select using (
  auth.uid()::text = uploaded_by or is_public = true
  or exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()::text)
);
create policy "files_insert" on public.files for insert with check (auth.uid()::text = uploaded_by);


-- =====================================================
-- 公共函数与触发器
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();
create trigger documents_updated_at before update on public.documents
  for each row execute function public.handle_updated_at();
create trigger channel_id_updated_at before update on public.channel_id
  for each row execute function public.handle_updated_at();
create trigger social_posts_updated_at before update on public.social_posts
  for each row execute function public.handle_updated_at();
create trigger video_conferences_updated_at before update on public.video_conferences
  for each row execute function public.handle_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.handle_updated_at();
create trigger sales_opportunities_updated_at before update on public.sales_opportunities
  for each row execute function public.handle_updated_at();
create trigger social_accounts_updated_at before update on public.social_accounts
  for each row execute function public.handle_updated_at();
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.handle_updated_at();
create trigger task_comments_updated_at before update on public.task_comments
  for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================
-- 常用函数
-- =====================================================

create or replace function public.get_unread_notification_count()
returns int as $$
  select count(*)::int from public.notifications
  where user_id = auth.uid()::text and read = false;
$$ language sql security definer stable;

create or replace function public.get_user_stats()
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'project_count', (select count(*) from public.projects where owner_id = auth.uid()::text),
    'task_count', (select count(*) from public.tasks where assignee_id = auth.uid()::text and status != 'completed'),
    'customer_count', (select count(*) from public.customers),
    'unread_notifications', public.get_unread_notification_count()
  ) into result;
  return result;
end;
$$ language plpgsql security definer;


-- =====================================================
-- 初始数据：默认频道
-- =====================================================
insert into public.channel_id (name, description, is_private, created_by)
values ('综合讨论', '团队综合讨论频道', false, null);

insert into public.channel_id (name, description, is_private, created_by)
values ('公告通知', '重要公告和通知', false, null);

insert into public.channel_id (name, description, is_private, created_by)
values ('随机闲聊', '非工作话题自由讨论', false, null);


-- =====================================================
-- 跟进记录表
-- =====================================================
create table if not exists public.followups (
  id text default gen_random_uuid()::text primary key,
  customer_id text references public.customers(id) on delete cascade not null,
  user_id text not null,
  type text check (type in ('call','email','meeting','other')) not null default 'other',
  content text not null,
  contact text,
  created_at timestamptz default now() not null
);

create index if not exists idx_followups_customer_id on public.followups(customer_id);
create index if not exists idx_followups_user_id on public.followups(user_id);
create index if not exists idx_followups_created_at on public.followups(created_at desc);

alter table public.followups enable row level security;
create policy if not exists "Users can manage own followups" on public.followups
  for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

grant select, insert, update, delete on public.followups to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- =====================================================
-- 完成提示
-- =====================================================
do $$
begin
  raise notice '==========================================';
  raise notice '一人成军办公平台 - 数据库创建完成！';
  raise notice '共创建 24 张表';
  raise notice 'RLS 策略已启用';
  raise notice 'Realtime 已配置';
  raise notice '==========================================';
end;
$$;
