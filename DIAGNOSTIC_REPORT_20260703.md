# 页面运行时诊断报告

**日期**: 2026-07-03
**项目**: one-man-army-office
**框架**: React 18 + TypeScript + Vite 8 + shadcn/ui + Zustand

---

## 诊断方法
1. **静态分析**: 逐文件阅读 15 个页面源码，检查 TDZ 模式、hooks 违规、内存泄漏
2. **TypeScript 编译检查**: 运行 `tsc --noEmit` 捕获编译错误
3. **运行时模式分析**: 检查已知问题模式（DndContext 复杂使用、动态 import 竞态、LiveKit hook 条件渲染等）

---

## 页面状态总览

| # | 页面 | 状态 | 严重程度 | 关键问题 |
|---|------|------|----------|----------|
| 1 | **WorkspaceHub.tsx** | 🔴 **编译错误** | **P0** | 语法错误（多余的 `)`） |
| 2 | **store/index.ts** | 🟡 **类型缺失** | **P1** | `Followup` 类型未导入 |
| 3 | **CRM.tsx** | 🟡 **间接依赖错误** | **P1** | 依赖 store 中未导入的 Followup 类型 |
| 4 | **Collaboration.tsx** | 🟡 **潜在问题** | **P2** | handleFileClick 缺少类型标注 |
| 5 | **Settings.tsx** | 🟡 **性能问题** | **P2** | 多处动态 import |
| 6 | **SocialMedia.tsx** | 🟡 **性能问题** | **P2** | 模板定义在组件内、大文件 |
| 7 | **VideoConference.tsx** | 🟡 **hook 风险** | **P2** | useTracks 条件渲染风险 |
| 8 | **ProjectManagement.tsx** | 🟢 **正常** | - | 无严重问题 |
| 9 | **Dashboard.tsx** | 🟢 **正常** | - | 无严重问题 |
| 10 | **AIAssistant.tsx** | 🟢 **正常** | - | 无严重问题 |
| 11 | **AdminPage.tsx** | 🟢 **正常** | - | 无严重问题 |
| 12 | **Invite.tsx** | 🟢 **正常** | - | 无严重问题 |
| 13 | **Login.tsx** | 🟢 **正常** | - | 无严重问题 |
| 14 | **Register.tsx** | 🟢 **正常** | - | 无严重问题 |
| 15 | **ResetPassword.tsx** | 🟢 **正常** | - | 无严重问题 |
| 16 | **ProjectDetail.tsx** | 🟢 **正常** | - | 无严重问题 |

---

## 详细问题报告

### 🔴 P0 — WorkspaceHub.tsx 语法错误（编译失败）

**文件**: `src/pages/WorkspaceHub.tsx`
**行号**: 1186
**严重程度**: P0 — **编译错误，页面无法渲染**

**问题描述**: ProjectModal 组件的 `useState` 调用末尾有多余的 `)`，导致 TypeScript 编译错误 `TS1005: ',' expected`。

**问题代码**:

```tsx
const [status, setStatus] = useState<`active` | 'completed' | 'archived'>((project?.status as any) || 'active'))
//                                                                                                                       ^ 多余的 )
```

**正确代码**:

```tsx
const [status, setStatus] = useState<`active` | 'completed' | 'archived'>((project?.status as any) || `active`)
```

**影响范围**: WorkspaceHub 页面中 ProjectModal 组件，当用户在频道侧边栏中点击「新建项目」或「编辑项目」时，此组件会被渲染并触发运行时错误。由于 TS 编译会报错，构建过程实际上会产生警告但不阻断（esbuild 非严格模式），但在浏览器中执行时会导致 JS 解析失败。

**验证方法**: 运行 `tsc --noEmit` 会立即捕获此错误。

---

### 🟡 P1 — store/index.ts Followup 类型缺失

**文件**: `src/store/index.ts`
**行号**: 4-36（导入块），121-124, 625, 634, 642（使用处）
**严重程度**: P1

