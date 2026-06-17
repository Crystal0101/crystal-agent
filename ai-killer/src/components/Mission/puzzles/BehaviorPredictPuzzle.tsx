'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BehaviorPredictPuzzle as TPuzzle, MissionResult } from '@/lib/missions/types';
import { PuzzleShell } from './PuzzleShell';

interface Props {
  puzzle: TPuzzle;
  onComplete: (r: MissionResult) => void;
}

export function BehaviorPredictPuzzle({ puzzle, onComplete }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Progressive message reveal — one every 750ms
  const [visibleCount, setVisibleCount] = useState(0);
  const [choicesUnlocked, setChoicesUnlocked] = useState(false);
  const handleTimeout = useCallback(() => onComplete('timeout'), [onComplete]);

  useEffect(() => {
    if (visibleCount >= puzzle.priorMessages.length) {
      // Small pause after last message before showing choices
      const t = setTimeout(() => setChoicesUnlocked(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleCount(c => c + 1), 750);
    return () => clearTimeout(t);
  }, [visibleCount, puzzle.priorMessages.length]);

  const submit = (choiceId: string) => {
    if (revealed || !choicesUnlocked) return;
    setPicked(choiceId);
    setRevealed(true);
    const choice = puzzle.choices.find(c => c.id === choiceId);
    setTimeout(() => {
      onComplete(choice?.isCorrect ? 'perfect' : 'fail');
    }, 1800);
  };

  return (
    <PuzzleShell briefing={puzzle.briefing} timeLimit={puzzle.timeLimit} onTimeout={handleTimeout}>
      <div className="flex flex-col gap-4">
        {/* Prior messages — revealed one by one */}
        <div className="flex flex-col gap-1.5">
          <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">
            已知发言记录
            {visibleCount < puzzle.priorMessages.length && (
              <span className="text-slate-600 ml-2">({visibleCount}/{puzzle.priorMessages.length})</span>
            )}
          </div>
          {puzzle.priorMessages.map((msg, i) => (
            <AnimatePresence key={i}>
              {i < visibleCount && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35 }}
                  className="border border-[#00ffb4]/10 rounded-lg px-3 py-2 bg-[#00ffb4]/3"
                >
                  <span className="font-mono text-xs text-slate-500 mr-2">{i + 1}.</span>
                  <span className="font-mono text-xs text-slate-300">{msg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
          {/* Cursor while revealing */}
          {visibleCount < puzzle.priorMessages.length && (
            <motion.div
              className="font-mono text-xs text-[#00ffb4]/40"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              █
            </motion.div>
          )}
        </div>

        {/* Question + choices — only after all messages revealed */}
        <AnimatePresence>
          {choicesUnlocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="border border-[#00ffb4]/30 rounded-lg px-3 py-2.5 bg-[#00ffb4]/5">
                <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">ECHO：推断下一步发言</div>
                <div className="font-mono text-sm text-[#00ffb4]">「你相信直觉吗？」</div>
                <div className="font-mono text-xs text-slate-500 mt-1">他最可能怎么回答？</div>
              </div>

              <div className="flex flex-col gap-2">
                {puzzle.choices.map((choice) => {
                  let borderClass = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50';
                  let bgClass = '';
                  let label = '';

                  if (revealed) {
                    if (choice.isCorrect) { borderClass = 'border-[#00ffb4]'; bgClass = 'bg-[#00ffb4]/10'; label = '✓ 正确'; }
                    else if (choice.id === picked) { borderClass = 'border-red-500'; bgClass = 'bg-red-500/10'; label = '✗'; }
                  }

                  return (
                    <motion.button
                      key={choice.id}
                      onClick={() => submit(choice.id)}
                      disabled={revealed}
                      className={`border rounded-lg px-3 py-2.5 text-left transition-colors ${borderClass} ${bgClass}`}
                      whileTap={!revealed ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-xs text-slate-300 leading-relaxed">{choice.text}</p>
                        {label && <span className="font-mono text-xs text-[#00ffb4] flex-shrink-0">{label}</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PuzzleShell>
  );
}
