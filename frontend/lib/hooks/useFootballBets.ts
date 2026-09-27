"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import DuelMarket from "../contracts/DuelMarket";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import type { FeePresetLevel } from "../genlayer/fees";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type {
  Bet,
  BetSide,
  CreateCleanMarketParams,
  CreateVibeMarketParams,
  Position,
} from "../contracts/types";

const BETS_KEY = ["bets"] as const;
const OPEN_BETS_KEY = ["openBets"] as const;

function invalidateMarketQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  betId?: string
) {
  queryClient.invalidateQueries({ queryKey: BETS_KEY });
  queryClient.invalidateQueries({ queryKey: OPEN_BETS_KEY });
  queryClient.invalidateQueries({ queryKey: ["totalBets"] });
  queryClient.invalidateQueries({ queryKey: ["totalPositions"] });

  if (betId) {
    queryClient.invalidateQueries({ queryKey: ["bet", betId] });
    queryClient.invalidateQueries({ queryKey: ["betPositions", betId] });
    queryClient.invalidateQueries({ queryKey: ["hasBeenAppealed", betId] });
    queryClient.invalidateQueries({ queryKey: ["walletPosition", betId] });
    queryClient.invalidateQueries({ queryKey: ["hasPosition", betId] });
  }
}

/**
 * Hook to get the DuelMarket contract instance.
 * Returns null if the contract address is not configured.
 * Recreated whenever the wallet address changes.
 */
export function useDuelMarketContract(): DuelMarket | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank"),
        }
      );
      return null;
    }

    return new DuelMarket(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);

  return contract;
}

export function useBets() {
  const contract = useDuelMarketContract();

  return useQuery<Bet[], Error>({
    queryKey: BETS_KEY,
    queryFn: () => {
      if (!contract) return Promise.resolve([]);
      return contract.getAllBets();
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useOpenBets() {
  const contract = useDuelMarketContract();

  return useQuery<Bet[], Error>({
    queryKey: OPEN_BETS_KEY,
    queryFn: () => {
      if (!contract) return Promise.resolve([]);
      return contract.getOpenBets();
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useBet(betId: string | null) {
  const contract = useDuelMarketContract();

  return useQuery<Bet | null, Error>({
    queryKey: ["bet", betId],
    queryFn: () => {
      if (!contract || !betId) return Promise.resolve(null);
      return contract.getBet(betId);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!betId,
  });
}

export function useBetPositions(betId: string | null) {
  const contract = useDuelMarketContract();

  return useQuery<Position[], Error>({
    queryKey: ["betPositions", betId],
    queryFn: () => {
      if (!contract || !betId) return Promise.resolve([]);
      return contract.getBetPositions(betId);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!betId,
  });
}

export function useWalletPosition(betId: string | null, wallet: string | null) {
  const contract = useDuelMarketContract();

  return useQuery<Position | null, Error>({
    queryKey: ["walletPosition", betId, wallet],
    queryFn: async () => {
      if (!contract || !betId || !wallet) return null;
      const exists = await contract.hasPosition(betId, wallet);
      if (!exists) return null;
      return contract.getWalletPosition(betId, wallet);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!betId && !!wallet,
  });
}

export function useHasPosition(betId: string | null, wallet: string | null) {
  const contract = useDuelMarketContract();

  return useQuery<boolean, Error>({
    queryKey: ["hasPosition", betId, wallet],
    queryFn: () => {
      if (!contract || !betId || !wallet) return Promise.resolve(false);
      return contract.hasPosition(betId, wallet);
    },
    enabled: !!contract && !!betId && !!wallet,
    staleTime: 2000,
  });
}

export function useHasBeenAppealed(betId: string | null) {
  const contract = useDuelMarketContract();

  return useQuery<boolean, Error>({
    queryKey: ["hasBeenAppealed", betId],
    queryFn: () => {
      if (!contract || !betId) return Promise.resolve(false);
      return contract.hasBeenAppealed(betId);
    },
    enabled: !!contract && !!betId,
    staleTime: 2000,
  });
}

export function useTotalBets() {
  const contract = useDuelMarketContract();

  return useQuery<number, Error>({
    queryKey: ["totalBets"],
    queryFn: () => {
      if (!contract) return Promise.resolve(0);
      return contract.getTotalBets();
    },
    enabled: !!contract,
    staleTime: 2000,
  });
}

export function useTotalPositions() {
  const contract = useDuelMarketContract();

  return useQuery<number, Error>({
    queryKey: ["totalPositions"],
    queryFn: () => {
      if (!contract) return Promise.resolve(0);
      return contract.getTotalPositions();
    },
    enabled: !!contract,
    staleTime: 2000,
  });
}

export function useCreateCleanMarket() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      params,
      feePresetLevel,
    }: {
      params: CreateCleanMarketParams;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to create a market.");
      }
      setIsCreating(true);
      const feePreset = await contract.estimateCreateCleanMarketFees(
        params,
        feePresetLevel ?? "standard"
      );
      return contract.createCleanMarket(params, feePreset);
    },
    onSuccess: () => {
      invalidateMarketQueries(queryClient);
      setIsCreating(false);
      success("Clean market created", {
        description: "Your market is live and accepting stakes.",
      });
    },
    onError: (err: any) => {
      console.error("Error creating clean market:", err);
      setIsCreating(false);
      error("Failed to create clean market", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isCreating,
    createCleanMarket: mutation.mutate,
    createCleanMarketAsync: mutation.mutateAsync,
  };
}

export function useCreateVibeMarket() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      params,
      feePresetLevel,
    }: {
      params: CreateVibeMarketParams;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to create a market.");
      }
      setIsCreating(true);
      const feePreset = await contract.estimateCreateVibeMarketFees(
        params,
        feePresetLevel ?? "standard"
      );
      return contract.createVibeMarket(params, feePreset);
    },
    onSuccess: () => {
      invalidateMarketQueries(queryClient);
      setIsCreating(false);
      success("Vibe market created", {
        description: "Your market is live and accepting stakes.",
      });
    },
    onError: (err: any) => {
      console.error("Error creating vibe market:", err);
      setIsCreating(false);
      error("Failed to create vibe market", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isCreating,
    createVibeMarket: mutation.mutate,
    createVibeMarketAsync: mutation.mutateAsync,
  };
}

export function useJoinBet() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isJoining, setIsJoining] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      betId,
      side,
      stakeGen,
      feePresetLevel,
    }: {
      betId: string;
      side: BetSide;
      stakeGen: number | bigint;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to join a bet.");
      }
      setIsJoining(true);
      const feePreset = await contract.estimateJoinBetFees(
        betId,
        side,
        stakeGen,
        feePresetLevel ?? "standard"
      );
      return contract.joinBet(betId, side, stakeGen, feePreset);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsJoining(false);
      success("Stake placed", {
        description: "Your position has been recorded on-chain.",
      });
    },
    onError: (err: any) => {
      console.error("Error joining bet:", err);
      setIsJoining(false);
      error("Failed to join bet", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isJoining,
    joinBet: mutation.mutate,
    joinBetAsync: mutation.mutateAsync,
  };
}

export function useCancelBet() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (betId: string) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to cancel a bet.");
      }
      return contract.cancelBet(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      success("Bet cancelled", {
        description: "Open positions were refunded.",
      });
    },
    onError: (err: any) => {
      console.error("Error cancelling bet:", err);
      error("Failed to cancel bet", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    cancelBet: mutation.mutate,
    cancelBetAsync: mutation.mutateAsync,
  };
}

export function useVoidUnmatchedBet() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (betId: string) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to void a bet.");
      }
      return contract.voidUnmatchedBet(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      success("Bet voided", {
        description: "Unmatched stakes were refunded.",
      });
    },
    onError: (err: any) => {
      console.error("Error voiding unmatched bet:", err);
      error("Failed to void bet", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    voidUnmatchedBet: mutation.mutate,
    voidUnmatchedBetAsync: mutation.mutateAsync,
  };
}

export function useResolveMarket() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isResolving, setIsResolving] = useState(false);
  const [resolvingBetId, setResolvingBetId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      betId,
      feePresetLevel,
    }: {
      betId: string;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to resolve a market.");
      }
      setIsResolving(true);
      setResolvingBetId(betId);
      const feePreset = await contract.estimateResolveMarketFees(
        betId,
        feePresetLevel ?? "standard"
      );
      return contract.resolveMarket(betId, feePreset);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsResolving(false);
      setResolvingBetId(null);
      success("Market resolved", {
        description: "The verdict is pending the appeal window.",
      });
    },
    onError: (err: any) => {
      console.error("Error resolving market:", err);
      setIsResolving(false);
      setResolvingBetId(null);
      error("Failed to resolve market", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isResolving,
    resolvingBetId,
    resolveMarket: mutation.mutate,
    resolveMarketAsync: mutation.mutateAsync,
  };
}

