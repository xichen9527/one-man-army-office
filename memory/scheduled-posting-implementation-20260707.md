# 定时发布功能实现记录

**日期**: 2026-07-07
**项目**: One-Person Army Office (D:\oma)
**功能**: 社交媒体定时发布

---

## 实现概览

| 组件 | 文件 | 状态 |
|------|------|------|
| Edge Function | `supabase/functions/post-scheduled/index.ts` | ✅ 完成 |
| SQL Cron Job | `post-scheduled-cron.sql` | ✅ 完成 |
| 前端 UI | `src/pages/SocialMedia.tsx` | ✅ 已有（无需修改）|
| Realtime 订阅 | `src/store/index.ts` | ✅ 完成 |
| 测试脚本 | `post-scheduled-test.cjs` | ✅ 完成 |

---

## 1. Edge Function — `post-scheduled/index.ts`

**路径**: `D:\oma\supabase\functions\post-scheduled\index.ts`

### 核心逻辑

```
pg_cron 调用 (每分钟)
  ↓
查询 social_media_posts WHERE status='scheduled' AND scheduled_at <= NOW()
  ↓
对每条到期的帖子:
  1. 查询关联的 social_post_platforms 记录（status='scheduled'）
  2. 更新主表状态为 publishing
  3. 对每个平台:
     - 获取账号 access_token（检查有效期）
     - 调用对应平台 API 发布
     - 更新 platform 记录（published / failed + error_message）
  4. 检查所有平台完成状态:
     - 全部 published → 主表 status='published', published_at=NOW()
     - 全部 done（有失败）→ 主表 status='failed'
     - 还有 pending → 保持 publishing，等待下次 cron
```

### 支持的平台

微博、微信公众号、抖音、小红书、B站、知乎、头条（含自定义 API 端点）

### 调用方式

- **Cron 调用**（无参数，内部查询 service_role）: `POST /functions/v1/post-scheduled`
- **手动触发**（带 `post_id`）: `POST /functions/v1/post-scheduled` body: `{ "post_id": "xxx" }`

---

## 2. pg_cron SQL — `post-scheduled-cron.sql`

**路径**: `D:\oma\post-scheduled-cron.sql`

### 执行方式

在 Supabase SQL Editor 中执行：

```sql
\i D:\oma\post-scheduled-cron.sql
```

或通过 Supabase CLI：

```bash
supabase db push
```

### 验证命令

```sql
-- 检查 job 是否创建成功
SELECT * FROM cron.job WHERE jobname = 'post-scheduled-cron';

-- 查看最近执行记录
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### 备选方案（pg_net 不可用时）

Supabase Dashboard → Database → Webhooks：
- Table: `social_media_posts`
- Events: Update
- Filter: `status = 'scheduled' AND scheduled_at <= now()`

---

## 3. 前端 UI — `src/pages/SocialMedia.tsx`

**状态**: 无需修改（已完整实现）

现有功能：
- `scheduleEnabled` 开关 → 显示 datetime-local 时间选择器
- 定时发布按钮（amber 主题）：调用 `handleCreatePost('scheduled', scheduledAt)`
- 立即发布按钮（blue 主题）：调用 `handlePublishDirect()`
- 保存草稿按钮

---

## 4. Realtime 订阅 — `src/store/index.ts`

### 新增内容

```typescript
// 接口
__socialPostsChannel: any
subscribeToSocialPosts: () => void
unsubscribeSocialPosts: () => void

// 实现
subscribeToSocialPosts()
  → 订阅 social_media_posts 表（INSERT/UPDATE/DELETE）
  → 订阅 social_post_platforms 表（INSERT/UPDATE）
  → 自动同步到 Zustand store

// 生命周期
SIGNED_IN → subscribeToSocialPosts()
SIGNED_OUT → unsubscribeSocialPosts()
```

---

## 测试步骤

### 手动测试（无平台 API 凭证）

```bash
# 1. 部署 Edge Function
cd D:\oma
supabase functions deploy post-scheduled

# 2. 执行 SQL 创建 cron job
# 在 Supabase SQL Editor 中执行 post-scheduled-cron.sql

# 3. 运行测试脚本（需要 .env 中配置 SUPABASE_SERVICE_ROLE_KEY）
node post-scheduled-test.cjs
```

### 端到端测试（需要真实平台凭证）

1. 在 Supabase 数据库中插入一条定时帖子：
```sql
INSERT INTO social_media_posts (title, content, status, scheduled_at)
VALUES ('测试定时帖', '内容', 'scheduled', NOW() + INTERVAL '1 minute');
```

2. 等待 1 分钟，观察帖子状态变为 `published`

3. 查看 Edge Function 日志确认调用成功

---

## 数据库表结构（关键字段）

### social_media_posts
- `id` text (UUID)
- `status` text ('draft' | 'scheduled' | 'published' | 'failed')
- `scheduled_at` timestamptz
- `published_at` timestamptz
- `media_urls` text[]

### social_post_platforms
- `id` text
- `post_id` text → social_media_posts.id
- `account_id` text → social_accounts.id
- `platform` text
- `status` text ('pending' | 'draft' | 'scheduled' | 'published' | 'failed')
- `scheduled_at` timestamptz
- `published_at` timestamptz
- `platform_post_id` text（平台返回的内容 ID）
- `error_message` text（失败原因）

### social_accounts
- `id` text
- `platform` text
- `access_token` text
- `token_expires_at` timestamptz
- `metadata` jsonb（存储 app_key, app_secret 等）

---

## 注意事项

1. **pg_net 扩展**：cron job 使用 `net.http_post` 调用 Edge Function，需确认 Supabase 项目中 pg_net 扩展已启用
2. **service_role key**：Edge Function 使用 service_role key 操作数据库，RLS 会被绕过，但数据按 user_id 字段隔离
3. **平台 API 凭证**：各平台的 App Key/Secret 存储在 social_accounts.metadata 中
4. **幂等性**：Edge Function 可安全重复调用，每次只处理到期的帖子
5. **错误处理**：单平台失败不影响其他平台，所有平台完成后才更新主表状态
