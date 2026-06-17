'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionRun, StageOutcome } from '@/lib/missions/runTypes';
import { MissionResult } from '@/lib/missions/types';
import { JudgeStage } from './stages/JudgeStage';
import { FindStage } from './stages/FindStage';
import { TrackStage } from './stages/TrackStage';

type Phase = 'intro' | 'running' | 'between' | 'result' | 'returning';

interface Props {
  run: MissionRun;
  onComplete: (result: MissionResult) => void;
}

export function MissionRunOverlay({ run, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<StageOutcome | null>(null);
  const [scores, setScores] = useState<StageOutcome[]>([]);

  // Intro: 3 steps, each ~1.2s auto-advance
  useEffect(() => {
    if (phase !== 'intro') return;
    if (introStep >= 3) { setPhase('running'); return; }
    const t = setTimeout(() => setIntroStep(s => s + 1), introStep === 0 ? 2000 : 1400);
    return () => clearTimeout(t);
  }, [phase, introStep]);

  const handleStageDone = useCallback((outcome: StageOutcome) => {
    setLastOutcome(outcome);
    setScores(prev => [...prev, outcome]);
    setPhase('between');
  }, []);

  // Between stages: show feedback for 1.4s then advance
  useEffect(() => {
    if (phase !== 'between') return;
    const t = setTimeout(() => {
      const next = stageIndex + 1;
      if (next >= run.stages.length) {
        setPhase('result');
      } else {
        setStageIndex(next);
        setPhase('running');
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [phase, stageIndex, run.stages.length]);

  // Result: show for 5s then return
  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(() => {
      setPhase('returning');
      const correctCount = scores.filter(s => s === 'correct').length;
      const missionResult: MissionResult =
        correctCount >= 10 ? 'perfect' : correctCount >= 7 ? 'success' : 'fail';
      setTimeout(() => onComplete(missionResult), 900);
    }, 5000);
    return () => clearTimeout(t);
  }, [phase, scores, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, exit: { duration: 0.15 } }}
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-[#020814]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,180,0.03) 2px, rgba(0,255,180,0.03) 4px)' }}
      />

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroScreen key="intro" run={run} step={introStep} />
        )}
        {phase === 'running' && (
          <RunningScreen
            key={`stage-${stageIndex}`}
            run={run}
            stageIndex={stageIndex}
            onDone={handleStageDone}
          />
        )}
        {phase === 'between' && lastOutcome && (
          <BetweenScreen
            key={`between-${stageIndex}`}
            outcome={lastOutcome}
            next={stageIndex + 1}
            total={run.stages.length}
            correctSoFar={scores.filter(s => s === 'correct').length}
          />
        )}
        {phase === 'result' && (
          <FinalResultScreen key="result" run={run} scores={scores} />
        )}
        {phase === 'returning' && <ReturningScreen key="returning" />}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 进场介绍 ───────────────────────────────────────────────────────────────────
function IntroScreen({ run, step }: { run: MissionRun; step: number }) {
  const lines = run.echoIntro.split('\n');

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 顶部闪烁警告 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00ffb4]/20">
        <motion.div
          className="font-mono text-[#00ffb4] text-xs tracking-widest"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          ⚠ MIRROR PROTOCOL ACTIVE
        </motion.div>
        <div className="font-mono text-slate-600 text-xs">{run.caseNumber}</div>
      </div>

      {step >= 0 && (
        <motion.div
          className="flex-1 flex flex-col justify-center px-6 gap-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* 干扰线 */}
          {step === 0 && [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-0 right-0 h-px bg-[#00ffb4]"
              style={{ top: `${15 + i * 14}%` }}
              animate={{ scaleX: [0, 1, 0.6, 0], opacity: [0, 0.6, 0.3, 0] }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          ))}

          {/* ECHO 头像 + 对话 */}
          {step >= 1 && (
            <motion.div
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#00ffb4]/40 flex items-center justify-center bg-[#00ffb4]/5">
                <motion.div
                  className="text-[#00ffb4] font-mono font-bold text-lg"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >E</motion.div>
              </div>
              <div className="flex-1">
                <div className="font-mono text-xs text-[#00ffb4]/50 mb-2">ECHO · 系统级访问</div>
                {lines.map((line, i) => (
                  <motion.p
                    key={i}
                    className="font-mono text-sm text-slate-300 leading-relaxed mb-1"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.18 }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div
              className="border border-[#00ffb4]/30 rounded-xl p-4 bg-[#00ffb4]/5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">任务代号</div>
              <div className="font-mono text-white font-bold text-lg">{run.title}</div>
              <div className="font-mono text-xs text-slate-500 mt-1">
                共 {run.stages.length} 关 · 判断 / 找异 / 追踪
              </div>
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div
              className="font-mono text-xs text-[#00ffb4]/50 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              即将开始 第 1 关...
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── 关卡运行 ───────────────────────────────────────────────────────────────────
function RunningScreen({ run, stageIndex, onDone }: { run: MissionRun; stageIndex: number; onDone: (o: StageOutcome) => void }) {
  const stage = run.stages[stageIndex];

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {stage.type === 'judge' && (
        <JudgeStage stage={stage} stageIndex={stageIndex} totalStages={run.stages.length} onDone={onDone} />
      )}
      {stage.type === 'find' && (
        <FindStage stage={stage} stageIndex={stageIndex} totalStages={run.stages.length} onDone={onDone} />
      )}
      {stage.type === 'track' && (
        <TrackStage stage={stage} stageIndex={stageIndex} totalStages={run.stages.length} onDone={onDone} />
      )}
    </motion.div>
  );
}

// ── 关卡间反馈 ─────────────────────────────────────────────────────────────────
function BetweenScreen({ outcome, next, total, correctSoFar }: {
  outcome: StageOutcome; next: number; total: number; correctSoFar: number;
}) {
  const isLast = next >= total;
  const correct = outcome === 'correct';
  const timeout = outcome === 'timeout';

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="text-4xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
      >
        {correct ? '✓' : timeout ? '⏱' : '✗'}
      </motion.div>
      <div
        className="font-mono font-bold text-lg tracking-wider"
        style={{ color: correct ? '#00ffb4' : timeout ? '#fb923c' : '#f87171' }}
      >
        {correct ? '判断正确' : timeout ? '超时' : '判断有误'}
      </div>
      <div className="font-mono text-xs text-slate-500">
        正确 {correctSoFar} / {next} 关
      </div>
      {!isLast && (
        <div className="font-mono text-xs text-[#00ffb4]/40">
          下一关: 第 {next + 1} 关
        </div>
      )}
    </motion.div>
  );
}

// ── 最终结果 ───────────────────────────────────────────────────────────────────
function FinalResultScreen({ run, scores }: { run: MissionRun; scores: StageOutcome[] }) {
  const correct = scores.filter(s => s === 'correct').length;
  const total = scores.length;
  const pct = Math.round((correct / total) * 100);

  const grade =
    correct >= 10 ? { label: '完美解码', color: '#00ffb4', icon: '◈', sub: '你对AI意识模式的识别能力超过了99%的参与者。' }
    : correct >= 7  ? { label: '任务成功', color: '#60a5fa', icon: '◆', sub: '情报已上传。本局存在机器意识残留。' }
    : correct >= 4  ? { label: '部分完成', color: '#fb923c', icon: '◇', sub: '数据不足。情报仅供参考，置信度偏低。' }
    :                 { label: '任务失败', color: '#f87171', icon: '◌', sub: '信号解析失败。本次情报作废。' };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="font-mono text-5xl"
        style={{ color: grade.color }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.5 }}
      >
        {grade.icon}
      </motion.div>

      <motion.div
        className="font-mono font-bold text-xl tracking-widest"
        style={{ color: grade.color }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {grade.label}
      </motion.div>

      {/* 分数 */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="font-mono text-4xl font-bold" style={{ color: grade.color }}>
          {correct}<span className="text-slate-600 text-2xl"> / {total}</span>
        </div>
        <div className="font-mono text-xs text-slate-500">正确率 {pct}%</div>
      </motion.div>

      {/* 每关结果小点 */}
      <motion.div
        className="flex gap-1.5 flex-wrap justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {scores.map((s, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: s === 'correct' ? '#00ffb4' : s === 'timeout' ? '#fb923c' : '#f87171' }}
            title={`第${i + 1}关: ${s}`}
          />
        ))}
      </motion.div>

      <motion.div
        className="border rounded-xl p-4 font-mono text-sm text-slate-300 text-center leading-relaxed max-w-xs"
        style={{ borderColor: `${grade.color}30`, backgroundColor: `${grade.color}08` }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        {grade.sub}
      </motion.div>

      <motion.div
        className="font-mono text-xs text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
      >
        正在返回会话...
      </motion.div>
    </motion.div>
  );
}

// ── 返回 ──────────────────────────────────────────────────────────────────────
function ReturningScreen() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="font-mono text-[#00ffb4] text-sm tracking-widest">↩ 返回会话</div>
    </motion.div>
  );
}
