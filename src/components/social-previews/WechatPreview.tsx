import React from 'react'
import { Eye, ThumbsUp, MessageCircle } from 'lucide-react'

interface WechatPreviewProps {
  title: string
  content: string
  coverImage?: string
  username?: string
  avatar?: string
  readCount?: number
  likeCount?: number
}

export function WechatPreview({
  title,
  content,
  coverImage,
  username = '您的公众号',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=wechat',
  readCount = 1234,
  likeCount = 56
}: WechatPreviewProps) {
  // 提取摘要（前60字）
  const summary = content.slice(0, 60) + (content.length > 60 ? '...' : '')

  return (
    <div className="bg-[#f5f5f5] rounded-lg overflow-hidden max-w-[375px]">
      {/* 公众号文章卡片样式 */}
      <div className="bg-white m-3 rounded-lg overflow-hidden shadow-sm">
        {/* 封面图 */}
        <div className="relative aspect-[16/9] bg-gray-100">
          {coverImage ? (
            <img 
              src={coverImage} 
              alt="cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#07c160]/20 to-[#07c160]/5">
              <span className="text-[#07c160]/40 text-sm">公众号封面</span>
            </div>
          )}
        </div>

        {/* 标题 */}
        <div className="p-3">
          <h3 className="font-semibold text-[#333] text-base line-clamp-2 leading-snug">
            {title || '公众号文章标题'}
          </h3>
          <p className="text-xs text-[#999] mt-2 line-clamp-2">
            {summary || '文章摘要...'}
          </p>
        </div>

        {/* 底部信息 */}
        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-[#999]">
          <div className="flex items-center gap-2">
            <img 
              src={avatar} 
              alt="avatar"
              className="w-4 h-4 rounded"
            />
            <span>{username}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <Eye size={12} />
              <span>{readCount >= 10000 ? `${(readCount/10000).toFixed(1)}万` : readCount}</span>
            </span>
            <span className="flex items-center gap-0.5">
              <ThumbsUp size={12} />
              <span>{likeCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 朋友圈样式预览 */}
      <div className="bg-white m-3 mt-0 rounded-lg p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <img 
            src={avatar} 
            alt="avatar"
            className="w-8 h-8 rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[#576b95] font-medium">{username}</div>
            <div className="text-sm text-[#333] mt-1 line-clamp-3">
              {content.slice(0, 100) || '分享了一篇文章'}
            </div>
            {/* 文章卡片（朋友圈内嵌） */}
            <div className="mt-2 bg-[#f7f7f7] rounded p-2 flex gap-2">
              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                {coverImage && (
                  <img src={coverImage} alt="thumb" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#333] line-clamp-2">{title || '文章标题'}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#b2b2b2]">刚刚</div>
          </div>
        </div>
      </div>
    </div>
  )
}
