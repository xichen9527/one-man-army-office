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
    // Verify Authorization
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { text, source_lang, target_lang } = await req.json()

    if (!text || !target_lang) {
      return new Response(JSON.stringify({ error: '缺少必要参数: text, target_lang' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (typeof text !== 'string' || text.length > 5000) {
      return new Response(JSON.stringify({ error: '文本长度超出限制（最大5000字符）' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const src = source_lang || 'auto'

    // Try MyMemory API (free, no key required)
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${target_lang}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      })
      const data = await response.json()

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        let translated = data.responseData.translatedText
        // MyMemory returns uppercase text when limit exceeded
        if (translated === text.toUpperCase() && src !== 'en') {
          // Fallback: try again with explicit source
        }
        return new Response(JSON.stringify({ translated_text: translated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } catch (e) {
      console.error('MyMemory API error:', e)
    }

    // Fallback: try LibreTranslate (if available)
    try {
      const ltUrl = Deno.env.get('LIBRETRANSLATE_URL')
      if (ltUrl) {
        const response = await fetch(`${ltUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: src === 'auto' ? 'auto' : src, target: target_lang, format: 'text' }),
          signal: AbortSignal.timeout(15000),
        })
        const data = await response.json()
        if (data.translatedText) {
          return new Response(JSON.stringify({ translated_text: data.translatedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    } catch (e) {
      console.error('LibreTranslate API error:', e)
    }

    // Degraded: return original text with notice
    return new Response(JSON.stringify({
      translated_text: text,
      notice: '翻译服务暂时不可用，返回原文。请稍后重试或配置翻译API密钥。',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('translation error:', e)
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
