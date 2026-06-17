'use client';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrackStage as TStage, StageOutcome } from '@/lib/missions/runTypes';
import { StageShell } from './StageShell';

interface Props {
  stage: TStage;
  stageIndex: number;
  totalStages: number;
  onDone: (outcome: StageOutcome) => void;
}

export function TrackStage({ stage, stageIndex, totalStages, onDone }: Props) {
  const handleTimeout = useCallback(() => onDone('timeout'), [onDone]);

  const pick = (isCorrect: boolean) => {
    onDone(isCorrect ? 'correct' : 'wrong');
  };

  return (
    <StageShell
      stageIndex={stageIndex}
      totalStages={totalStages}
      timeLimit={stage.timeLimit}
      onTimeout={handleTimeout}
    >
      <div className="flex flex-col gap-4">
        <div className="font-mono text-xs text-[#00ffb4]/60">
          追踪：{stage.speakerHint}。ta 的历史发言如下——
        </div>

        {/* 历史发言 */}
        <div className="flex flex-col gap-1.5">
          {stage.priorMessages.map((msg, i) => (
            <motion.div
              key={i}
              className="border border-[#00ffb4]/10 rounded-lg px-3 py-2 bg-[#00ffb4]/3 flex gap-2 items-start"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
            >
              <span className="font-mono text-[#00ffb4]/25 text-xs flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span className="font-mono text-xs text-slate-300">{msg}</span>
            </motion.div>
          ))}
        </div>

        <div className="font-mono text-xs text-slate-500 border-t border-[#00ffb4]/10 pt-3">
          ECHO：接下来 ta 最可能说什么？
        </div>

        {/* 选项 */}
        <div className="flex flex-col gap-2">
          {stage.options.map((opt, i) => (
            <motion.button
              key={opt.id}
              onClick={() => pick(opt.isCorrect)}
              className="border border-[#00ffb4]/15 rounded-xl px-4 py-2.5 text-left hover:border-[#00ffb4]/50 hover:bg-[#00ffb4]/5 transition-colors"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stage.priorMessages.length * 0.12 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[#00ffb4]/30 text-xs mt-0.5 flex-shrink-0 select-none">
                  {String.fromCharCode(65 + i)}
                </span>
                <p className="font-mono text-sm text-slate-300 leading-relaxed">{opt.text}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </StageShell>
  );
}
