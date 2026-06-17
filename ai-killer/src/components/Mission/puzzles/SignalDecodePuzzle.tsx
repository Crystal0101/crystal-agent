'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { SignalDecodePuzzle as TPuzzle } from '@/lib/missions/types';
import { MissionResult } from '@/lib/missions/types';
import { PuzzleShell } from './PuzzleShell';

interface Props {
  puzzle: TPuzzle;
  onComplete: (r: MissionResult) => void;
}

export function SignalDecodePuzzle({ puzzle, onComplete }: Props) {
  const [items, setItems] = useState(() => [...puzzle.fragments].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<'order' | 'identify'>('order');
  const [submitted, setSubmitted] = useState(false);

  const handleTimeout = useCallback(() => onComplete('timeout'), [onComplete]);

  const checkOrder = () => {
    const correct = items.every((f, i) => f.correctIndex === i);
    if (correct) {
      setPhase('identify');
    } else {
      // shake and show hint
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 800);
    }
  };

  const handleIdentify = (id: string) => {
    const fragment = puzzle.fragments.find(f => f.id === id);
    if (!fragment) return;
    if (fragment.isAnomalous) {
      onComplete('perfect');
    } else {
      onComplete('success');
    }
  };

  return (
    <PuzzleShell briefing={puzzle.briefing} timeLimit={puzzle.timeLimit} onTimeout={handleTimeout}>
      {phase === 'order' && (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">
            第一步：拖动排序，还原正确时序 ↕
          </div>

          <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
            {items.map((fragment, i) => (
              <Reorder.Item key={fragment.id} value={fragment}>
                <motion.div
                  className={`border rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing flex gap-3 items-start ${
                    submitted ? 'border-red-500/50 bg-red-500/5' : 'border-[#00ffb4]/20 bg-[#00ffb4]/3 hover:border-[#00ffb4]/40'
                  }`}
                  animate={submitted ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <span className="font-mono text-[#00ffb4]/40 text-xs mt-0.5 select-none flex-shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="font-mono text-sm text-slate-300 leading-relaxed">{fragment.text}</p>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <button
            onClick={checkOrder}
            className="mt-2 w-full border border-[#00ffb4]/40 rounded-lg py-2.5 font-mono text-sm text-[#00ffb4] hover:bg-[#00ffb4]/10 transition-colors"
          >
            确认顺序 →
          </button>
        </div>
      )}

      {phase === 'identify' && (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-[#00ffb4] mb-1">
            ✓ 顺序正确。第二步：点击那句「不可能由人类写出」的话。
          </div>
          <div className="font-mono text-xs text-slate-500 mb-2">
            提示：{puzzle.anomalyHint}
          </div>

          {items.map((fragment) => (
            <motion.button
              key={fragment.id}
              onClick={() => handleIdentify(fragment.id)}
              className={`border rounded-lg px-3 py-2.5 text-left flex gap-3 items-start transition-colors ${
                selected === fragment.id
                  ? 'border-[#00ffb4] bg-[#00ffb4]/10'
                  : 'border-[#00ffb4]/20 bg-[#00ffb4]/3 hover:border-[#00ffb4]/50'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-mono text-[#00ffb4]/40 text-xs mt-0.5 select-none flex-shrink-0">▸</span>
              <p className="font-mono text-sm text-slate-300 leading-relaxed">{fragment.text}</p>
            </motion.button>
          ))}
        </div>
      )}
    </PuzzleShell>
  );
}
