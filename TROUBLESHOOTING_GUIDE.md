# 一人成军办公平台 - 问题解决指南

**生成日期：** 2026-06-23  
**目标：** 解决平台存在的所有已知问题

---

## 📋 问题清单

### P0 级别（阻塞性问题）

#### 1. 线上403/404错误
**症状：**
- 访问视频会议页面时报错：`video_conferences` 403 Forbidden
- 访问自媒体页面时报错：`social_post_platforms` 404 Not Found

**根因：**
- `video_conferences` 表缺少正确的RLS策略
- `social_post_platforms` 表不存在
- 数据库权限未正确授予

**解决方案：**
执行以下SQL迁移脚本（已生成）：
```bash
supabase/migrations/20260623090000_fix_all_rls_and_missing_tables.sql
```

**执行步骤：**
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制上述SQL文件内容
4. 执行SQL
5. 验证：执行 `SELECT * FROM social_post_platforms LIMIT 1;` 确认表存在

---

#### 2. TDZ（Temporal Dead Zone）错误
**症状：**
- 在生产环境中，某些页面报 `Cannot access 'z' before initialization` 错误
- 影响页面：CRM、SocialMedia、VideoConference、Settings

**根因：**
- 变量在声明之前就被访问（可能是循环依赖或压缩导致的变量名冲突）
- @dnd-kit 状态管理问题
- 生产构建时的变量名压缩

**解决方案：**

**方案A：检查循环依赖**
```bash
# 检查VideoConference.tsx的依赖
cd D:\代码\one-man-army-office
npx madge --circular src/pages/VideoConference.tsx
```

**方案B：禁用Terser压缩（临时方案）**
在 `vite.config.ts` 中添加：
```typescript
build: {
  minify: 'esbuild', // 改用esbuild代替terser
  terserOptions: {
    compress: {
      dead_code: false // 禁用死代码消除
    }
  }
}
```

**方案C：检查@dnd-kit使用**
确保 `@dnd-kit/core` 和 `@dnd-kit/sortable` 的导入和使用正确。

**验证步骤：**
1. 本地运行 `npm run dev`
2. 访问受影响的页面
3. 检查浏览器控制台是否有错误
4. 如果本地正常，构建生产版本测试：`npm run build && npm run preview`

---

### P1 级别（重要问题）

#### 3. SQL迁移未执行
**症状：**
- 数据库表结构不完整
- 某些功能无法正常工作

**解决方案：**
已生成完整SQL迁移脚本：`20260623090000_fix_all_rls_and_missing_tables.sql`

**执行步骤：**
1. 在 Supabase SQL Editor 执行上述SQL
2. 验证表创建：`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
3. 验证RLS策略：`SELECT * FROM pg_policies;`

---

#### 4. Store中的重复调用
**症状：**
- `loadUser` 方法中 `fetchApprovals()` 被调用两次
- 可能导致性能问题

**根因：**
- 代码逻辑错误

**解决方案：**
检查 `src/store/index.ts` 中的 `loadUser` 方法，确保 `fetchApprovals()` 只调用一次。

---

### P2 级别（次要问题）

#### 5. 热点追踪功能不完整
**症状：**
- 热点追踪功能只有前端UI，缺少后端爬取逻辑

**解决方案：**
已实现 `get-trending-lists` Edge Function，但需要：
1. 确保SQL迁移执行（`trending_topics` 表存在）
2. 部署 Edge Function：`supabase functions deploy get-trending-lists`
3. 配置定时任务（可选）：使用 cron 定时调用 Edge Function

---

#### 6. 非关键性问题
**症状：**
- 12处 `catch` 块使用 `console.error` 而不是 `toast`
- 少量未使用的导入
- UTF-8 BOM 编码问题

**解决方案：**
1. 将 `console.error` 替换为 `toast` 通知
2. 删除未使用的导入
3. 确保所有文件使用 UTF-8 编码（无 BOM）

---

## 🔧 立即执行步骤

### 步骤1：执行SQL迁移（必须）
```sql
-- 在 Supabase SQL Editor 执行
-- 文件：supabase/migrations/20260623090000_fix_all_rls_and_missing_tables.sql
```

### 步骤2：验证数据库
```sql
-- 验证表存在
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 验证RLS策略
SELECT * FROM pg_policies WHERE tablename IN ('video_conferences', 'social_post_platforms', 'project_members');

-- 验证权限
GRANT SELECT, INSERT, UPDATE, DELETE ON video_conferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_post_platforms TO authenticated;
```

### 步骤3：部署Edge Functions（如果需要）
```bash
supabase functions deploy livekit-token
supabase functions deploy get-trending-lists
```

### 步骤4：构建并部署前端
```bash
npm run build
# 部署到 GitHub Pages
git add .
git commit -m "fix: 修复所有已知问题"
git push origin master
```

### 步骤5：清除缓存测试
- 浏览器硬刷新：`Ctrl + Shift + R`
- 清除 localStorage：`localStorage.clear()`
- 清除 sessionStorage：`sessionStorage.clear()`

---

## 📝 验证清单

执行完成后，验证以下问题是否已解决：

- [ ] 视频会议页面不再报403错误
- [ ] 自媒体页面不再报404错误
- [ ] TDZ错误不再出现
- [ ] 所有功能正常运行
- [ ] 构建零错误零警告（只有chunk大小警告）
- [ ] 部署成功，GitHub Pages 可访问

---

## 🆘 如果问题仍然存在

### 收集错误信息
1. 浏览器控制台错误截图
2. 网络请求失败详情
3. Supabase 日志（Dashboard → Logs）
4. 构建日志

### 常见问题排查

**问题：** SQL执行失败  
**解决：** 检查是否有语法错误，确保所有表名和列名正确

**问题：** Edge Function 部署失败  
**解决：** 检查 `.env` 文件是否正确，运行 `supabase login` 重新登录

**问题：** 构建失败  
**解决：** 运行 `npm run build` 查看详细错误，检查 TypeScript 类型错误

**问题：** TDZ错误仍然存在  
**解决：** 尝试方案B（禁用Terser压缩），或提供更多错误堆栈信息

---

## 📞 联系支持

如果问题无法解决，请提供：
1. 完整的错误堆栈
2. 浏览器控制台截图
3. 执行的操作步骤
4. 数据库表结构（`SELECT * FROM information_schema.tables...`）

---

**最后更新：** 2026-06-23 09:45 GMT+8
