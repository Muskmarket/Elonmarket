import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface TokenBalance {
  walletAddress: string;
  tokenBalance: number;
  minRequired: number;
  isEligible: boolean;
  tokenContract: string;
}

export function useTokenVerification() {
  const { publicKey, signMessage } = useWallet();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyTokenBalance = useCallback(async () => {
    if (!publicKey) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-token-balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify token balance");
      }

      const data = await response.json();
      setBalance(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const signMessageForClaim = useCallback(
    async (roundId: string) => {
      if (!publicKey || !signMessage) {
        throw new Error("Wallet not connected or doesn't support signing");
      }

      const message = `Claim reward for round ${roundId} - MuskMarket - ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      return {
        message,
        signature: Buffer.from(signature).toString("base64"),
      };
    },
    [publicKey, signMessage]
  );

  return {
    balance,
    loading,
    error,
    verifyTokenBalance,
    signMessageForClaim,
  };
}
