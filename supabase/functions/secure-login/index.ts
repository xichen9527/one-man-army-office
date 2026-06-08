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
    const { identifier, password } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    if (!identifier || !password) {
      return new Response(JSON.stringify({ error: "缺少用户名或密码" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check active lock
    const { data: activeLock } = await supabase
      .from("account_locks")
      .select("*")
      .eq("user_identifier", identifier)
      .eq("is_active", true)
      .gt("locked_until", new Date().toISOString())
      .maybeSingle();

    if (activeLock) {
      const left = new Date(activeLock.locked_until).getTime() - Date.now();
      const mins = Math.ceil(left / 60000);
      return new Response(
        JSON.stringify({
          error: `账号已锁定，请 ${mins} 分钟后再试`,
          locked: true,
          locked_until: activeLock.locked_until,
          retry_in_mins: mins,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Count failures in last 30 mins
    const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: failCount } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_identifier", identifier)
      .eq("success", false)
      .gt("created_at", halfHourAgo);

    if (failCount !== null && failCount >= 5) {
      // Auto-lock: 5 failures in 30min → lock 30min
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabase.from("account_locks").insert({
        user_identifier: identifier,
        lock_type: "login_fail",
        is_active: true,
        locked_until: lockedUntil,
        ip_address: ip,
      });
      return new Response(
        JSON.stringify({
          error: "登录失败次数过多，账号已锁定30分钟",
          locked: true,
          locked_until: lockedUntil,
          retry_in_mins: 30,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Find user by username or email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, email")
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (!profile) {
      await supabase.from("login_attempts").insert({
        user_identifier: identifier,
        ip_address: ip,
        user_agent: ua,
        success: false,
        failure_reason: "user_not_found",
      });
      return new Response(
        JSON.stringify({ error: "用户名或密码错误", attempts_left: 4 - (failCount || 0) }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Call Supabase Auth signInWithPassword
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        email: profile.email,
        password: password,
      }),
    });
    const authData = await authRes.json();

    if (!authRes.ok || authData.error) {
      const newFailCount = (failCount || 0) + 1;
      await supabase.from("login_attempts").insert({
        user_identifier: identifier,
        ip_address: ip,
        user_agent: ua,
        success: false,
        failure_reason: "wrong_password",
      });

      if (newFailCount >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await supabase.from("account_locks").insert({
          user_identifier: identifier,
          user_id: profile.id,
          ip_address: ip,
          lock_type: "login_fail",
          is_active: true,
          locked_until: lockedUntil,
        });
        return new Response(
          JSON.stringify({
            error: "登录失败次数过多，账号已锁定30分钟",
            locked: true,
            locked_until: lockedUntil,
            retry_in_mins: 30,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "用户名或密码错误",
          attempts_left: 5 - newFailCount,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Login success
    await supabase.from("login_attempts").insert({
      user_identifier: identifier,
      user_id: profile.id,
      ip_address: ip,
      user_agent: ua,
      success: true,
    });

    // Clear any active lock
    await supabase
      .from("account_locks")
      .update({ is_active: false, unlock_reason: "login_success" })
      .eq("user_identifier", identifier)
      .eq("is_active", true);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData,
        user: { id: profile.id, username: profile.username, email: profile.email },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("secure-login error:", e);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});