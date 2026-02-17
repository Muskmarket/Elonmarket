import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";
import { useTokenVerification } from "./useTokenVerification";

export function useClaim() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { signMessageForClaim } = useTokenVerification();
  const [loading, setLoading] = useState(false);

  const claimReward = useCallback(
    async (roundId?: string) => {
      if (!publicKey) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to claim",
          variant: "destructive",
        });
        return false;
      }

      try {
        setLoading(true);

        // Sign message for verification
        const signed = await signMessageForClaim(roundId || "all");

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-claim`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              walletAddress: publicKey.toBase58(),
              roundId: roundId || null,
              signedMessage: signed.signature,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to claim reward");
        }

        toast({
          title: "Claim successful! 💰",
          description: data.message || `Claimed ${data.claim_amount?.toFixed(6) || ""} SOL`,
        });

        return true;
      } catch (err) {
        toast({
          title: "Claim failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, toast, signMessageForClaim]
  );

  return { claimReward, loading };
}
