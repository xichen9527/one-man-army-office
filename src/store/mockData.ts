import { v4 as uuid } from 'uuid'

// ==================== Mock 数据生成器 ====================

const now = new Date()
const day = (d: number) => new Date(now.getTime() + d * 86400000).toISOString()
const hour = (h: number) => new Date(now.getTime() + h * 3600000).toISOString()

// ==================== 用户相关 ====================
export const mockUser = {
  id: 'user-001',
  email: 'demo@onemanarmy.com',
  full_name: '张三',
  username: 'zhangsan',
  avatar_url: null,
  role: 'admin' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: now.toISOString(),
}

export const mockNotifications = [
  { id: uuid(), title: '新客户留言', content: '李四给您发送了消息', type: 'message' as const, read: false, created_at: hour(-1) },
  { id: uuid(), title: '任务即将到期', content: '"完成项目方案设计" 将于明天到期', type: 'task' as const, read: false, created_at: hour(-3) },
  { id: uuid(), title: '视频会议提醒', content: '下午 3:00 有一个团队周会', type: 'meeting' as const, read: true, created_at: hour(-5) },
  { id: uuid(), title: '文档被修改', content: '王五修改了 "产品需求文档 v2"', type: 'document' as const, read: true, created_at: day(-1) },
  { id: uuid(), title: '新客户注册', content: '新客户 "深圳科技有限公司" 已入库', type: 'crm' as const, read: true, created_at: day(-2) },
]

// ==================== 项目 ====================
export const mockProjects = [
  { id: 'proj-001', name: '官网改版', description: '公司官网全面改版升级', owner_id: 'user-001', status: 'active' as const, created_at: day(-30), updated_at: day(-1) },
  { id: 'proj-002', name: '小程序开发', description: '微信小程序商城开发', owner_id: 'user-001', status: 'active' as const, created_at: day(-20), updated_at: day(-2) },
  { id: 'proj-003', name: '数据分析平台', description: '内部数据分析系统', owner_id: 'user-001', status: 'completed' as const, created_at: day(-60), updated_at: day(-5) },
  { id: 'proj-004', name: 'CRM 系统优化', description: '客户管理系统功能增强', owner_id: 'user-001', status: 'active' as const, created_at: day(-10), updated_at: day(-1) },
  { id: 'proj-005', name: '营销活动策划', description: '618 大促活动方案', owner_id: 'user-001', status: 'archived' as const, created_at: day(-90), updated_at: day(-30) },
]

