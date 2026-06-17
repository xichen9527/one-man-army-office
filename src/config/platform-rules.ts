/**
 * Platform Rules Configuration
 * 各自媒体平台内容发布规则、限制与要求
 */

export type ContentType = 'shortText' | 'article' | 'video' | 'imageText'

export interface PlatformRule {
  key: string
  name: string
  contentTypes: ContentType[]
  defaultContentType: ContentType
  title: { required: boolean; maxLength: number; label: string }
  content: { maxLength: number; label: string }
  summary: { maxLength: number | null; required: boolean; label: string }
  images: { maxCount: number; formats: string[]; maxSingleSizeMB: number; coverRequired: boolean; coverAspectRatio: string | null; coverRecommendSize: string | null; label: string }
  video: { required: boolean; maxCount: number; maxLengthMin: number; maxLengthMinVerified: number | null; maxSingleSizeGB: number; formats: string[]; aspectRatio: string | null; label: string }
  hashtags: { format: 'hashtag' | 'wechat_hashtag'; maxCount: number; recommendCount: string; label: string }
  mentions: { supported: boolean; format: string }
  category: { required: boolean; label: string; options: string[] }
  tags: { maxCount: number; required: boolean; label: string }
  music: { supported: boolean; label: string }
  tips: string[]
  sensitiveTips: string[]
}

