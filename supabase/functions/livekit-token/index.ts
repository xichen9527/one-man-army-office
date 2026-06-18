// Supabase Edge Function: 生成 LiveKit Room Token
// 从数据库读取用户的 LiveKit 配置
// 文件路径: supabase/functions/livekit-token/index.ts

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 验证用户身份
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用 service role key 读取配置表
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 解析请求
    const { roomName, participantName, action }: TokenRequest = await req.json()

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'roomName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 从数据库读取用户的 LiveKit 配置
    const { data: config, error: configError } = await supabaseClient
      .from('video_conference_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          error: 'LiveKit not configured. Please configure it in Settings -> Video Conference.',
          code: 'CONFIG_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const livekitUrl = config.server_url
    const livekitApiKey = config.api_key
    const livekitApiSecret = config.api_secret

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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
