import React from 'react';
import { MarketStatus, MarketType } from '../../types/market';

interface StatusTagProps {
  status: MarketStatus;
  appealDeadline?: number;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, appealDeadline }) => {
  switch (status) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-[#E8E2D6] text-[#3E3832]">
          Open
        </span>
      );
    case 'locked':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-[#E2DCD1] text-[#524B43]">
          Locked
        </span>
      );
    case 'pending_appeal': {
      let appealNotice = 'Pending appeal';
      if (appealDeadline && appealDeadline > Date.now()) {
        const remainingHours = Math.max(1, Math.round((appealDeadline - Date.now()) / (3600 * 1000)));
        appealNotice = `Appeal window (${remainingHours}h left)`;
      }
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-[#EFE6D5] text-[#6E4F1B] border border-[#DFD1B3]">
          {appealNotice}
        </span>
      );
    }
    case 'resolved':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-[#E0D9CD] text-[#24201C] font-semibold">
          Resolved
        </span>
      );
    case 'void':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide bg-[#E6E1D8] text-[#5A554E]">
          Voided (Refunded)
        </span>
      );
    default:
      return null;
  }
};

interface MarketTypeTagProps {
  type: MarketType;
}

export const MarketTypeTag: React.FC<MarketTypeTagProps> = ({ type }) => {
  if (type === 'clean') {
    return (
      <span className="text-[11px] uppercase tracking-wider text-[#6B645C] font-medium">
        Clean / Deterministic
      </span>
    );
  }
  return (
    <span className="text-[11px] uppercase tracking-wider text-[#6B645C] font-medium">
      Vibe / Evidence Rule
    </span>
  );
};
