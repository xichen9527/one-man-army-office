/// <reference types="https://esm.sh/@supabase/functions-api@0" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const TENCENT_MEETING_BASE_URL = 'https://api.meeting.qq.com'

// 生成腾讯会议 API 签名（Deno 环境）
async function generateSignature(appId: string, secretKey: string, timestamp: number): Promise<string> {
  const message = `appid=${appId}&timestamp=${timestamp}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req: Request) => {
  // CORS 处理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const APP_ID = Deno.env.get('TENCENT_MEETING_APP_ID')
    const SECRET_KEY = Deno.env.get('TENCENT_MEETING_SECRET_KEY')

    if (!APP_ID || !SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error: '腾讯会议 API 未配置',
          help: '请在 Supabase Dashboard → Settings → Edge Functions 中配置 TENCENT_MEETING_APP_ID 和 TENCENT_MEETING_SECRET_KEY'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { action, data } = await req.json()
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await generateSignature(APP_ID, SECRET_KEY, timestamp)

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'AppId': APP_ID,
      'Timestamp': timestamp.toString(),
      'Signature': signature,
    }

    let apiUrl = ''
    let method = 'POST'
    let body: any = null

    // 根据 action 调用不同的腾讯会议 API
    switch (action) {
      case 'create_meeting':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings`
        method = 'POST'
        body = {
          subject: data.subject || '快速会议',
          start_time: data.start_time || new Date().toISOString(),
          end_time: data.end_time || new Date(Date.now() + 3600000).toISOString(),
          timezone: data.timezone || 'Asia/Shanghai',
          userid: data.userid || 'admin',
          instanceid: 1,
          settings: {
            mute_enable_join: true,
            allow_unmute_self: true,
            mute_all: false,
          }
        }
        break

      case 'get_meetings':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings?userid=${data.userid || 'admin'}&instanceid=1&status=all`
        method = 'GET'
        break

      case 'cancel_meeting':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings/${data.meeting_id}?userid=${data.userid || 'admin'}&instanceid=1`
        method = 'DELETE'
        break

      default:
        return new Response(
          JSON.stringify({ error: '未知操作', action }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        )
    }

    // 调用腾讯会议 API
    const apiResp = await fetch(apiUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const result = await apiResp.json()

    return new Response(
      JSON.stringify(result),
      { status: apiResp.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
