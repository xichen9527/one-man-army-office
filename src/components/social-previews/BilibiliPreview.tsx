import React from 'react'
import { Play, MessageSquare, ThumbsUp, Star, Share2 } from 'lucide-react'

interface BilibiliPreviewProps {
  title: string
  content: string
  coverImage?: string
  username?: string
  avatar?: string
  category?: string
  duration?: string
}

export function BilibiliPreview({
  title,
  content,
  coverImage,
  username = '您的UP主名称',
  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=bilibili',
  category = '生活',
  duration = '03:45'
}: BilibiliPreviewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[520px]">
      {/* 视频封面 */}
      <div className="relative aspect-video bg-gray-900">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt="cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#23ade5] to-[#00b5e5]">
            <span className="text-white/50 text-sm">视频封面</span>
          </div>
        )}
        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
        {/* 时长 */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-white text-xs">
          {duration}
        </div>
      </div>

      {/* 标题 */}
      <div className="p-3">
        <h3 className="font-semibold text-[#18191c] text-base line-clamp-2 leading-snug">
          {title || '视频标题（最多80字）'}
        </h3>
      </div>

      {/* UP主信息 */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <img 
          src={avatar} 
          alt="avatar"
          className="w-6 h-6 rounded-full"
        />
        <span className="text-xs text-[#61666d]">{username}</span>
        <span className="text-xs text-[#9499a0]">·</span>
        <span className="text-xs px-1.5 py-0.5 bg-[#00aeec]/10 text-[#00aeec] rounded">
          {category}
        </span>
      </div>

      {/* 数据栏 */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-4 text-[#9499a0] text-xs">
        <span className="flex items-center gap-1">
          <Play size={14} />
          <span>1.2万</span>
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={14} />
          <span>328</span>
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp size={14} />
          <span>1.5万</span>
        </span>
        <span className="flex items-center gap-1">
          <Star size={14} />
          <span>收藏</span>
        </span>
        <span className="flex items-center gap-1">
          <Share2 size={14} />
          <span>分享</span>
        </span>
      </div>
    </div>
  )
}
