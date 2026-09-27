import React from 'react';
import { useMarkets } from '../../context/MarketContext';
import { Market } from '../../types/market';
import { PoolSplitBar } from '../common/PoolSplitBar';
import { StatusTag, MarketTypeTag } from '../common/StatusTag';

interface LandingViewProps {
  onSelectMarket: (market: Market) => void;
  onExploreMarkets: () => void;
  onCreateMarket: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSelectMarket,
  onExploreMarkets,
  onCreateMarket,
}) => {
  const { markets } = useMarkets();

  // Pick top 3 featured markets (e.g. 1 open vibe, 1 open clean, 1 pending appeal or locked)
  const featuredMarkets = markets.slice(0, 3);

  const formatLockTime = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Locked for resolution';
    const hours = Math.floor(diff / (3600 * 1000));
    const days = Math.floor(hours / 24);
    if (days > 0) return `Locks in ${days}d ${hours % 24}h`;
    return `Locks in ${hours}h`;
  };

  return (
    <div className="space-y-24 pt-8 pb-16">
      {/* Editorial Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
        <div className="space-y-3">
          <div className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[#736B63]">
            Peer-to-Peer Prediction Protocol
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1E1B18] leading-[1.08] text-balance">
            Two sides. One claim.
            <br />
            <span className="text-[#686158] font-normal">Settle on public truth.</span>
          </h1>
        </div>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#554F47] leading-relaxed font-normal">
          DuelMarket eliminates the admin key. Every duel locks opposite pools of GEN in autonomous contracts, resolved deterministically by public oracle numbers or transparent AI evidence dockets.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onExploreMarkets}
            className="px-8 py-3.5 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-sm font-semibold tracking-wide transition-transform hover:-translate-y-0.5 cursor-pointer shadow-none"
          >
            Explore Live Markets
          </button>
          <button
            onClick={onCreateMarket}
            className="px-8 py-3.5 rounded-full border border-[#BA401B] text-[#BA401B] hover:bg-[#BA401B]/5 text-sm font-semibold tracking-wide transition-colors cursor-pointer"
          >
            Create a Duel
          </button>
        </div>

        {/* Quiet protocol metric strip */}
        <div className="pt-8 border-t border-[#E0DAD0] grid grid-cols-3 gap-6 max-w-xl mx-auto text-left">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#787167] font-medium">
              Resolution
            </div>
            <div className="text-sm font-semibold text-[#1E1B18] mt-0.5">
              Zero Admin Keys
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#787167] font-medium">
              Protocol Fee
            </div>
            <div className="text-sm font-semibold text-[#1E1B18] mt-0.5">
              2% (Losing Pool)
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#787167] font-medium">
              Appeal Guard
            </div>
            <div className="text-sm font-semibold text-[#1E1B18] mt-0.5">
              24h Public Window
            </div>
          </div>
        </div>
      </section>

      {/* Live Market Preview Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-[#E0DAD0] pb-3">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
              Featured Markets
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1E1B18] mt-1">
              Active duels seeking counter-stakes
            </h2>
          </div>
          <button
            onClick={onExploreMarkets}
            className="text-xs font-semibold text-[#BA401B] hover:text-[#912F11] cursor-pointer inline-flex items-center gap-1"
          >
            <span>View All ({markets.length})</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredMarkets.map((market) => {
            const totalPool = market.poolA + market.poolB;
            return (
              <div
                key={market.id}
                onClick={() => onSelectMarket(market)}
                className="group bg-[#FAF8F5] rounded-xl border border-[#E0DAD0] p-6 hover:border-[#D1C9BE] transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <MarketTypeTag type={market.type} />
                    <StatusTag status={market.status} appealDeadline={market.appealDeadline} />
                  </div>

                  <h3 className="text-base font-bold text-[#1E1B18] group-hover:text-[#BA401B] transition-colors leading-snug line-clamp-3">
                    {market.question}
                  </h3>
                </div>

                <div className="space-y-4 pt-2 border-t border-[#EBE5DC]">
                  <PoolSplitBar
                    poolA={market.poolA}
                    poolB={market.poolB}
                    labelA={market.sideA.label}
                    labelB={market.sideB.label}
                    size="sm"
                  />

                  <div className="flex items-center justify-between text-xs text-[#6B645C] pt-1">
                    <span className="font-semibold text-[#1E1B18] num-tabular">
                      {totalPool.toLocaleString()} GEN staked
                    </span>
                    <span className="text-[#857E74]">
                      {formatLockTime(market.lockTimestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Numbered "How It Works" Section */}
      <section
        id="how-it-works"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-12"
      >
        <div className="max-w-2xl space-y-2">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
            How It Works
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E1B18]">
            Three phases. Contract-enforced finality.
          </h2>
          <p className="text-sm sm:text-base text-[#686158] leading-relaxed">
            DuelMarket does not match orders via an orderbook or continuous automated market maker. Two parties take reciprocal positions on an immutable statement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {/* Step 1 */}
          <div className="border-t border-[#1E1B18] pt-6 space-y-4">
            <div className="text-xs font-mono font-bold text-[#BA401B] tracking-wider uppercase">
              Phase 01
            </div>
            <h3 className="text-xl font-bold text-[#1E1B18]">
              Create or join a duel
            </h3>
            <p className="text-sm text-[#5C564E] leading-relaxed">
              Define the proposition, side labels, and resolution source. Choose between <strong className="text-[#1E1B18] font-semibold">Clean markets</strong> (deterministic price or metric feed) or <strong className="text-[#1E1B18] font-semibold">Vibe markets</strong> (plain English criteria evaluated against fetched public evidence). Stake GEN tokens on your conviction.
            </p>
          </div>

          {/* Step 2 */}
          <div className="border-t border-[#1E1B18] pt-6 space-y-4">
            <div className="text-xs font-mono font-bold text-[#BA401B] tracking-wider uppercase">
              Phase 02
            </div>
            <h3 className="text-xl font-bold text-[#1E1B18]">
              Locking & pool freeze
            </h3>
            <p className="text-sm text-[#5C564E] leading-relaxed">
              At the predetermined lock timestamp, staking is permanently frozen. No capital can enter or exit. The ratio between Side A and Side B fixes the exact payout multiplier for each participant.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border-t border-[#1E1B18] pt-6 space-y-4">
            <div className="text-xs font-mono font-bold text-[#BA401B] tracking-wider uppercase">
              Phase 03
            </div>
            <h3 className="text-xl font-bold text-[#1E1B18]">
              Evidence resolution & appeal
            </h3>
            <p className="text-sm text-[#5C564E] leading-relaxed">
              When the event occurs, public proof is retrieved and recorded as an open audit receipt. A strict 24-hour appeal window lets any participant challenge erroneous evidence with bonded counter-proof before winners claim the pool.
            </p>
          </div>
        </div>
      </section>

      {/* Clean vs Vibe Editorial Comparison */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#E0DAD0] p-8 sm:p-12 space-y-8">
          <div className="max-w-xl space-y-2">
            <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#736B63]">
              Market Architectures
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-[#1E1B18]">
              Choose the right resolution model
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E0DAD0]">
            {/* Clean */}
            <div className="space-y-4 pr-0 md:pr-8">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E1B18]" />
                <h4 className="text-lg font-bold text-[#1E1B18]">Clean Markets</h4>
              </div>
              <p className="text-sm text-[#5C564E] leading-relaxed">
                Deterministic. Resolved strictly by an objective numeric metric pulled directly from a designated public oracle (e.g. BTC spot close price, US CPI release, block explorer metrics).
              </p>
              <ul className="text-xs text-[#6B645C] space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> No human or AI interpretation required
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> Direct mathematical evaluation (`&gt;=`, `&lt;=`, `==`)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> Immediate cryptographic finality upon oracle report
                </li>
              </ul>
            </div>

            {/* Vibe */}
            <div className="space-y-4 pt-8 md:pt-0 pl-0 md:pl-8">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#BA401B]" />
                <h4 className="text-lg font-bold text-[#1E1B18]">Vibe Markets</h4>
              </div>
              <p className="text-sm text-[#5C564E] leading-relaxed">
                Evidence-grounded. Used for qualitative real-world events that lack an API feed. The creator pens unambiguous resolution criteria, verified against whitelisted public evidence domains.
              </p>
              <ul className="text-xs text-[#6B645C] space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> Transparent reasoning receipt published on-chain
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> Whitelisted journalistic & official domain citations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA401B] font-bold">✓</span> Single 24-hour appeal bond mechanism prevents abuse
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
