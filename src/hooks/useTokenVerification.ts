import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface TokenBalance {
  walletAddress: string;
  tokenBalance: number;
  minRequired: number;
  isEligible: boolean;
  tokenContract: string;
}

export function useTokenVerification() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyTokenBalance = useCallback(async () => {
    if (!user) {
      setError("Not logged in");
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
            walletAddress: user.wallet_address,
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
  }, [user]);

  return {
    balance,
    loading,
    error,
    verifyTokenBalance,
  };
}
