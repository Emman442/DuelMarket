import React, { useMemo, useState } from "react";
import { PoolSplitBar } from "../common/PoolSplitBar";
import { StatusTag, MarketTypeTag } from "../common/StatusTag";
import { useBets } from "@/lib/hooks/useFootballBets";
import type { Bet, BetStatus, MarketType } from "@/lib/contracts/types";

interface MarketsListProps {
  onSelectMarket: (market: Bet) => void;
  onCreateMarket: () => void;
}

type StatusFilter = "all" | "open" | "pending_appeal" | "resolved";

const RESOLVED_STATUSES: BetStatus[] = [
  "appeal_resolved",
  "finalized",
  "voided",
  "cancelled",
];

function isResolved(status: BetStatus): boolean {
  return RESOLVED_STATUSES.includes(status);
}

function poolTotal(market: Bet): number {
  return Number(market.side_a_total) + Number(market.side_b_total);
}

function formatLockStatus(market: Bet): string {
  if (market.status === "finalized") {
    if (market.winning_side === "void") return "Refunded (void outcome)";
    if (market.winning_side === "A") return `Resolved · ${market.side_a_label} won`;
    if (market.winning_side === "B") return `Resolved · ${market.side_b_label} won`;
    return "Resolved";
  }
  if (market.status === "voided") return "Voided · stakes refunded";
  if (market.status === "cancelled") return "Cancelled · stakes refunded";
  if (market.status === "appeal_resolved") {
    return "Appeal resolved · awaiting payout";
  }
  if (market.status === "pending_appeal") return "In appeal window";

  const diff = Number(market.resolve_at) - Date.now();
  if (diff <= 0) return "Locked · awaiting resolution";
  const hours = Math.floor(diff / (3600 * 1000));
  const days = Math.floor(hours / 24);
  if (days > 0) return `Locks in ${days}d ${hours % 24}h`;
  if (hours > 0) return `Locks in ${hours}h`;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  return `Locks in ${minutes}m`;
}

