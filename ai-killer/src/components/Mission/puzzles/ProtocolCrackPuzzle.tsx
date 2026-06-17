'use client';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ProtocolCrackPuzzle as TPuzzle, MissionResult } from '@/lib/missions/types';
import { PuzzleShell } from './PuzzleShell';

interface Props {
  puzzle: TPuzzle;
  onComplete: (r: MissionResult) => void;
}

export function ProtocolCrackPuzzle({ puzzle, onComplete }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const handleTimeout = useCallback(() => onComplete('timeout'), [onComplete]);

  const submit = (option: string) => {
    if (revealed) return;
    setPicked(option);
    setRevealed(true);
    const correct = option === puzzle.answer;
    setTimeout(() => {
      onComplete(correct ? 'perfect' : 'fail');
    }, 1400);
  };

  return (
    <PuzzleShell briefing={puzzle.briefing} timeLimit={puzzle.timeLimit} onTimeout={handleTimeout}>
      <div className="flex flex-col gap-4">
        {/* Observations */}
        <div className="flex flex-col gap-2">
          <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">执行日志：</div>
          {puzzle.observations.map((gate, i) => (
            <motion.div
              key={gate.id}
              className={`border rounded-lg px-3 py-2 font-mono text-xs ${
                gate.isKey
                  ? 'border-[#00ffb4]/50 bg-[#00ffb4]/8 text-[#00ffb4]'
                  : 'border-[#00ffb4]/10 bg-transparent text-slate-400'
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
            >
              <div>{gate.condition}</div>
              <div className={`mt-0.5 ${gate.isKey ? 'text-[#00ffb4]/60' : 'text-slate-500'}`}>
                {gate.result}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Question */}
        <div className="border border-[#00ffb4]/30 rounded-lg px-3 py-2.5 bg-[#00ffb4]/5">
          <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">推断：</div>
          <div className="font-mono text-sm text-white">{puzzle.question}</div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {puzzle.options.map((option) => {
            const isCorrect = option === puzzle.answer;
            let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/60 text-slate-300';

            if (revealed) {
              if (isCorrect) cls = 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4]';
              else if (option === picked) cls = 'border-red-500 bg-red-500/10 text-red-400';
              else cls = 'border-[#00ffb4]/10 text-slate-600';
            }

            return (
              <motion.button
                key={option}
                onClick={() => submit(option)}
                disabled={revealed}
                className={`border rounded-lg py-3 font-mono text-sm transition-colors ${cls}`}
                whileTap={!revealed ? { scale: 0.95 } : {}}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </div>
    </PuzzleShell>
  );
}
