import React from "react";

export const Footer: React.FC<{
  onNavigateToMarkets: () => void;
  onNavigateToCreate: () => void;
}> = ({ onNavigateToMarkets, onNavigateToCreate }) => {
  return (
    <footer className="mt-24 border-t border-[#E0DAD0] bg-[#ECE8E0]/60 text-[#6B645C] text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div className="md:col-span-2 space-y-3">
            <span className="text-base font-bold text-[#1E1B18] tracking-tight block">
              DuelMarket
            </span>
            <p className="max-w-md text-sm leading-relaxed text-[#5F5850]">
              A peer-to-peer prediction protocol built on contractual finality.
              Two sides, pooled GEN, no custodial admin keys. Deterministic
              oracle numbers or evidence-grounded vibe resolution.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-[#857E74]">
              <span>Protocol fee: 2.0% of losing pool</span>
              <span>·</span>
              <span>Appeal window: 24 hours</span>
              <span>·</span>
              <span>Settlement: on-chain</span>
            </div>
          </div>

          <div className="space-y-3 md:pl-4">
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
                  className="hover:text-[#1E1B18] transition-colors"
                >
                  Resolution Mechanics
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#DFD8CD] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8C8479]">
          <div>
            © 2026 DuelMarket Protocol. Outcomes are set by the contract, not an
            admin.
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider">
            <span>Deterministic</span>
            <span>·</span>
            <span>Evidence-grounded</span>
            <span>·</span>
            <span>On-chain</span>
          </div>
        </div>
      </div>
    </footer>
  );
};