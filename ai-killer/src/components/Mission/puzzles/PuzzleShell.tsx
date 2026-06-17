'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MissionResult } from '@/lib/missions/types';

interface Props {
  briefing: string;
  timeLimit: number;
  onTimeout: () => void;
  children: React.ReactNode;
}

export function PuzzleShell({ briefing, timeLimit, onTimeout, children }: Props) {
  const [remaining, setRemaining] = useState(timeLimit);

  useEffect(() => {
    if (remaining <= 0) { onTimeout(); return; }
    const t = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, onTimeout]);

  const pct = remaining / timeLimit;
  const timerColor = pct > 0.5 ? '#00ffb4' : pct > 0.25 ? '#fb923c' : '#f87171';

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Timer bar */}
      <div className="h-0.5 bg-[#00ffb4]/10 flex-shrink-0">
        <motion.div
          className="h-full"
          style={{ backgroundColor: timerColor, width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#00ffb4]/15 flex-shrink-0">
        <div className="font-mono text-[#00ffb4] text-xs tracking-widest">MIRROR · 谜题</div>
        <div
          className="font-mono font-bold text-lg tabular-nums"
          style={{ color: timerColor }}
        >
          {remaining}s
        </div>
      </div>

      {/* Briefing */}
      <div className="px-4 py-3 border-b border-[#00ffb4]/10 flex-shrink-0">
        <p className="font-mono text-xs text-slate-400 leading-relaxed">{briefing}</p>
      </div>

      {/* Puzzle content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {children}
      </div>
    </div>
  );
}
