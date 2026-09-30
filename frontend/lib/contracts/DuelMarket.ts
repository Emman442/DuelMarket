import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import type { Bet, BetSide, BetStatus, ComparisonOp, MarketType, Position, TransactionReceipt, WinningSide } from "./types";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetEstimate,
  type FeePresetLevel,
} from "../genlayer/fees";

export interface CreateCleanMarketParams {
  question: string;
  sideALabel: string;
  sideBLabel: string;
  evidenceUrl: string;
  evidenceUrlFallback?: string;
  jsonFieldPath: string;
  comparison: ComparisonOp;
  targetValue: string;
  creatorSide: BetSide;
  lockMinutes: number;
  minStake: number;
  stakeGen: number | bigint;
}

export interface CreateVibeMarketParams {
  question: string;
  sideALabel: string;
  sideBLabel: string;
  evidenceUrl: string;
  evidenceUrlFallback?: string;
  resolutionCriteria: string;
  creatorSide: BetSide;
  lockMinutes: number;
  minStake: number;
  stakeGen: number | bigint;
}

const GEN_WEI = 10n ** 18n;

function toWholeGenWei(amountGen: number | bigint): bigint {
  const gen = typeof amountGen === "bigint" ? amountGen : BigInt(amountGen);
  if (gen <= 0n) {
    throw new Error("Stake must be a positive whole number of GEN");
  }
  return gen * GEN_WEI;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, inner]) => [String(key), inner])
    );
  }
  if (typeof value === "object") {
    return value as Record<string, any>;
  }
  return {};
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function normalizeBet(raw: unknown): Bet {
  const data = asRecord(raw);
  return {
    bet_id: toStringValue(data.bet_id),
    creator: toStringValue(data.creator),
    market_type: (toStringValue(data.market_type, "clean") as MarketType),
    question: toStringValue(data.question),
    side_a_label: toStringValue(data.side_a_label),
    side_b_label: toStringValue(data.side_b_label),
    evidence_url: toStringValue(data.evidence_url),
    evidence_url_fallback: toStringValue(data.evidence_url_fallback),
    json_field_path: toStringValue(data.json_field_path),
    comparison: toStringValue(data.comparison),
    target_value: toStringValue(data.target_value),
    resolution_criteria: toStringValue(data.resolution_criteria),
    min_stake: toNumber(data.min_stake),
    side_a_total: toNumber(data.side_a_total),
    side_b_total: toNumber(data.side_b_total),
    status: (toStringValue(data.status, "open") as BetStatus),
    winning_side: (toStringValue(data.winning_side) as WinningSide),
    resolution_reasoning: toStringValue(data.resolution_reasoning),
    resolution_value: toStringValue(data.resolution_value),
    created_at: toStringValue(data.created_at),
    resolve_at: toNumber(data.resolve_at),
    resolved_at: toStringValue(data.resolved_at),
    appeal_deadline: toNumber(data.appeal_deadline),
  };
}

function normalizePosition(raw: unknown): Position {
  const data = asRecord(raw);
  return {
    position_id: toStringValue(data.position_id),
    bet_id: toStringValue(data.bet_id),
    backer: toStringValue(data.backer),
    side: (toStringValue(data.side, "A") as BetSide),
    amount: toNumber(data.amount),
    claimed: Boolean(data.claimed),
    payout_amount: toNumber(data.payout_amount),
    joined_at: toStringValue(data.joined_at),
  };
}

function normalizeBetList(raw: unknown): Bet[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizeBet);
  if (raw instanceof Map) {
    return Array.from(raw.values()).map(normalizeBet);
  }
  return [];
}

function normalizePositionList(raw: unknown): Position[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizePosition);
  if (raw instanceof Map) {
    return Array.from(raw.values()).map(normalizePosition);
  }
  return [];
}

