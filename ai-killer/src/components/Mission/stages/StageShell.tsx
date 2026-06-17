'use client';
import { useState, useEffect } from 'react';

interface Props {
  stageIndex: number;
  totalStages: number;
  timeLimit: number;
  onTimeout: () => void;
  children: React.ReactNode;
}

export function StageShell({ stageIndex, totalStages, timeLimit, onTimeout, children }: Props) {
  const [remaining, setRemaining] = useState(timeLimit);

  useEffect(() => {
    setRemaining(timeLimit);
  }, [stageIndex, timeLimit]);

  useEffect(() => {
    if (remaining <= 0) { onTimeout(); return; }
    const t = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, onTimeout]);

  const pct = remaining / timeLimit;
  const timerColor = pct > 0.5 ? '#00ffb4' : pct > 0.25 ? '#fb923c' : '#f87171';

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* 进度条（关卡进度） */}
      <div className="h-0.5 bg-[#00ffb4]/10 flex-shrink-0">
        <div
          className="h-full bg-[#00ffb4]/40 transition-all duration-300"
          style={{ width: `${((stageIndex) / totalStages) * 100}%` }}
        />
      </div>

      {/* 顶部信息 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#00ffb4]/15 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="font-mono text-[#00ffb4] text-xs tracking-widest">MIRROR</div>
          <div className="font-mono text-slate-600 text-xs">
            第 {stageIndex + 1} / {totalStages} 关
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 倒计时 */}
          <div className="font-mono font-bold text-base tabular-nums" style={{ color: timerColor }}>
            {remaining}s
          </div>
        </div>
      </div>

      {/* 时间条 */}
      <div className="h-0.5 bg-white/5 flex-shrink-0">
        <div
          className="h-full transition-all duration-900"
          style={{ backgroundColor: timerColor, width: `${pct * 100}%` }}
        />
      </div>

      {/* 关卡内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
}
