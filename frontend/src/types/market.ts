/**
 * Types for DuelMarket peer-to-peer prediction protocol
 */

export type MarketType = 'clean' | 'vibe';

export type MarketStatus = 'open' | 'locked' | 'pending_appeal' | 'resolved' | 'void';

export type MarketSide = 'A' | 'B';

export interface CleanMarketRule {
  dataSourceName: string; // e.g., "CoinGecko API / Binance 12:00 UTC Close"
  dataSourceUrl: string;  // e.g., "https://api.coingecko.com/v3/coins/ethereum"
  metricIdentifier: string; // e.g., "market_data.current_price.usd"
  targetOperator: '>=' | '<=' | '>' | '<' | '==';
  thresholdValue: number;
  formattedTarget: string; // e.g., ">= $3,800.00 USD"
}

export interface VibeMarketRule {
  resolutionCriteria: string; // Full human prose written by creator
  evidenceDomains: string[];  // Whitelisted domains / publication handles
  evaluatorModel: string;     // e.g. "DuelArbitrator v1.2 (Multi-Source Verifier)"
}

export interface ResolutionEvidence {
  resolvedTimestamp: number;
  decidedOutcome: MarketSide | 'void';
  sourceTitle: string;
  sourceUrl: string;
  extractedSnippet: string;
  reasoningReceipt: string;
  finalizedNumericValue?: number; // for clean markets
  evidenceHash: string; // pseudo-hash for contract verifiability
}

export interface AppealRecord {
  appealId: string;
  appellantAddress: string;
  contestedTimestamp: number;
  counterEvidenceUrl: string;
  counterReasoning: string;
  appealBondAmount: number; // in GEN
  status: 'under_review' | 'upheld' | 'dismissed';
}

export interface Market {
  id: string;
  type: MarketType;
  question: string;
  category: string; // e.g. "Macro", "Crypto", "Tech", "Culture"
  sideA: {
    label: string;
    description?: string;
  };
  sideB: {
    label: string;
    description?: string;
  };
  poolA: number; // in GEN
  poolB: number; // in GEN
  lockTimestamp: number; // when staking closes
  resolutionDeadline: number; // when resolution must happen
  appealDeadline?: number; // lockTimestamp + 24 hours after resolution
  status: MarketStatus;
  creatorAddress: string;
  creatorSide: MarketSide;
  creatorStake: number;
  
  // Specific rules
  cleanRule?: CleanMarketRule;
  vibeRule?: VibeMarketRule;

  // Resolution & appeal state
  resolution?: ResolutionEvidence;
  appeal?: AppealRecord;
}

export interface UserPosition {
  id: string;
  marketId: string;
  side: MarketSide;
  amount: number; // in GEN
  timestamp: number;
  claimed: boolean;
  claimedAmount?: number;
}

export interface ProtocolStats {
  totalVolumeGEN: number;
  activeDuelsCount: number;
  settledDuelsCount: number;
  protocolFeeRate: number; // e.g. 0.02 (2%)
}
