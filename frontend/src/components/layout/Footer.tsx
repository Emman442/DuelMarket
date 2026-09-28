import React from 'react';

export const Footer: React.FC<{ onNavigateToMarkets: () => void; onNavigateToCreate: () => void }> = ({
  onNavigateToMarkets,
  onNavigateToCreate,
}) => {

  return (
    <footer className="mt-24 border-t border-[#E0DAD0] bg-[#ECE8E0]/60 text-[#6B645C] text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-3">
            <span className="text-base font-bold text-[#1E1B18] tracking-tight block">
              DuelMarket
            </span>
            <p className="max-w-md text-sm leading-relaxed text-[#5F5850]">
              A peer-to-peer prediction protocol built on contractual finality. Two sides, pooled GEN, zero custodial admin keys. Deterministic oracle numbers or evidence-grounded vibe arbitrations.
            </p>
            <div className="flex items-center gap-4 pt-2 text-[11px] text-[#857E74]">
              <span>Protocol Fee: 2.0% (Losing Pool Only)</span>
              <span>·</span>
              <span>Appeal Window: 24 Hours</span>
              <span>·</span>
              <span>Settlement: Autonomous</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-[#1E1B18] font-semibold">
              Protocol
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <button
                  onClick={onNavigateToMarkets}
                  className="hover:text-[#1E1B18] transition-colors cursor-pointer"
                >
                  Active Duels
                </button>
              </li>
              <li>
                <button
                  onClick={onNavigateToCreate}
                  className="hover:text-[#1E1B18] transition-colors cursor-pointer"
                >
                  Create Market
                </button>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-[#1E1B18] transition-colors cursor-pointer"
                >
                  Resolution Mechanics
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          {/* <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-[#1E1B18] font-semibold">
              Testing Environment
            </div>
            <p className="text-xs text-[#7A7369] leading-relaxed">
              Local sandbox with persistent state. All stakes and evidence receipts simulate on-chain contract executions.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Reset all demo markets, user stakes, and balance to default state?')) {
                  // resetAllData();
                }
              }}
              className="text-xs text-[#BA401B] hover:underline cursor-pointer pt-1 block"
            >
              Reset Sandbox State
            </button>
          </div> */}
        </div>

        {/* Bottom hairline */}
        <div className="pt-6 border-t border-[#DFD8CD] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8C8479]">
          <div>
            © 2026 DuelMarket Protocol. No centralized administrative discretion over market outcomes.
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider">
            <span>Deterministic</span>
            <span>·</span>
            <span>Evidence-Grounding</span>
            <span>·</span>
            <span>Decentralized</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
