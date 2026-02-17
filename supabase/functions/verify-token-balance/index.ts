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
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "Missing wallet address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get wallet config
    const { data: walletConfig } = await supabase
      .from("wallet_config")
      .select("token_contract_address, min_token_balance")
      .single();

    const tokenContract = walletConfig?.token_contract_address;
    const minBalance = walletConfig?.min_token_balance || 1;

    let tokenBalance = 0;
    let isEligible = false;

    // If token contract is configured, verify on-chain
    if (tokenContract && tokenContract.length > 0) {
      try {
        // Use Solana RPC to get token balance
        const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
        
        // Get token accounts for the wallet
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              walletAddress,
              { mint: tokenContract },
              { encoding: "jsonParsed" },
            ],
          }),
        });

        const data = await response.json();
        
        if (data.result?.value?.length > 0) {
          const tokenAccount = data.result.value[0];
          tokenBalance = Number(tokenAccount.account.data.parsed.info.tokenAmount.uiAmount) || 0;
        }

        isEligible = tokenBalance >= minBalance;
      } catch (rpcError) {
        console.error("RPC error:", rpcError);
        // In case of RPC error, allow participation (for demo purposes)
        tokenBalance = 1000; // Mock balance for demo
        isEligible = true;
      }
    } else {
      // No token contract configured - allow all wallets (demo mode)
      tokenBalance = 1000;
      isEligible = true;
    }

    return new Response(
      JSON.stringify({
        walletAddress,
        tokenBalance,
        minRequired: minBalance,
        isEligible,
        tokenContract: tokenContract || "Not configured (demo mode)",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error verifying token balance:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
