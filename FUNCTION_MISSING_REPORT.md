# 功能缺失报告

**日期：** 2026-07-03
**项目：** one-man-army-office
**检查范围：** 全部10个核心页面

---

## 📋 页面总览

| 页面 | 文件 | 功能完整度 |
|------|------|-----------|
| Dashboard | Dashboard.tsx | ⭐⭐⭐⭐ (80%) |
| Projects/任务 | ProjectManagement.tsx | ⭐⭐⭐ (70%) |
| Collaboration | Collaboration.tsx | ⭐⭐⭐⭐ (80%) |
| CRM | CRM.tsx | ⭐⭐⭐ (65%) |
| AI Assistant | AIAssistant.tsx | ⭐⭐⭐⭐ (75%) |
| Social Media | SocialMedia.tsx | ⭐⭐⭐ (70%) |
| Video Conference | VideoConference.tsx | ⭐⭐⭐ (70%) |
| Documents | ProjectManagement.tsx (文档Tab) | ⭐⭐⭐ (65%) |
| Settings | Settings.tsx | ⭐⭐⭐⭐ (85%) |
| Workspace | WorkspaceHub.tsx | ⭐⭐⭐⭐ (75%) |
| Admin | AdminPage.tsx | ⭐⭐⭐ (70%) |

---

## 详细功能缺失清单

### 🔴 P0 — 必须实现（核心功能断裂）

#### 1. CRM：销售漏斗拖拽交互（CRM.tsx）
- **现状：** 销售漏斗（5阶段 Kanban）显示正确，但无法拖拽客户卡片在阶段间移动
- **影响：** CRM 核心工作流完全不可用
- **优先级：** P0
- **实现难度：** 中等（需接入 @dnd-kit，参考 ProjectManagement.tsx 的任务看板已有完整实现）
- **修复方案：** 参考 `ProjectManagement.tsx` 的 `KanbanBoard` 组件中的 `handleDragEnd`，将 `SalesOpportunity` 的 `sales_stage` 字段更新到数据库

#### 2. Collaboration：实时消息订阅（Collaboration.tsx）
- **现状：** 消息发送后需手动刷新页面才能看到新消息
- **影响：** 团队协作体验极差
- **优先级：** P0
- **实现难度：** 低（Supabase 已有 realtime 支持）
- **修复方案：** 在 `useEffect` 中添加 `supabase.channel('messages').on('postgres_changes', ...)` 订阅频道消息更新，类似 `useStore` 中已有 `fetchMessages` 的调用

#### 3. SocialMedia：真实 OAuth 集成（SocialMedia.tsx）
- **现状：** 账号绑定只存储本地数据，无真实 OAuth 授权流程
- **影响：** 无法真正管理社交媒体账号
- **优先级：** P0（分平台实现，先做微博/知乎）
- **实现难度：** 高（各平台 OAuth 流程不同，需要后端）
- **临时方案：** 使用 Supabase Edge Function 作为 OAuth 代理跳板，存储 refresh_token

---

### 🟠 P1 — 重要功能（影响核心体验）

#### 4. ProjectManagement：任务看板拖拽（ProjectManagement.tsx）
- **现状：** 任务看板 UI 完整，但拖拽任务后不会更新数据库
- **影响：** 用户无法通过拖拽调整任务状态
- **优先级：** P1
- **实现难度：** 低（已参考已有 drag-drop 代码）
- **修复方案：** 在 `KanbanBoard` 中添加 `handleDragEnd`，调用 `updateTask(id, { status: newStatus })`

#### 5. VideoConference：会议录制功能（VideoConference.tsx）
- **现状：** 可以创建和加入会议，但无法录制
- **影响：** 会议内容无法留存
- **优先级：** P1
- **实现难度：** 中（LiveKit 支持服务端录制，或前端通过 Track 数据流录制）
- **修复方案：** 添加 `useTracks` 录制逻辑，或调用 LiveKit Cloud 的服务端录制 API

#### 6. AIAssistant：对话导出（AIAssistant.tsx）
- **现状：** 对话只保存在数据库，无法导出
- **影响：** 用户无法备份重要对话
- **优先级：** P1
- **实现难度：** 低
- **修复方案：** 添加"导出"按钮，将对话内容导出为 Markdown 或 PDF

