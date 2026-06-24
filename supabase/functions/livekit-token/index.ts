// Supabase Edge Function: 生成 LiveKit Room Token
// 从数据库读取用户的 LiveKit 配置
// 文件路径: supabase/functions/livekit-token/index.ts
// 【修复问题3】使用两个独立的 client：
//   1. authClient: 用于验证用户身份（传 Authorization header）
//   2. serviceClient: 用于读取 video_conference_configs 表（用 service_role key，不传 Authorization 避免 RLS 冲突）

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRequest {
  roomName: string
  participantName?: string
  // 权限：join | create
  action: 'join' | 'create'
  // 可选：客户端直接传入配置（优先使用），避免依赖数据库中的 video_conference_configs 表
  serverUrl?: string
  apiKey?: string
  apiSecret?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    // 【修复核心】创建两个独立的 client，避免 Authorization header 与 service_role 冲突
    // client 1: 验证用户身份（使用 anon key + Authorization header）
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader! } }
    })

    // client 2: 读取配置（使用 service_role key，绕过 RLS，直接读取 video_conference_configs 表）
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      console.error('[livekit-token] 认证失败:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: '用户认证失败，请重新登录' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 解析请求
    const { roomName, participantName, action, serverUrl: clientUrl, apiKey: clientKey, apiSecret: clientSecret }: TokenRequest = await req.json().catch(() => ({}))

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'roomName is required', message: '房间名称不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 获取 LiveKit 配置：优先使用客户端传入的，其次查数据库
    let livekitUrl: string, livekitApiKey: string, livekitApiSecret: string

    if (clientUrl && clientKey && clientSecret) {
      // 客户端直接提供配置（从 localStorage 读取）
      livekitUrl = clientUrl
      livekitApiKey = clientKey
      livekitApiSecret = clientSecret
      console.log('[livekit-token] 使用客户端传入配置')
    } else {
      // 【修复】使用 serviceClient 读取配置（绕过 RLS）
      const { data: config, error: configError } = await serviceClient
        .from('video_conference_configs')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('[livekit-token] 数据库配置查询结果:', { config: !!config, configError: configError?.message })

      if (configError || !config) {
        return new Response(
          JSON.stringify({
            error: 'LiveKit not configured. Please configure it in Settings -> Video Conference or re-save your LiveKit config.',
            code: 'CONFIG_NOT_FOUND',
            debug: { userId: user.id, configError: configError?.message }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      livekitUrl = config.server_url
      livekitApiKey = config.api_key
      livekitApiSecret = config.api_secret
    }

    console.log('[livekit-token] 配置读取成功:', { livekitUrl: !!livekitUrl, hasApiKey: !!livekitApiKey, hasApiSecret: !!livekitApiSecret })

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({
          error: 'Incomplete LiveKit configuration. Please check your settings.',
          code: 'CONFIG_INCOMPLETE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 生成 Token
    const participantIdentity = user.id
    const displayName = participantName || user.email?.split('@')[0] || 'Guest'

    const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: participantIdentity,
      name: displayName,
    })

    // 添加房间权限
    if (action === 'create') {
      // 创建者有完整权限
      accessToken.addGrant({
        room: roomName,
        roomJoin: true,
        roomCreate: true,
        roomAdmin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      })
    } else {
      // 加入者有基本权限
      accessToken.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      })
    }

    const token = accessToken.toJwt()
    console.log('[livekit-token] Token 生成成功，房间:', roomName)

    return new Response(
      JSON.stringify({
        token,
        url: livekitUrl,
        roomName,
        participantIdentity,
        displayName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('LiveKit token generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
