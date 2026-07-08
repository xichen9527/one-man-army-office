import React from 'react'
import { Heart, Star, MessageCircle } from 'lucide-react'

interface XiaohongshuPreviewProps {
  title: string
  content: string
  images: string[]
  username?: string
  avatar?: string
}

export function XiaohongshuPreview({
  title,
  content,
  images,
  username = '您的小红书昵称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=xhs'
}: XiaohongshuPreviewProps) {
  // 提取标签
  const tags = content.match(/#[^#\s]+/g) || []
  const cleanContent = content.replace(/#[^#\s]+/g, '').trim()

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[375px]">
      {/* 封面图（小红书是3:4） */}
      <div className="relative aspect-[3/4] bg-gray-100">
        {images[0] ? (
          <img 
            src={images[0]} 
            alt="cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff2442]/20 to-[#ff2442]/5">
            <span className="text-[#ff2442]/40 text-sm">封面图（3:4）</span>
          </div>
        )}
        {/* 多图指示器 */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 rounded-full text-white text-xs">
            1/{images.length}
          </div>
        )}
      </div>

      {/* 标题 */}
      <div className="p-3">
        <h3 className="font-medium text-[#333] text-sm line-clamp-2 leading-snug">
          {title || '小红书标题（最多20字）'}
        </h3>
      </div>

      {/* 作者信息 */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={avatar} 
            alt="avatar"
            className="w-5 h-5 rounded-full"
          />
          <span className="text-xs text-[#666]">{username}</span>
        </div>
        <div className="flex items-center gap-3 text-[#999] text-xs">
          <span className="flex items-center gap-0.5">
            <Heart size={12} />
            <span>128</span>
          </span>
          <span className="flex items-center gap-0.5">
            <Star size={12} />
            <span>56</span>
          </span>
        </div>
      </div>

      {/* 内容预览（展开时显示） */}
      {cleanContent && (
        <div className="px-3 pb-3">
          <p className="text-xs text-[#666] line-clamp-3 leading-relaxed">
            {cleanContent}
          </p>
        </div>
      )}

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((tag, i) => (
            <span 
              key={i}
              className="text-xs text-[#576b95] bg-[#f5f5f5] px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
