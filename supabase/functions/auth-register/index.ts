import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const username = (body.username ?? body.display_name ?? "").trim();
    const walletAddress = (body.walletAddress ?? body.wallet_address ?? "").trim();

    if (!username || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Username and wallet address are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      // Check if wallet already exists (one account per wallet)
      const { data: existingByWallet } = await supabase
        .from("profiles")
        .select("id")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (existingByWallet) {
        return new Response(
          JSON.stringify({ error: "Wallet is already registered." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Block registration if username is already used (case-insensitive)
      const { data: usernameTaken, error: rpcError } = await supabase
        .rpc("profile_username_exists", { _username: username });

      if (rpcError) {
        // Fallback when RPC is missing: check with ilike (case-insensitive), exact match by escaping %_
        const escaped = username.replace(/[%_\\]/g, "\\$&");
        const { data: existingByName } = await supabase
          .from("profiles")
          .select("id")
          .ilike("display_name", escaped)
          .limit(1);
        if (existingByName && existingByName.length > 0) {
          return new Response(
            JSON.stringify({ error: "Username is already taken." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (usernameTaken) {
        return new Response(
          JSON.stringify({ error: "Username is already taken." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          display_name: username,
          wallet_address: walletAddress,
        })
        .select("id, display_name, wallet_address, total_wins, total_predictions, total_claimed_usd, unclaimed_rewards_sol")
        .single();

      if (insertError) {
        const code = (insertError as { code?: string }).code;
        const msg = (insertError.message || "").toLowerCase();
        // Unique violation: never allow duplicate username or wallet
        if (code === "23505") {
          if (msg.includes("wallet") || (insertError as { details?: string }).details?.includes("wallet")) {
            return new Response(
              JSON.stringify({ error: "Wallet is already registered." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: "Username is already taken." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("Profile insert error:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message || "Registration failed." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ user: profile }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login") {
      const { data: profile, error: selectError } = await supabase
        .from("profiles")
        .select("id, display_name, wallet_address, total_wins, total_predictions, total_claimed_usd, unclaimed_rewards_sol")
        .eq("display_name", username)
        .maybeSingle();

      if (selectError || !profile) {
        return new Response(
          JSON.stringify({ error: "User not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile.wallet_address !== walletAddress) {
        return new Response(
          JSON.stringify({ error: "Wallet address does not match this username." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ user: profile }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'register' or 'login'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auth-register error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
