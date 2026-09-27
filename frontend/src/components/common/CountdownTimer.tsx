import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetTimestamp: number;
  prefix?: string;
  expiredLabel?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTimestamp,
  prefix = '',
  expiredLabel = 'Expired',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculate = () => {
      const diff = targetTimestamp - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds, expired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (timeLeft.expired) {
    return <span className="font-mono text-xs text-[#8C8479]">{expiredLabel}</span>;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className="font-mono text-xs num-tabular">
      {prefix}
      {timeLeft.hours > 0 && `${timeLeft.hours}h `}
      {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
    </span>
  );
};
