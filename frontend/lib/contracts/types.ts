/**
 * TypeScript types for the GenLayer DuelMarket contract
 */

export type MarketType = "clean" | "vibe";
export type BetSide = "A" | "B";
export type WinningSide = "" | "A" | "B" | "void";
export type ComparisonOp = ">" | ">=" | "<" | "<=" | "==";

export type BetStatus =
  | "open"
  | "pending_appeal"
  | "appeal_resolved"
  | "finalized"
  | "voided"
  | "cancelled";

export interface Bet {
  bet_id: string;
  creator: string;
  market_type: MarketType;
  question: string;
  side_a_label: string;
  side_b_label: string;
  evidence_url: string;
  evidence_url_fallback: string;
  json_field_path: string;
  comparison: string;
  target_value: string;
  resolution_criteria: string;
  min_stake: number;
  side_a_total: number;
  side_b_total: number;
  status: BetStatus;
  winning_side: WinningSide;
  resolution_reasoning: string;
  resolution_value: string;
  created_at: string;
  resolve_at: number;
  resolved_at: string;
  appeal_deadline: number;
}
export interface Position {
  position_id: string;
  bet_id: string;
  backer: string;
  side: BetSide;
  amount: number;
  claimed: boolean;
  payout_amount: number;
  joined_at: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}

export interface BetFilters {
  status?: BetStatus | BetStatus[];
  marketType?: MarketType;
  creator?: string;
  openOnly?: boolean;
}

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