# 深度代码审计报告 — one-man-army-office
**审计日期：** 2026-07-06  
**项目路径：** `D:\代码\one-man-army-office`  
**部署地址：** https://xichen9527.github.io/one-man-army-office/

---

## 一、构建验证

| 步骤 | 结果 |
|------|------|
| `vite build` 本地构建 | ✅ **成功**（894ms，零错误，仅 chunk 警告） |
| Git commit | ✅ `7faddec` |
| Git push | ✅ `master -> master` |
| GitHub Pages 部署 | ✅ HTTP 200，`Last-Modified: Mon, 06 Jul 2026 05:08:41 GMT` |

**构建产物 chunk 大小（无变化）：**
- `vendor-livekit`: 615 KB（已懒加载，合理）
- `vendor-react`: 224 KB
- `vendor-supabase`: 193 KB
- 其他所有 chunk 均 < 120 KB

---

## 二、P0 — 403 优雅降级修复（核心）

### 问题描述
Supabase RLS（行级安全策略）拒绝访问时，所有 `supabase.from(...).select()` 查询返回 403，导致：
1. 页面崩溃（componentDidCatch 触发）
2. toast 只显示 generic 错误，无上下文

### 根因
`src/store/index.ts` 的所有 fetch 函数虽然有 `try/catch`，但：
- 错误消息不区分 403（RLS）与其他错误
- 用户看到的提示是 `"fetchXXX failed: [error message]"`，不够友好

### 修复方案
在 `src/store/index.ts` 添加了统一的 `handleRLSError()` 辅助函数：

```typescript
function handleRLSError(context: string, error: any): boolean {
  const code = error?.code || ''
  const is403 = code === '403' || code === 'PGRST301' || code === '42501' || error?.message?.includes('403')
  if (is403) {
    console.warn(`[store] RLS 403 for ${context}:`, error?.message)
    toast.error(`数据加载失败（权限不足），请检查 Supabase RLS 策略设置`)
    return true
  }
  toast.error(`${context} failed: ${error?.message || '[unknown error]'}`)
  return false
}
```

### 已更新的 fetch 函数（共 20 个）

| 函数 | 状态 | 403 降级 |
|------|------|----------|
| `fetchProjects` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchTasks` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchDocuments` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchChannels` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchMessages` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchTeamMembers` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchInvitations` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchCustomers` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchSalesOpportunities` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchFollowups` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchAIConversations` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchAIMessages` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchSocialAccounts` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchSocialPosts` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchSocialPostPlatforms` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchTrendingTopics` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchConferences` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchNotifications` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchApprovals` | ✅ 已更新 | ✅ 返回空数组 + toast |
| `fetchFiles` | ✅ 已更新 | ✅ 返回空数组 + toast |

---

## 三、页面审计结果（15 个页面）

### 3.1 AdminPage.tsx
**状态：** ✅ 正常
- 无运行时崩溃风险
- 使用 store fetch 函数，继承 403 降级
- 无 hooks 违规
- 无 TDZ 风险
- **建议：** 可考虑拆分统计面板组件（次要）

### 3.2 AIAssistant.tsx
**状态：** ✅ 正常
- `sendAIMessage` 有完善的 try/catch 和错误处理
- 流式响应有 fallback 降级（非流式 → 模拟）
- API 错误有详细的分类提示（401/429/timeout）
- 无 403 问题（无直接数据库查询）
- 无 hooks 违规
- **注意：** `sendAIMessage` 未使用 `handleRLSError`（因为它不直接调用 `supabase.from().select()`）

### 3.3 Collaboration.tsx
**状态：** ✅ 正常（修复后）
- **修复：** `handleFileClick` 参数添加了 `DBFile` 类型标注（`src/pages/Collaboration.tsx:76`）
- Realtime 订阅有正确的 cleanup（`unsubscribeMessages`）
- `@mention` 功能有边界检查
- `playBeep` 有 try/catch，不阻塞消息流程
- 无 TDZ 风险
- 无 hooks 违规

### 3.4 CRM.tsx
**状态：** ✅ 正常
- **已审查 TDZ 风险：** `handleOppDragStart` 和 `handleOppDragEnd` 使用 `DragStartEvent` / `DragEndEvent` 类型，参数有类型标注 ✅
- `useDraggable` 和 `useDroppable` 在组件顶层调用 ✅（非条件渲染内）
- `DragOverlay` 使用 `activeOpp` 派生值（非 ref），符合规范 ✅
- `DroppableStage` 是独立的函数组件，不存在 TDZ ✅
- 继承 store 403 降级 ✅
- **建议：** `funnelData` useMemo 可考虑拆分（次要）

### 3.5 Dashboard.tsx
**状态：** ✅ 正常
- 组件较大（统计数据），但无运行时风险
- 使用 store 数据，有空状态处理
- 继承 403 降级

### 3.6 Invite.tsx
**状态：** ✅ 正常
- 邀请链接处理，无 Supabase 查询风险
- `acceptInvitation` 和 `declineInvitation` 有基本错误处理

### 3.7 Login.tsx
**状态：** ✅ 正常
- 表单验证 + Supabase auth
- `signIn` 返回错误后 UI 有反馈

