'use client';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MemoryAuditPuzzle as TPuzzle, MissionResult } from '@/lib/missions/types';
import { PuzzleShell } from './PuzzleShell';

interface Props {
  puzzle: TPuzzle;
  onComplete: (r: MissionResult) => void;
}

export function MemoryAuditPuzzle({ puzzle, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const handleTimeout = useCallback(() => onComplete('timeout'), [onComplete]);

  const toggle = (id: string) => {
    if (revealed) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = () => {
    const correctIds = puzzle.entries.filter(e => e.isContradiction).map(e => e.id);
    const correctSet = new Set(correctIds);
    const hits = [...selected].filter(id => correctSet.has(id)).length;
    const misses = [...selected].filter(id => !correctSet.has(id)).length;

    setRevealed(true);
    setTimeout(() => {
      if (hits === correctIds.length && misses === 0) onComplete('perfect');
      else if (hits >= 2) onComplete('success');
      else onComplete('fail');
    }, 1200);
  };

  return (
    <PuzzleShell briefing={puzzle.briefing} timeLimit={puzzle.timeLimit} onTimeout={handleTimeout}>
      <div className="flex flex-col gap-2">
        <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">
          档案主体：{puzzle.subjectName} · 点击标记矛盾条目
        </div>

        {puzzle.entries.map((entry) => {
          const isSelected = selected.has(entry.id);
          const isCorrect = entry.isContradiction;
          let borderClass = 'border-[#00ffb4]/15 hover:border-[#00ffb4]/40';
          let bgClass = 'bg-transparent';

          if (revealed) {
            if (isCorrect && isSelected) { borderClass = 'border-[#00ffb4]'; bgClass = 'bg-[#00ffb4]/10'; }
            else if (isCorrect && !isSelected) { borderClass = 'border-orange-400'; bgClass = 'bg-orange-400/10'; }
            else if (!isCorrect && isSelected) { borderClass = 'border-red-500'; bgClass = 'bg-red-500/10'; }
          } else if (isSelected) {
            borderClass = 'border-[#00ffb4]/60';
            bgClass = 'bg-[#00ffb4]/8';
          }

          return (
            <motion.button
              key={entry.id}
              onClick={() => toggle(entry.id)}
              className={`border rounded-lg px-3 py-2 text-left transition-colors ${borderClass} ${bgClass}`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`font-mono text-xs ${isSelected ? 'text-[#00ffb4]' : 'text-slate-600'}`}>
                    {isSelected ? '◆' : '◇'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-mono text-xs text-[#00ffb4]/50 mb-0.5">{entry.label}</div>
                  <div className="font-mono text-xs text-slate-300 leading-relaxed">{entry.content}</div>
                </div>
                {revealed && isCorrect && (
                  <div className="font-mono text-xs text-orange-400 flex-shrink-0">矛盾</div>
                )}
              </div>
            </motion.button>
          );
        })}

        {!revealed && (
          <button
            onClick={submit}
            disabled={selected.size === 0}
            className="mt-2 w-full border border-[#00ffb4]/40 rounded-lg py-2.5 font-mono text-sm text-[#00ffb4] hover:bg-[#00ffb4]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            提交审计结果 ({selected.size} 项已标记)
          </button>
        )}
      </div>
    </PuzzleShell>
  );
}
