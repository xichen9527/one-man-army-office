/// <reference types="https://esm.sh/@supabase/functions-api@0" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const TENCENT_MEETING_BASE_URL = 'https://api.meeting.qq.com'

// 生成腾讯会议 API 签名
async function generateSignature(appId: string, secretKey: string, timestamp: number): Promise<string> {
  const message = `appid=${appId}&timestamp=${timestamp}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const { action, data, credentials } = body as {
      action: string
      data?: Record<string, unknown>
      credentials?: { app_id: string; secret_key: string }
    }

    // 用户自主连接模式：优先从请求体读凭证，fallback 到环境变量
    const APP_ID = credentials?.app_id || Deno.env.get('TENCENT_MEETING_APP_ID') || ''
    const SECRET_KEY = credentials?.secret_key || Deno.env.get('TENCENT_MEETING_SECRET_KEY') || ''

    if (!APP_ID || !SECRET_KEY) {
      return new Response(JSON.stringify({
        error: '腾讯会议 API 未配置',
        help: '请在「设置 → 第三方服务」中填写腾讯会议 App ID 和 Secret Key',
      }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
    }

    // 测试连接
    if (action === 'test') {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = await generateSignature(APP_ID, SECRET_KEY, timestamp)
      const resp = await fetch(`${TENCENT_MEETING_BASE_URL}/v1/meetings?userid=admin&instanceid=1&status=all`, {
        headers: {
          'Content-Type': 'application/json',
          'AppId': APP_ID,
          'Timestamp': timestamp.toString(),
          'Signature': signature,
        },
      })
      return new Response(JSON.stringify({
        ok: resp.ok,
        status: resp.status,
      }), { status: resp.ok ? 200 : 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await generateSignature(APP_ID, SECRET_KEY, timestamp)
    const headers = {
      'Content-Type': 'application/json',
      'AppId': APP_ID,
      'Timestamp': timestamp.toString(),
      'Signature': signature,
    }

    let apiUrl = ''
    let method = 'POST'
    let reqBody: string | undefined

    switch (action) {
      case 'create_meeting':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings`
        reqBody = JSON.stringify({
          subject: data?.subject || '快速会议',
          start_time: data?.start_time || new Date().toISOString(),
          end_time: data?.end_time || new Date(Date.now() + 3600000).toISOString(),
          timezone: data?.timezone || 'Asia/Shanghai',
          userid: data?.userid || 'admin',
          instanceid: 1,
          settings: { mute_enable_join: true, allow_unmute_self: true, mute_all: false },
        })
        break

      case 'get_meetings':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings?userid=${data?.userid || 'admin'}&instanceid=1&status=all`
        method = 'GET'
        break

      case 'cancel_meeting':
        apiUrl = `${TENCENT_MEETING_BASE_URL}/v1/meetings/${data?.meeting_id}?userid=${data?.userid || 'admin'}&instanceid=1`
        method = 'DELETE'
        break

      default:
        return new Response(JSON.stringify({ error: '未知操作', action }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        })
    }

    const apiResp = await fetch(apiUrl, {
      method,
      headers,
      body: reqBody,
    })

    const result = await apiResp.json()
    return new Response(JSON.stringify(result), {
      status: apiResp.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
