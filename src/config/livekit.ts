/**
 * LiveKit Cloud 视频会议配置
 * 文档：https://docs.livekit.io/
 */

export const LIVEKIT_CONFIG = {
  // LiveKit Cloud 服务器地址（用户在设置中配置）
  // 格式：https://your-project.livekit.cloud
  serverUrl: '',

  // API Key 和 Secret（用于后端生成 Token）
  // 前端不直接使用，通过 Edge Function 获取
  apiKey: '',
  apiSecret: '',
}

/**
 * LiveKit 房间配置
 */
export const ROOM_CONFIG = {
  // 默认房间设置
  defaultRoomOptions: {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: { width: 1280, height: 720, frameRate: 30 },
    },
  },

  // 预设布局
  layouts: ['grid', 'speaker', 'split'] as const,
}

export type LiveKitLayout = typeof ROOM_CONFIG.layouts[number]

/**
 * 会议状态
 */
export type MeetingStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'

/**
 * 房间参与者信息
 */
export interface ParticipantInfo {
  identity: string
  name: string
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
}
