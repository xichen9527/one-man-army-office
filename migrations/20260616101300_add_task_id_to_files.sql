-- 数据库迁移：为 files 表添加 task_id 字段
-- 执行方式：在 Supabase SQL Editor 中运行此 SQL

ALTER TABLE files ADD COLUMN IF NOT EXISTS task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;

-- 验证：查看 files 表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'files'
ORDER BY ordinal_position;