#### 7. SocialMedia：定时发布执行（SocialMedia.tsx）
- **现状：** 可以设置定时发布时间，但系统不会自动执行
- **影响：** 定时发布形同虚设
- **优先级：** P1
- **实现难度：** 高（需要 Supabase Cron + Edge Function）
- **修复方案：** 使用 Supabase pg_cron 创建定时任务，调用 Edge Function 执行发布

#### 8. Documents：文档协作编辑（ProjectManagement.tsx）
- **现状：** 文档只支持创建者编辑，无协作功能
- **影响：** 团队无法同时编辑文档
- **优先级：** P1
- **实现难度：** 高（需要 WebSocket 实时协作，如 Yjs）
- **修复方案：** 引入 Yjs + y-webrtc 或直接使用腾讯文档 API

---

### 🟡 P2 — 优化功能（提升体验）

#### 9. Dashboard：数据导出（Dashboard.tsx）
- **现状：** 无导出功能
- **优先级：** P2
- **实现难度：** 低

#### 10. CRM：销售数据分析（CRM.tsx）
- **现状：** 无数据分析视图
- **优先级：** P2
- **实现难度：** 中

#### 11. VideoConference：会议日历视图（VideoConference.tsx）
- **现状：** 仅有列表视图
- **优先级：** P2
- **实现难度：** 低

#### 12. Collaboration：@提及通知推送（Collaboration.tsx）
- **现状：** @提及后对方无实时通知
- **优先级：** P2
- **实现难度：** 中（需 Supabase Realtime + 浏览器通知）

#### 13. Settings：语言切换（Settings.tsx）
- **现状：** 只有中文
- **优先级：** P2
- **实现难度：** 低（引入 i18n）

#### 14. AIAssistant：图片/文件上传（AIAssistant.tsx）
- **现状：** 只能发送文字
- **优先级：** P2
- **实现难度：** 中（需要 multimodal API 支持）

#### 15. SocialMedia：多平台一键发布（SocialMedia.tsx）
- **现状：** 需逐个平台发布
- **优先级：** P2
- **实现难度：** 高（需各平台 API）

#### 16. Workspace：订阅/计费管理（WorkspaceHub.tsx）
- **现状：** 显示占位 UI，无真实计费逻辑
- **优先级：** P2
- **实现难度：** 高（需 Stripe 集成）

---

## 已验证正常功能

| 页面 | 已完成功能 |
|------|-----------|
| Dashboard | 任务列表、筛选、统计图表、项目概览、快速导航 |
| AIAssistant | 多模型切换、流式响应、对话管理、Markdown 渲染 |
| Settings | 个人资料、密码修改、主题切换、通知设置、AI/LiveKit 配置 |
| Collaboration | 频道管理、消息发送、文件上传、文档预览、审批流 |
| ProjectManagement | 项目CRUD、任务看板/列表/卡片视图、文档模板 |
| SocialMedia | 账号管理、内容创建、平台模板、热点素材、数据统计 |
| VideoConference | 会议CRUD、LiveKit 视频通话、屏幕共享 |
| CRM | 客户CRUD、销售漏斗、跟进记录 |
| Admin | 系统概览、用户管理、审计日志 |

---

## ⚠️ 更新说明（2026-07-03）

经过实际代码审查，以下功能已实现：
- ✅ P0-1: CRM 销售漏斗拖拽（`handleOppDragEnd` 已调用 `updateOpportunity`）
- ✅ P1-4: 任务看板拖拽（`handleDragEnd` 已调用 `updateTask`）
- ✅ P1-6: AI 对话导出（`handleExportConversation` 已实现 Markdown 导出）
- ✅ Collaboration 实时消息（store 中 `subscribeToMessages` 已实现 Supabase Realtime）

## 建议执行顺序

1. **P0-1：** CRM 销售漏斗拖拽（最快修复，立竿见影）
2. **P0-2：** Collaboration 实时消息订阅（显著提升体验）
3. **P0-3：** SocialMedia OAuth 集成（最难，放最后）
4. **P1-4：** 任务看板拖拽（参考已有代码快速实现）
5. **P1-6：** AI 对话导出（快速完成）
6. **P1-5：** 会议录制（中等难度）
