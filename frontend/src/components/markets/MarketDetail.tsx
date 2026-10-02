import React, { useMemo, useState } from "react";
import { PoolSplitBar } from "../common/PoolSplitBar";
import { StatusTag, MarketTypeTag } from "../common/StatusTag";
import { CountdownTimer } from "../common/CountdownTimer";
import { useWallet } from "@/lib/genlayer/wallet";
import {getAddress} from "viem"
import {
  useBet,
  useWalletPosition,
  useHasBeenAppealed,
  useJoinBet,
  useResolveMarket,
  useDisputeResolution,
  useFinalizePayout,
  useVoidUnmatchedBet,
  useCancelBet,
} from "@/lib/hooks/useDuelMarket";
import type { BetSide } from "@/lib/contracts/types";
import { useParams } from "react-router-dom";

interface MarketDetailProps {
  marketId: string;
  onBack: () => void;
  onOpenWallet: () => void;
}

function previewMultiplier(ownPool: number, otherPool: number) {


   
  if (ownPool <= 0) return "2.00";
  return (1 + (otherPool * 0.98) / ownPool).toFixed(2);
}

function projectedReturn(stake: number, ownPool: number, otherPool: number) {
  const nextOwn = ownPool + stake;
  if (nextOwn <= 0) return stake;
  const share = (stake * (otherPool * 0.98)) / nextOwn;
  return stake + share;
}

