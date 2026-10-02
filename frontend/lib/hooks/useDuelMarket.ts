"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import DuelMarket from "../contracts/DuelMarket";
import { getContractAddress } from "../genlayer/client";
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

export function useDuelMarketContract(): DuelMarket | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Set VITE_CONTRACT_ADDRESS in your .env file."
      );
      return null;
    }
    return new DuelMarket(contractAddress, address);
  }, [contractAddress, address]);
}

export function useBets() {
  const contract = useDuelMarketContract();
  return useQuery<Bet[], Error>({
    queryKey: BETS_KEY,
    queryFn: () => (contract ? contract.getAllBets() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useOpenBets() {
  const contract = useDuelMarketContract();
  return useQuery<Bet[], Error>({
    queryKey: OPEN_BETS_KEY,
    queryFn: () => (contract ? contract.getOpenBets() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useBet(betId: string | null) {
  const contract = useDuelMarketContract();
  return useQuery<Bet | null, Error>({
    queryKey: ["bet", betId],
    queryFn: () => (contract && betId ? contract.getBet(betId) : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!betId,
  });
}


export function useWalletPositions(wallet: string | null) {
  const contract = useDuelMarketContract();
  return useQuery<Position[], Error>({
    queryKey: ["walletPositions", wallet],
    queryFn: () => (contract && wallet ? contract.getWalletPositions(wallet) : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!wallet,
  });
}

export function useBetPositions(betId: string | null) {
  const contract = useDuelMarketContract();
  return useQuery<Position[], Error>({
    queryKey: ["betPositions", betId],
    queryFn: () =>
      contract && betId ? contract.getBetPositions(betId) : Promise.resolve([]),
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
    queryFn: () =>
      contract && betId && wallet
        ? contract.hasPosition(betId, wallet)
        : Promise.resolve(false),
    enabled: !!contract && !!betId && !!wallet,
    staleTime: 2000,
  });
}

export function useHasBeenAppealed(betId: string | null) {
  const contract = useDuelMarketContract();
  return useQuery<boolean, Error>({
    queryKey: ["hasBeenAppealed", betId],
    queryFn: () =>
      contract && betId ? contract.hasBeenAppealed(betId) : Promise.resolve(false),
    enabled: !!contract && !!betId,
    staleTime: 2000,
  });
}

export function useTotalBets() {
  const contract = useDuelMarketContract();
  return useQuery<number, Error>({
    queryKey: ["totalBets"],
    queryFn: () => (contract ? contract.getTotalBets() : Promise.resolve(0)),
    enabled: !!contract,
    staleTime: 2000,
  });
}

export function useTotalPositions() {
  const contract = useDuelMarketContract();
  return useQuery<number, Error>({
    queryKey: ["totalPositions"],
    queryFn: () => (contract ? contract.getTotalPositions() : Promise.resolve(0)),
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
    mutationFn: async (params: CreateCleanMarketParams) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsCreating(true);
      return contract.createCleanMarket(params);
    },
    onSuccess: () => {
      invalidateMarketQueries(queryClient);
      setIsCreating(false);
      success("Clean market created", {
        description: "Your market is live and accepting stakes.",
      });
    },
    onError: (err: any) => {
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
    mutationFn: async (params: CreateVibeMarketParams) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsCreating(true);
      return contract.createVibeMarket(params);
    },
    onSuccess: () => {
      invalidateMarketQueries(queryClient);
      setIsCreating(false);
      success("Vibe market created", {
        description: "Your market is live and accepting stakes.",
      });
    },
    onError: (err: any) => {
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
    }: {
      betId: string;
      side: BetSide;
      stakeGen: number | bigint;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsJoining(true);
      return contract.joinBet(betId, side, stakeGen);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsJoining(false);
      success("Stake placed", {
        description: "Your position has been recorded on-chain.",
      });
    },
    onError: (err: any) => {
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
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.cancelBet(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      success("Bet cancelled", { description: "Open positions were refunded." });
    },
    onError: (err: any) => {
      error("Failed to cancel bet", { description: err?.message || "Please try again." });
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
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      return contract.voidUnmatchedBet(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      success("Bet voided", { description: "Unmatched stakes were refunded." });
    },
    onError: (err: any) => {
      error("Failed to void bet", { description: err?.message || "Please try again." });
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
    mutationFn: async (betId: string) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsResolving(true);
      setResolvingBetId(betId);
      return contract.resolveMarket(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      setIsResolving(false);
      setResolvingBetId(null);
      success("Market resolved", {
        description: "The verdict is pending the appeal window.",
      });
    },
    onError: (err: any) => {
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
    }: {
      betId: string;
      appealContext: string;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsDisputing(true);
      return contract.disputeResolution(betId, appealContext);
    },
    onSuccess: (_data, variables) => {
      invalidateMarketQueries(queryClient, variables.betId);
      setIsDisputing(false);
      success("Appeal submitted", {
        description: "Validators will re-review the verdict.",
      });
    },
    onError: (err: any) => {
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
    mutationFn: async (betId: string) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsFinalizing(true);
      return contract.finalizePayout(betId);
    },
    onSuccess: (_data, betId) => {
      invalidateMarketQueries(queryClient, betId);
      setIsFinalizing(false);
      success("Payout finalized", {
        description: "Winnings and refunds have been sent.",
      });
    },
    onError: (err: any) => {
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