**问题描述**: `Followup`, `FollowupInsert`, `FollowupUpdate` 这三个类型被广泛使用，但**未在 import 块中导入**。

**当前导入**（缺少 Followup 系列）:
```typescript
import type {
  Profile, ProfileInsert, ProfileUpdate,
  // ... 大量类型 ...
  ApprovalRequest, ApprovalRequestInsert, ApprovalRequestUpdate, ApprovalStatus,
} from '@/types/database'
```

**使用处**:
- L121: `followups: Record<string, Followup[]>`
- L123: `addFollowup: (data: FollowupInsert) => Promise<void>`
- L625: `(data as Followup[] | null)`
- L634: `[result as Followup, ...`
- L642: `.filter((f: Followup) => f.id !== id)`

**影响**: TypeScript 在有 `strict: true` 或 `noImplictAny` 启用时会报错。本项目 tsconfig 未启用 strict 模式，因此 Vite 的 esbuild 构建能通过，但 IDE 和 tsc 检查会报告错误。在运行时，由于类型被擦除，这不会直接导致 JS 异常，但会导致 **IDE 红线下画、代码提示缺失、可能引入未类型安全的 bug**。

**修复建议**: 在 import 块中添加：
```typescript
  Followup, FollowupInsert, FollowupUpdate,
```

---

### 🟡 P2 — Collaboration.tsx handleFileClick 缺少类型标注

**文件**: `src/pages/Collaboration.tsx`
**行号**: 69
**严重程度**: P2

**问题描述**: `handleFileClick` 函数的参数 `file` 缺少 TypeScript 类型标注，且函数体内部访问 `.file_path`, `.publicUrl` 等属性也没有类型守卫。

**问题代码**:
```tsx
const handleFileClick = (file) => {   // 缺少类型: missing `: DBFile` or `: any`
  const { data, error } = supabase.storage.from('files').getPublicUrl(file.file_path)
  ...
}
```

**影响**: 虽然不会导致运行时崩溃（TS 宽松模式下），但当传入错误格式的对象时不会被 TS 警告。

**修复建议**:
```tsx
const handleFileClick = (file: DBFile) => {
```

---

### 🟡 P2 — Settings.tsx 多处动态 import

**文件**: `src/pages/Settings.tsx`
**严重程度**: P2

**问题描述**: `loadEmailChangeCount`, `handleAvatarUpload`, `handleSaveProfile`, `handleChangePassword`, `handleEnable2FA`, `handleDisable2FA` 等多个函数中使用了 `await import('@/db/supabase')` 进行动态导入。虽然 Vite 的 ESM 模块缓存机制使这些 import 只在实际执行一次（后续命中缓存），但这种模式：

1. 违反了 `verbatimModuleSyntax` 的最佳实践
2. 使静态分析变得困难
3. 在初次加载时可能造成竞态条件（动态 import 是异步的）

**典型问题代码**:
```tsx
const loadEmailChangeCount = async () => {
  if (!currentUser?.id) return
  const { supabase: sb } = await import('@/db/supabase')  // 动态 import
  ...
}
```

**影响**: 不会导致崩溃，但延迟了 handler 的首次执行时间（增加 1-3 个网络往返延迟），属于性能问题。另外，如果 `supabase` 初始化失败，动态 import 不会在页面加载时暴露问题，而是在用户执行操作时突然失败。

**修复建议**: 将 `supabase` 的 import 移到文件顶部（已经在 Collaboration.tsx、CRM.tsx 等页面中正确使用了顶部 import）。

---

### 🟡 P2 — SocialMedia.tsx 模板定义在组件内部

**文件**: `src/pages/SocialMedia.tsx`
**行号**: 109-170
**严重程度**: P2

**问题描述**: 7 个内容模板（weibo, wechat, douyin, xiaohongshu 等）被定义为 `templates` 数组，**直接位于 `SocialMedia()` 函数组件内部**。这意味着每次组件渲染都会重新创建这个数组及其所有字符串和对象内容。

