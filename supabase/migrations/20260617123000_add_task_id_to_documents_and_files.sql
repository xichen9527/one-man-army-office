-- 为 documents 表添加 task_id 字段
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_task_id ON public.documents(task_id);

-- 为 files 表添加 task_id 字段
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_task_id ON public.files(task_id);

-- 更新 RLS 策略，确保用户能访问自己项目/任务的文档和文件
-- documents 表已有权限策略，无需修改
-- files 表已有权限策略，无需修改
