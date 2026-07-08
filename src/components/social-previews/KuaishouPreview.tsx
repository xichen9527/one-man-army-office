import React from 'react'
import { Heart, MessageCircle, Share2, Music2 } from 'lucide-react'

interface KuaishouPreviewProps {
  content: string
  coverImage?: string
  username?: string
  avatar?: string
  music?: string
}

export function KuaishouPreview({
  content,
  coverImage,
  username = '您的快手昵称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=kuaishou',
  music = '热门音乐'
}: KuaishouPreviewProps) {
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#ff6600]/20 to-[#ff6600]/5">
            <span className="text-white/30 text-sm">视频预览（9:16）</span>
          </div>
        )}

        {/* 右上角头像 */}
        <div className="absolute top-3 right-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden">
            <img src={avatar} alt="avatar" className="w-full h-full" />
          </div>
          <div className="w-5 h-5 rounded-full bg-[#ff6600] flex items-center justify-center -mt-2 mx-auto relative z-10">
            <span className="text-white text-xs">+</span>
          </div>
        </div>

        {/* 右侧操作栏 */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Heart size={32} fill="white" />
            <span className="text-xs font-medium">8.5万</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <MessageCircle size={32} fill="white" />
            <span className="text-xs font-medium">1.2万</span>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 text-white">
            <Share2 size={32} fill="white" />
            <span className="text-xs font-medium">分享</span>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="absolute left-3 right-16 bottom-4 text-white">
          <div className="text-sm leading-relaxed mb-2 line-clamp-3">
            @{username}：{cleanContent || '视频描述内容...'}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-sm text-[#ff6600]">{tag}</span>
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
