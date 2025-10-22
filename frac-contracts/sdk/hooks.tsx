/**
 * React Hooks for FractionalBase
 *
 * Custom React hooks for interacting with FractionalBase smart contracts
 *
 * Usage:
 * ```tsx
 * import { useStaking, useUserBalance } from '@fractionalbase/sdk/hooks';
 *
 * function StakingDashboard() {
 *   const { balance } = useUserBalance();
 *   const { createStake, stakes, loading } = useStaking();
 *
 *   return <div>Balance: {balance} $FRAC</div>;
 * }
 * ```
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState, useCallback } from "react";
import { FractionalBaseSDK, ProgramIds } from "./index";

/**
 * Hook to get SDK instance
 */
export function useSDK(programIds: ProgramIds): FractionalBaseSDK | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  return new FractionalBaseSDK(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    },
    programIds
  );
}

/**
 * Hook to get user's $FRAC token balance
 */
export function useUserBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch token balance from connection
      // This would need the actual token mint address
      const balance = 0; // Placeholder
      setBalance(balance);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalance();
    // Set up subscription for balance updates
    const intervalId = setInterval(fetchBalance, 10000); // Poll every 10s
    return () => clearInterval(intervalId);
  }, [fetchBalance]);

  return { balance, loading, error, refresh: fetchBalance };
}

/**
 * Hook for staking operations
 */
export function useStaking(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const { publicKey } = useWallet();
  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStakes = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      setLoading(true);
      const userStakes = await sdk.staking.getUserStakes(publicKey);
      setStakes(userStakes);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, publicKey]);

  useEffect(() => {
    fetchStakes();
  }, [fetchStakes]);

  const createStake = async (
    amount: number,
    stakeType: any,
    lockDurationDays: number
  ): Promise<string> => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.staking.createStake(amount, stakeType, lockDurationDays);
      await fetchStakes(); // Refresh stakes
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async (stakeAccount: PublicKey): Promise<string> => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.staking.claimRewards(stakeAccount);
      await fetchStakes(); // Refresh stakes
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unstake = async (stakeAccount: PublicKey, amount: number): Promise<string> => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.staking.unstake(stakeAccount, amount);
      await fetchStakes(); // Refresh stakes
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    stakes,
    loading,
    error,
    createStake,
    claimRewards,
    unstake,
    refresh: fetchStakes,
  };
}

/**
 * Hook for fractional ownership operations
 */
export function useFractionalOwnership(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const createVault = async (params: {
    assetType: any;
    totalShares: number;
    valuationUsd: number;
    metadataUri: string;
  }) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const result = await sdk.fractionalOwnership.createVault(params);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const listShares = async (vaultId: number, shares: number, pricePerShare: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.fractionalOwnership.listShares(
        vaultId,
        shares,
        pricePerShare
      );
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const buyShares = async (vaultId: number, orderId: number, shares: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.fractionalOwnership.buyShares(vaultId, orderId, shares);
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getOrderBook = async (vaultId: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const orderBook = await sdk.fractionalOwnership.getOrderBook(vaultId);
      return orderBook;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vaults,
    loading,
    error,
    createVault,
    listShares,
    buyShares,
    getOrderBook,
  };
}

/**
 * Hook for governance operations
 */
export function useGovernance(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const { publicKey } = useWallet();
  const [proposals, setProposals] = useState<any[]>([]);
  const [votingPower, setVotingPower] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const activeProposals = await sdk.governance.getActiveProposals();
      setProposals(activeProposals);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const fetchVotingPower = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      const power = await sdk.governance.getUserVotingPower(publicKey);
      setVotingPower(power);
    } catch (err) {
      console.error("Error fetching voting power:", err);
    }
  }, [sdk, publicKey]);

  useEffect(() => {
    fetchProposals();
    fetchVotingPower();
  }, [fetchProposals, fetchVotingPower]);

  const createProposal = async (params: {
    proposalType: any;
    title: string;
    description: string;
    targetProgram: PublicKey;
    instructionData: Buffer;
  }) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const result = await sdk.governance.createProposal(params);
      await fetchProposals(); // Refresh proposals
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (proposalId: number, vote: any) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.governance.castVote(proposalId, vote);
      await fetchProposals(); // Refresh proposals
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    proposals,
    votingPower,
    loading,
    error,
    createProposal,
    castVote,
    refresh: fetchProposals,
  };
}

/**
 * Hook for access control and tier information
 */
