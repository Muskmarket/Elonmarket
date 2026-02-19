// Manual claim flow has been removed. Rewards are paid automatically by backend/vault.
export function useClaim() {
  return {
    claimReward: async () => false,
    loading: false,
  };
}
