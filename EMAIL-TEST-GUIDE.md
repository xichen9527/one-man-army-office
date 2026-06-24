# 邮件邀请功能测试指南

## 修复内容

### 问题5：用户无法通过邮件邀请用户

已修复以下问题：
1. ✅ `APP_URL` 默认值改为 `https://xichen9527.github.io/one-man-army-office`
2. ✅ 发件人地址从 `invite@resend.dev` 改为 `onboarding@resend.dev`（Resend 默认可用）
3. ✅ 添加更友好的错误提示和日志

## 部署状态

✅ Edge Function `send-invitation-email` 已成功部署
- 项目ID: `jikjcdrrcywnwmtaabzh`
- 函数URL: `https://jikjcdrrcywnwmtaabzh.supabase.co/functions/v1/send-invitation-email`
- Dashboard: https://supabase.com/dashboard/project/jikjcdrrcywnwmtaabzh/functions

## 测试方式

### 方式1：通过前端应用测试（推荐）

1. 启动前端应用：
   ```bash
   cd D:\代码\one-man-army-office\office-admin
   npm run dev
   ```

2. 访问应用：`https://xichen9527.github.io/one-man-army-office` 或本地地址

3. 登录后，进入团队管理页面

4. 尝试邀请一个真实邮箱（建议用你自己的邮箱）

5. 检查是否收到邀请邮件

### 方式2：使用 Supabase Dashboard 测试

1. 打开 Supabase Dashboard
2. 进入 Edge Functions 页面
3. 选择 `send-invitation-email` 函数
4. 使用 Dashboard 提供的测试工具发送请求

### 方式3：配置 RESEND_API_KEY（生产环境）

在当前开发模式下，如果未配置 `RESEND_API_KEY`，函数会进入"模拟发送"模式，只在日志中输出邀请链接。

要实际发送邮件，需要：

1. 在 Resend 平台获取 API Key：https://resend.com/api-keys
2. 在 Supabase Dashboard 中配置环境变量：
   - 进入 Settings > Edge Functions
   - 添加 `RESEND_API_KEY` 环境变量
   - 值填写你的 Resend API Key
3. 重新部署函数（可选，环境变量会自动生效）

## 验证要点

测试时请验证以下功能：

- [ ] 邮件能成功发送到任意邮箱（不只注册邮箱）
- [ ] 邀请链接指向正确的 GitHub Pages 地址
- [ ] 邮件内容显示正确（中文、格式、按钮）
- [ ] 错误处理友好（如邮箱格式错误、Resend 配置错误等）
- [ ] 日志输出清晰（便于调试）

## 常见问题

### Q: 为什么没收到邮件？
A: 检查是否处于开发模式（未配置 RESEND_API_KEY）。开发模式下只会模拟发送，不会真的发邮件。

### Q: 发件人地址为什么是 onboarding@resend.dev？
A: 这是 Resend 免费套餐的默认发件人地址，可以发送到任意邮箱。如果要使用自定义域名，需要升级付费套餐。

### Q: 如何查看函数日志？
A: 在 Supabase Dashboard 的 Edge Functions 页面，选择函数后可以看到调用日志。

## 下一步

1. 配置 Resend API Key（如果需要真实发送邮件）
2. 在前端应用中测试完整的邀请流程
3. 验证邀请链接能正确打开并接受邀请
