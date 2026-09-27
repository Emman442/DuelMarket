import React, { createContext, useContext, useState, useEffect } from 'react';
import { Market, UserPosition, MarketSide, ResolutionEvidence, AppealRecord } from '../types/market';
import { INITIAL_MARKETS, INITIAL_USER_POSITIONS } from '../data/seedMarkets';

interface MarketContextType {
  markets: Market[];
  positions: UserPosition[];
  userBalance: number;
  userAddress: string;
  isWalletConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  faucetGEN: (amount?: number) => void;
  stakeOnMarket: (marketId: string, side: MarketSide, amount: number) => boolean;
  createMarket: (marketData: Partial<Market>) => string;
  resolveMarket: (
    marketId: string,
    outcome: MarketSide | 'void',
    evidenceData: Omit<ResolutionEvidence, 'resolvedTimestamp' | 'evidenceHash' | 'decidedOutcome'>
  ) => void;
  fileAppeal: (
    marketId: string,
    counterEvidenceUrl: string,
    counterReasoning: string,
    bondAmount: number
  ) => boolean;
  finalizeAppeal: (marketId: string, decision: 'upheld' | 'dismissed') => void;
  claimPayout: (positionId: string) => { success: boolean; payout: number };
  simulateLockMarket: (marketId: string) => void;
  calculatePayoutPreview: (market: Market, side: MarketSide, stakeAmount: number) => {
    projectedReturn: number;
    multiplier: number;
    protocolFee: number;
  };
  calculateClaimableAmount: (position: UserPosition, market: Market) => number;
  resetAllData: () => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const PROTOCOL_FEE_RATE = 0.02; // 2% protocol fee taken only from the losing pool

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [markets, setMarkets] = useState<Market[]>(() => {
    const saved = localStorage.getItem('duelmarket_markets_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_MARKETS;
  });

  const [positions, setPositions] = useState<UserPosition[]>(() => {
    const saved = localStorage.getItem('duelmarket_positions_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USER_POSITIONS;
  });

  const [userBalance, setUserBalance] = useState<number>(() => {
    const saved = localStorage.getItem('duelmarket_balance_v1');
    if (saved) {
      return Number(saved);
    }
    return 3450; // Initial simulated balance of GEN tokens
  });

  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(() => {
    return localStorage.getItem('duelmarket_wallet_connected_v1') !== 'false';
  });

  const userAddress = '0x78D1...49F3';

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('duelmarket_markets_v1', JSON.stringify(markets));
  }, [markets]);

  useEffect(() => {
    localStorage.setItem('duelmarket_positions_v1', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('duelmarket_balance_v1', userBalance.toString());
  }, [userBalance]);

  useEffect(() => {
    localStorage.setItem('duelmarket_wallet_connected_v1', isWalletConnected.toString());
  }, [isWalletConnected]);

  const connectWallet = () => setIsWalletConnected(true);
  const disconnectWallet = () => setIsWalletConnected(false);

  const faucetGEN = (amount: number = 1000) => {
    setUserBalance((prev) => prev + amount);
  };

  const calculatePayoutPreview = (market: Market, side: MarketSide, stakeAmount: number) => {
    if (stakeAmount <= 0) {
      return { projectedReturn: 0, multiplier: 1, protocolFee: 0 };
    }
    const currentMyPool = side === 'A' ? market.poolA : market.poolB;
    const currentOpposingPool = side === 'A' ? market.poolB : market.poolA;

    const newMyPool = currentMyPool + stakeAmount;
    const userShareRatio = stakeAmount / newMyPool;
    const grossOpposingWinning = currentOpposingPool * userShareRatio;
    const fee = grossOpposingWinning * PROTOCOL_FEE_RATE;
    const netOpposingWinning = grossOpposingWinning - fee;

    const projectedReturn = stakeAmount + netOpposingWinning;
    const multiplier = projectedReturn / stakeAmount;

    return {
      projectedReturn: Math.round(projectedReturn * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
      protocolFee: Math.round(fee * 100) / 100,
    };
  };

  const stakeOnMarket = (marketId: string, side: MarketSide, amount: number): boolean => {
    if (amount <= 0 || amount > userBalance) return false;

    // Deduct user balance
    setUserBalance((prev) => prev - amount);

    // Update market pool
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        return {
          ...m,
          poolA: side === 'A' ? m.poolA + amount : m.poolA,
          poolB: side === 'B' ? m.poolB + amount : m.poolB,
        };
      })
    );

