-- 添加腾讯会议相关字段到 conferences 表
ALTER TABLE public.conferences 
ADD COLUMN IF NOT EXISTS meeting_number TEXT,
ADD COLUMN IF NOT EXISTS join_url TEXT;

-- 创建索引（可选，用于快速查询）
CREATE INDEX IF NOT EXISTS idx_conferences_meeting_number ON public.conferences(meeting_number) WHERE meeting_number IS NOT NULL;