export const platformRules: Record<string, PlatformRule> = {
  weibo: {
    key: 'weibo', name: '微博',
    contentTypes: ['shortText', 'imageText', 'video'], defaultContentType: 'shortText',
    title: { required: false, maxLength: 0, label: '' },
    content: { maxLength: 2000, label: '微博内容' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 9, formats: ['JPG','PNG','GIF'], maxSingleSizeMB: 10, coverRequired: false, coverAspectRatio: null, coverRecommendSize: null, label: '图片（最多9张）' },
    video: { required: false, maxCount: 1, maxLengthMin: 15, maxLengthMinVerified: null, maxSingleSizeGB: 2, formats: ['MP4','MOV'], aspectRatio: null, label: '视频（最长15分钟）' },
    hashtags: { format: 'wechat_hashtag', maxCount: 10, recommendCount: '3-5个', label: '#话题#' },
    mentions: { supported: true, format: '@用户名' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: false, label: '' },
    tips: ['微博话题格式：#话题名#（前后都有#号）', '最多2000字（含话题和@提及）', '图片最多9张，GIF动图会被压缩为静态图', '视频最长15分钟，单个最大2GB'],
    sensitiveTips: ['禁止政治敏感、低俗色情、虚假不实信息', '禁止刷屏重复发布'],
  },
  wechat: {
    key: 'wechat', name: '微信公众号',
    contentTypes: ['article'], defaultContentType: 'article',
    title: { required: true, maxLength: 64, label: '文章标题（必填，64字以内）' },
    content: { maxLength: 20000, label: '正文内容' },
    summary: { maxLength: 120, required: true, label: '摘要（120字以内）' },
    images: { maxCount: 20, formats: ['JPG','PNG'], maxSingleSizeMB: 10, coverRequired: true, coverAspectRatio: '2.35:1', coverRecommendSize: '900x383px', label: '图片（封面必选，正文最多20张）' },
    video: { required: false, maxCount: 1, maxLengthMin: 0, maxLengthMinVerified: null, maxSingleSizeGB: 1, formats: ['MP4'], aspectRatio: null, label: '视频（最大1GB）' },
    hashtags: { format: 'hashtag', maxCount: 5, recommendCount: '3-5个', label: '#话题' },
    mentions: { supported: false, format: '' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: false, label: '' },
    tips: ['标题必填，64字以内', '摘要必填，120字以内', '封面图必选，推荐比例2.35:1（900x383px）', '正文最长20000字', '内容必须原创或获得授权转载'],
    sensitiveTips: ['禁止诱导分享', '禁止虚假标题', '需标明转载来源'],
  },
  douyin: {
    key: 'douyin', name: '抖音',
    contentTypes: ['video', 'imageText'], defaultContentType: 'video',
    title: { required: true, maxLength: 30, label: '视频标题（必填，30字以内）' },
    content: { maxLength: 300, label: '描述/文案' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 35, formats: ['JPG','PNG','WEBP'], maxSingleSizeMB: 20, coverRequired: true, coverAspectRatio: '9:16', coverRecommendSize: '1080x1920px', label: '图片（图文最多35张，竖版优先）' },
    video: { required: true, maxCount: 1, maxLengthMin: 15, maxLengthMinVerified: 30, maxSingleSizeGB: 4, formats: ['MP4','MOV'], aspectRatio: '9:16', label: '视频（必填，最长15分钟）' },
    hashtags: { format: 'hashtag', maxCount: 10, recommendCount: '3-5个', label: '#话题' },
    mentions: { supported: true, format: '@用户名' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: true, label: '推荐使用平台音乐库' },
    tips: ['视频必填，推荐竖屏9:16', '标题30字以内，描述300字以内', '视频最长15分钟（认证账号30分钟），单个最大4GB', '推荐使用平台音乐库', '普通图文最多35张'],
    sensitiveTips: ['禁止低俗内容', '禁止搬运未经授权内容'],
  },
  xiaohongshu: {
    key: 'xiaohongshu', name: '小红书',
    contentTypes: ['imageText', 'video'], defaultContentType: 'imageText',
    title: { required: true, maxLength: 20, label: '笔记标题（必填，推荐20字以内）' },
    content: { maxLength: 1000, label: '正文内容' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 18, formats: ['JPG','PNG','WEBP'], maxSingleSizeMB: 20, coverRequired: true, coverAspectRatio: '3:4', coverRecommendSize: '1080x1440px', label: '图片（封面必选，最多18张）' },
    video: { required: false, maxCount: 1, maxLengthMin: 5, maxLengthMinVerified: 15, maxSingleSizeGB: 4, formats: ['MP4','MOV'], aspectRatio: '9:16', label: '视频（最长5分钟）' },
    hashtags: { format: 'hashtag', maxCount: 10, recommendCount: '3-5个', label: '#话题' },
    mentions: { supported: false, format: '' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: false, label: '' },
    tips: ['标题必填，推荐20字以内', '封面图必选，推荐竖版3:4（1080x1440px）', '图文笔记最多18张，正文1000字以内', '视频笔记最长5分钟（认证15分钟）', '建议添加3-5个话题标签', '内容需真实种草风格'],
    sensitiveTips: ['禁止虚假种草', '禁止未经授权品牌推广', '禁止引流到其他平台'],
  },
  bilibili: {
    key: 'bilibili', name: 'B站',
    contentTypes: ['video'], defaultContentType: 'video',
    title: { required: true, maxLength: 80, label: '视频标题（必填，80字以内）' },
    content: { maxLength: 2000, label: '视频简介' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 1, formats: ['JPG','PNG'], maxSingleSizeMB: 10, coverRequired: true, coverAspectRatio: '16:9', coverRecommendSize: '1146x717px', label: '封面图（必选，推荐16:9）' },
    video: { required: true, maxCount: 1, maxLengthMin: 0, maxLengthMinVerified: null, maxSingleSizeGB: 4, formats: ['MP4'], aspectRatio: '16:9', label: '视频（必填，单个最大4GB）' },
    hashtags: { format: 'hashtag', maxCount: 12, recommendCount: '3-6个', label: '#话题' },
    mentions: { supported: false, format: '' },
    category: { required: true, label: '投稿分区', options: ['动画','番剧','国创','音乐','舞蹈','游戏','知识','科技','运动','汽车','生活','美食','动物圈','时尚','娱乐','影视'] },
    tags: { maxCount: 12, required: true, label: '视频标签（最多12个）' },
    music: { supported: false, label: '' },
    tips: ['标题必填，80字以内', '封面图必选，推荐16:9（1146x717px）', '简介最长2000字', '投稿分区必选', '标签必填，最多12个', '视频单个最大4GB'],
    sensitiveTips: ['禁止低俗色情内容', '禁止搬运未经授权视频', '禁止误导性标题封面'],
  },
  zhihu: {
    key: 'zhihu', name: '知乎',
    contentTypes: ['article'], defaultContentType: 'article',
    title: { required: true, maxLength: 100, label: '文章标题（必填，100字以内）' },
    content: { maxLength: 50000, label: '正文内容' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 50, formats: ['JPG','PNG','GIF'], maxSingleSizeMB: 10, coverRequired: false, coverAspectRatio: null, coverRecommendSize: null, label: '图片（建议每2000字至少配1张）' },
    video: { required: false, maxCount: 1, maxLengthMin: 0, maxLengthMinVerified: null, maxSingleSizeGB: 1, formats: ['MP4'], aspectRatio: null, label: '视频（可选）' },
    hashtags: { format: 'hashtag', maxCount: 5, recommendCount: '1-5个', label: '#话题' },
    mentions: { supported: true, format: '@用户名' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: false, label: '' },
    tips: ['标题必填，100字以内', '正文建议5000字以内', '重视专业性和深度，建议引用来源', '适合发布深度长文、专业回答或专栏文章'],
    sensitiveTips: ['禁止抄袭洗稿', '禁止虚假信息', '建议引用权威来源'],
  },
  toutiao: {
    key: 'toutiao', name: '今日头条',
    contentTypes: ['shortText', 'article', 'video'], defaultContentType: 'article',
    title: { required: true, maxLength: 30, label: '标题（必填，推荐30字以内）' },
    content: { maxLength: 50000, label: '正文内容' },
    summary: { maxLength: null, required: false, label: '' },
    images: { maxCount: 30, formats: ['JPG','PNG','WEBP'], maxSingleSizeMB: 10, coverRequired: true, coverAspectRatio: '16:9', coverRecommendSize: '1080x608px', label: '图片（封面必选，最多30张）' },
    video: { required: false, maxCount: 1, maxLengthMin: 60, maxLengthMinVerified: null, maxSingleSizeGB: 4, formats: ['MP4','MOV'], aspectRatio: '16:9', label: '视频（最长60分钟）' },
    hashtags: { format: 'hashtag', maxCount: 5, recommendCount: '2-3个', label: '#话题' },
    mentions: { supported: false, format: '' },
    category: { required: false, label: '', options: [] },
    tags: { maxCount: 0, required: false, label: '' },
    music: { supported: false, label: '' },
    tips: ['标题必填，推荐30字以内', '封面图必选，推荐16:9（1080x608px）', '图片最多30张，需高清原创', '视频最长60分钟，最大4GB', '原创优先'],
    sensitiveTips: ['禁止虚假标题', '禁止低俗内容', '禁止搬运抄袭'],
  },
}

