'use client';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { FindStage as TStage, StageOutcome } from '@/lib/missions/runTypes';
import { StageShell } from './StageShell';

interface Props {
  stage: TStage;
  stageIndex: number;
  totalStages: number;
  onDone: (outcome: StageOutcome) => void;
}

export function FindStage({ stage, stageIndex, totalStages, onDone }: Props) {
  const handleTimeout = useCallback(() => onDone('timeout'), [onDone]);

  const pick = (isTarget: boolean) => {
    onDone(isTarget ? 'correct' : 'wrong');
  };

  return (
    <StageShell
      stageIndex={stageIndex}
      totalStages={totalStages}
      timeLimit={stage.timeLimit}
      onTimeout={handleTimeout}
    >
      <div className="flex flex-col gap-4">
        <div className="font-mono text-xs text-[#00ffb4]/70 leading-relaxed">
          {stage.question}
        </div>

        {stage.options.map((opt, i) => (
          <motion.button
            key={opt.id}
            onClick={() => pick(opt.isTarget)}
            className="border border-[#00ffb4]/15 rounded-xl px-4 py-3 text-left hover:border-[#00ffb4]/50 hover:bg-[#00ffb4]/5 transition-colors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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
    </StageShell>
  );
}
