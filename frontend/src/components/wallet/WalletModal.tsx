import React, { useState } from 'react';
import { useMarkets } from '../../context/MarketContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const {
    userBalance,
    userAddress,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    faucetGEN,
  } = useMarkets();

  const [copied, setCopied] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFaucet = (amount: number) => {
    faucetGEN(amount);
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FAF8F5] border border-[#DCD6CC] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E0DAD0] pb-4">
          <div className="space-y-0.5">
            <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#736B63]">
              Settlement Account
            </div>
            <h3 className="text-xl font-bold text-[#1E1B18]">
              {isWalletConnected ? 'Connected Wallet' : 'Connect Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#7A7369] hover:text-[#1E1B18] cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {isWalletConnected ? (
          <div className="space-y-5">
            {/* Address & Network */}
            <div className="bg-[#F2EDE4] rounded-xl p-4 space-y-2 border border-[#E5DFD4]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A7369] uppercase tracking-wider font-semibold">
                  Network
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1E1B18]">
                  <span className="w-2 h-2 rounded-full bg-[#388E3C]" />
                  Base Protocol L2
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D7]">
                <span className="text-xs text-[#7A7369] uppercase tracking-wider font-semibold">
                  Address
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#1E1B18]">
                    {userAddress}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] text-[#BA401B] hover:underline cursor-pointer"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* GEN Token Balance */}
            <div className="bg-white rounded-xl p-4 border border-[#E0DAD0] space-y-1">
              <span className="text-xs text-[#7A7369] uppercase tracking-wider font-semibold block">
                Available GEN Balance
              </span>
              <div className="text-2xl font-bold text-[#1E1B18] num-tabular">
                {userBalance.toLocaleString()} GEN
              </div>
              <span className="text-[11px] text-[#8C8479]">
                1 GEN = 1 Unit of Escrow Collateral
              </span>
            </div>

            {/* Faucet Controls */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider block">
                Testnet Collateral Faucet
              </span>
              <p className="text-xs text-[#6B645C] leading-relaxed">
                Add simulated GEN tokens to test high-volume peer-to-peer predictions.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => handleFaucet(500)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-[#EAE5DC] hover:bg-[#DDD6CA] text-[#1E1B18] transition-colors cursor-pointer"
                >
                  +500 GEN
                </button>
                <button
                  onClick={() => handleFaucet(1500)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-[#EAE5DC] hover:bg-[#DDD6CA] text-[#1E1B18] transition-colors cursor-pointer"
                >
                  +1,500 GEN
                </button>
                <button
                  onClick={() => handleFaucet(5000)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-[#EAE5DC] hover:bg-[#DDD6CA] text-[#1E1B18] transition-colors cursor-pointer"
                >
                  +5,000 GEN
                </button>
              </div>
              {faucetSuccess && (
                <div className="text-xs text-[#2E7D32] font-semibold pt-1">
                  ✓ Faucet request completed! Tokens added to balance.
                </div>
              )}
            </div>

            {/* Disconnect */}
            <div className="pt-4 border-t border-[#E0DAD0] flex items-center justify-between">
              <button
                onClick={() => {
                  disconnectWallet();
                  onClose();
                }}
                className="text-xs text-[#8C8479] hover:text-[#BA401B] cursor-pointer"
              >
                Disconnect Account
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-[#1E1B18] text-white text-xs font-semibold hover:bg-black cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-[#5C564E] leading-relaxed">
              Connect your decentralized wallet to stake GEN tokens on public duels or create autonomous prediction markets.
            </p>
            <button
              onClick={() => {
                connectWallet();
                onClose();
              }}
              className="w-full py-3 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer"
            >
              Connect Simulated Wallet (0x78D1...49F3)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
