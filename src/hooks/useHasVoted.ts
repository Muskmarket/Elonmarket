import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the connected wallet has already voted in the given round.
 * Used to show "Vote submitted" and disable voting after refresh.
 */
export function useHasVoted(roundId: string | null, walletAddress: string | null) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchHasVoted = useCallback(async () => {
    if (!roundId || !walletAddress) {
      setHasVoted(false);
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (!profile) {
        setHasVoted(false);
        return;
      }

      const { data: vote } = await supabase
        .from("votes")
        .select("id")
        .eq("round_id", roundId)
        .eq("user_id", profile.id)
        .maybeSingle();

      setHasVoted(!!vote);
    } catch {
      setHasVoted(false);
    } finally {
      setLoading(false);
    }
  }, [roundId, walletAddress]);

  useEffect(() => {
    fetchHasVoted();
  }, [fetchHasVoted]);

  return { hasVoted, loading, refetch: fetchHasVoted };
}
