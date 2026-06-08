import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, source } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "缺少搜索关键词" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("AI_SEARCH_API_KEY");
    const cx = Deno.env.get("GOOGLE_SEARCH_CX");

    // If Google Custom Search is configured
    if (apiKey && cx) {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10&hl=zh-CN`;
      const res = await fetch(searchUrl);
      const data = await res.json();

      if (data.items) {
        const results = data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          source: item.displayLink,
        }));
        return new Response(JSON.stringify({ success: true, query, results, total: data.searchInformation?.totalResults }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: Use DuckDuckGo HTML scrape (simple, no API key needed)
    // This is a demo implementation - in production you should use a proper search API
    const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=cn-zh`;
    const res = await fetch(ddgUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AI Assistant/1.0)" },
    });
    const html = await res.text();

    // Parse simple results from HTML
    const results: any[] = [];
    const regex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 10) {
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const url = match[1];
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();
      if (title && url && !url.includes('duckduckgo')) {
        results.push({ title, link: url, snippet, source: new URL(url).hostname });
        count++;
      }
    }

    if (results.length > 0) {
      return new Response(JSON.stringify({ success: true, query, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "搜索服务暂不可用，请配置 AI_SEARCH_API_KEY 和 GOOGLE_SEARCH_CX" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});