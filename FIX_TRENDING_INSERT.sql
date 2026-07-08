-- Auto-generated: FIX_TRENDING_INSERT.sql
-- Correct column names from database.ts TrendingTopic interface
-- Generated: 2026-07-07T01:54:45.061Z

-- === trending_topics ===
DELETE FROM trending_topics WHERE TRUE;
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('微博热搜TOP1', 'weibo', 1200000, 'up', 'https://s.weibo.com', '微博实时热搜榜第1位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('微博热搜TOP2', 'weibo', 980000, 'up', 'https://s.weibo.com', '微博实时热搜榜第2位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('微博热搜TOP3', 'weibo', 850000, 'stable', 'https://s.weibo.com', '微博实时热搜榜第3位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('知乎热榜TOP1', 'zhihu', 520000, 'up', 'https://www.zhihu.com', '知乎热度榜第1位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('知乎热榜TOP2', 'zhihu', 480000, 'stable', 'https://www.zhihu.com', '知乎热度榜第2位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('知乎热榜TOP3', 'zhihu', 420000, 'down', 'https://www.zhihu.com', '知乎热度榜第3位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('B站排行榜TOP1', 'bilibili', 380000, 'up', 'https://www.bilibili.com', 'B站综合排行榜第1位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('B站排行榜TOP2', 'bilibili', 320000, 'stable', 'https://www.bilibili.com', 'B站综合排行榜第2位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('B站排行榜TOP3', 'bilibili', 290000, 'down', 'https://www.bilibili.com', 'B站综合排行榜第3位');
INSERT INTO trending_topics (title, platform, heat, trend, url, description) VALUES ('抖音热搜TOP1', 'douyin', 890000, 'up', 'https://www.douyin.com', '抖音实时热搜榜第1位');