export const MarketDetail: React.FC<MarketDetailProps> = ({
  marketId,
  onBack,
  onOpenWallet,
}) => {
  const params = useParams<{ marketId?: string }>();
   
  const { address } = useWallet();
  const isWalletConnected = Boolean(address);

  const { data: market, isLoading } = useBet(params.marketId || marketId);
  const { data: position } = useWalletPosition(params.marketId || marketId, getAddress(address!) ?? null);
  console.log(address, position, params.marketId || marketId, market);
  const { data: appealed } = useHasBeenAppealed(params.marketId || marketId);

  const { joinBet, isJoining } = useJoinBet();
  const { resolveMarket, isResolving } = useResolveMarket();
  const { disputeResolution, isDisputing } = useDisputeResolution();
  const { finalizePayout, isFinalizing } = useFinalizePayout();
  const { voidUnmatchedBet } = useVoidUnmatchedBet();
  const {  cancelBet } = useCancelBet();

  const [selectedSide, setSelectedSide] = useState<BetSide>("A");
  const [stakeAmount, setStakeAmount] = useState("1");
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealContext, setAppealContext] = useState("");

  const parsedStake = Math.floor(Number(stakeAmount) || 0);

  const poolA = Number(market?.side_a_total ?? 0);
  const poolB = Number(market?.side_b_total ?? 0);
  const totalPool = poolA + poolB;
  const locked = market ? Date.now() >= Number(market.resolve_at) : false;

  const payoutPreview = useMemo(() => {
    const own = selectedSide === "A" ? poolA : poolB;
    const other = selectedSide === "A" ? poolB : poolA;
    return {
      multiplier: previewMultiplier(own + parsedStake, other),
      projectedReturn: projectedReturn(parsedStake, own, other),
    };
  }, [selectedSide, poolA, poolB, parsedStake]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-[#6B645C]">
        Loading market...
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg font-bold text-[#1E1B18]">Market not found</p>
        <button
          onClick={onBack}
          className="text-xs font-semibold text-[#BA401B] hover:underline cursor-pointer"
        >
          ← Return to all duels
        </button>
      </div>
    );
  }

  const canStake = market.status === "open" && !locked;
  const canResolve =
    market.status === "open" && locked && poolA > 0 && poolB > 0;
  const canVoidUnmatched =
    market.status === "open" && locked && (poolA === 0 || poolB === 0);
  const canCancel =
    market.status === "open" &&
    (poolA === 0 || poolB === 0) &&
    address &&
    (address.toLowerCase() === market.creator.toLowerCase());
  const canAppeal =
    market.status === "pending_appeal" &&
    !appealed &&
    Boolean(position) &&
    Date.now() < Number(market.appeal_deadline);
  const canFinalize =
    market.status === "appeal_resolved" ||
    (market.status === "pending_appeal" &&
      Date.now() >= Number(market.appeal_deadline));

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalletConnected) {
      onOpenWallet();
      return;
    }
    if (parsedStake < 1) return;
    joinBet({
      betId: market.bet_id,
      side: selectedSide,
      stakeGen: parsedStake,
    });
  };

  const submitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (appealContext.trim().length < 10) return;
    disputeResolution({
      betId: market.bet_id,
      appealContext: appealContext.trim(),
    });
    setShowAppealModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] cursor-pointer"
        >
          ← Back to all duels
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#8C8479]">#{market.bet_id}</span>
          <StatusTag
            status={market.status}
            appealDeadline={Number(market.appeal_deadline)}
          />
        </div>
      </div>

      <div className="space-y-4 border-b border-[#E0DAD0] pb-8">
        <div className="flex items-center gap-2 text-xs text-[#6B645C]">
          <MarketTypeTag type={market.market_type} />
          <span>·</span>
          <span>
            Created by{" "}
            <strong className="font-mono text-[#1E1B18]">{market.creator}</strong>
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1B18] tracking-tight leading-tight">
          {market.question}
        </h1>

        <div className="pt-2 flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-[#7A7369] block">Total pool</span>
            <span className="text-xl font-bold text-[#1E1B18] num-tabular">
              {totalPool.toLocaleString()} GEN
            </span>
          </div>
          <div>
            <span className="text-xs text-[#7A7369] block">
              {canStake ? "Locks in" : "Lock time"}
            </span>
            <span className="text-sm font-semibold text-[#1E1B18]">
              {canStake ? (
                <CountdownTimer targetTimestamp={Number(market.resolve_at)} />
              ) : (
                new Date(Number(market.resolve_at)).toLocaleString()
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-5">
            <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63] border-b border-[#EBE5DC] pb-3">
              {market.market_type === "clean"
                ? "Oracle specification"
                : "Resolution criteria"}
            </div>

            {market.market_type === "clean" ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-[#787167] block">Rule</span>
                  <span className="font-mono font-semibold text-[#1E1B18]">
                    {market.json_field_path} {market.comparison} {market.target_value}
                  </span>
                </div>
                <a
                  href={market.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#BA401B] hover:underline break-all"
                >
                  {market.evidence_url} ↗
                </a>
              </div>
            ) : (
              <p className="text-sm text-[#3E3832] leading-relaxed whitespace-pre-line bg-[#F5F1EB] p-4 rounded-lg">
                {market.resolution_criteria}
              </p>
            )}
          </div>

          {market.resolution_reasoning && (
            <div className="bg-[#FAF8F5] rounded-xl border border-[#D8D0C3] p-6 space-y-3">
              <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#1E1B18]">
                Resolution
              </div>
              <p className="text-sm font-semibold text-[#BA401B]">
                Outcome: {market.winning_side || "pending"}
                {market.winning_side === "A" && ` · ${market.side_a_label}`}
                {market.winning_side === "B" && ` · ${market.side_b_label}`}
              </p>
              {market.resolution_value && (
                <p className="text-xs font-mono text-[#686158]">
                  Observed: {market.resolution_value}
                </p>
              )}
              <p className="text-sm text-[#4E4841] leading-relaxed">
                {market.resolution_reasoning}
              </p>
            </div>
          )}

          <div className="bg-[#FAF8F5]/60 rounded-xl border border-[#E0DAD0] p-4 flex flex-wrap gap-2 text-xs">
            {canResolve && (
              <button
                disabled={isResolving}
                onClick={() => resolveMarket(market.bet_id)}
                className="px-3 py-1.5 rounded-full bg-[#BA401B] text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {isResolving ? "Resolving..." : "Resolve market"}
              </button>
            )}
            {canVoidUnmatched && (
              <button
                onClick={() => voidUnmatchedBet(market.bet_id)}
                className="px-3 py-1.5 rounded-full bg-[#EAE5DC] text-[#1E1B18] font-medium cursor-pointer"
              >
                Void unmatched
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => cancelBet(market.bet_id)}
                className="px-3 py-1.5 rounded-full bg-[#EAE5DC] text-[#1E1B18] font-medium cursor-pointer"
              >
              Cancel market
              </button>
            )}
            {canAppeal && (
              <button
                onClick={() => setShowAppealModal(true)}
                className="px-3 py-1.5 rounded-full border border-[#805B24] text-[#805B24] font-medium cursor-pointer"
              >
                File appeal
              </button>
            )}
            {canFinalize && (
              <button
                disabled={isFinalizing}
                onClick={() => finalizePayout(market.bet_id)}
                className="px-3 py-1.5 rounded-full bg-[#BA401B] text-white font-medium cursor-pointer disabled:opacity-50"
              >
                {isFinalizing ? "Finalizing..." : "Finalize payout"}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-6">
            <PoolSplitBar
              poolA={poolA}
              poolB={poolB}
              labelA={market.side_a_label}
              labelB={market.side_b_label}
              size="md"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSide("A")}
                disabled={!canStake}
                className={`p-4 rounded-xl text-left border cursor-pointer ${
                  selectedSide === "A"
                    ? "border-[#BA401B] bg-[#FAF3F0] ring-1 ring-[#BA401B]"
                    : "border-[#E0DAD0] bg-white"
                }`}
              >
                <div className="text-[11px] font-mono font-bold text-[#BA401B]">SIDE A</div>
                <div className="font-bold text-sm mt-1">{market.side_a_label}</div>
                <div className="text-[11px] text-[#7A7369] mt-2">
                  {poolA.toLocaleString()} GEN · {previewMultiplier(poolA, poolB)}x
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide("B")}
                disabled={!canStake}
                className={`p-4 rounded-xl text-left border cursor-pointer ${
                  selectedSide === "B"
                    ? "border-[#1E1B18] bg-[#F5F2ED] ring-1 ring-[#1E1B18]"
                    : "border-[#E0DAD0] bg-white"
                }`}
              >
                <div className="text-[11px] font-mono font-bold text-[#4A453F]">SIDE B</div>
                <div className="font-bold text-sm mt-1">{market.side_b_label}</div>
                <div className="text-[11px] text-[#7A7369] mt-2">
                  {poolB.toLocaleString()} GEN · {previewMultiplier(poolB, poolA)}x
                </div>
              </button>
            </div>

            {canStake ? (
              <form onSubmit={handleStake} className="space-y-4">
                <input
                  type="number"
                  min={market.min_stake}
                  step="1"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-base font-semibold focus:border-[#BA401B] focus:outline-none"
                />
                <div className="bg-[#F5F1EB] rounded-lg p-3.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Implied multiplier</span>
                    <strong>{payoutPreview.multiplier}x</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. return if this side wins</span>
                    <strong className="text-[#BA401B]">
                      ~{payoutPreview.projectedReturn.toFixed(2)} GEN
                    </strong>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isJoining || parsedStake < 1}
                  className="w-full py-3 rounded-full bg-[#BA401B] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isJoining
                    ? "Staking..."
                    : `Stake ${parsedStake} GEN on Side ${selectedSide}`}
                </button>
              </form>
            ) : (
              <p className="text-xs text-[#7A7369] text-center">
                Staking is closed for this duel.
              </p>
            )}
          </div>

          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-3">
            <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
              Your position
            </div>
            {!position ? (
              <p className="text-xs text-[#7A7369]">No stake on this duel yet.</p>
            ) : (
              <div className="text-xs space-y-1">
                <p>
                  Side {position.side}:{" "}
                  <strong>
                    {position.side === "A"
                      ? market.side_a_label
                      : market.side_b_label}
                  </strong>
                </p>
                <p>
                  Staked:{" "}
                  <strong className="font-mono">
                    {Number(position.amount).toLocaleString()} GEN
                  </strong>
                </p>
                {position.claimed && (
                  <p className="text-[#388E3C] font-semibold">
                    Settled {Number(position.payout_amount).toLocaleString()} GEN
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form
            onSubmit={submitAppeal}
            className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-xl font-bold text-[#1E1B18]">
              Appeal {market.bet_id}
            </h3>
            <p className="text-xs text-[#6B645C]">
              One appeal per market. No bond on-chain. Context must be at least 10
              characters.
            </p>
            <textarea
              required
              minLength={10}
              rows={5}
              value={appealContext}
              onChange={(e) => setAppealContext(e.target.value)}
              className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs focus:border-[#BA401B] focus:outline-none"
              placeholder="Why the original verdict is wrong..."
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAppealModal(false)}
                className="text-xs font-semibold text-[#6B645C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDisputing}
                className="px-6 py-2.5 rounded-full bg-[#BA401B] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isDisputing ? "Submitting..." : "Submit appeal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};