export const MarketsList: React.FC<MarketsListProps> = ({
  onSelectMarket,
  onCreateMarket,
}) => {
  const { data: markets = [], isLoading } = useBets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | MarketType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "newest" | "closing_soon">(
    "volume"
  );

  const filteredMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        if (statusFilter === "open" && market.status !== "open") return false;
        if (statusFilter === "pending_appeal" && market.status !== "pending_appeal") {
          return false;
        }
        if (statusFilter === "resolved" && !isResolved(market.status)) return false;

        if (typeFilter !== "all" && market.market_type !== typeFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchQuestion = market.question.toLowerCase().includes(q);
          const matchSideA = market.side_a_label.toLowerCase().includes(q);
          const matchSideB = market.side_b_label.toLowerCase().includes(q);
          const matchId = market.bet_id.toLowerCase().includes(q);
          if (!matchQuestion && !matchSideA && !matchSideB && !matchId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "volume") return poolTotal(b) - poolTotal(a);
        if (sortBy === "newest") {
          const aNum = Number(a.bet_id.replace("bet_", "")) || 0;
          const bNum = Number(b.bet_id.replace("bet_", "")) || 0;
          return bNum - aNum;
        }
        if (sortBy === "closing_soon") {
          return Number(a.resolve_at) - Number(b.resolve_at);
        }
        return 0;
      });
  }, [markets, statusFilter, typeFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return {
      all: markets.length,
      open: markets.filter((m) => m.status === "open").length,
      pending_appeal: markets.filter((m) => m.status === "pending_appeal").length,
      resolved: markets.filter((m) => isResolved(m.status)).length,
    };
  }, [markets]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E0DAD0] pb-6">
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
            Open Protocol Markets
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B18]">
            Prediction Duels
          </h1>
          <p className="text-sm text-[#6B645C] max-w-xl">
            Take a side, deposit GEN into contract escrow, and verify outcomes
            against immutable data feeds or transparent evidence.
          </p>
        </div>

        <button
          onClick={onCreateMarket}
          className="self-start sm:self-end px-5 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
        >
          Create Duel
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#EAE5DC] rounded-lg">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === "open"
                  ? "bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              Open ({counts.open})
            </button>
            <button
              onClick={() => setStatusFilter("pending_appeal")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === "pending_appeal"
                  ? "bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              Pending Appeal ({counts.pending_appeal})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === "resolved"
                  ? "bg-[#FAF8F5] text-[#1E1B18] shadow-xs font-semibold"
                  : "text-[#6B645C] hover:text-[#1E1B18]"
              }`}
            >
              Resolved ({counts.resolved})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#787167] text-[11px] uppercase tracking-wider font-medium">
                Type:
              </span>
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === "all"
                    ? "font-semibold text-[#1E1B18] bg-[#E8E2D6]"
                    : "text-[#6B645C] hover:text-[#1E1B18]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter("clean")}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === "clean"
                    ? "font-semibold text-[#1E1B18] bg-[#E8E2D6]"
                    : "text-[#6B645C] hover:text-[#1E1B18]"
                }`}
              >
                Clean
              </button>
              <button
                onClick={() => setTypeFilter("vibe")}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                  typeFilter === "vibe"
                    ? "font-semibold text-[#1E1B18] bg-[#E8E2D6]"
                    : "text-[#6B645C] hover:text-[#1E1B18]"
                }`}
              >
                Vibe
              </button>
            </div>

            <div className="h-4 w-px bg-[#DCD6CC] hidden sm:block" />

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "volume" | "newest" | "closing_soon")
              }
              className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-lg text-xs py-1.5 px-2.5 text-[#1E1B18] focus:outline-none focus:border-[#BA401B] cursor-pointer"
            >
              <option value="volume">Highest Pool</option>
              <option value="newest">Most Recent</option>
              <option value="closing_soon">Closing Soon</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by question, side, or bet id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-sm text-[#1E1B18] placeholder-[#948D84] focus:outline-none focus:border-[#BA401B] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#736B63] hover:text-[#1E1B18] cursor-pointer p-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-[#6B645C]">
          Loading markets...
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] px-4">
          <p className="text-base font-semibold text-[#1E1B18]">
            No duels match your criteria
          </p>
          <p className="text-xs text-[#6B645C] max-w-sm mx-auto">
            Try adjusting your status or search terms, or deploy a new market to
            initiate a duel.
          </p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
              setSearchQuery("");
            }}
            className="mt-2 text-xs font-semibold text-[#BA401B] hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMarkets.map((market) => {
            const poolA = Number(market.side_a_total);
            const poolB = Number(market.side_b_total);
            const totalPool = poolA + poolB;
            const multA =
              poolA > 0 ? (1 + (poolB * 0.98) / poolA).toFixed(2) : "2.00";
            const multB =
              poolB > 0 ? (1 + (poolA * 0.98) / poolB).toFixed(2) : "2.00";

            return (
              <div
                key={market.bet_id}
                onClick={() => onSelectMarket(market)}
                className="group bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 hover:border-[#CDC5B8] transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#8C8479]">
                        #{market.bet_id}
                      </span>
                      <span className="text-[#C5BEB3]">·</span>
                      <MarketTypeTag type={market.market_type} />
                    </div>
                    <StatusTag
                      status={
                        market.status === "open" ||
                        market.status === "pending_appeal"
                          ? market.status
                          : "resolved"
                      }
                      appealDeadline={Number(market.appeal_deadline)}
                    />
                  </div>

                  <h3 className="text-lg font-bold text-[#1E1B18] group-hover:text-[#BA401B] transition-colors leading-snug">
                    {market.question}
                  </h3>
                </div>

                <div className="space-y-4 pt-3 border-t border-[#EBE5DC]">
                  <PoolSplitBar
                    poolA={poolA}
                    poolB={poolB}
                    labelA={market.side_a_label}
                    labelB={market.side_b_label}
                    size="md"
                  />

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[#6B645C]">
                        Side A:{" "}
                        <strong className="text-[#1E1B18] font-mono">{multA}x</strong>
                      </span>
                      <span className="text-[#6B645C]">
                        Side B:{" "}
                        <strong className="text-[#1E1B18] font-mono">{multB}x</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-[#1E1B18] num-tabular">
                        {totalPool.toLocaleString()} GEN
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#787167] pt-1 border-t border-[#F0ECE4]">
                    <span className="capitalize">{market.market_type} market</span>
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