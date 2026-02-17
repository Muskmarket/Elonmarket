import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";

export function useVoting() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const submitVote = useCallback(
    async (roundId: string, optionId: string, tokenBalance: number) => {
      if (!publicKey) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to vote",
          variant: "destructive",
        });
        return false;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-vote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              walletAddress: publicKey.toBase58(),
              roundId,
              optionId,
              tokenBalance,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit vote");
        }

        toast({
          title: "Vote submitted! 🎯",
          description: "Your prediction has been recorded",
        });

        return true;
      } catch (err) {
        toast({
          title: "Vote failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, toast]
  );

  return { submitVote, loading };
}
