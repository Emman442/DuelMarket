import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { parseEther } from "viem";
import type {
  Bet,
  BetSide,
  BetStatus,
  ComparisonOp,
  MarketType,
  Position,
  TransactionReceipt,
  WinningSide,
} from "./types";

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

function asRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, inner]) => [String(key), inner])
    );
  }
  if (Array.isArray(value)) {
    const [position_id, bet_id, backer, side, amount, claimed, payout_amount, joined_at] = value;
    if (typeof position_id === "string" && typeof backer === "string") {
      return { position_id, bet_id, backer, side, amount, claimed, payout_amount, joined_at };
    }
  }
  if (typeof value === "object") return value as Record<string, any>;
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

function idList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value instanceof Map) return Array.from(value.values()).map(String).filter(Boolean);
  return [];
}

function normalizeBet(raw: unknown): Bet {
  const data = asRecord(raw);
  return {
    bet_id: toStringValue(data.bet_id),
    creator: toStringValue(data.creator),
    market_type: toStringValue(data.market_type, "clean") as MarketType,
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
    status: toStringValue(data.status, "open") as BetStatus,
    winning_side: toStringValue(data.winning_side) as WinningSide,
    resolution_reasoning: toStringValue(data.resolution_reasoning),
    resolution_value: toStringValue(data.resolution_value),
    created_at: toStringValue(data.created_at),
    resolve_at: toNumber(data.resolve_at),
    resolved_at: toStringValue(data.resolved_at),
    appeal_deadline: toNumber(data.appeal_deadline),
    position_ids: idList(data.position_ids),
    positions: [],
  };
}

function normalizePosition(raw: unknown): Position {
  const data = asRecord(raw);
  return {
    position_id: toStringValue(data.position_id),
    bet_id: toStringValue(data.bet_id),
    backer: toStringValue(data.backer),
    side: toStringValue(data.side, "A") as BetSide,
    amount: toNumber(data.amount),
    claimed: Boolean(data.claimed),
    payout_amount: toNumber(data.payout_amount),
    joined_at: toStringValue(data.joined_at),
  };
}

function unwrap<T>(input: any): T {
  return input?.params ?? input;
}

class DuelMarket {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null, studioUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    if (studioUrl) config.endpoint = studioUrl;
    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    this.client = createClient({
      chain: studionet,
      account: address as `0x${string}`,
    });
  }

  private async read<T>(functionName: string, args: any[] = []): Promise<T> {
    return this.client.readContract({
      address: this.contractAddress,
      functionName,
      args,
    }) as Promise<T>;
  }

  private async write(
    functionName: string,
    args: any[],
    value: bigint
  ): Promise<TransactionReceipt> {
    await this.client.connect("studionet");
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value,
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      retries: 48,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  private cleanMarketArgs(params: CreateCleanMarketParams): any[] {
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

  private vibeMarketArgs(params: CreateVibeMarketParams): any[] {
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

  async getPosition(positionId: string): Promise<Position> {
    return normalizePosition(await this.read("get_position", [positionId]));
  }

  async hydrateBet(raw: unknown): Promise<Bet> {
    const bet = normalizeBet(raw);
    const positions: Position[] = [];
    for (const id of bet.position_ids ?? []) {
      positions.push(await this.getPosition(id));
    }
    bet.positions = positions;
    return bet;
  }

  async getBet(betId: string): Promise<Bet> {
    return this.hydrateBet(await this.read("get_bet", [betId]));
  }

  async getAllBets(): Promise<Bet[]> {
    const raw = await this.read<unknown>("get_all_bets", []);
    const list = Array.isArray(raw) ? raw : raw instanceof Map ? Array.from(raw.values()) : [];
    const out: Bet[] = [];
    for (const row of list) out.push(await this.hydrateBet(row));
    return out;
  }

  async getOpenBets(): Promise<Bet[]> {
    const raw = await this.read<unknown>("get_open_bets", []);
    const list = Array.isArray(raw) ? raw : raw instanceof Map ? Array.from(raw.values()) : [];
    const out: Bet[] = [];
    for (const row of list) out.push(await this.hydrateBet(row));
    return out;
  }

  async getBetPositions(betId: string): Promise<Position[]> {
    const bet = await this.getBet(betId);
    return bet.positions ?? [];
  }

  async getWalletPosition(betId: string, wallet: string): Promise<Position> {
    return normalizePosition(await this.read("get_wallet_position", [betId, wallet]));
  }

  async hasPosition(betId: string, wallet: string): Promise<boolean> {
    try {
      return Boolean(await this.read("has_position", [betId, wallet]));
    } catch {
      return false;
    }
  }

  async getWalletPositions(wallet: string): Promise<Position[]> {
    const bets = await this.getAllBets();
    const walletLower = wallet.toLowerCase();
    return bets
      .flatMap((bet) => bet.positions ?? [])
      .filter((position) => position.backer.toLowerCase() === walletLower);
  }

  async hasBeenAppealed(betId: string): Promise<boolean> {
    try {
      return Boolean(await this.read("has_been_appealed", [betId]));
    } catch {
      return false;
    }
  }

  async getTotalBets(): Promise<number> {
    return toNumber(await this.read("get_total_bets", []));
  }

  async getTotalPositions(): Promise<number> {
    return toNumber(await this.read("get_total_positions", []));
  }

  async createCleanMarket(input: CreateCleanMarketParams | { params: CreateCleanMarketParams }) {
  const params = unwrap<CreateCleanMarketParams>(input);
  return this.write(
    "create_clean_market",
    this.cleanMarketArgs(params),
    parseEther(String(params.stakeGen))
  );
}

async createVibeMarket(input: CreateVibeMarketParams | { params: CreateVibeMarketParams }) {
  const params = unwrap<CreateVibeMarketParams>(input);
  return this.write(
    "create_vibe_market",
    this.vibeMarketArgs(params),
    parseEther(String(params.stakeGen))
  );
}

  async joinBet(betId: string, side: BetSide, stakeGen: number | bigint) {
    return this.write("join_bet", [betId, side], parseEther(stakeGen.toString()));
  }

  async cancelBet(betId: string) {
    return this.write("cancel_bet", [betId], 0n);
  }

  async voidUnmatchedBet(betId: string) {
    return this.write("void_unmatched_bet", [betId], 0n);
  }

  async resolveMarket(betId: string) {
    return this.write("resolve_market", [betId], 0n);
  }

  async disputeResolution(betId: string, appealContext: string) {
    return this.write("dispute_resolution", [betId, appealContext], 0n);
  }

  async finalizePayout(betId: string) {
    return this.write("finalize_payout", [betId], 0n);
  }

  async setProtocolFee(newFeeBps: number) {
    return this.write("set_protocol_fee", [newFeeBps], 0n);
  }

  async setTreasury(newTreasury: string) {
    return this.write("set_treasury", [newTreasury], 0n);
  }
}

export default DuelMarket;