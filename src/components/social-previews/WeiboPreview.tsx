import React from 'react'
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'

interface WeiboPreviewProps {
  content: string
  images: string[]
  username?: string
  avatar?: string
  time?: string
}

export function WeiboPreview({ 
  content, 
  images, 
  username = '您的微博昵称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=weibo',
  time = '刚刚'
}: WeiboPreviewProps) {
  // 高亮话题标签
  const renderContent = (text: string) => {
    const parts = text.split(/(#[^#]+#)/g)
    return parts.map((part, i) => {
      if (part.startsWith('#') && part.endsWith('#')) {
        return <span key={i} className="text-[#eb7350] hover:underline cursor-pointer">{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  // 图片网格布局
  const getImageGridClass = () => {
    const count = images.length
    if (count === 0) return ''
    if (count === 1) return 'grid-cols-1 max-w-[200px]'
    if (count === 2 || count === 4) return 'grid-cols-2'
    return 'grid-cols-3'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[500px]">
      {/* 头部 */}
      <div className="p-4 flex items-start gap-3">
        <img 
          src={avatar} 
          alt="avatar" 
          className="w-10 h-10 rounded-full border border-gray-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#333] text-sm">{username}</span>
            <span className="text-[#f4a460] text-xs">V</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {time} <span className="mx-1">·</span> 来自 微博网页版
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 内容 */}
      <div className="px-4 pb-3">
        <div className="text-[#333] text-sm leading-relaxed whitespace-pre-wrap">
          {renderContent(content || '这里显示微博内容...')}
        </div>
      </div>

      {/* 图片网格 */}
      {images.length > 0 && (
        <div className="px-4 pb-3">
          <div className={`grid gap-1 ${getImageGridClass()}`}>
            {images.slice(0, 9).map((img, i) => (
              <div 
                key={i} 
                className={`relative bg-gray-100 rounded overflow-hidden ${
                  images.length === 1 ? 'aspect-video' : 'aspect-square'
                }`}
              >
                <img 
                  src={img} 
                  alt={`img-${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-gray-500 text-xs">
        <button className="flex items-center gap-1 hover:text-[#eb7350] transition-colors">
          <Share2 size={16} />
          <span>转发</span>
        </button>
        <button className="flex items-center gap-1 hover:text-[#eb7350] transition-colors">
          <MessageCircle size={16} />
          <span>评论</span>
        </button>
        <button className="flex items-center gap-1 hover:text-[#eb7350] transition-colors">
          <Heart size={16} />
          <span>点赞</span>
        </button>
      </div>
    </div>
  )
}
