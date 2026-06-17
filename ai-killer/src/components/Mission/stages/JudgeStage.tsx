'use client';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { JudgeStage as TStage, StageOutcome } from '@/lib/missions/runTypes';
import { StageShell } from './StageShell';

interface Props {
  stage: TStage;
  stageIndex: number;
  totalStages: number;
  onDone: (outcome: StageOutcome) => void;
}

export function JudgeStage({ stage, stageIndex, totalStages, onDone }: Props) {
  const handleTimeout = useCallback(() => onDone('timeout'), [onDone]);

  const judge = (isAI: boolean) => {
    onDone(isAI === stage.isAI ? 'correct' : 'wrong');
  };

  return (
    <StageShell
      stageIndex={stageIndex}
      totalStages={totalStages}
      timeLimit={stage.timeLimit}
      onTimeout={handleTimeout}
    >
      <div className="flex flex-col gap-5 h-full justify-center">
        <div className="font-mono text-xs text-[#00ffb4]/60">判断：以下这条消息是真人写的还是AI写的？</div>

        <motion.div
          className="border border-[#00ffb4]/20 rounded-xl p-5 bg-[#00ffb4]/3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="font-mono text-sm text-slate-200 leading-relaxed break-words">
            {stage.message}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => judge(false)}
            className="border border-blue-500/30 rounded-xl py-5 font-mono text-sm text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/60 transition-colors flex flex-col items-center gap-1.5"
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-2xl">👤</span>
            <span>真人</span>
          </motion.button>
          <motion.button
            onClick={() => judge(true)}
            className="border border-[#00ffb4]/30 rounded-xl py-5 font-mono text-sm text-[#00ffb4] hover:bg-[#00ffb4]/10 hover:border-[#00ffb4]/60 transition-colors flex flex-col items-center gap-1.5"
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-2xl">🤖</span>
            <span>AI</span>
          </motion.button>
        </div>
      </div>
    </StageShell>
  );
}