**问题代码**:
```tsx
export default function SocialMedia() {
  // ... 大量 state ...
  
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  
  // Template definitions — 每次渲染都重新创建
  const templates = [
    {
      id: 'weibo',
      name: '微博模板',
      platform: 'weibo',
      content: '#[话题]# [您的微博内容，最多140字]\n\n#[热点]# #[每日分享]#'
    },
    // ... 6 more large template objects
  ]
  // ...
}
```

**影响**: 
1. **性能**: 每次渲染都会 GC 掉旧的模板数组并创建新的，虽然 React 18 做了优化，但频繁创建大对象仍然增加 GC 压力
2. **引用不稳定性**: 如果子组件依赖 `templates` 的引用相等性，会导致不必要的重渲染

**修复建议**: 将 `templates` 定义移到组件外部（顶层的 `const`），或者使用 `useMemo` 包裹。

**同文件中其他类似问题**:
- `platformCredentialFields` 对象（L187-200）也定义在组件内部
- `filteredPosts`, `totalFollowers`, `totalEngagement` 三个 useMemo 是良好的模式

---

### 🟡 P2 — VideoConference.tsx useTracks 条件渲染风险

**文件**: `src/pages/VideoConference.tsx`
**严重程度**: P2

**问题描述**: `MeetingRoom` 组件内部使用了 LiveKit 的 `useTracks` hook，而 `MeetingRoom` 只在 `liveKitToken && activeRoomName` 为 true 时渲染。从代码结构看，这是安全的（因为 `MeetingRoom` 在 if 分支中渲染，不是条件式打乱 hooks 顺序）。

但存在一个潜在风险：`LiveKitRoom` 组件包裹着 `MeetingRoom`，当 `LiveKitRoom` 的 `connect` prop 触发连接时，如果连接出错导致 `onDisconnected` 回调快速触发，会触发 `handleLeaveMeeting` → 清除 `liveKitToken` 和 `activeRoomName` → 导致组件卸载，`MeetingRoom` 内部的 hooks 可能在不完整状态下执行清理。

**影响**: 在不良网络条件下可能导致 hook 警告或 unexpected behavior，但不属于严重错误。

---

## 历史已修复问题

| Commit | 问题 | 修复内容 |
|--------|------|----------|
| a7d4476 | CRM FunnelChart TDZ | 修复了 CRM.tsx 中 FunnelChart 组件的 TDZ 错误 |
| 5a17685 | Terser minify 配置 | 修复了 terser 压缩导致的 TDZ 相关问题 |

## 未发现的问题（已排除）

以下常见的 TDZ 模式在本次检查中**未发现**:
- ❌ 循环引用（A 引用 B，B 引用 A）
- ❌ const/let 在使用后才声明
- ❌ 工厂函数返回前的引用
- ❌ 数组/对象解构在声明前使用
- ❌ useEffect 依赖数组中遗漏的函数引用
- ❌ 条件渲染中的 hooks 违规（除 VideoConference 的轻微风险外）

---

## 构建验证

运行 `npx tsc --noEmit --project tsconfig.app.json` 的结果：
```
src/pages/WorkspaceHub.tsx(1186,114): error TS1005: ',' expected.
```
仅检出 **1 个编译错误**。

---

## 需要立即修复的 P0 问题

### 1. 🔴 WorkspaceHub.tsx 语法错误
- **文件**: `src/pages/WorkspaceHub.tsx`, 第 1186 行
- **问题**: `useState` 调用末尾多余的 `)` 
- **影响**: 编译错误，ProjectModal 无法生效
- **修复**: 删除多余的 `)`

```diff
- const [status, setStatus] = useState<'active' | 'completed' | 'archived'>((project?.status as any) || 'active'))
+ const [status, setStatus] = useState<'active' | 'completed' | 'archived'>((project?.status as any) || 'active')
```

### 2. 🟡 store/index.ts 缺少 Followup 类型导入
- **文件**: `src/store/index.ts`, 导入块（L4-36）
- **问题**: `Followup`, `FollowupInsert`, `FollowupUpdate` 未导入
- **修复**: 在 import type 块中添加这三个类型