export function useAccessControl(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const { publicKey } = useWallet();
  const [tier, setTier] = useState<{
    tier: number;
    tierName: string;
    accessScore: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTier = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      setLoading(true);
      const userTier = await sdk.accessControl.getUserTier(publicKey);
      setTier(userTier);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, publicKey]);

  useEffect(() => {
    fetchTier();
    // Refresh tier every 5 minutes (matches cache duration)
    const intervalId = setInterval(fetchTier, 300000);
    return () => clearInterval(intervalId);
  }, [fetchTier]);

  const checkAccess = async (accessType: string): Promise<boolean> => {
    if (!sdk || !publicKey) return false;

    try {
      return await sdk.accessControl.checkAccess(publicKey, accessType);
    } catch (err) {
      console.error("Error checking access:", err);
      return false;
    }
  };

  return {
    tier,
    loading,
    error,
    checkAccess,
    refresh: fetchTier,
  };
}

/**
 * Hook for rewards and milestones
 */
export function useRewards(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const { publicKey } = useWallet();
  const [grants, setGrants] = useState<any[]>([]);
  const [milestoneProgress, setMilestoneProgress] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGrants = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      setLoading(true);
      const userGrants = await sdk.rewards.getUserGrants(publicKey);
      setGrants(userGrants);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, publicKey]);

  const fetchMilestoneProgress = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      const progress = await sdk.rewards.getMilestoneProgress(publicKey);
      setMilestoneProgress(progress);
    } catch (err) {
      console.error("Error fetching milestone progress:", err);
    }
  }, [sdk, publicKey]);

  useEffect(() => {
    fetchGrants();
    fetchMilestoneProgress();
  }, [fetchGrants, fetchMilestoneProgress]);

  const claimRewards = async (grantId: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.rewards.claimRewards(grantId);
      await fetchGrants(); // Refresh grants
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unlockMilestone = async (grantId: number, stage: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.rewards.unlockMilestoneStage(grantId, stage);
      await fetchGrants(); // Refresh grants
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    grants,
    milestoneProgress,
    loading,
    error,
    claimRewards,
    unlockMilestone,
    refresh: fetchGrants,
  };
}

/**
 * Hook for enterprise operations
 */
export function useEnterprise(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const { publicKey } = useWallet();
  const [enterprise, setEnterprise] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnterprise = useCallback(async () => {
    if (!sdk || !publicKey) return;

    try {
      setLoading(true);
      const enterpriseAccount = await sdk.enterprise.getEnterprise(publicKey);
      setEnterprise(enterpriseAccount);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sdk, publicKey]);

  useEffect(() => {
    fetchEnterprise();
  }, [fetchEnterprise]);

  const registerEnterprise = async (collateralAmount: number, lockDurationMonths: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.enterprise.registerEnterprise(
        collateralAmount,
        lockDurationMonths
      );
      await fetchEnterprise(); // Refresh enterprise data
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addCollateral = async (amount: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.enterprise.addCollateral(amount);
      await fetchEnterprise(); // Refresh enterprise data
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestWithdrawal = async (amount: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const signature = await sdk.enterprise.requestWithdrawal(amount);
      await fetchEnterprise(); // Refresh enterprise data
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    enterprise,
    loading,
    error,
    registerEnterprise,
    addCollateral,
    requestWithdrawal,
    refresh: fetchEnterprise,
  };
}

/**
 * Hook for bridge operations
 */
export function useBridge(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const bridgeOut = async (params: {
    amount: number;
    targetChain: number;
    recipientAddress: string;
  }) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      setLoading(true);
      const result = await sdk.bridge.bridgeOut(params);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTransferStatus = async (transferNonce: number) => {
    if (!sdk) throw new Error("SDK not initialized");

    try {
      const status = await sdk.bridge.getTransferStatus(transferNonce);
      return status;
    } catch (err) {
      console.error("Error getting transfer status:", err);
      throw err;
    }
  };

  return {
    transfers,
    loading,
    error,
    bridgeOut,
    getTransferStatus,
  };
}

/**
 * Hook to get staking APY rates
 */
export function useStakingConfig(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sdk) return;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const stakingConfig = await sdk.staking.getStakingConfig();
        setConfig(stakingConfig);
      } catch (err) {
        console.error("Error fetching staking config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [sdk]);

  return { config, loading };
}

/**
 * Hook to get token supply information
 */
export function useTokenSupply(programIds: ProgramIds) {
  const sdk = useSDK(programIds);
  const [supply, setSupply] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sdk) return;

    const fetchSupply = async () => {
      try {
        setLoading(true);
        const supplyInfo = await sdk.fracToken.getSupplyInfo();
        setSupply(supplyInfo);
      } catch (err) {
        console.error("Error fetching supply info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupply();
  }, [sdk]);

  return { supply, loading };
}