// ==================== 任务 ====================
export const mockTasks = [
  { id: 'task-001', title: '完成首页设计稿', description: '设计官网首页 UI 稿', status: 'completed' as const, priority: 'high' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-001', due_date: day(2), completed_at: day(-1), created_at: day(-15), updated_at: day(-1) },
  { id: 'task-002', title: '开发登录注册模块', description: '实现用户认证流程', status: 'in_progress' as const, priority: 'high' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-002', due_date: day(3), completed_at: null, created_at: day(-10), updated_at: hour(-2) },
  { id: 'task-003', title: '编写 API 文档', description: '后端接口文档整理', status: 'todo' as const, priority: 'medium' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-002', due_date: day(5), completed_at: null, created_at: day(-5), updated_at: day(-5) },
  { id: 'task-004', title: '数据库性能优化', description: '优化慢查询', status: 'in_progress' as const, priority: 'urgent' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-004', due_date: day(1), completed_at: null, created_at: day(-3), updated_at: hour(-5) },
  { id: 'task-005', title: '客户回访 - 华为', description: '跟进华为项目合作', status: 'todo' as const, priority: 'high' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: null, due_date: day(1), completed_at: null, created_at: day(-2), updated_at: day(-2) },
  { id: 'task-006', title: '产品需求文档评审', description: 'PRD v2 评审', status: 'review' as const, priority: 'medium' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-001', due_date: day(4), completed_at: null, created_at: day(-7), updated_at: day(-1) },
  { id: 'task-007', title: '部署测试环境', description: '配置 CI/CD 流水线', status: 'completed' as const, priority: 'medium' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-003', due_date: day(-10), completed_at: day(-12), created_at: day(-20), updated_at: day(-12) },
  { id: 'task-008', title: '竞品分析报告', description: '分析市场主要竞品', status: 'todo' as const, priority: 'low' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-001', due_date: day(7), completed_at: null, created_at: day(-1), updated_at: day(-1) },
  { id: 'task-009', title: 'UI 组件库搭建', description: '统一设计系统组件', status: 'in_progress' as const, priority: 'high' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-001', due_date: day(6), completed_at: null, created_at: day(-8), updated_at: hour(-1) },
  { id: 'task-010', title: '支付功能对接', description: '微信支付 + 支付宝', status: 'todo' as const, priority: 'high' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-002', due_date: day(10), completed_at: null, created_at: day(-1), updated_at: day(-1) },
  { id: 'task-011', title: '用户反馈整理', description: '整理近一个月用户反馈', status: 'review' as const, priority: 'medium' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: 'proj-003', due_date: day(3), completed_at: null, created_at: day(-4), updated_at: day(-1) },
  { id: 'task-012', title: '周报撰写', description: '本周工作总结', status: 'completed' as const, priority: 'low' as const, assignee_id: 'user-001', creator_id: 'user-001', project_id: null, due_date: day(-1), completed_at: day(-1), created_at: day(-3), updated_at: day(-1) },
]

// ==================== 文档 ====================
export const mockDocuments = [
  { id: 'doc-001', title: '产品需求文档 v2.0', content: '# 产品需求文档\n\n## 1. 项目概述\n\n本文档描述了"一人成军办公平台"的产品需求规格...', type: 'markdown' as const, metadata: {}, project_id: 'proj-001', task_id: null, creator_id: 'user-001', is_public: false, created_at: day(-10), updated_at: day(-1) },
  { id: 'doc-002', title: '技术架构设计', content: '# 技术架构\n\n## 前端\n- React 18 + TypeScript\n- Vite 构建工具\n- Tailwind CSS\n\n## 后端\n- Supabase BaaS\n- PostgreSQL', type: 'markdown' as const, metadata: {}, project_id: 'proj-001', task_id: null, creator_id: 'user-001', is_public: true, created_at: day(-15), updated_at: day(-3) },
  { id: 'doc-003', title: '会议纪要 - 周会', content: '# 周会纪要\n\n**日期**: 2026-05-20\n\n## 议题\n1. 项目进度同步\n2. 问题讨论\n3. 下周计划', type: 'markdown' as const, metadata: {}, project_id: null, task_id: null, creator_id: 'user-001', is_public: false, created_at: day(-5), updated_at: day(-5) },
  { id: 'doc-004', title: 'API 接口规范', content: '# API 规范\n\n## 认证\n- JWT Token\n- 刷新机制\n\n## 接口列表\n- POST /api/auth/login\n- POST /api/auth/register', type: 'markdown' as const, metadata: {}, project_id: 'proj-002', task_id: null, creator_id: 'user-001', is_public: false, created_at: day(-8), updated_at: day(-2) },
  { id: 'doc-005', title: '项目排期表', content: '# 排期\n\n| 阶段 | 时间 | 内容 |\n|------|------|------|\n| 需求 | Week 1 | PRD |\n| 设计 | Week 2 | UI |', type: 'markdown' as const, metadata: {}, project_id: 'proj-002', task_id: null, creator_id: 'user-001', is_public: false, created_at: day(-12), updated_at: day(-4) },
  { id: 'doc-006', title: '客户方案 - 华为', content: '# 解决方案\n\n## 客户需求\n华为需要一套内部协作系统...', type: 'markdown' as const, metadata: {}, project_id: null, task_id: 'task-005', creator_id: 'user-001', is_public: false, created_at: day(-3), updated_at: day(-1) },
]

// ==================== 消息/频道 ====================
export const mockChannels = [
  { id: 'ch-001', name: '综合讨论', description: '日常交流', is_private: false },
  { id: 'ch-002', name: '技术分享', description: '技术讨论', is_private: false },
  { id: 'ch-003', name: '项目进展', description: '项目同步', is_private: false },
  { id: 'ch-004', name: '私聊-李四', description: '', is_private: true },
]

export const mockMessages: Record<string, Array<{id: string; content: string; sender_id: string; sender_name: string; message_type: string; created_at: string; reply_to: string | null}>> = {
  'ch-001': [
    { id: uuid(), content: '大家好，今天网站改版有什么进展吗？', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: hour(-4), reply_to: null },
    { id: uuid(), content: '首页设计稿已经完成了，正在做内页', sender_id: 'user-002', sender_name: '李四', message_type: 'text', created_at: hour(-3), reply_to: null },
    { id: uuid(), content: '不错！记得用新的设计规范', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: hour(-2), reply_to: null },
    { id: uuid(), content: 'API 文档我已经更新了，大家可以看看', sender_id: 'user-003', sender_name: '王五', message_type: 'text', created_at: hour(-1), reply_to: null },
    { id: uuid(), content: '收到，我下午看一下', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: hour(-1), reply_to: null },
  ],
  'ch-002': [
    { id: uuid(), content: '有人用过 Bun 吗？感觉比 Node 快很多', sender_id: 'user-003', sender_name: '王五', message_type: 'text', created_at: day(-1), reply_to: null },
    { id: uuid(), content: '试了一下，确实不错，但生态还差一点', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: day(-1), reply_to: null },
  ],
  'ch-003': [
    { id: uuid(), content: '官网改版进度：设计稿完成 80%，前端开发 30%', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: hour(-6), reply_to: null },
    { id: uuid(), content: '小程序开发：登录模块开发中', sender_id: 'user-002', sender_name: '李四', message_type: 'text', created_at: hour(-5), reply_to: null },
  ],
  'ch-004': [
    { id: uuid(), content: '方案发你邮箱了，看一下', sender_id: 'user-002', sender_name: '李四', message_type: 'text', created_at: hour(-8), reply_to: null },
    { id: uuid(), content: '好的，我下午看', sender_id: 'user-001', sender_name: '张三', message_type: 'text', created_at: hour(-7), reply_to: null },
  ],
}

// ==================== 团队成员 ====================
export const mockTeamMembers = [
  { id: 'user-001', username: 'zhangsan', full_name: '张三', email: 'zhangsan@demo.com', role: 'admin' as const, avatar_url: null, status: 'online' as const, last_seen: now.toISOString() },
  { id: 'user-002', username: 'lisi', full_name: '李四', email: 'lisi@demo.com', role: 'member' as const, avatar_url: null, status: 'online' as const, last_seen: hour(-1) },
  { id: 'user-003', username: 'wangwu', full_name: '王五', email: 'wangwu@demo.com', role: 'member' as const, avatar_url: null, status: 'offline' as const, last_seen: day(-1) },
  { id: 'user-004', username: 'zhaoliu', full_name: '赵六', email: 'zhaoliu@demo.com', role: 'member' as const, avatar_url: null, status: 'offline' as const, last_seen: day(-3) },
  { id: 'user-005', username: 'sunqi', full_name: '孙七', email: 'sunqi@demo.com', role: 'manager' as const, avatar_url: null, status: 'online' as const, last_seen: hour(-2) },
]

export const mockInvitations = [
  { id: uuid(), email: 'newuser@example.com', role: 'member' as const, status: 'pending' as const, created_at: day(-1), invited_by: 'user-001' },
]

// ==================== CRM 客户 ====================
export const mockCustomers = [
  { id: 'cust-001', name: '华为技术有限公司', email: 'contact@huawei.com', phone: '0755-28780000', company: '华为技术有限公司', status: 'active' as const, assigned_to: 'user-001', notes: '年度合作客户，重点项目对接中', tags: ['重点客户', '科技'], source: '展会', value: 500000, created_at: day(-60), updated_at: day(-1) },
  { id: 'cust-002', name: '腾讯科技', email: 'biz@tencent.com', phone: '0755-86013388', company: '腾讯科技', status: 'active' as const, assigned_to: 'user-001', notes: '云服务需求沟通中', tags: ['科技', '互联网'], source: '转介绍', value: 300000, created_at: day(-45), updated_at: day(-3) },
  { id: 'cust-003', name: '阿里巴巴', email: 'sales@alibaba.com', phone: '0571-85022088', company: '阿里巴巴集团', status: 'potential' as const, assigned_to: 'user-001', notes: '初步接触，了解需求中', tags: ['互联网', '电商'], source: '官网', value: 800000, created_at: day(-20), updated_at: day(-5) },
  { id: 'cust-004', name: '字节跳动', email: 'partner@bytedance.com', phone: '010-58890000', company: '字节跳动', status: 'potential' as const, assigned_to: 'user-001', notes: '对协作工具有兴趣', tags: ['互联网', '科技'], source: '线上咨询', value: 200000, created_at: day(-15), updated_at: day(-7) },
  { id: 'cust-005', name: '小米科技', email: 'biz@xiaomi.com', phone: '010-59820000', company: '小米科技有限公司', status: 'inactive' as const, assigned_to: 'user-001', notes: '项目已交付，保持联系', tags: ['科技', '硬件'], source: '老客户', value: 150000, created_at: day(-90), updated_at: day(-30) },
  { id: 'cust-006', name: '美团', email: 'open@meituan.com', phone: '010-57376000', company: '美团', status: 'active' as const, assigned_to: 'user-001', notes: '正在洽谈二期合作', tags: ['互联网', '本地生活'], source: '竞标', value: 400000, created_at: day(-30), updated_at: day(-2) },
  { id: 'cust-007', name: '京东集团', email: 'partner@jd.com', phone: '010-89198000', company: '京东集团', status: 'potential' as const, assigned_to: 'user-001', notes: '供应链系统需求', tags: ['电商', '物流'], source: '展会', value: 600000, created_at: day(-10), updated_at: day(-4) },
  { id: 'cust-008', name: '深圳创新科技', email: 'info@szcx.com', phone: '0755-12345678', company: '深圳创新科技有限公司', status: 'active' as const, assigned_to: 'user-001', notes: '小企业客户，维护小程序', tags: ['中小企业'], source: '线上咨询', value: 50000, created_at: day(-40), updated_at: day(-6) },
]

export const mockSalesOpportunities = [
  { id: uuid(), customer_id: 'cust-001', title: '华为内部协作系统', stage: 'negotiation' as const, amount: 500000, probability: 70, expected_close: day(30), notes: '技术方案已提交，等待商务报价', created_at: day(-30), updated_at: day(-1) },
  { id: uuid(), customer_id: 'cust-006', title: '美团外卖商家管理系统二期', stage: 'proposal' as const, amount: 400000, probability: 40, expected_close: day(60), notes: '需求调研中', created_at: day(-15), updated_at: day(-2) },
  { id: uuid(), customer_id: 'cust-003', title: '阿里巴巴数据中台', stage: 'initial' as const, amount: 800000, probability: 15, expected_close: day(90), notes: '初步接触', created_at: day(-10), updated_at: day(-5) },
  { id: uuid(), customer_id: 'cust-002', title: '腾讯云迁移服务', stage: 'won' as const, amount: 300000, probability: 100, expected_close: day(-5), notes: '合同已签', created_at: day(-45), updated_at: day(-5) },
  { id: uuid(), customer_id: 'cust-007', title: '京东供应链管理平台', stage: 'qualified' as const, amount: 600000, probability: 30, expected_close: day(45), notes: '已安排演示', created_at: day(-7), updated_at: day(-3) },
]

// ==================== AI 对话 ====================
export const mockAIConversations = [
  { id: 'ai-conv-001', user_id: 'user-001', feature_type: 'text_generation' as const, title: '营销文案生成', created_at: day(-5), updated_at: day(-1) },
  { id: 'ai-conv-002', user_id: 'user-001', feature_type: 'translation' as const, title: '英文合同翻译', created_at: day(-3), updated_at: day(-2) },
  { id: 'ai-conv-003', user_id: 'user-001', feature_type: 'writing_assistant' as const, title: '周报自动生成', created_at: day(-1), updated_at: day(-1) },
]

export const mockAIMessages: Record<string, Array<{id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at: string}>> = {
  'ai-conv-001': [
    { id: uuid(), role: 'user', content: '帮我写一段618大促的营销文案，面向年轻用户群体', created_at: day(-1) },
    { id: uuid(), role: 'assistant', content: '🔥 618狂欢倒计时！\n\n年轻人，你的购物清单准备好了吗？\n\n🌟 全场低至3折\n🎁 爆款限时秒杀\n💰 满减叠加优惠券\n\n🔥 从6月1日到6月18日，连续18天惊喜不断！\n\n#618大促 #年轻人购物节 #限时优惠', created_at: day(-1) },
  ],
  'ai-conv-002': [
    { id: uuid(), role: 'user', content: '请翻译以下合同条款：The Parties agree that all disputes arising from this Agreement shall be resolved through friendly negotiation.', created_at: day(-2) },
    { id: uuid(), role: 'assistant', content: '双方同意，因本协议引起的一切争议应通过友好协商解决。', created_at: day(-2) },
  ],
  'ai-conv-003': [
    { id: uuid(), role: 'user', content: '帮我根据以下内容生成周报：完成了官网首页设计稿、进行了3次客户回访、推进了小程序登录模块开发', created_at: day(-1) },
    { id: uuid(), role: 'assistant', content: '# 本周工作周报\n\n## 一、本周完成事项\n\n### 1. 官网改版项目\n- ✅ 完成官网首页设计稿，已提交评审\n- 📐 遵循新版设计规范，统一视觉风格\n\n### 2. 客户关系维护\n- 📞 完成 3 次客户回访（华为、腾讯、深圳创新）\n- 📝 更新客户跟进记录\n\n### 3. 小程序开发\n- 🚀 推进登录注册模块开发，完成 60%\n- 🔐 集成微信授权登录\n\n## 二、下周计划\n- 完成内页设计稿\n- 登录模块联调测试\n- 华为方案报价\n\n## 三、需要协调的事项\n- 设计评审需产品经理参与（预计周三）', created_at: day(-1) },
  ],
}

// ==================== 社交媒体 ====================
export const mockSocialAccounts = [
  { id: 'sm-001', platform: '微信公众号', account_name: '一人成军工作室', account_id: 'gh_abc123', follower_count: 12580, post_count: 156, status: 'active' as const, check_status: 'healthy' as const, auto_sync: true, creator_id: 'user-001', created_at: day(-90), updated_at: day(-1) },
  { id: 'sm-002', platform: '抖音', account_name: '科技小达人', account_id: 'dy_456', follower_count: 89200, post_count: 342, status: 'active' as const, check_status: 'healthy' as const, auto_sync: true, creator_id: 'user-001', created_at: day(-120), updated_at: day(-1) },
  { id: 'sm-003', platform: '微博', account_name: '一人成军official', account_id: 'wb_789', follower_count: 5600, post_count: 89, status: 'active' as const, check_status: 'healthy' as const, auto_sync: false, creator_id: 'user-001', created_at: day(-60), updated_at: day(-2) },
  { id: 'sm-004', platform: '小红书', account_name: '效率工具集', account_id: 'xhs_101', follower_count: 23400, post_count: 78, status: 'active' as const, check_status: 'warning' as const, auto_sync: true, creator_id: 'user-001', created_at: day(-45), updated_at: day(-3) },
  { id: 'sm-005', platform: 'B站', account_name: '一人成军频道', account_id: 'bili_202', follower_count: 15600, post_count: 45, status: 'inactive' as const, check_status: 'error' as const, auto_sync: false, creator_id: 'user-001', created_at: day(-30), updated_at: day(-7) },
]

export const mockSocialPosts = [
  { id: uuid(), account_id: 'sm-001', title: '一人成军：小团队也能做出大产品', content: '在这个时代，一个人或小团队也能创造出改变世界的产品...', platform: '微信公众号', status: 'published' as const, likes: 234, comments: 56, shares: 89, views: 15800, published_at: day(-2), created_at: day(-3) },
  { id: uuid(), account_id: 'sm-002', title: '3分钟学会高效办公', content: '分享几个我自己用的高效办公技巧...', platform: '抖音', status: 'published' as const, likes: 12500, comments: 890, shares: 2300, views: 356000, published_at: day(-1), created_at: day(-2) },
  { id: uuid(), account_id: 'sm-003', title: '新产品发布预告', content: '我们即将推出一款全新的协作工具...', platform: '微博', status: 'draft' as const, likes: 0, comments: 0, shares: 0, views: 0, published_at: null, created_at: day(-1) },
  { id: uuid(), account_id: 'sm-004', title: '效率工具测评合集', content: '今天给大家测评5款效率工具...', platform: '小红书', status: 'scheduled' as const, likes: 0, comments: 0, shares: 0, views: 0, published_at: day(1), created_at: day(-1) },
  { id: uuid(), account_id: 'sm-002', title: '程序员的一天 Vlog', content: '记录真实的工作日常...', platform: '抖音', status: 'published' as const, likes: 8900, comments: 456, shares: 1200, views: 189000, published_at: day(-7), created_at: day(-8) },
  { id: uuid(), account_id: 'sm-001', title: '如何管理远程团队', content: '远程工作已成为趋势...', platform: '微信公众号', status: 'published' as const, likes: 178, comments: 34, shares: 67, views: 9200, published_at: day(-5), created_at: day(-6) },
]

export const mockTrendingTopics = [
  { id: uuid(), title: 'AI 大模型最新进展', platform: '全网', heat: 98500, trend: 'up' as const },
  { id: uuid(), title: '远程办公效率提升技巧', platform: '知乎', heat: 76500, trend: 'up' as const },
  { id: uuid(), title: '小团队创业成功案例', platform: '微信公众号', heat: 54300, trend: 'stable' as const },
  { id: uuid(), title: '2026年科技趋势预测', platform: '微博', heat: 89200, trend: 'up' as const },
  { id: uuid(), title: 'SaaS 产品增长策略', platform: '小红书', heat: 32100, trend: 'down' as const },
  { id: uuid(), title: '低代码平台对比测评', platform: 'B站', heat: 45600, trend: 'up' as const },
  { id: uuid(), title: '产品设计灵感合集', platform: '抖音', heat: 67800, trend: 'stable' as const },
  { id: uuid(), title: '创业融资经验分享', platform: '知乎', heat: 23400, trend: 'up' as const },
]

// ==================== 视频会议 ====================
export const mockConferences = [
  { id: 'vc-001', meeting_id: 'meet-001', title: '团队周会', description: '每周项目进度同步', host_id: 'user-001', scheduled_at: hour(2), started_at: null, ended_at: null, duration: null, status: 'scheduled' as const, max_participants: 10, participants: ['user-001', 'user-002', 'user-003'], recording_enabled: true, recording_url: null, settings: {}, created_at: day(-1), updated_at: day(-1) },
  { id: 'vc-002', meeting_id: 'meet-002', title: '客户需求评审 - 华为', description: '华为项目需求细节讨论', host_id: 'user-001', scheduled_at: hour(5), started_at: null, ended_at: null, duration: null, status: 'scheduled' as const, max_participants: 5, participants: ['user-001', 'user-005'], recording_enabled: true, recording_url: null, settings: {}, created_at: day(-2), updated_at: day(-1) },
  { id: 'vc-003', meeting_id: 'meet-003', title: '技术方案讨论', description: '数据库选型和架构设计', host_id: 'user-003', scheduled_at: day(-1), started_at: day(-1), ended_at: day(-1), duration: 45, status: 'ended' as const, max_participants: 8, participants: ['user-001', 'user-002', 'user-003'], recording_enabled: true, recording_url: 'https://storage.example.com/recordings/meet-003.mp4', settings: {}, created_at: day(-3), updated_at: day(-1) },
  { id: 'vc-004', meeting_id: 'meet-004', title: '产品演示 - 腾讯', description: '产品功能演示和答疑', host_id: 'user-001', scheduled_at: day(-3), started_at: day(-3), ended_at: day(-3), duration: 60, status: 'ended' as const, max_participants: 15, participants: ['user-001', 'user-002', 'user-005'], recording_enabled: true, recording_url: 'https://storage.example.com/recordings/meet-004.mp4', settings: {}, created_at: day(-5), updated_at: day(-3) },
  { id: 'vc-005', meeting_id: 'meet-005', title: '1v1 - 李四', description: '个人绩效沟通', host_id: 'user-001', scheduled_at: day(2), started_at: null, ended_at: null, duration: null, status: 'scheduled' as const, max_participants: 2, participants: ['user-001', 'user-002'], recording_enabled: false, recording_url: null, settings: {}, created_at: day(-1), updated_at: day(-1) },
]