    // Create or append to position
    setPositions((prev) => {
      const existing = prev.find((p) => p.marketId === marketId && p.side === side && !p.claimed);
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? { ...p, amount: p.amount + amount, timestamp: Date.now() }
            : p
        );
      }
      const newPos: UserPosition = {
        id: `pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        marketId,
        side,
        amount,
        timestamp: Date.now(),
        claimed: false,
      };
      return [newPos, ...prev];
    });

    return true;
  };

  const createMarket = (marketData: Partial<Market>): string => {
    const newId = `dm-${Date.now().toString().slice(-4)}`;
    const creatorStake = marketData.creatorStake || 100;
    const creatorSide = marketData.creatorSide || 'A';

    setUserBalance((prev) => Math.max(0, prev - creatorStake));

    const fullMarket: Market = {
      id: newId,
      type: marketData.type || 'clean',
      question: marketData.question || 'Untitled Market',
      category: marketData.category || 'General',
      sideA: marketData.sideA || { label: 'Side A' },
      sideB: marketData.sideB || { label: 'Side B' },
      poolA: creatorSide === 'A' ? creatorStake : 0,
      poolB: creatorSide === 'B' ? creatorStake : 0,
      lockTimestamp: marketData.lockTimestamp || Date.now() + 86400000 * 3,
      resolutionDeadline: marketData.resolutionDeadline || Date.now() + 86400000 * 7,
      status: 'open',
      creatorAddress: userAddress,
      creatorSide,
      creatorStake,
      cleanRule: marketData.cleanRule,
      vibeRule: marketData.vibeRule,
    };

    setMarkets((prev) => [fullMarket, ...prev]);

    // Record user position as creator
    const creatorPosition: UserPosition = {
      id: `pos-${Date.now()}`,
      marketId: newId,
      side: creatorSide,
      amount: creatorStake,
      timestamp: Date.now(),
      claimed: false,
    };
    setPositions((prev) => [creatorPosition, ...prev]);

    return newId;
  };

  const simulateLockMarket = (marketId: string) => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        return {
          ...m,
          status: 'locked',
          lockTimestamp: Date.now() - 1000,
        };
      })
    );
  };

  const resolveMarket = (
    marketId: string,
    outcome: MarketSide | 'void',
    evidenceData: Omit<ResolutionEvidence, 'resolvedTimestamp' | 'evidenceHash' | 'decidedOutcome'>
  ) => {
    const resolution: ResolutionEvidence = {
      ...evidenceData,
      decidedOutcome: outcome,
      resolvedTimestamp: Date.now(),
      evidenceHash: `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`,
    };

    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        // Appeal window is 24 hours
        const appealDeadline = Date.now() + 24 * 3600 * 1000;
        return {
          ...m,
          status: 'pending_appeal',
          resolution,
          appealDeadline,
        };
      })
    );
  };

  const fileAppeal = (
    marketId: string,
    counterEvidenceUrl: string,
    counterReasoning: string,
    bondAmount: number
  ): boolean => {
    if (bondAmount > userBalance) return false;

    setUserBalance((prev) => prev - bondAmount);

    const appeal: AppealRecord = {
      appealId: `apl-${Date.now().toString().slice(-4)}`,
      appellantAddress: userAddress,
      contestedTimestamp: Date.now(),
      counterEvidenceUrl,
      counterReasoning,
      appealBondAmount: bondAmount,
      status: 'under_review',
    };

    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        return {
          ...m,
          appeal,
        };
      })
    );

    return true;
  };

  const finalizeAppeal = (marketId: string, decision: 'upheld' | 'dismissed') => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId || !m.appeal || !m.resolution) return m;

        let finalOutcome = m.resolution.decidedOutcome;
        if (decision === 'upheld') {
          // Flip outcome or set void
          finalOutcome = m.resolution.decidedOutcome === 'A' ? 'B' : 'A';
        }

        return {
          ...m,
          status: 'resolved',
          resolution: {
            ...m.resolution,
            decidedOutcome: finalOutcome,
          },
          appeal: {
            ...m.appeal,
            status: decision,
          },
        };
      })
    );
  };

  const calculateClaimableAmount = (position: UserPosition, market: Market): number => {
    if (market.status !== 'resolved') return 0;
    if (!market.resolution) return 0;

    const outcome = market.resolution.decidedOutcome;
    if (outcome === 'void') {
      return position.amount; // full refund
    }

    if (position.side !== outcome) {
      return 0; // loss
    }

    // Winner
    const winningPool = outcome === 'A' ? market.poolA : market.poolB;
    const losingPool = outcome === 'A' ? market.poolB : market.poolA;

    if (winningPool <= 0) return position.amount;

    const userShare = position.amount / winningPool;
    const netLosingPool = losingPool * (1 - PROTOCOL_FEE_RATE);
    const winBonus = userShare * netLosingPool;

    return Math.round((position.amount + winBonus) * 100) / 100;
  };

  const claimPayout = (positionId: string): { success: boolean; payout: number } => {
    const position = positions.find((p) => p.id === positionId);
    if (!position || position.claimed) return { success: false, payout: 0 };

    const market = markets.find((m) => m.id === position.marketId);
    if (!market || market.status !== 'resolved') return { success: false, payout: 0 };

    const payout = calculateClaimableAmount(position, market);
    if (payout <= 0) return { success: false, payout: 0 };

    setUserBalance((prev) => prev + payout);
    setPositions((prev) =>
      prev.map((p) => (p.id === positionId ? { ...p, claimed: true, claimedAmount: payout } : p))
    );

    return { success: true, payout };
  };

  const resetAllData = () => {
    localStorage.removeItem('duelmarket_markets_v1');
    localStorage.removeItem('duelmarket_positions_v1');
    localStorage.removeItem('duelmarket_balance_v1');
    localStorage.removeItem('duelmarket_wallet_connected_v1');
    setMarkets(INITIAL_MARKETS);
    setPositions(INITIAL_USER_POSITIONS);
    setUserBalance(3450);
    setIsWalletConnected(true);
  };

  return (
    <MarketContext.Provider
      value={{
        markets,
        positions,
        userBalance,
        userAddress,
        isWalletConnected,
        connectWallet,
        disconnectWallet,
        faucetGEN,
        stakeOnMarket,
        createMarket,
        resolveMarket,
        fileAppeal,
        finalizeAppeal,
        claimPayout,
        simulateLockMarket,
        calculatePayoutPreview,
        calculateClaimableAmount,
        resetAllData,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarkets = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarkets must be used within a MarketProvider');
  }
  return context;
};
