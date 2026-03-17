import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  try {
    const { round_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vaultUrl = Deno.env.get("VAULT_URL");
    const vaultPassword = Deno.env.get("VAULT_PASSWORD");

    // 1️⃣ Lock round to prevent double execution
    const { data: round } = await supabase
      .from("prediction_rounds")
      .update({ status: "processing" })
      .eq("id", round_id)
      .eq("status", "finalized")
      .select()
      .single();

    if (!round) {
      return new Response(JSON.stringify({ message: "Round already processed or no winner yet" }));
    }

    if (!round.winning_option_id) {
      return new Response(JSON.stringify({ error: "No winning option set for this round" }));
    }

    // 2️⃣ Get all winners
    const { data: winners } = await supabase
      .from("votes")
      .select("user_id, wallet_address")
      .eq("round_id", round.id)
      .eq("option_id", round.winning_option_id);

    if (!winners || winners.length === 0) {
      // Mark round as paid anyway
      await supabase
        .from("prediction_rounds")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", round.id);

      return new Response(JSON.stringify({ message: "No winners to payout" }));
    }

    // 3️⃣ Calculate payout per winner
    // Example: pool = 100 SOL, payout % = 20%, total payout = 20 SOL
    const payoutPercent = round.payout_percent || 20; // 20%
    const totalPool = round.pool_sol || 0;
    const totalPayout = (totalPool * payoutPercent) / 100;
    const winnerCount = winners.length;
    const payoutPerWinner = totalPayout / winnerCount;

    // 4️⃣ Split winners into batches of 20
    const batchSize = 20;

    for (let i = 0; i < winners.length; i += batchSize) {
      const batch = winners.slice(i, i + batchSize);

      // Prepare payload for vault: multiple transfers in 1 transaction
      const vaultPayload = batch.map((winner) => ({
        wallet: winner.wallet_address,
        amount: payoutPerWinner,
      }));

      // 5️⃣ Send batch to vault
      let txSig: string | null = null;
      try {
        const res = await fetch(`${vaultUrl}/batch-payout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": vaultPassword || "",
          },
          body: JSON.stringify({ payouts: vaultPayload }),
        });

        if (!res.ok) {
          console.error("Vault batch failed:", await res.text());
          continue; // Skip batch if fails
        }

        const data = await res.json();
        txSig = data.tx_signature || data.signature || null;
      } catch (vaultErr) {
        console.error("Vault error:", vaultErr);
        continue;
      }

      // 6️⃣ Save payout log + realtime notification
      await Promise.all(
        batch.map(async (winner) => {
          // Skip if already paid (double pay protection)
          const { data: existing } = await supabase
            .from("claims")
            .select("id")
            .eq("round_id", round.id)
            .eq("user_id", winner.user_id)
            .maybeSingle();

          if (existing) return;

          await supabase.from("claims").insert({
            round_id: round.id,
            user_id: winner.user_id,
            wallet_address: winner.wallet_address,
            amount: payoutPerWinner,
            status: "completed",
            tx_signature: txSig,
            processed_at: new Date().toISOString(),
          });

          // Realtime UX
          await supabase.from("payout_events").insert({
            user_id: winner.user_id,
            round_id: round.id,
            amount: payoutPerWinner,
            message: `🎉 Congratulations! You won ${payoutPerWinner.toFixed(6)} SOL`,
          });
        })
      );
    }

    // 7️⃣ Mark round fully paid
    await supabase
      .from("prediction_rounds")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", round.id);

    return new Response(JSON.stringify({ success: true, total_payout: totalPayout }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to process round" }), { status: 500 });
  }
});
