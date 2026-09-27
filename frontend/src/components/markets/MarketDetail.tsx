import React, { useState, useMemo } from 'react';
import { useMarkets } from '../../context/MarketContext';
import { Market, MarketSide } from '../../types/market';
import { PoolSplitBar } from '../common/PoolSplitBar';
import { StatusTag, MarketTypeTag } from '../common/StatusTag';
import { CountdownTimer } from '../common/CountdownTimer';

interface MarketDetailProps {
  marketId: string;
  onBack: () => void;
  onOpenWallet: () => void;
}

export const MarketDetail: React.FC<MarketDetailProps> = ({
  marketId,
  onBack,
  onOpenWallet,
}) => {
  const {
    markets,
    positions,
    userBalance,
    userAddress,
    isWalletConnected,
    stakeOnMarket,
    calculatePayoutPreview,
    resolveMarket,
    fileAppeal,
    finalizeAppeal,
    claimPayout,
    simulateLockMarket,
    calculateClaimableAmount,
  } = useMarkets();

  const market = markets.find((m) => m.id === marketId);

  // Staking state
  const [selectedSide, setSelectedSide] = useState<MarketSide>('A');
  const [stakeAmount, setStakeAmount] = useState<string>('100');
  const [stakeSuccessMsg, setStakeSuccessMsg] = useState<string | null>(null);

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState<MarketSide | 'void'>('A');
  const [resolveSourceTitle, setResolveSourceTitle] = useState('');
  const [resolveSourceUrl, setResolveSourceUrl] = useState('');
  const [resolveSnippet, setResolveSnippet] = useState('');
  const [resolveReasoning, setResolveReasoning] = useState('');

  // Appeal modal state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealUrl, setAppealUrl] = useState('');
  const [appealReasoning, setAppealReasoning] = useState('');
  const [appealBond, setAppealBond] = useState('200');

  // Claim feedback
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

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

  // Parse stake number
  const parsedStake = parseFloat(stakeAmount) || 0;
  const payoutPreview = calculatePayoutPreview(market, selectedSide, parsedStake);

  // User positions in this specific market
  const userMarketPositions = positions.filter((p) => p.marketId === market.id);
  const totalUserStakeA = userMarketPositions
    .filter((p) => p.side === 'A')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalUserStakeB = userMarketPositions
    .filter((p) => p.side === 'B')
    .reduce((sum, p) => sum + p.amount, 0);

  // Claimable positions
  const winningUnclaimedPositions = userMarketPositions.filter(
    (p) => !p.claimed && calculateClaimableAmount(p, market) > 0
  );

  const totalPool = market.poolA + market.poolB;

  // Implied multipliers for 100 GEN stake baseline
  const multiplierA = calculatePayoutPreview(market, 'A', 100).multiplier;
  const multiplierB = calculatePayoutPreview(market, 'B', 100).multiplier;

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWalletConnected) {
      onOpenWallet();
      return;
    }
    if (parsedStake <= 0) return;
    if (parsedStake > userBalance) {
      alert(`Insufficient GEN balance. Your balance is ${userBalance.toLocaleString()} GEN.`);
      return;
    }

    const ok = stakeOnMarket(market.id, selectedSide, parsedStake);
    if (ok) {
      setStakeSuccessMsg(
        `Successfully staked ${parsedStake.toLocaleString()} GEN on Side ${selectedSide} (${
          selectedSide === 'A' ? market.sideA.label : market.sideB.label
        })`
      );
      setTimeout(() => setStakeSuccessMsg(null), 5000);
    }
  };

  const handleClaim = (posId: string) => {
    const res = claimPayout(posId);
    if (res.success) {
      setClaimFeedback(`Claimed ${res.payout.toLocaleString()} GEN into your wallet!`);
      setTimeout(() => setClaimFeedback(null), 5000);
    }
  };

  const openResolveDialog = () => {
    // Populate smart default realistic evidence based on market type
    if (market.type === 'clean' && market.cleanRule) {
      setResolveOutcome('A');
      setResolveSourceTitle(`${market.cleanRule.dataSourceName} Snapshot`);
      setResolveSourceUrl(market.cleanRule.dataSourceUrl);
      setResolveSnippet(`Metric identifier ${market.cleanRule.metricIdentifier} recorded numeric value 4,285.50`);
      setResolveReasoning(
        `Automated evaluation checked if 4,285.50 ${market.cleanRule.targetOperator} ${market.cleanRule.thresholdValue}. Condition satisfied, resolving to Side A.`
      );
    } else if (market.vibeRule) {
      setResolveOutcome('A');
      setResolveSourceTitle('Official Press Release & Telemetry Verification');
      setResolveSourceUrl(`https://${market.vibeRule.evidenceDomains[0] || 'reuters.com'}/reports/evidence-vibe`);
      setResolveSnippet(
        'Public records and primary source statements conclusively verify that all specified requirements for Side A have occurred within the specified timeframe.'
      );
      setResolveReasoning(
        'Verified against whitelisted domain evidence. Criterion requires explicit public announcement by official channels, which was published on the specified date.'
      );
    }
    setShowResolveModal(true);
  };

  const submitResolution = (e: React.FormEvent) => {
    e.preventDefault();
    resolveMarket(market.id, resolveOutcome, {
      sourceTitle: resolveSourceTitle || 'Public Verification Feed',
      sourceUrl: resolveSourceUrl || 'https://example.com/evidence',
      extractedSnippet: resolveSnippet || 'Public statements confirm resolution conditions.',
      reasoningReceipt: resolveReasoning || 'Direct evaluation against published criteria.',
    });
    setShowResolveModal(false);
  };

  const submitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    const bond = parseFloat(appealBond) || 200;
    if (bond > userBalance) {
      alert(`Insufficient GEN balance for appeal bond. You have ${userBalance} GEN.`);
      return;
    }
    fileAppeal(market.id, appealUrl, appealReasoning, bond);
    setShowAppealModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back button and Eyebrow */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] transition-colors cursor-pointer"
        >
          <span aria-hidden="true">←</span>
          <span>Back to all duels</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#8C8479]">ID #{market.id}</span>
          <StatusTag status={market.status} appealDeadline={market.appealDeadline} />
        </div>
      </div>

      {/* Main Duel Header */}
      <div className="space-y-4 border-b border-[#E0DAD0] pb-8">
        <div className="flex items-center gap-2 text-xs text-[#6B645C]">
          <MarketTypeTag type={market.type} />
          <span>·</span>
          <span>Category: {market.category}</span>
          <span>·</span>
          <span>Created by <strong className="font-mono text-[#1E1B18]">{market.creatorAddress}</strong></span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E1B18] tracking-tight leading-tight">
          {market.question}
        </h1>

        {/* Global Pool Summary */}
        <div className="pt-2 flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-[#7A7369] block">Total Escrowed Pool</span>
            <span className="text-xl font-bold text-[#1E1B18] num-tabular">
              {totalPool.toLocaleString()} GEN
            </span>
          </div>
          <div className="h-8 w-px bg-[#E0DAD0] hidden sm:block" />
          <div>
            <span className="text-xs text-[#7A7369] block">
              {market.status === 'open' && market.lockTimestamp > Date.now() ? 'Locks In' : 'Lock Timestamp'}
            </span>
            <span className="text-sm font-semibold text-[#1E1B18]">
              {market.status === 'open' && market.lockTimestamp > Date.now() ? (
                <CountdownTimer targetTimestamp={market.lockTimestamp} />
              ) : (
                new Date(market.lockTimestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              )}
            </span>
          </div>
          <div className="h-8 w-px bg-[#E0DAD0] hidden sm:block" />
          <div>
            <span className="text-xs text-[#7A7369] block">Protocol Settlement Fee</span>
            <span className="text-sm font-semibold text-[#1E1B18]">2% of losing pool</span>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Rule Specs & Resolution Docket), Right Column (Staking / Position Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Rules & Evidence (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Resolution Criteria Card */}
          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#EBE5DC] pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
                {market.type === 'clean' ? 'Deterministic Oracle Specification' : 'Plain-Text Resolution Criteria'}
              </div>
              <span className="text-xs text-[#8C8479]">Public Verifiable</span>
            </div>

            {market.type === 'clean' && market.cleanRule && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-[#787167] block">Data Source</span>
                    <span className="font-semibold text-[#1E1B18]">{market.cleanRule.dataSourceName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#787167] block">Evaluation Rule</span>
                    <span className="font-mono font-semibold text-[#1E1B18]">{market.cleanRule.formattedTarget}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#787167] block">Metric Key</span>
                  <span className="font-mono text-xs text-[#524C44] bg-[#F2EDE4] px-2 py-1 rounded inline-block">
                    {market.cleanRule.metricIdentifier}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-[#787167] block">Endpoint Reference</span>
                  <a
                    href={market.cleanRule.dataSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#BA401B] hover:underline break-all inline-flex items-center gap-1"
                  >
                    <span>{market.cleanRule.dataSourceUrl}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            )}

            {market.type === 'vibe' && market.vibeRule && (
              <div className="space-y-4">
                <p className="text-sm text-[#3E3832] leading-relaxed whitespace-pre-line bg-[#F5F1EB] p-4 rounded-lg border border-[#E8E2D8]">
                  "{market.vibeRule.resolutionCriteria}"
                </p>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[#787167] block font-medium">Whitelisted Evidence Domains:</span>
                  <div className="flex flex-wrap gap-2">
                    {market.vibeRule.evidenceDomains.map((domain) => (
                      <span
                        key={domain}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#EAE4D9] text-[#423C35]"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-[#7A7369]">
                  Evaluator: <span className="font-mono">{market.vibeRule.evaluatorModel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Receipt Docket (If Resolved or Pending Appeal) */}
          {market.resolution && (
            <div className="bg-[#FAF8F5] rounded-xl border-2 border-[#D8D0C3] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E0DAD0] pb-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#1E1B18]">
                    Resolution Evidence Receipt
                  </div>
                  <div className="text-xs text-[#787167]">
                    Autonomous docket published at {new Date(market.resolution.resolvedTimestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-[#8C8479] block">
                    Hash: {market.resolution.evidenceHash.slice(0, 10)}...
                  </span>
                  <span className="text-xs font-semibold text-[#BA401B]">
                    Outcome: Side {market.resolution.decidedOutcome} (
                    {market.resolution.decidedOutcome === 'A'
                      ? market.sideA.label
                      : market.resolution.decidedOutcome === 'B'
                      ? market.sideB.label
                      : 'Void'}
                    )
                  </span>
                </div>
              </div>

              {/* Source Document */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-[#7A7369] font-semibold block">
                  Cited Source Document
                </span>
                <div className="text-sm font-semibold text-[#1E1B18]">
                  {market.resolution.sourceTitle}
                </div>
                <a
                  href={market.resolution.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#BA401B] hover:underline break-all inline-flex items-center gap-1"
                >
                  <span>{market.resolution.sourceUrl}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              {/* Extracted Snippet / Proof */}
              <div className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-[#7A7369] font-semibold block">
                  Extracted Proof Snippet
                </span>
                <blockquote className="text-xs sm:text-sm italic text-[#3F3933] bg-[#F4EFE6] border-l-2 border-[#BA401B] pl-3 py-2 rounded-r">
                  "{market.resolution.extractedSnippet}"
                </blockquote>
              </div>

              {/* Reasoning Receipt */}
              <div className="space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-[#7A7369] font-semibold block">
                  Verification Reasoning
                </span>
                <p className="text-xs sm:text-sm text-[#4E4841] leading-relaxed">
                  {market.resolution.reasoningReceipt}
                </p>
              </div>

              {/* Appeal Status Section */}
              {market.appeal && (
                <div className="pt-4 border-t border-[#E0DAD0] space-y-3 bg-[#F9F4EB] p-4 rounded-lg border border-[#E2D6C0]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#805B24] uppercase tracking-wider">
                      Active Appeal Filed
                    </span>
                    <span className="text-xs font-mono text-[#686158]">
                      Bond: {market.appeal.appealBondAmount} GEN
                    </span>
                  </div>
                  <p className="text-xs text-[#524B40] leading-relaxed">
                    <strong>Contested Argument:</strong> {market.appeal.counterReasoning}
                  </p>
                  <a
                    href={market.appeal.counterEvidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#BA401B] hover:underline break-all block"
                  >
                    Counter-evidence: {market.appeal.counterEvidenceUrl}
                  </a>

                  {/* Arbitrator appeal resolution buttons for test environment */}
                  {market.appeal.status === 'under_review' && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-[#7A7369]">Arbitrator action:</span>
                      <button
                        onClick={() => finalizeAppeal(market.id, 'upheld')}
                        className="px-3 py-1 text-xs font-semibold rounded-full bg-[#BA401B] text-white hover:bg-[#A33615] cursor-pointer"
                      >
                        Uphold Appeal (Flip Outcome)
                      </button>
                      <button
                        onClick={() => finalizeAppeal(market.id, 'dismissed')}
                        className="px-3 py-1 text-xs font-semibold rounded-full border border-[#7A7369] text-[#1E1B18] hover:bg-[#ECE6DB] cursor-pointer"
                      >
                        Dismiss Appeal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Appeal Button & Countdown (During Appeal Window) */}
              {market.status === 'pending_appeal' && !market.appeal && (
                <div className="pt-4 border-t border-[#E0DAD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#805B24] animate-pulse" />
                      <span className="text-xs font-bold text-[#805B24] uppercase tracking-wider">
                        24-Hour Appeal Window Active
                      </span>
                    </div>
                    <div className="text-xs text-[#6B645C] flex items-center gap-2">
                      <span>Window closes in:</span>
                      <strong className="text-[#1E1B18]">
                        <CountdownTimer
                          targetTimestamp={market.appealDeadline || Date.now() + 24 * 3600 * 1000}
                          expiredLabel="Window Expired"
                        />
                      </strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAppealModal(true)}
                    className="px-5 py-2 rounded-full border border-[#BA401B] text-[#BA401B] hover:bg-[#BA401B]/5 text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Contest Outcome (File Appeal)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Test / Dev Protocol Controls */}
          <div className="bg-[#FAF8F5]/60 rounded-xl border border-[#E0DAD0] p-4 space-y-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8277] font-bold block">
              Contract Lifecycle Simulator
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {market.status === 'open' && (
                <button
                  onClick={() => simulateLockMarket(market.id)}
                  className="px-3 py-1.5 rounded-full bg-[#EAE5DC] hover:bg-[#DDD6CA] text-[#1E1B18] font-medium transition-colors cursor-pointer"
                >
                  Simulate Lock Time (Freeze Stakes)
                </button>
              )}

              {(market.status === 'locked' || market.status === 'open') && (
                <button
                  onClick={openResolveDialog}
                  className="px-3 py-1.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white font-medium transition-colors cursor-pointer"
                >
                  Resolve Market (Fetch Evidence)
                </button>
              )}

              {market.status === 'pending_appeal' && !market.appeal && (
                <button
                  onClick={() => setShowAppealModal(true)}
                  className="px-3 py-1.5 rounded-full border border-[#805B24] text-[#805B24] hover:bg-[#F5EFE0] font-medium transition-colors cursor-pointer"
                >
                  File Appeal Challenge
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Staking & User Positions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Stake Box */}
          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-6">
            <div className="space-y-1">
              <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
                Participate in Duel
              </div>
              <h2 className="text-xl font-bold text-[#1E1B18]">
                {market.status === 'open' ? 'Select Side & Stake' : 'Market Closed for Staking'}
              </h2>
            </div>

            {/* Split Bar showing current state */}
            <div className="space-y-2">
              <PoolSplitBar
                poolA={market.poolA}
                poolB={market.poolB}
                labelA={market.sideA.label}
                labelB={market.sideB.label}
                size="md"
              />
              <div className="flex justify-between text-xs text-[#7A7369]">
                <span>Pool A: <strong className="text-[#1E1B18] num-tabular">{market.poolA.toLocaleString()} GEN</strong></span>
                <span>Pool B: <strong className="text-[#1E1B18] num-tabular">{market.poolB.toLocaleString()} GEN</strong></span>
              </div>
            </div>

            {/* Side A / Side B Large Tappable Panels */}
            <div className="grid grid-cols-2 gap-3">
              {/* Panel A */}
              <button
                type="button"
                onClick={() => setSelectedSide('A')}
                disabled={market.status !== 'open'}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSide === 'A'
                    ? 'border-[#BA401B] bg-[#FAF3F0] ring-1 ring-[#BA401B]'
                    : 'border-[#E0DAD0] bg-white hover:border-[#D5CCC0]'
                } ${market.status !== 'open' ? 'opacity-80 cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#BA401B]">SIDE A</span>
                  <span className="text-xs font-mono font-semibold text-[#1E1B18]">{multiplierA}x</span>
                </div>
                <div className="font-bold text-sm text-[#1E1B18] mt-1 line-clamp-2">
                  {market.sideA.label}
                </div>
                <div className="text-[11px] text-[#7A7369] mt-2 num-tabular">
                  {market.poolA.toLocaleString()} GEN staked
                </div>
              </button>

              {/* Panel B */}
              <button
                type="button"
                onClick={() => setSelectedSide('B')}
                disabled={market.status !== 'open'}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSide === 'B'
                    ? 'border-[#1E1B18] bg-[#F5F2ED] ring-1 ring-[#1E1B18]'
                    : 'border-[#E0DAD0] bg-white hover:border-[#D5CCC0]'
                } ${market.status !== 'open' ? 'opacity-80 cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#4A453F]">SIDE B</span>
                  <span className="text-xs font-mono font-semibold text-[#1E1B18]">{multiplierB}x</span>
                </div>
                <div className="font-bold text-sm text-[#1E1B18] mt-1 line-clamp-2">
                  {market.sideB.label}
                </div>
                <div className="text-[11px] text-[#7A7369] mt-2 num-tabular">
                  {market.poolB.toLocaleString()} GEN staked
                </div>
              </button>
            </div>

            {/* If market is open, display stake form */}
            {market.status === 'open' ? (
              <form onSubmit={handleStake} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="stake-input" className="font-medium text-[#1E1B18]">
                      Stake Amount (GEN)
                    </label>
                    <span className="text-[#7A7369]">
                      Balance:{' '}
                      <strong className="text-[#1E1B18] font-mono">
                        {userBalance.toLocaleString()} GEN
                      </strong>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="stake-input"
                      type="number"
                      min="1"
                      max={userBalance}
                      step="any"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full bg-white border border-[#DCD6CC] rounded-xl px-4 py-2.5 text-base font-semibold text-[#1E1B18] focus:outline-none focus:border-[#BA401B]"
                      placeholder="0"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A7369]">
                      GEN
                    </div>
                  </div>

                  {/* Quick Stake Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStakeAmount(amt.toString())}
                        className="px-2.5 py-1 text-xs rounded-lg bg-[#EAE5DC] text-[#4A453F] hover:bg-[#DDD7CC] transition-colors cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStakeAmount(userBalance.toString())}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#EAE5DC] text-[#BA401B] font-semibold hover:bg-[#DDD7CC] transition-colors cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Return preview */}
                <div className="bg-[#F5F1EB] rounded-lg p-3.5 space-y-1.5 text-xs border border-[#E8E2D7]">
                  <div className="flex items-center justify-between text-[#6B645C]">
                    <span>Implied Multiplier</span>
                    <span className="font-mono font-bold text-[#1E1B18]">
                      {payoutPreview.multiplier}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#6B645C]">
                    <span>Estimated Winning Return</span>
                    <span className="font-mono font-bold text-[#BA401B] text-sm">
                      ~{payoutPreview.projectedReturn.toLocaleString()} GEN
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C8479] pt-1 border-t border-[#E8E2D8] leading-tight">
                    Winners receive initial stake back plus proportionate share of the opposing pool (minus 2% protocol fee).
                  </p>
                </div>

                {stakeSuccessMsg && (
                  <div className="p-3 bg-[#EAF5EA] text-[#245C27] text-xs rounded-lg font-medium">
                    ✓ {stakeSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  Stake {parsedStake > 0 ? `${parsedStake} GEN` : ''} on Side {selectedSide}
                </button>
              </form>
            ) : (
              <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E0DAD0] text-center space-y-2">
                <span className="text-xs font-semibold text-[#5A544C] block">
                  Staking is closed for this duel.
                </span>
                <p className="text-xs text-[#7A7369]">
                  {market.status === 'locked' && 'Awaiting resolution evidence.'}
                  {market.status === 'pending_appeal' && 'In 24-hour public appeal challenge window.'}
                  {market.status === 'resolved' && 'Market has concluded. Check outcomes and claim payouts below.'}
                </p>
              </div>
            )}
          </div>

          {/* User Positions & Claim Section */}
          <div className="bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBE5DC] pb-3">
              <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
                Your Position in this Duel
              </div>
              <span className="text-xs font-mono text-[#8C8479]">
                {totalUserStakeA + totalUserStakeB > 0 ? `${(totalUserStakeA + totalUserStakeB).toLocaleString()} GEN` : 'None'}
              </span>
            </div>

            {claimFeedback && (
              <div className="p-3 bg-[#EAF5EA] text-[#245C27] text-xs rounded-lg font-medium">
                ✓ {claimFeedback}
              </div>
            )}

            {userMarketPositions.length === 0 ? (
              <div className="text-xs text-[#7A7369] py-2 text-center">
                You have not placed a stake in this duel yet.
              </div>
            ) : (
              <div className="space-y-3">
                {userMarketPositions.map((pos) => {
                  const claimable = calculateClaimableAmount(pos, market);
                  const isWinner = market.status === 'resolved' && market.resolution?.decidedOutcome === pos.side;
                  const isVoid = market.status === 'resolved' && market.resolution?.decidedOutcome === 'void';

                  return (
                    <div
                      key={pos.id}
                      className="p-3.5 rounded-lg border border-[#E5DFD4] bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              pos.side === 'A' ? 'bg-[#BA401B]' : 'bg-[#3D3833]'
                            }`}
                          />
                          <span className="font-bold text-[#1E1B18]">
                            Side {pos.side}: {pos.side === 'A' ? market.sideA.label : market.sideB.label}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-[#1E1B18]">
                          {pos.amount.toLocaleString()} GEN
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#F0ECE4] text-[11px] text-[#787167]">
                        <span>Staked {new Date(pos.timestamp).toLocaleDateString()}</span>

                        {market.status === 'resolved' ? (
                          pos.claimed ? (
                            <span className="text-[#388E3C] font-semibold">
                              ✓ Claimed {pos.claimedAmount?.toLocaleString()} GEN
                            </span>
                          ) : claimable > 0 ? (
                            <button
                              onClick={() => handleClaim(pos.id)}
                              className="px-3 py-1 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white font-semibold cursor-pointer"
                            >
                              Claim {claimable.toLocaleString()} GEN
                            </button>
                          ) : (
                            <span className="text-[#8C8479]">
                              {isWinner || isVoid ? 'Resolving' : 'Outcome did not win'}
                            </span>
                          )
                        ) : (
                          <span className="text-[#7A7369]">Active in escrow</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl">
            <div className="space-y-1 border-b border-[#E0DAD0] pb-4">
              <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#736B63]">
                Contract Resolution Oracle
              </div>
              <h3 className="text-xl font-bold text-[#1E1B18]">
                Resolve Duel #{market.id}
              </h3>
              <p className="text-xs text-[#6B645C]">
                Record public proof and execute the contract resolution step.
              </p>
            </div>

            <form onSubmit={submitResolution} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Decided Outcome
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolveOutcome('A')}
                    className={`p-2.5 text-xs rounded-xl border font-semibold cursor-pointer ${
                      resolveOutcome === 'A'
                        ? 'border-[#BA401B] bg-[#FAF3F0] text-[#BA401B]'
                        : 'border-[#DCD6CC] bg-white text-[#1E1B18]'
                    }`}
                  >
                    Side A Wins
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolveOutcome('B')}
                    className={`p-2.5 text-xs rounded-xl border font-semibold cursor-pointer ${
                      resolveOutcome === 'B'
                        ? 'border-[#1E1B18] bg-[#F2EDE5] text-[#1E1B18]'
                        : 'border-[#DCD6CC] bg-white text-[#1E1B18]'
                    }`}
                  >
                    Side B Wins
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolveOutcome('void')}
                    className={`p-2.5 text-xs rounded-xl border font-semibold cursor-pointer ${
                      resolveOutcome === 'void'
                        ? 'border-[#6B645C] bg-[#EAE5DC] text-[#1E1B18]'
                        : 'border-[#DCD6CC] bg-white text-[#6B645C]'
                    }`}
                  >
                    Void (Refund)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Evidence Source Title
                </label>
                <input
                  type="text"
                  required
                  value={resolveSourceTitle}
                  onChange={(e) => setResolveSourceTitle(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Source URL
                </label>
                <input
                  type="url"
                  required
                  value={resolveSourceUrl}
                  onChange={(e) => setResolveSourceUrl(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Extracted Citation Snippet
                </label>
                <textarea
                  required
                  rows={2}
                  value={resolveSnippet}
                  onChange={(e) => setResolveSnippet(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Reasoning Receipt
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolveReasoning}
                  onChange={(e) => setResolveReasoning(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DAD0]">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold tracking-wide cursor-pointer"
                >
                  Commit Resolution & Open Appeal Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appeal Challenge Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl">
            <div className="space-y-1 border-b border-[#E0DAD0] pb-4">
              <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#805B24]">
                Single Appeal Challenge Window
              </div>
              <h3 className="text-xl font-bold text-[#1E1B18]">
                Contest Outcome for Duel #{market.id}
              </h3>
              <p className="text-xs text-[#6B645C]">
                An appeal requires posting a refundable bond and submitting verifiable counter-evidence against the resolution receipt.
              </p>
            </div>

            <form onSubmit={submitAppeal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Appeal Bond Amount (GEN)
                </label>
                <input
                  type="number"
                  min="50"
                  max={userBalance}
                  value={appealBond}
                  onChange={(e) => setAppealBond(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs font-mono text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
                <span className="text-[11px] text-[#7A7369]">
                  Bond returned if appeal is upheld. Forfeited if frivolous.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Counter-Evidence URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://official-source.gov/amended-record"
                  value={appealUrl}
                  onChange={(e) => setAppealUrl(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1E1B18]">
                  Counter-Reasoning & Specification
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail precisely why the primary citation is incomplete or misapplied according to the market criteria..."
                  value={appealReasoning}
                  onChange={(e) => setAppealReasoning(e.target.value)}
                  className="w-full bg-white border border-[#DCD6CC] rounded-xl px-3 py-2 text-xs text-[#1E1B18] focus:border-[#BA401B] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DAD0]">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B645C] hover:text-[#1E1B18] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-xs font-semibold tracking-wide cursor-pointer"
                >
                  Bond {appealBond} GEN & Submit Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
