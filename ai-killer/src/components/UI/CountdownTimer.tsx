'use client';
import { useEffect, useState } from 'react';

export function CountdownTimer({ endTime, className }: { endTime: number; className?: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [endTime]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <span className={`font-mono tabular-nums ${isUrgent ? 'text-red-400 animate-pulse' : ''} ${className || ''}`}>
      {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
    </span>
  );
}
