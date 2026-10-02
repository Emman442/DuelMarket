import React, { useMemo, useState } from "react";
import { useWallet } from "@/lib/genlayer/wallet";
import { useNavigate } from "react-router-dom";

export type NavTab = "landing" | "markets" | "create" | "portfolio";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenCreate: () => void;
  onOpenWalletModal: () => void;
  activePositionsCount?: number;
}

function shortenAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreate,
  onOpenWalletModal,
  activePositionsCount = 0,
}) => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isWalletConnected = Boolean(address);
  const userAddress = useMemo(
    () => (address ? shortenAddress(address) : ""),
    [address]
  );

  return (
    <header className="sticky top-0 z-40 bg-[#F2EFE8]/95 backdrop-blur-md border-b border-[#E0DAD0] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-left group cursor-pointer focus-visible:outline-none"
        >
          <span className="text-xl font-bold tracking-tight text-[#1E1B18] transition-opacity group-hover:opacity-80">
            DuelMarket
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button
            onClick={() => navigate("/markets")}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === "markets"
                ? "text-[#1E1B18] border-b-2 border-[#1E1B18] font-semibold"
                : "text-[#6B645C] hover:text-[#1E1B18]"
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => {
              navigate("/");
              setTimeout(() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="text-[#6B645C] hover:text-[#1E1B18] transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              navigate("/");
              setActiveTab("create");
              onOpenCreate();
            }}
            className={`transition-colors cursor-pointer pb-0.5 ${
              activeTab === "create"
                ? "text-[#1E1B18] border-b-2 border-[#1E1B18] font-semibold"
                : "text-[#6B645C] hover:text-[#1E1B18]"
            }`}
          >
            Create Duel
          </button>
          <button
            onClick={() => navigate("/my-positions")}
            className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer pb-0.5 ${
              activeTab === "portfolio"
                ? "text-[#1E1B18] border-b-2 border-[#1E1B18] font-semibold"
                : "text-[#6B645C] hover:text-[#1E1B18]"
            }`}
          >
            <span>My Positions</span>
            {activePositionsCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-[#E5DFD4] text-[#332E29]">
                {activePositionsCount}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {isWalletConnected ? (
            <button
              onClick={onOpenWalletModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full bg-[#FAF8F5] border border-[#DCD6CC] text-[#1E1B18] hover:border-[#BA401B]/40 hover:bg-white transition-all shadow-none cursor-pointer"
              title="View wallet"
            >
              <span className="w-2 h-2 rounded-full bg-[#388E3C]" />
              <span className="font-mono text-[#6B645C]">{userAddress}</span>
            </button>
          ) : (
            <button
              onClick={onOpenWalletModal}
              className="px-5 py-2 text-xs font-semibold tracking-wide text-white bg-[#BA401B] hover:bg-[#A33615] rounded-full transition-all cursor-pointer whitespace-nowrap"
            >
              Connect Wallet
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#1E1B18] hover:bg-[#EAE5DC] cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E0DAD0] bg-[#FAF8F5] px-4 py-4 space-y-3">
          <button
            onClick={() => {
              navigate("/markets");
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-[#1E1B18]"
          >
            Browse Markets
          </button>
          <button
            onClick={() => {
              navigate("/");
              setMobileMenuOpen(false);
              setTimeout(() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-[#6B645C]"
          >
            How It Works
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              onOpenCreate();
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-[#6B645C]"
          >
            Create Duel
          </button>
          <button
            onClick={() => {
              setActiveTab("portfolio");
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full py-2 text-sm font-medium text-[#6B645C]"
          >
            <span>My Positions</span>
            {activePositionsCount > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#E5DFD4] text-[#332E29]">
                {activePositionsCount}
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};