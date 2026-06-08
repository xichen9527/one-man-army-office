-- 在 Supabase SQL Editor 中运行此查询来检查 buckets

-- 查看 storage schema 中的所有 buckets
SELECT * FROM storage.buckets;

-- 如果上面返回空，则需要创建 buckets
-- 运行以下 SQL:

-- 创建 files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('files', 'files', true, 52428800);

-- 创建 avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 5242880);

-- 验证创建成功
SELECT id, name, public, file_size_limit FROM storage.buckets;
