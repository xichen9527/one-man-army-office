-- Trending Topics Table
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  heat BIGINT NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  url TEXT,
  description TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANT permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON trending_topics TO anon, authenticated;

-- RLS
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending topics" ON trending_topics
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert trending topics" ON trending_topics
  FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

CREATE POLICY "Authenticated users can update trending topics" ON trending_topics
  FOR UPDATE USING (auth.uid()::text IS NOT NULL);

CREATE POLICY "Authenticated users can delete trending topics" ON trending_topics
  FOR DELETE USING (auth.uid()::text IS NOT NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON trending_topics (platform);
CREATE INDEX IF NOT EXISTS idx_trending_topics_heat ON trending_topics (heat DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_captured ON trending_topics (captured_at DESC);

-- Insert sample data for demonstration
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES
  -- Weibo Hot Search
  ('2026高考作文题出炉', 'weibo', 5892300, 'up', 'https://s.weibo.com/', '2026年高考语文作文题目公布，引发全网热议'),
  ('新能源汽车销量再创新高', 'weibo', 4215000, 'up', 'https://s.weibo.com/', '5月新能源汽车月销量突破120万辆'),
  ('AI大模型价格战白热化', 'weibo', 3890000, 'stable', 'https://s.weibo.com/', '多家AI公司宣布API调用价格大幅下调'),
  ('夏季防晒指南', 'weibo', 2100000, 'up', 'https://s.weibo.com/', '高温天气来临，专家支招科学防晒'),
  ('端午节假期出行攻略', 'weibo', 1860000, 'down', 'https://s.weibo.com/', '端午小长假出行高峰预测及避堵建议'),
  ('国产芯片最新突破', 'weibo', 1650000, 'up', 'https://s.weibo.com/', '国内半导体产业传来多项技术突破消息'),
  ('暑期档电影前瞻', 'weibo', 1230000, 'stable', 'https://s.weibo.com/', '2026年暑期档重点影片盘点'),
  ('职场新人避坑指南', 'weibo', 980000, 'up', 'https://s.weibo.com/', '毕业生入职季实用经验分享'),
  -- Douyin
  ('露营新玩法火了', 'douyin', 8200000, 'up', 'https://www.douyin.com/', '沉浸式露营体验视频播放量破亿'),
  ('一人食料理教程', 'douyin', 6500000, 'up', 'https://www.douyin.com/', '独居美食系列内容持续走红'),
  ('城市夜景拍摄技巧', 'douyin', 4300000, 'stable', 'https://www.douyin.com/', '手机拍摄城市夜景教程合集'),
  ('宠物日常vlog', 'douyin', 3800000, 'down', 'https://www.douyin.com/', '萌宠短视频依旧是流量密码'),
  ('极简家居改造', 'douyin', 2900000, 'up', 'https://www.douyin.com/', '低成本家居改造案例分享'),
  ('健身打卡挑战', 'douyin', 2100000, 'stable', 'https://www.douyin.com/', '30天健身挑战赛引发跟风'),
  -- Zhihu
  ('如何评价2026年高考难度？', 'zhihu', 5200000, 'up', 'https://www.zhihu.com/', '高考结束后考生和专家对试题难度的讨论'),
  ('年轻人为什么不愿加班了？', 'zhihu', 4100000, 'stable', 'https://www.zhihu.com/', '职场文化变迁引发深度讨论'),
  ('AI会取代程序员吗？', 'zhihu', 3800000, 'up', 'https://www.zhihu.com/', '编程行业从业者对AI发展的看法'),
  ('有哪些越早知道越好的道理？', 'zhihu', 3200000, 'stable', 'https://www.zhihu.com/', '人生经验分享类话题持续高热'),
  ('远程办公的真实体验', 'zhihu', 2800000, 'up', 'https://www.zhihu.com/', '混合办公模式下的真实感受分享'),
  ('2026年值得关注的科技趋势', 'zhihu', 2100000, 'up', 'https://www.zhihu.com/', '技术前瞻类讨论'),
  -- Bilibili
  ('国产动画电影年度盘点', 'bilibili', 6800000, 'up', 'https://www.bilibili.com/', '2026年国产动画电影佳作回顾'),
  ('程序员日常搞笑合集', 'bilibili', 5200000, 'stable', 'https://www.bilibili.com/', 'IT行业趣味内容合集'),
  ('自由职业者的一天', 'bilibili', 4500000, 'up', 'https://www.bilibili.com/', '数字游民生活方式Vlog'),
  ('机械键盘选购指南2026', 'bilibili', 3900000, 'down', 'https://www.bilibili.com/', '年度机械键盘推荐横评'),
  ('独立游戏推荐合集', 'bilibili', 3300000, 'up', 'https://www.bilibili.com/', '小众但优秀的独立游戏推荐'),
  ('数学建模入门教程', 'bilibili', 2600000, 'stable', 'https://www.bilibili.com/', '大学生数学建模竞赛备赛指南'),
  ('日本旅行避坑攻略', 'bilibili', 2100000, 'up', 'https://www.bilibili.com/', '暑期日本旅行实用建议'),
  ('Linux从入门到精通', 'bilibili', 1800000, 'up', 'https://www.bilibili.com/', 'Linux系统学习路线完整指南');