export function getStrictestRule(rules: PlatformRule[], field: 'title' | 'content') {
  const limits = rules.map(r => r[field].maxLength).filter(l => l > 0)
  return limits.length > 0 ? Math.min(...limits) : Infinity
}

export function getImageLimit(rules: PlatformRule[]) {
  const counts = rules.map(r => r.images.maxCount).filter(c => c > 0)
  return counts.length > 0 ? Math.min(...counts) : 0
}

export function getContentTypeConflicts(contentType: ContentType, selectedPlatforms: string[]): string[] {
  return selectedPlatforms.filter(p => {
    const rule = platformRules[p]
    return rule && !rule.contentTypes.includes(contentType)
  })
}

export function getContentRecommendations(text: string, hasImages: boolean, hasVideo: boolean): { recommended: string[]; warnings: string[] } {
  const recommended: string[] = []
  const warnings: string[] = []
  if (hasVideo) { recommended.push('douyin', 'bilibili', 'xiaohongshu'); if (text.length > 300) warnings.push('抖音描述建议300字以内') }
  if (hasImages && !hasVideo) recommended.push('xiaohongshu', 'weibo', 'toutiao')
  if (text.length > 2000 && !hasVideo) { recommended.push('wechat', 'zhihu', 'toutiao'); warnings.push('微博限制2000字，内容较长不适合微博') }
  if (text.length <= 200) recommended.push('weibo')
  if (!hasImages && !hasVideo && text.length > 5000) { recommended.push('wechat', 'zhihu'); warnings.push('纯文字超过5000字，仅适合微信公众号和知乎') }
  if (recommended.length === 0) recommended.push('weibo', 'toutiao', 'xiaohongshu')
  return { recommended: [...new Set(recommended)], warnings: [...new Set(warnings)] }
}
