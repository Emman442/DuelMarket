import React, { useState, useMemo } from 'react';
import { useMarkets } from '../../context/MarketContext';
import { Market, MarketStatus, MarketType } from '../../types/market';
import { PoolSplitBar } from '../common/PoolSplitBar';
import { StatusTag, MarketTypeTag } from '../common/StatusTag';

interface MarketsListProps {
  onSelectMarket: (market: Market) => void;
  onCreateMarket: () => void;
}

type StatusFilter = 'all' | 'open' | 'pending_appeal' | 'resolved';

export const MarketsList: React.FC<MarketsListProps> = ({
  onSelectMarket,
  onCreateMarket,
}) => {
  const { markets } = useMarkets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MarketType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'newest' | 'closing_soon'>('volume');

  const filteredMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        // Status filter
        if (statusFilter === 'open' && market.status !== 'open') return false;
        if (statusFilter === 'pending_appeal' && market.status !== 'pending_appeal') return false;
        if (statusFilter === 'resolved' && (market.status !== 'resolved' && market.status !== 'void')) return false;

        // Type filter
        if (typeFilter !== 'all' && market.type !== typeFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchQuestion = market.question.toLowerCase().includes(q);
          const matchSideA = market.sideA.label.toLowerCase().includes(q);
          const matchSideB = market.sideB.label.toLowerCase().includes(q);
          const matchCategory = market.category.toLowerCase().includes(q);
          if (!matchQuestion && !matchSideA && !matchSideB && !matchCategory) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'volume') {
          return b.poolA + b.poolB - (a.poolA + a.poolB);
        }
        if (sortBy === 'newest') {
          return parseInt(b.id.replace('dm-', '') || '0') - parseInt(a.id.replace('dm-', '') || '0');
        }
        if (sortBy === 'closing_soon') {
          return a.lockTimestamp - b.lockTimestamp;
        }
        return 0;
      });
  }, [markets, statusFilter, typeFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return {
      all: markets.length,
      open: markets.filter((m) => m.status === 'open').length,
      pending_appeal: markets.filter((m) => m.status === 'pending_appeal').length,
      resolved: markets.filter((m) => m.status === 'resolved' || m.status === 'void').length,
    };
  }, [markets]);

  const formatLockStatus = (market: Market) => {
    if (market.status === 'resolved') {
      return market.resolution?.decidedOutcome === 'void'
        ? 'Refunded (Void outcome)'
        : `Resolved · ${market.resolution?.decidedOutcome === 'A' ? market.sideA.label : market.sideB.label} won`;
    }
    if (market.status === 'pending_appeal') {
      return 'In 24h appeal window';
    }
    if (market.status === 'locked') {
      return 'Locked · Awaiting resolution';
    }
    const diff = market.lockTimestamp - Date.now();
    if (diff <= 0) return 'Staking locked';
    const hours = Math.floor(diff / (3600 * 1000));
    const days = Math.floor(hours / 24);
    if (days > 0) return `Locks in ${days}d ${hours % 24}h`;
    return `Locks in ${hours}h`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header and Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E0DAD0] pb-6">
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
            Open Protocol Markets
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B18]">
            Prediction Duels
          </h1>
          <p className="text-sm text-[#6B645C] max-w-xl">
            Take a side, deposit GEN into contract escrow, and verify outcomes against immutable data feeds or transparent evidence.
          </p>
        </div>

        <button
          onClick={onCreateMarket}
          className="self-start sm:self-end px-5 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
        >
          Create Duel
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Main Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#EAE5DC] rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              Open ({counts.open})
            </button>
            <button
              onClick={() => setStatusFilter('pending_appeal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'pending_appeal'
                  ? 'bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              Pending Appeal ({counts.pending_appeal})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === 'resolved'
                  ? 'bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold'
                  : 'text-[#6B645C] hover:text-[#1E1B18]'
              }`}
            >
              Resolved ({counts.resolved})
            </button>
          </div>

          {/* Type Filter & Sort by */}
          <div className="flex items-center gap-3">
            {/* Type selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#787167] text-[11px] uppercase tracking-wider font-medium">Type:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === 'all'
                    ? 'font-semibold text-[#1E1B18] bg-[#E8E2D6]'
                    : 'text-[#6B645C] hover:text-[#1E1B18]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('clean')}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === 'clean'
                    ? 'font-semibold text-[#1E1B18] bg-[#E8E2D6]'
                    : 'text-[#6B645C] hover:text-[#1E1B18]'
                }`}
              >
                Clean
              </button>
              <button
                onClick={() => setTypeFilter('vibe')}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === 'vibe'
                    ? 'font-semibold text-[#1E1B18] bg-[#E8E2D6]'
                    : 'text-[#6B645C] hover:text-[#1E1B18]'
                }`}
              >
                Vibe
              </button>
            </div>

            <div className="h-4 w-px bg-[#DCD6CC] hidden sm:block" />

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-lg text-xs py-1.5 px-2.5 text-[#1E1B18] focus:outline-none focus:border-[#BA401B] cursor-pointer"
            >
              <option value="volume">Highest Pool</option>
              <option value="newest">Most Recent</option>
              <option value="closing_soon">Closing Soon</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search claims by keyword, side, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-sm text-[#1E1B18] placeholder-[#948D84] focus:outline-none focus:border-[#BA401B] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#736B63] hover:text-[#1E1B18] cursor-pointer p-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Markets Cards Grid */}
      {filteredMarkets.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] px-4">
          <p className="text-base font-semibold text-[#1E1B18]">
            No duels match your criteria
          </p>
          <p className="text-xs text-[#6B645C] max-w-sm mx-auto">
            Try adjusting your status or search terms, or deploy a new market to initiate a duel.
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setTypeFilter('all');
              setSearchQuery('');
            }}
            className="mt-2 text-xs font-semibold text-[#BA401B] hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMarkets.map((market) => {
            const totalPool = market.poolA + market.poolB;

            // Calculate current implied payout multipliers
            const multA = market.poolA > 0 ? (1 + (market.poolB * 0.98) / market.poolA).toFixed(2) : '2.00';
            const multB = market.poolB > 0 ? (1 + (market.poolA * 0.98) / market.poolB).toFixed(2) : '2.00';

            return (
              <div
                key={market.id}
                onClick={() => onSelectMarket(market)}
                className="group bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 hover:border-[#CDC5B8] transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-6"
              >
                {/* Header metadata row */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#8C8479]">
                        #{market.id}
                      </span>
                      <span className="text-[#C5BEB3]">·</span>
                      <MarketTypeTag type={market.type} />
                    </div>
                    <StatusTag status={market.status} appealDeadline={market.appealDeadline} />
                  </div>

                  <h3 className="text-lg font-bold text-[#1E1B18] group-hover:text-[#BA401B] transition-colors leading-snug">
                    {market.question}
                  </h3>
                </div>

                {/* Pool & Multipliers */}
                <div className="space-y-4 pt-3 border-t border-[#EBE5DC]">
                  {/* Split Bar */}
                  <PoolSplitBar
                    poolA={market.poolA}
                    poolB={market.poolB}
                    labelA={market.sideA.label}
                    labelB={market.sideB.label}
                    size="md"
                  />

                  {/* Multiplier tags & volume */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[#6B645C]">
                        Side A: <strong className="text-[#1E1B18] font-mono">{multA}x</strong>
                      </span>
                      <span className="text-[#6B645C]">
                        Side B: <strong className="text-[#1E1B18] font-mono">{multB}x</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-[#1E1B18] num-tabular">
                        {totalPool.toLocaleString()} GEN
                      </span>
                    </div>
                  </div>

                  {/* Status timing strip */}
                  <div className="flex items-center justify-between text-[11px] text-[#787167] pt-1 border-t border-[#F0ECE4]">
                    <span>Category: {market.category}</span>
                    <span className="font-medium text-[#4A453F]">
                      {formatLockStatus(market)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
