import React from 'react'
import { Heart, MessageCircle, Share2, Music2, Bookmark } from 'lucide-react'

interface DouyinPreviewProps {
  content: string
  coverImage?: string
  username?: string
  avatar?: string
  music?: string
}

export function DouyinPreview({
  content,
  coverImage,
  username = '您的抖音昵称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=douyin',
  music = '热门音乐 - 原声'
}: DouyinPreviewProps) {
  // 提取话题标签
  const tags = content.match(/#[^#\s]+/g) || []
  const cleanContent = content.replace(/#[^#\s]+/g, '').trim()

  return (
    <div className="bg-black rounded-lg overflow-hidden max-w-[280px]">
      {/* 视频区域（9:16） */}
      <div className="relative aspect-[9/16] bg-gray-900">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt="cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#161823] to-[#0f0f1a]">
            <span className="text-white/30 text-sm">视频预览（9:16）</span>
          </div>
        )}

        {/* 右侧操作栏 */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
            </div>
            <div className="w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center -mt-2">
              <span className="text-white text-xs">+</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Heart size={28} fill="white" />
            <span className="text-xs font-medium">1.2万</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <MessageCircle size={28} fill="white" />
            <span className="text-xs font-medium">328</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Bookmark size={28} fill="white" />
            <span className="text-xs font-medium">收藏</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Share2 size={28} fill="white" />
            <span className="text-xs font-medium">分享</span>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="absolute left-3 right-16 bottom-4 text-white">
          <div className="font-medium text-sm mb-1">@{username}</div>
          <div className="text-sm leading-relaxed mb-2 line-clamp-3">
            {cleanContent || '视频描述内容...'}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-sm">{tag}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Music2 size={14} className="animate-spin" />
            <span className="truncate max-w-[150px]">{music}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
