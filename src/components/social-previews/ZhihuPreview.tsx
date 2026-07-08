import React from 'react'
import { ThumbsUp, MessageCircle, Star, Share2, MoreHorizontal } from 'lucide-react'

interface ZhihuPreviewProps {
  title: string
  content: string
  images: string[]
  username?: string
  avatar?: string
  bio?: string
}

export function ZhihuPreview({
  title,
  content,
  images,
  username = '您的知乎昵称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhihu',
  bio = '个人简介'
}: ZhihuPreviewProps) {
  // 提取摘要
  const summary = content.slice(0, 120) + (content.length > 120 ? '...' : '')

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[600px]">
      {/* 问题标题 */}
      <div className="p-4 pb-2">
        <h2 className="text-lg font-bold text-[#121212] leading-snug">
          {title || '问题：您的问题标题是什么？'}
        </h2>
      </div>

      {/* 作者信息 */}
      <div className="px-4 py-3 flex items-center gap-3">
        <img 
          src={avatar} 
          alt="avatar"
          className="w-10 h-10 rounded"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#121212] text-sm">{username}</span>
            <span className="text-xs px-1.5 py-0.5 bg-[#0066ff]/10 text-[#0066ff] rounded">
              作者
            </span>
          </div>
          <div className="text-xs text-[#8590a6] mt-0.5">{bio}</div>
        </div>
        <button className="px-3 py-1.5 bg-[#0066ff] text-white text-xs rounded hover:bg-[#0052cc]">
          + 关注
        </button>
      </div>

      {/* 回答内容 */}
      <div className="px-4 pb-3">
        <div className="text-[#121212] text-sm leading-relaxed whitespace-pre-wrap">
          {summary || '回答内容...'}
        </div>
        
        {/* 图片 */}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden">
                <img src={img} alt={`img-${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* 展开阅读全文 */}
        <div className="mt-3 text-[#175199] text-sm cursor-pointer hover:underline">
          阅读全文 <span className="text-xs">▼</span>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
        <button className="flex items-center gap-1.5 text-[#8590a6] hover:text-[#0066ff] transition-colors">
          <div className="flex items-center bg-[#0066ff]/10 rounded px-2 py-1">
            <ThumbsUp size={14} className="text-[#0066ff]" />
            <span className="text-xs text-[#0066ff] ml-1">赞同 128</span>
          </div>
          <div className="bg-[#0066ff]/10 rounded px-2 py-1">
            <ThumbsUp size={14} className="text-[#0066ff] rotate-180" />
          </div>
        </button>
        
        <button className="flex items-center gap-1 text-[#8590a6] hover:text-[#8590a6]/80 text-sm">
          <MessageCircle size={16} />
          <span>32 条评论</span>
        </button>
        
        <button className="flex items-center gap-1 text-[#8590a6] hover:text-[#8590a6]/80 text-sm">
          <Star size={16} />
          <span>收藏</span>
        </button>
        
        <button className="flex items-center gap-1 text-[#8590a6] hover:text-[#8590a6]/80 text-sm">
          <Share2 size={16} />
          <span>分享</span>
        </button>
        
        <button className="ml-auto text-[#8590a6]">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  )
}
