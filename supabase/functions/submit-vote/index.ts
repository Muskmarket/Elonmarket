import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify token balance on-chain using Solana RPC
async function verifyTokenBalanceOnChain(
  walletAddress: string,
  tokenContract: string,
  rpcUrl: string
): Promise<number> {
  if (!tokenContract || tokenContract.length === 0) {
    return Infinity;
  }

  try {
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
      const tokenAmount = data.result.value[0].account.data.parsed.info.tokenAmount;
      return Number(tokenAmount.uiAmount) || 0;
    }
    
    return 0;
  } catch (error) {
    console.error("Error verifying token balance on-chain:", error);
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, roundId, optionId } = await req.json();

    if (!walletAddress || !roundId || !optionId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get wallet config for minimum token balance
    const { data: walletConfig } = await supabase
      .from("wallet_config")
      .select("min_token_balance, token_contract_address")
      .single();

    const minBalance = walletConfig?.min_token_balance || 1;
    const tokenContract = walletConfig?.token_contract_address || "";

    // Verify token balance ON-CHAIN (server-side verification)
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
    const verifiedTokenBalance = await verifyTokenBalanceOnChain(walletAddress, tokenContract, rpcUrl);
    
    if (verifiedTokenBalance < minBalance) {
      return new Response(
        JSON.stringify({
          error: `Insufficient token balance. Required: ${minBalance}, Verified: ${verifiedTokenBalance}`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if round is open
    const { data: round } = await supabase
      .from("prediction_rounds")
      .select("*")
      .eq("id", roundId)
      .single();

    if (!round || round.status !== "open") {
      return new Response(JSON.stringify({ error: "Round is not open for voting" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vote locking logic: lock votes X minutes before prediction_start_time
    if (round.prediction_start_time) {
      const now = new Date();
      const predictionStart = new Date(round.prediction_start_time);
      const voteLockMinutes = round.vote_lock_minutes || 60;
      const voteLockTime = new Date(predictionStart.getTime() - voteLockMinutes * 60 * 1000);

      if (now >= voteLockTime) {
        const minutesUntilPrediction = Math.ceil((predictionStart.getTime() - now.getTime()) / (60 * 1000));
        return new Response(
          JSON.stringify({
            error: `Voting is locked. Prediction monitoring starts in ${minutesUntilPrediction > 0 ? minutesUntilPrediction + " minutes" : "now"}.`,
            vote_locked: true,
            prediction_start_time: round.prediction_start_time,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get or create user profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) {
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          wallet_address: walletAddress,
          display_name: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        })
        .select("id")
        .single();

      if (profileError) {
        throw profileError;
      }
      profile = newProfile;

      // Add user role
      await supabase.from("user_roles").insert({
        user_id: profile.id,
        role: "user",
      });
    }

    // Check if user already voted this round
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("round_id", roundId)
      .eq("user_id", profile.id)
      .single();

    if (existingVote) {
      return new Response(JSON.stringify({ error: "You have already voted this round" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert vote
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        round_id: roundId,
        user_id: profile.id,
        option_id: optionId,
        wallet_address: walletAddress,
        token_balance_at_vote: verifiedTokenBalance,
      })
      .select()
      .single();

    if (voteError) {
      throw voteError;
    }

    return new Response(JSON.stringify({ success: true, vote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error submitting vote:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
