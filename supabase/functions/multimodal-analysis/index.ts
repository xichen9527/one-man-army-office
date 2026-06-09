import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { type, data } = await req.json()

    if (!type || !data) {
      return new Response(JSON.stringify({ error: '缺少必要参数: type, data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['image', 'document'].includes(type)) {
      return new Response(JSON.stringify({ error: 'type 必须是 image 或 document' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const AI_API_BASE_URL = Deno.env.get('AI_API_BASE_URL') || 'https://api.openai.com/v1'
    const AI_API_KEY = Deno.env.get('AI_API_KEY') || ''
    const AI_MODEL = Deno.env.get('AI_VISION_MODEL') || Deno.env.get('AI_MODEL') || 'gpt-4o-mini'

    // Degraded mode: no API key
    if (!AI_API_KEY || AI_API_KEY === 'xxx') {
      return new Response(JSON.stringify({
        analysis: `[开发模式] 多模态分析功能需要配置 AI_API_KEY。当前接收到 ${type} 类型数据，请配置AI服务后重试。`,
        tags: [type, '待分析'],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build vision message content
    let contentParts: any[]

    if (type === 'image') {
      // data can be URL or base64
      const imageUrl = data.startsWith('http')
        ? { type: 'image_url', image_url: { url: data } }
        : { type: 'image_url', image_url: { url: `data:image/png;base64,${data}` } }

      contentParts = [
        { type: 'text', text: '请详细描述这张图片的内容，并提取关键标签。用JSON格式返回：{"analysis": "描述内容", "tags": ["标签1", "标签2"]}' },
        imageUrl,
      ]
    } else {
      // Document: base64 encoded text content
      let docText: string
      try {
        docText = atob(data)
      } catch {
        docText = data // treat as plain text
      }

      contentParts = [
        {
          type: 'text',
          text: `请分析以下文档内容，给出摘要和关键标签。用JSON格式返回：{"analysis": "分析内容", "tags": ["标签1", "标签2"]}\n\n文档内容：\n${docText.substring(0, 8000)}`,
        },
      ]
    }

    const apiUrl = `${AI_API_BASE_URL.replace(/\/$/, '')}/chat/completions`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(60000),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('AI API error:', result)
      return new Response(JSON.stringify({
        analysis: 'AI分析服务暂时不可用，请稍后重试',
        tags: [type, '分析失败'],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse AI response
    const aiContent = result.choices?.[0]?.message?.content || ''
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return new Response(JSON.stringify({
          analysis: parsed.analysis || aiContent,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [type],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } catch {
      // JSON parse failed, use raw content
    }

    return new Response(JSON.stringify({
      analysis: aiContent,
      tags: [type],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('multimodal-analysis error:', e)
    return new Response(JSON.stringify({
      analysis: '分析服务暂时不可用，请稍后重试',
      tags: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
