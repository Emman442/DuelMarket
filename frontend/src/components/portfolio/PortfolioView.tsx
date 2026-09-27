import React, { useState } from 'react';
import { useMarkets } from '../../context/MarketContext';
import { Market, UserPosition } from '../../types/market';
import { StatusTag, MarketTypeTag } from '../common/StatusTag';

interface PortfolioViewProps {
  onSelectMarket: (market: Market) => void;
  onExploreMarkets: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  onSelectMarket,
  onExploreMarkets,
}) => {
  const { markets, positions, userBalance, claimPayout, calculateClaimableAmount } = useMarkets();
  const [claimToast, setClaimToast] = useState<string | null>(null);

  // Total metrics
  const activePositions = positions.filter((p) => {
    const market = markets.find((m) => m.id === p.marketId);
    return market && market.status !== 'resolved' && market.status !== 'void';
  });

  const totalStakedActive = activePositions.reduce((acc, p) => acc + p.amount, 0);

  // Unclaimed winnings
  let totalUnclaimedPayout = 0;
  positions.forEach((p) => {
    if (!p.claimed) {
      const market = markets.find((m) => m.id === p.marketId);
      if (market) {
        totalUnclaimedPayout += calculateClaimableAmount(p, market);
      }
    }
  });

  const handleClaim = (posId: string) => {
    const res = claimPayout(posId);
    if (res.success) {
      setClaimToast(`Claimed ${res.payout.toLocaleString()} GEN into wallet.`);
      setTimeout(() => setClaimToast(null), 4000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header and Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E0DAD0] pb-6">
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
            My Account & Escrow
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B18]">
            Staked Positions
          </h1>
          <p className="text-sm text-[#6B645C] max-w-xl">
            Audit your capital commitments, monitor dispute appeals, and claim contract-settled payouts.
          </p>
        </div>

        <button
          onClick={onExploreMarkets}
          className="self-start sm:self-end px-5 py-2.5 rounded-full border border-[#BA401B] text-[#BA401B] hover:bg-[#BA401B]/5 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
        >
          Explore More Duels
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Active in Escrow
          </span>
          <div className="text-2xl font-bold text-[#1E1B18] num-tabular">
            {totalStakedActive.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">
            Across {activePositions.length} active market{activePositions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#EBE5DC] pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Unclaimed Winnings
          </span>
          <div className="text-2xl font-bold text-[#BA401B] num-tabular">
            {totalUnclaimedPayout.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">Ready for wallet withdrawal</span>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#EBE5DC] pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Wallet Balance
          </span>
          <div className="text-2xl font-bold text-[#1E1B18] num-tabular">
            {userBalance.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">Available for staking</span>
        </div>
      </div>

      {claimToast && (
        <div className="p-4 bg-[#EAF5EA] text-[#205723] rounded-xl border border-[#CFE8CF] text-xs font-semibold flex items-center justify-between">
          <span>✓ {claimToast}</span>
          <button
            onClick={() => setClaimToast(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Positions Card List (No dense table) */}
      <div className="space-y-4">
        <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
          All Positions ({positions.length})
        </div>

        {positions.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] px-4">
            <p className="text-base font-semibold text-[#1E1B18]">
              No active or historical positions
            </p>
            <p className="text-xs text-[#6B645C] max-w-sm mx-auto">
              Join an open duel or deploy your own to begin building a prediction track record.
            </p>
            <button
              onClick={onExploreMarkets}
              className="mt-3 px-6 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold cursor-pointer"
            >
              Browse Open Markets
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((pos) => {
              const market = markets.find((m) => m.id === pos.marketId);
              if (!market) return null;

              const claimable = calculateClaimableAmount(pos, market);
              const isWinner =
                market.status === 'resolved' && market.resolution?.decidedOutcome === pos.side;
              const isVoid =
                market.status === 'resolved' && market.resolution?.decidedOutcome === 'void';
              const isLoser =
                market.status === 'resolved' &&
                market.resolution?.decidedOutcome !== pos.side &&
                market.resolution?.decidedOutcome !== 'void';

              return (
                <div
                  key={pos.id}
                  className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 hover:border-[#D1C9BE] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-3 text-xs">
                      <MarketTypeTag type={market.type} />
                      <span className="text-[#C5BEB3]">·</span>
                      <StatusTag status={market.status} appealDeadline={market.appealDeadline} />
                      <span className="text-[#C5BEB3]">·</span>
                      <span className="text-[11px] font-mono text-[#8C8479]">
                        ID #{market.id}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectMarket(market)}
                      className="text-base font-bold text-[#1E1B18] hover:text-[#BA401B] cursor-pointer transition-colors leading-snug"
                    >
                      {market.question}
                    </h3>

                    {/* Position details */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B645C] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            pos.side === 'A' ? 'bg-[#BA401B]' : 'bg-[#3D3833]'
                          }`}
                        />
                        <span>
                          Side {pos.side}:{' '}
                          <strong className="text-[#1E1B18]">
                            {pos.side === 'A' ? market.sideA.label : market.sideB.label}
                          </strong>
                        </span>
                      </div>

                      <span>·</span>

                      <span>
                        Staked:{' '}
                        <strong className="text-[#1E1B18] font-mono">
                          {pos.amount.toLocaleString()} GEN
                        </strong>
                      </span>

                      <span>·</span>

                      <span className="text-[#8C8479]">
                        {new Date(pos.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Payout Status */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 border-[#EBE5DC] pt-4 sm:pt-0">
                    {market.status === 'resolved' ? (
                      pos.claimed ? (
                        <div className="text-right">
                          <span className="text-xs font-semibold text-[#388E3C] block">
                            ✓ Payout Claimed
                          </span>
                          <span className="text-xs font-mono text-[#686158]">
                            +{pos.claimedAmount?.toLocaleString()} GEN
                          </span>
                        </div>
                      ) : claimable > 0 ? (
                        <button
                          onClick={() => handleClaim(pos.id)}
                          className="px-5 py-2 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-bold tracking-wide transition-colors cursor-pointer shadow-none"
                        >
                          Claim {claimable.toLocaleString()} GEN
                        </button>
                      ) : isLoser ? (
                        <div className="text-right">
                          <span className="text-xs font-medium text-[#7A7369] block">
                            Outcome Did Not Win
                          </span>
                          <span className="text-[11px] text-[#A19A8F]">Loss: -{pos.amount} GEN</span>
                        </div>
                      ) : (
                        <div className="text-xs text-[#7A7369]">Awaiting claim</div>
                      )
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1E1B18] block">
                          Escrow Locked
                        </span>
                        <span className="text-[11px] text-[#8C8479]">
                          {market.status === 'open' ? 'Staking open' : 'Pending outcome'}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => onSelectMarket(market)}
                      className="text-xs text-[#6B645C] hover:text-[#1E1B18] font-medium cursor-pointer"
                    >
                      View Duel Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