/**
 * DuelMarket contract class for interacting with the GenLayer DuelMarket contract.
 *
 * Every write method here follows the exact same shape as LineCall.ts's
 * working methods: estimate fees with estimateWriteFeePreset (via
 * estimateFees below), convert with feePresetToTransactionFees, call
 * writeContract, then poll with the client's own waitForTransactionReceipt.
 * There is deliberately no client.estimateTransactionFeesForWrite call
 * anywhere in this file, that method produced hashes studio-dev could
 * never resolve afterward, which is why every write here used to fail
 * with "Transaction ... not found" on eth_getTransactionByHash.
 */
class DuelMarket {
  private contractAddress: `0x${string}`;
  private client: any;
  private studioUrl?: string;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.studioUrl = studioUrl;

    const config: any = { chain: studioDevnet };
    if (address) config.account = address as `0x${string}`;
    if (studioUrl) config.endpoint = studioUrl;
    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: studioDevnet,
      account: address as `0x${string}`,
    };
    if (this.studioUrl) config.endpoint = this.studioUrl;
    this.client = createClient(config);
  }


  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    return this.client.readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
  }

  async estimateCreateCleanMarketFees(
    params: CreateCleanMarketParams,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName: "create_clean_market",
        args: this.cleanMarketArgs(params),
        value: toWholeGenWei(params.stakeGen),
      },
      level
    );
  }

  async estimateCreateVibeMarketFees(
    params: CreateVibeMarketParams,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName: "create_vibe_market",
        args: this.vibeMarketArgs(params),
        value: toWholeGenWei(params.stakeGen),
      },
      level
    );
  }


 async estimateJoinBetFees(
  betId: string,
  side: BetSide,
  stakeGen: number | bigint,
  level: FeePresetLevel = "standard"
): Promise<FeePresetEstimate | undefined> {
  return estimateWriteFeePreset(
    this.client,
    {
      address: this.contractAddress,
      functionName: "join_bet",
      args: [betId, side],
      value: toWholeGenWei(stakeGen),
    },
    level
  );
}

  async estimateResolveMarketFees(
    betId: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(this.client, { address: this.contractAddress, functionName: "resolve_market", args: [betId] }, level);
  }

  async estimateDisputeResolutionFees(
    betId: string,
    appealContext: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(this.client,
      {
        address: this.contractAddress,
        functionName: "dispute_resolution",
        args: [betId, appealContext],
      },
      level
    );
  }

  async estimateFinalizePayoutFees(
    betId: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(this.client, { address: this.contractAddress, functionName: "finalize_payout", args: [betId] }, level);
  }

  private cleanMarketArgs(params: CreateCleanMarketParams): unknown[] {
    return [
      params.question,
      params.sideALabel,
      params.sideBLabel,
      params.evidenceUrl,
      params.evidenceUrlFallback ?? "",
      params.jsonFieldPath,
      params.comparison,
      params.targetValue,
      params.creatorSide,
      params.lockMinutes,
      params.minStake,
    ];
  }

  private vibeMarketArgs(params: CreateVibeMarketParams): unknown[] {
    return [
      params.question,
      params.sideALabel,
      params.sideBLabel,
      params.evidenceUrl,
      params.evidenceUrlFallback ?? "",
      params.resolutionCriteria,
      params.creatorSide,
      params.lockMinutes,
      params.minStake,
    ];
  }

  async getBet(betId: string): Promise<Bet> {
    try {
      const bet = await this.read("get_bet", [betId]);
      return normalizeBet(bet);
    } catch (error) {
      console.error("Error fetching bet:", error);
      throw new Error("Failed to fetch bet from contract");
    }
  }

  async getAllBets(): Promise<Bet[]> {
    try {
      const bets = await this.read("get_all_bets", []);
      return normalizeBetList(bets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      throw new Error("Failed to fetch bets from contract");
    }
  }

  async getOpenBets(): Promise<Bet[]> {
    try {
      const bets = await this.read("get_open_bets", []);
      return normalizeBetList(bets);
    } catch (error) {
      console.error("Error fetching open bets:", error);
      throw new Error("Failed to fetch open bets from contract");
    }
  }

  async getPosition(positionId: string): Promise<Position> {
    try {
      const position = await this.read("get_position", [positionId]);
      return normalizePosition(position);
    } catch (error) {
      console.error("Error fetching position:", error);
      throw new Error("Failed to fetch position from contract");
    }
  }

  async getBetPositions(betId: string): Promise<Position[]> {
    try {
      const positions = await this.read("get_bet_positions", [betId]);
      return normalizePositionList(positions);
    } catch (error) {
      console.error("Error fetching bet positions:", error);
      throw new Error("Failed to fetch bet positions from contract");
    }
  }

  async getWalletPosition(betId: string, wallet: string): Promise<Position> {
    try {
      const position = await this.read("get_wallet_position", [betId, wallet]);
      return normalizePosition(position);
    } catch (error) {
      console.error("Error fetching wallet position:", error);
      throw new Error("Failed to fetch wallet position from contract");
    }
  }

  async hasPosition(betId: string, wallet: string): Promise<boolean> {
    try {
      const result = await this.read("has_position", [betId, wallet]);
      return Boolean(result);
    } catch (error) {
      console.error("Error checking position:", error);
      return false;
    }
  }

  async hasBeenAppealed(betId: string): Promise<boolean> {
    try {
      const result = await this.read("has_been_appealed", [betId]);
      return Boolean(result);
    } catch (error) {
      console.error("Error checking appeal status:", error);
      return false;
    }
  }

  async getTotalBets(): Promise<number> {
    try {
      const total = await this.read("get_total_bets", []);
      return toNumber(total);
    } catch (error) {
      console.error("Error fetching total bets:", error);
      return 0;
    }
  }

  async getTotalPositions(): Promise<number> {
    try {
      const total = await this.read("get_total_positions", []);
      return toNumber(total);
    } catch (error) {
      console.error("Error fetching total positions:", error);
      return 0;
    }
  }

  async createCleanMarket(
    params: CreateCleanMarketParams,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(feePreset);
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_clean_market",
      args: this.cleanMarketArgs(params),
      value: toWholeGenWei(params.stakeGen),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }


  async createVibeMarket(
    params: CreateVibeMarketParams,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(
      feePreset 
    );
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_vibe_market",
      args: this.vibeMarketArgs(params),
      value: toWholeGenWei(params.stakeGen),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async joinBet(
    betId: string,
    side: BetSide,
    stakeGen: number | bigint,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(feePreset );
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "join_bet",
      args: [betId, side],
      value: toWholeGenWei(stakeGen),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async cancelBet(betId: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "cancel_bet",
      args: [betId],
      value: BigInt(0),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async voidUnmatchedBet(betId: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "void_unmatched_bet",
      args: [betId],
      value: BigInt(0),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }


  async resolveMarket(
    betId: string,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(
      feePreset ?? (await this.estimateResolveMarketFees(betId))
    );
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "resolve_market",
      args: [betId],
      value: BigInt(0),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 48,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }



  async disputeResolution(
    betId: string,
    appealContext: string,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(
      feePreset ?? (await this.estimateDisputeResolutionFees(betId, appealContext))
    );
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "dispute_resolution",
      args: [betId, appealContext],
      value: BigInt(0),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 48,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }


  async finalizePayout(
    betId: string,
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(
      feePreset ?? (await this.estimateFinalizePayoutFees(betId))
    );
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "finalize_payout",
      args: [betId],
      value: BigInt(0),
      ...(fees ? { fees } : {}),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 48,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async setProtocolFee(newFeeBps: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "set_protocol_fee",
      args: [newFeeBps],
      value: BigInt(0),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async setTreasury(newTreasury: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "set_treasury",
      args: [newTreasury],
      value: BigInt(0),
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }
}

export default DuelMarket;