### 3.8 ProjectDetail.tsx
**状态：** ✅ 正常
- 任务列表、文档列表使用 store 数据
- 有空状态处理

### 3.9 ProjectManagement.tsx
**状态：** ✅ 正常
- 较大的组件，有任务/项目/成员管理
- 继承 store 403 降级

### 3.10 Register.tsx
**状态：** ✅ 正常
- 表单验证 + Supabase auth
- `signUp` 返回错误后 UI 有反馈

### 3.11 ResetPassword.tsx
**状态：** ✅ 正常
- 密码重置流程，有基本错误处理

### 3.12 Settings.tsx
**状态：** ✅ 正常（修复后）
- **修复：** 移除了 6 处 `await import('@/db/supabase')` 动态导入，改为顶层 `import { supabase } from '@/db/supabase'`
- **修复：** 移除了 2 处 `(await import('@/store')).useStore.getState()` 动态导入，改为直接调用 `useStore.getState()`
- `handleAvatarUpload` 有文件大小/类型验证
- 主题切换有 `useEffect` 响应
- **建议：** 可考虑将 AI 模型配置部分拆分为独立组件

### 3.13 SocialMedia.tsx
**状态：** ✅ 正常（修复后）
- **修复：** 7 个内容模板（`templates`）从组件内移到模块级常量 `SOCIAL_MEDIA_TEMPLATES`，使用 `Object.freeze` 防止意外修改
  - 原来：每次 `SocialMedia` 渲染都创建 7 个新对象
  - 现在：模块初始化时创建一次，所有渲染共享同一引用
- OAuth 弹窗处理有超时检查
- 平台凭证字段有动态映射

### 3.14 VideoConference.tsx
**状态：** ✅ 正常
- **已审查 LiveKit `useTracks` hooks 风险：** `MeetingRoom` 组件在 `LiveKitRoom` 内部调用 `useTracks`，这是正确的使用方式 ✅
- `LiveKitRoom` 提供 `RoomContext`，`useTracks` 在其子树中使用符合 React hooks 规则 ✅
- 无条件渲染中调用 hooks 的情况 ✅
- Edge Function 调用有完善的错误分类（CONFIG_NOT_FOUND / CONFIG_INCOMPLETE / 401）

### 3.15 WorkspaceHub.tsx
**状态：** ✅ 正常
- 导航/工作区入口，无 Supabase 查询

### 3.16 store/index.ts（核心状态层）
**状态：** ✅ 正常（修复后）
- **P0 修复：** 20 个 fetch 函数全部接入 `handleRLSError()`
- Realtime 订阅有正确的 `unsubscribe` 清理
- `getCachedUser` 有 5 秒缓存防止并发认证锁
- 认证状态变化监听有正确处理（SIGNED_IN / SIGNED_OUT / USER_UPDATED）

### 3.17 App.tsx（路由/布局）
**状态：** ✅ 正常
- 懒加载路由（13 个页面全部懒加载）
- `ErrorBoundary` 包裹根组件
- `RequireAuth` 路由守卫有正确的 loading 状态
- `Toaster` 组件正确配置

---

## 四、修复清单

| # | 优先级 | 问题 | 文件 | 行号 | 修复状态 |
|---|--------|------|------|------|----------|
| 1 | P0 | 403 错误无差异化处理导致崩溃 | `store/index.ts` | 多处 | ✅ 已修复 |
| 2 | P1 | SocialMedia 模板在组件内重建 | `pages/SocialMedia.tsx` | 110-153 | ✅ 已修复 |
| 3 | P1 | Collaboration.handleFileClick 缺类型 | `pages/Collaboration.tsx` | 76 | ✅ 已修复 |
| 4 | P1 | Settings.tsx 6处动态import拖慢加载 | `pages/Settings.tsx` | 100,258,297,365,384,401,459,486 | ✅ 已修复 |
| 5 | P1 | CRM DnD TDZ 审查 | `pages/CRM.tsx` | 383-410 | ✅ 验证通过（无TDZ） |
| 6 | P1 | VideoConference useTracks hooks 审查 | `pages/VideoConference.tsx` | 58-75 | ✅ 验证通过（无违规） |

---

## 五、未修改但已确认正常的文件

| 文件 | 原因 |
|------|------|
| `src/main.tsx` | ErrorBoundary 已包裹，无需修改 |
| `src/components/ErrorBoundary.tsx` | 功能正常 |
| `src/db/supabase.ts` | 配置正常 |
| `src/types/database.ts` | 类型定义正常 |
| `src/hooks/*` | 功能正常 |

---

## 六、后续建议（非本次修复范围）

1. **vendor-livekit chunk 615KB**：已是懒加载，若要进一步优化可考虑 Web Worker 分离
2. **大型组件拆分**：`Dashboard.tsx`、`ProjectManagement.tsx`、`Settings.tsx` 可拆分出子组件
3. **RLS 策略根本解决**：长期方案是在 Supabase 后台配置 RLS 策略，让用户自己的数据可以被自己访问（`auth.uid()` 过滤）

---

## 七、部署验证

```
URL: https://xichen9527.github.io/one-man-army-office/
HTTP Status: 200 OK
Last-Modified: Mon, 06 Jul 2026 05:08:41 GMT
Git Commit: 7faddec
```
