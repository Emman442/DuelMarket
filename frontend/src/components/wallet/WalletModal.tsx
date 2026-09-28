import React, { useState } from "react";
import { useWallet } from "@/lib/genlayer/wallet";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function shorten(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connectWallet, disconnectWallet, address } = useWallet();
  const isConnected = Boolean(address);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard?.writeText?.(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              {isConnected ? "Connected Wallet" : "Connect Account"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#7A7369] hover:text-[#1E1B18] cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {isConnected ? (
          <div className="space-y-5">
            <div className="bg-[#F2EDE4] rounded-xl p-4 space-y-2 border border-[#E5DFD4]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A7369] uppercase tracking-wider font-semibold">
                  Network
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1E1B18]">
                  <span className="w-2 h-2 rounded-full bg-[#388E3C]" />
                  GenLayer Studio Dev · 61997
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D7] gap-3">
                <span className="text-xs text-[#7A7369] uppercase tracking-wider font-semibold">
                  Address
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#1E1B18] truncate">
                    {shorten(address!)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] text-[#BA401B] hover:underline cursor-pointer shrink-0"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6B645C] leading-relaxed">
              GEN for staking comes from the Studio faucet in the account
              selector, not from this app.
            </p>

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
              Connect a wallet on GenLayer Studio Dev (chain 61997) to stake GEN
              or create a market.
            </p>
            <button
              onClick={async () => {
                await connectWallet();
                onClose();
              }}
              className="w-full py-3 rounded-full bg-[#BA401B] hover:bg-[#A33615] text-white text-sm font-semibold tracking-wide cursor-pointer"
            >
              Connect wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};