export function useDisputeResolution() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isDisputing, setIsDisputing] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      betId,
      appealContext,
      feePresetLevel,
    }: {
      betId: string;
      appealContext: string;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to appeal.");
      }
      setIsDisputing(true);
      const feePreset = await contract.estimateDisputeResolutionFees(
        betId,
        appealContext,
        feePresetLevel ?? "standard"
      );
      return contract.disputeResolution(betId, appealContext, feePreset);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsDisputing(false);
      success("Appeal submitted", {
        description: "Validators will re-review the verdict.",
      });
    },
    onError: (err: any) => {
      console.error("Error disputing resolution:", err);
      setIsDisputing(false);
      error("Failed to submit appeal", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isDisputing,
    disputeResolution: mutation.mutate,
    disputeResolutionAsync: mutation.mutateAsync,
  };
}

export function useFinalizePayout() {
  const contract = useDuelMarketContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      betId,
      feePresetLevel,
    }: {
      betId: string;
      feePresetLevel?: FeePresetLevel;
    }) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to finalize payout.");
      }
      setIsFinalizing(true);
      const feePreset = await contract.estimateFinalizePayoutFees(
        betId,
        feePresetLevel ?? "standard"
      );
      return contract.finalizePayout(betId, feePreset);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsFinalizing(false);
      success("Payout finalized", {
        description: "Winnings and refunds have been sent.",
      });
    },
    onError: (err: any) => {
      console.error("Error finalizing payout:", err);
      setIsFinalizing(false);
      error("Failed to finalize payout", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isFinalizing,
    finalizePayout: mutation.mutate,
    finalizePayoutAsync: mutation.mutateAsync,
  };
}