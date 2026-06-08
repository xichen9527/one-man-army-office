import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const AI_API_BASE_URL = Deno.env.get('AI_API_BASE_URL') || 'https://api.openai.com/v1'
const AI_API_KEY = Deno.env.get('AI_API_KEY') || ''
const AI_MODEL = Deno.env.get('AI_MODEL') || 'gpt-4o-mini'

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { messages, model, stream = false } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages 必须是非空数组' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 如果没有配置服务器 API Key，返回开发模式模拟响应
    if (!AI_API_KEY || AI_API_KEY === 'xxx') {
      const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()
      const mockContent = `[开发模式] 已收到您的消息：${lastUserMsg?.content || '（空）'}\n\n请在 Supabase Secrets 中配置 AI_API_KEY 以启用真实 AI 响应，或在「设置 → AI 模型」中配置自定义 API。`
      console.log(`[DEV MODE] 模拟 AI 响应，消息: ${lastUserMsg?.content}`)
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: mockContent } }],
        model: AI_MODEL,
        dev: true,
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const modelToUse = model || AI_MODEL
    const apiUrl = `${AI_API_BASE_URL.replace(/\/$/, '')}/chat/completions`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        stream,
      }),
      signal: AbortSignal.timeout(60000),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: data.error?.message || `API 请求失败 (${response.status})`,
        details: data,
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('text-generation error:', err)
    return new Response(JSON.stringify({
      error: err.message || '服务器内部错误',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
