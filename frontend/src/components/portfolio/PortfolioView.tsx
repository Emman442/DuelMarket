import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusTag, MarketTypeTag } from "../common/StatusTag";
import {
  useBets,
  useDuelMarketContract,
  useFinalizePayout,
} from "@/lib/hooks/useDuelMarket";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Bet, BetStatus, Position } from "@/lib/contracts/types";

interface PortfolioViewProps {
  onSelectMarket: (market: Bet) => void;
  onExploreMarkets: () => void;
}

const SETTLED: BetStatus[] = ["finalized", "voided", "cancelled"];

function isSettled(status: BetStatus) {
  return SETTLED.includes(status);
}

function claimableAmount(pos: Position, market: Bet): number {
  if (pos.claimed) return 0;
  if (market.status === "finalized" && pos.payout_amount > 0) {
    return pos.payout_amount;
  }
  if (market.winning_side === "void" || market.status === "voided") {
    return pos.amount;
  }
  if (
    (market.status === "finalized" || market.status === "appeal_resolved") &&
    market.winning_side === pos.side
  ) {
    return pos.payout_amount || pos.amount;
  }
  return 0;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  onSelectMarket,
  onExploreMarkets,
}) => {
  const { address } = useWallet();
  const { data: markets = [], isLoading: marketsLoading } = useBets();
  const contract = useDuelMarketContract();
  const { finalizePayout, isFinalizing } = useFinalizePayout();
  const userBalance = 1000;

  const { data: rows = [], isLoading: positionsLoading } = useQuery({
    queryKey: [
      "walletPositions",
      address,
      markets.map((m) => m.bet_id).join(","),
    ],
    enabled: !!contract && !!address && markets.length > 0,
    queryFn: async () => {
      const result: { market: Bet; position: Position }[] = [];
      for (const market of markets) {
        const has = await contract!.hasPosition(market.bet_id, address!);
        if (!has) continue;
        const position = await contract!.getWalletPosition(
          market.bet_id,
          address!
        );
        result.push({ market, position });
      }
      return result;
    },
  });

  const activeRows = useMemo(
    () => rows.filter(({ market }) => !isSettled(market.status)),
    [rows]
  );

  const totalStakedActive = activeRows.reduce(
    (acc, row) => acc + Number(row.position.amount),
    0
  );

  const totalUnclaimedPayout = rows.reduce((acc, { market, position }) => {
    return acc + claimableAmount(position, market);
  }, 0);

  const canFinalize = (market: Bet) =>
    market.status === "appeal_resolved" || market.status === "pending_appeal";

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <p className="text-base font-semibold text-[#1E1B18]">
          Connect a wallet to see your positions
        </p>
        <button
          onClick={onExploreMarkets}
          className="mt-3 px-6 py-2.5 rounded-full bg-[#BA401B] text-white text-xs font-semibold cursor-pointer"
        >
          Browse Open Markets
        </button>
      </div>
    );
  }

  const loading = marketsLoading || positionsLoading;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E0DAD0] pb-6">
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
            My Account & Escrow
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1B18]">
            Staked Positions
          </h1>
          <p className="text-sm text-[#6B645C] max-w-xl">
            Positions are loaded from the contract per market. Claiming runs
            finalize_payout for that duel.
          </p>
        </div>

        <button
          onClick={onExploreMarkets}
          className="self-start sm:self-end px-5 py-2.5 rounded-full border border-[#BA401B] text-[#BA401B] hover:bg-[#BA401B]/5 text-xs font-semibold tracking-wide cursor-pointer"
        >
          Explore More Duels
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Active in Escrow
          </span>
          <div className="text-2xl font-bold text-[#1E1B18] num-tabular">
            {totalStakedActive.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">
            Across {activeRows.length} active market
            {activeRows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#EBE5DC] pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Unclaimed / Payable
          </span>
          <div className="text-2xl font-bold text-[#BA401B] num-tabular">
            {totalUnclaimedPayout.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">
            After finalize_payout has run
          </span>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-[#EBE5DC] pt-4 sm:pt-0 sm:pl-6">
          <span className="text-[11px] uppercase tracking-wider text-[#7A7369] font-semibold">
            Wallet Balance
          </span>
          <div className="text-2xl font-bold text-[#1E1B18] num-tabular">
            {userBalance.toLocaleString()} GEN
          </div>
          <span className="text-xs text-[#8C8479]">Placeholder until a balance hook exists</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
          All Positions ({rows.length})
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#6B645C]">
            Loading positions...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] px-4">
            <p className="text-base font-semibold text-[#1E1B18]">
              No positions for this wallet
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
            {rows.map(({ market, position }) => {
              const claimable = claimableAmount(position, market);
              const won =
                market.winning_side === position.side &&
                (market.status === "finalized" ||
                  market.status === "appeal_resolved");
              const lost =
                isSettled(market.status) &&
                market.winning_side !== "" &&
                market.winning_side !== "void" &&
                market.winning_side !== position.side;
              const voided =
                market.status === "voided" || market.winning_side === "void";

              return (
                <div
                  key={position.position_id}
                  className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-3 text-xs">
                      <MarketTypeTag type={market.market_type} />
                      <span className="text-[#C5BEB3]">·</span>
                      <StatusTag
                        status={market.status}
                        appealDeadline={Number(market.appeal_deadline)}
                      />
                      <span className="text-[#C5BEB3]">·</span>
                      <span className="text-[11px] font-mono text-[#8C8479]">
                        #{market.bet_id}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectMarket(market)}
                      className="text-base font-bold text-[#1E1B18] hover:text-[#BA401B] cursor-pointer leading-snug"
                    >
                      {market.question}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B645C] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            position.side === "A" ? "bg-[#BA401B]" : "bg-[#3D3833]"
                          }`}
                        />
                        <span>
                          Side {position.side}:{" "}
                          <strong className="text-[#1E1B18]">
                            {position.side === "A"
                              ? market.side_a_label
                              : market.side_b_label}
                          </strong>
                        </span>
                      </div>
                      <span>·</span>
                      <span>
                        Staked:{" "}
                        <strong className="text-[#1E1B18] font-mono">
                          {Number(position.amount).toLocaleString()} GEN
                        </strong>
                      </span>
                      {position.joined_at && (
                        <>
                          <span>·</span>
                          <span className="text-[#8C8479]">{position.joined_at}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 border-[#EBE5DC] pt-4 sm:pt-0">
                    {position.claimed ? (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#388E3C] block">
                          ✓ Settled
                        </span>
                        <span className="text-xs font-mono text-[#686158]">
                          {Number(position.payout_amount).toLocaleString()} GEN
                        </span>
                      </div>
                    ) : canFinalize(market) ? (
                      <button
                        disabled={isFinalizing}
                        onClick={() =>
                          finalizePayout({ betId: market.bet_id })
                        }
                        className="px-5 py-2 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isFinalizing ? "Finalizing..." : "Finalize payout"}
                      </button>
                    ) : claimable > 0 ? (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#388E3C] block">
                          Payable {claimable.toLocaleString()} GEN
                        </span>
                      </div>
                    ) : lost ? (
                      <div className="text-right">
                        <span className="text-xs font-medium text-[#7A7369] block">
                          Outcome did not win
                        </span>
                        <span className="text-[11px] text-[#A19A8F]">
                          Loss: -{position.amount} GEN
                        </span>
                      </div>
                    ) : voided ? (
                      <div className="text-xs text-[#7A7369]">Void / refund</div>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1E1B18] block">
                          In escrow
                        </span>
                        <span className="text-[11px] text-[#8C8479]">
                          {market.status === "open"
                            ? "Staking open"
                            : "Pending outcome"}
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