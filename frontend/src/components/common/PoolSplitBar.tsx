import React from 'react';

interface PoolSplitBarProps {
  poolA: number;
  poolB: number;
  labelA?: string;
  labelB?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PoolSplitBar: React.FC<PoolSplitBarProps> = ({
  poolA,
  poolB,
  labelA = 'Side A',
  labelB = 'Side B',
  showLabels = true,
  size = 'md',
}) => {
  const total = poolA + poolB;
  const pctA = total > 0 ? Math.round((poolA / total) * 100) : 50;
  const pctB = 100 - pctA;

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  return (
    <div className="w-full space-y-1.5">
      {showLabels && (
        <div className="flex items-center justify-between text-xs tracking-tight">
          <div className="flex items-center gap-1.5 truncate max-w-[48%]">
            <span className="w-2 h-2 rounded-full bg-[#BA401B] shrink-0" />
            <span className="font-medium text-[#1E1B18] truncate">{labelA}</span>
            <span className="text-[#6B645C] num-tabular shrink-0">{pctA}%</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end truncate max-w-[48%]">
            <span className="text-[#6B645C] num-tabular shrink-0">{pctB}%</span>
            <span className="font-medium text-[#1E1B18] truncate">{labelB}</span>
            <span className="w-2 h-2 rounded-full bg-[#3D3833] shrink-0" />
          </div>
        </div>
      )}

      {/* Horizontal split bar */}
      <div
        className={`w-full ${heightClass} bg-[#ECE5DA] rounded-full overflow-hidden flex p-0.5 border border-[#E0DAD0]`}
        role="progressbar"
        aria-valuenow={pctA}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#BA401B] rounded-l-full transition-all duration-300"
          style={{ width: `${pctA}%` }}
          title={`${labelA}: ${pctA}%`}
        />
        <div
          className="h-full bg-[#3D3833] rounded-r-full transition-all duration-300"
          style={{ width: `${pctB}%` }}
          title={`${labelB}: ${pctB}%`}
        />
      </div>
    </div>
  );
};
