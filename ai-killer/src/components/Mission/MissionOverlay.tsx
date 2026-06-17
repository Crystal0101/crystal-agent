'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mission, MissionResult } from '@/lib/missions/types';
import { SignalDecodePuzzle } from './puzzles/SignalDecodePuzzle';
import { MemoryAuditPuzzle } from './puzzles/MemoryAuditPuzzle';
import { BehaviorPredictPuzzle } from './puzzles/BehaviorPredictPuzzle';
import { ProtocolCrackPuzzle } from './puzzles/ProtocolCrackPuzzle';

type Phase = 'breach' | 'scanning' | 'briefing' | 'puzzle' | 'analysis' | 'result' | 'returning';

interface Props {
  mission: Mission;
  onComplete: (result: MissionResult) => void;
}

export function MissionOverlay({ mission, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('breach');
  const [result, setResult] = useState<MissionResult | null>(null);
  const [briefingCountdown, setBriefingCountdown] = useState(8);

  useEffect(() => {
    if (phase !== 'breach') return;
    const t = setTimeout(() => setPhase('scanning'), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'scanning') return;
    const t = setTimeout(() => setPhase('briefing'), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'briefing') return;
    if (briefingCountdown <= 0) { setPhase('puzzle'); return; }
    const t = setTimeout(() => setBriefingCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, briefingCountdown]);

  const handlePuzzleComplete = useCallback((r: MissionResult) => {
    setResult(r);
    setPhase('analysis');
  }, []);

  useEffect(() => {
    if (phase !== 'analysis') return;
    const t = setTimeout(() => setPhase('result'), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(() => {
      setPhase('returning');
      setTimeout(() => onComplete(result!), 1000);
    }, 4500);
    return () => clearTimeout(t);
  }, [phase, result, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, exit: { duration: 0.15 } }}
    >
      <div className="absolute inset-0 bg-[#020814]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,180,0.03) 2px, rgba(0,255,180,0.03) 4px)',
        }}
      />

      <AnimatePresence mode="wait">
        {phase === 'breach' && <BreachScreen key="breach" mission={mission} />}
        {phase === 'scanning' && <ScanningScreen key="scanning" mission={mission} />}
        {phase === 'briefing' && (
          <BriefingScreen
            key="briefing"
            mission={mission}
            countdown={briefingCountdown}
            onSkip={() => setPhase('puzzle')}
          />
        )}
        {phase === 'puzzle' && (
          <PuzzleScreen key="puzzle" mission={mission} onComplete={handlePuzzleComplete} />
        )}
        {phase === 'analysis' && result && <AnalysisScreen key="analysis" result={result} />}
        {phase === 'result' && result && (
          <ResultScreen key="result" mission={mission} result={result} />
        )}
        {phase === 'returning' && <ReturningScreen key="returning" />}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 破入动画 ───────────────────────────────────────────────────────────────────
function BreachScreen({ mission }: { mission: Mission }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-0 right-0 h-px bg-[#00ffb4]"
          style={{ top: `${8 + i * 10}%` }}
          animate={{ scaleX: [0, 1, 0.7, 1], opacity: [0, 0.7, 0.2, 0.5] }}
          transition={{ duration: 0.35, delay: i * 0.07, repeat: 3 }}
        />
      ))}
      <motion.div
        className="text-[#00ffb4] font-mono text-xs tracking-[0.3em] uppercase"
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ duration: 0.3, repeat: 4 }}
      >
        ⚠ SIGNAL BREACH DETECTED
      </motion.div>
      <motion.div
        className="text-[#00ffb4] font-mono font-bold text-2xl tracking-wider text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        MIRROR 协议
      </motion.div>
      <motion.div
        className="text-slate-500 font-mono text-xs text-center px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        {mission.caseNumber} · {mission.classification}
      </motion.div>
      <motion.div
        className="w-48 h-px bg-[#00ffb4]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      />
      <motion.div
        className="text-[#00ffb4] font-mono text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 2.0, duration: 0.4, repeat: Infinity }}
      >
        正在建立加密通道...
      </motion.div>
    </motion.div>
  );
}

// ── 参与者扫描 ─────────────────────────────────────────────────────────────────
const FAKE_ADDRS = [
  '0x7F2A·E91C·44B0', '0xC3D8·0F17·A52E', '0x19FF·B6EA·3301',
  '0x84AC·D270·F9BB', '0xE50B·7C43·2198', '0x2D6F·A1E0·85C4',
];

function ScanningScreen({ mission }: { mission: Mission }) {
  const [step, setStep] = useState(0);
  const [addrIdx, setAddrIdx] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1600);
    const t2 = setTimeout(() => setStep(2), 2800);
    const t3 = setTimeout(() => setStep(3), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (step > 0) return;
    const t = setInterval(() => setAddrIdx(i => (i + 1) % FAKE_ADDRS.length), 180);
    return () => clearInterval(t);
  }, [step]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00ffb4]/20">
        <div className="font-mono text-[#00ffb4] text-xs tracking-widest">MIRROR · 扫描中</div>
        <motion.div
          className="w-2 h-2 rounded-full bg-[#00ffb4]"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-5">
        {/* 滚动地址 */}
        <div className="border border-[#00ffb4]/15 rounded-lg p-4 bg-[#00ffb4]/3">
          <div className="font-mono text-[10px] text-[#00ffb4]/50 mb-2">SESSION PARTICIPANTS · SIGNAL TRACE</div>
          <div className="font-mono text-sm text-[#00ffb4]">
            {step === 0 ? FAKE_ADDRS[addrIdx] : '0x··· ··· ···'}
          </div>
          <div className="font-mono text-[10px] text-slate-600 mt-1">
            {step === 0 ? 'SCANNING...' : step >= 1 ? 'ANOMALY LOCKED' : ''}
          </div>
        </div>

        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-orange-500/30 rounded-lg p-4 bg-orange-500/5"
            >
              <div className="font-mono text-xs text-orange-400 mb-1">⚠ 异常信号</div>
              <div className="font-mono text-sm text-slate-300">
                在本次会话的数据流中检测到一段非人类意识残留。
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[#00ffb4]/30 rounded-lg p-4 bg-[#00ffb4]/5"
            >
              <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">ECHO 指令</div>
              <div className="font-mono text-sm text-[#00ffb4]">
                任务已就绪。准备接收简报。
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-xs text-slate-600 text-center"
            >
              {mission.caseNumber} · 即将进入任务简报
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── 任务简报 ───────────────────────────────────────────────────────────────────
function BriefingScreen({ mission, countdown, onSkip }: { mission: Mission; countdown: number; onSkip: () => void }) {
  const lines = mission.echoMessage.split('\n');
  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00ffb4]/20">
        <div className="font-mono text-[#00ffb4] text-xs tracking-widest">MIRROR / ECHO</div>
        <div className="font-mono text-slate-500 text-xs">{mission.caseNumber}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#00ffb4]/40 flex items-center justify-center bg-[#00ffb4]/5">
            <motion.div
              className="text-[#00ffb4] font-mono font-bold text-lg"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              E
            </motion.div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">ECHO · 系统级访问</div>
            {lines.map((line, i) => (
              <motion.p
                key={i}
                className="font-mono text-sm text-slate-300 leading-relaxed"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </div>

        <motion.div
          className="border border-[#00ffb4]/30 rounded-lg p-4 bg-[#00ffb4]/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: lines.length * 0.3 + 0.2 }}
        >
          <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">任务代号</div>
          <div className="font-mono text-white font-bold text-lg">{mission.title}</div>
          <div className="font-mono text-xs text-slate-500 mt-1">{mission.classification}</div>
        </motion.div>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={onSkip}
          className="w-full border border-[#00ffb4]/40 rounded-lg py-3 font-mono text-sm text-[#00ffb4] hover:bg-[#00ffb4]/10 transition-colors flex items-center justify-center gap-3"
        >
          <span>开始任务</span>
          <span className="text-[#00ffb4]/60">（{countdown}s）</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── 谜题路由 ───────────────────────────────────────────────────────────────────
function PuzzleScreen({ mission, onComplete }: { mission: Mission; onComplete: (r: MissionResult) => void }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {mission.puzzle.type === 'signal-decode' && (
        <SignalDecodePuzzle puzzle={mission.puzzle} onComplete={onComplete} />
      )}
      {mission.puzzle.type === 'memory-audit' && (
        <MemoryAuditPuzzle puzzle={mission.puzzle} onComplete={onComplete} />
      )}
      {mission.puzzle.type === 'behavior-predict' && (
        <BehaviorPredictPuzzle puzzle={mission.puzzle} onComplete={onComplete} />
      )}
      {mission.puzzle.type === 'protocol-crack' && (
        <ProtocolCrackPuzzle puzzle={mission.puzzle} onComplete={onComplete} />
      )}
    </motion.div>
  );
}

// ── ECHO 分析中（新阶段） ──────────────────────────────────────────────────────
function AnalysisScreen({ result }: { result: MissionResult }) {
  const [progress, setProgress] = useState(0);
  const lines: Record<MissionResult, string[]> = {
    perfect: ['信号完整解析', '意识特征提取完成', '情报已加密上传'],
    success: ['信号部分解析', '可信度校验中...', '情报上传中'],
    fail:    ['解析失败', '数据校验错误', '本次情报作废'],
    timeout: ['连接超时', '任务中止', '信号已断开'],
  };
  const color = result === 'perfect' ? '#00ffb4' : result === 'success' ? '#60a5fa' : '#f87171';

  useEffect(() => {
    const t = setInterval(() => setProgress(p => Math.min(p + 4, 100)), 80);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="font-mono text-xs tracking-widest" style={{ color }}>
        ECHO · 数据分析中
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2">
        {lines[result].map((line, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
            <span className="font-mono text-sm text-slate-400">{line}</span>
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-xs">
        <div className="h-0.5 bg-[#00ffb4]/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color, width: `${progress}%` }}
          />
        </div>
        <div className="font-mono text-[10px] text-slate-600 mt-1.5 text-right">{progress}%</div>
      </div>
    </motion.div>
  );
}

// ── 结果页 ─────────────────────────────────────────────────────────────────────
function ResultScreen({ mission, result }: { mission: Mission; result: MissionResult }) {
  const config = {
    perfect: { color: '#00ffb4', label: '完美解码', icon: '◈', message: mission.perfectIntel },
    success: { color: '#60a5fa', label: '任务成功', icon: '◆', message: mission.successIntel },
    fail:    { color: '#f87171', label: '任务失败', icon: '◇', message: mission.failMessage },
    timeout: { color: '#fb923c', label: '时间耗尽', icon: '◌', message: mission.failMessage },
  }[result];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="font-mono text-5xl"
        style={{ color: config.color }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5 }}
      >
        {config.icon}
      </motion.div>

      <motion.div
        className="font-mono font-bold text-xl tracking-widest uppercase"
        style={{ color: config.color }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {config.label}
      </motion.div>

      <motion.div
        className="border rounded-lg p-4 font-mono text-sm text-slate-300 text-center leading-relaxed max-w-xs"
        style={{ borderColor: `${config.color}40`, backgroundColor: `${config.color}08` }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {config.message}
      </motion.div>

      <motion.div
        className="font-mono text-xs text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        正在返回会话...
      </motion.div>
    </motion.div>
  );
}

// ── 返回动画 ───────────────────────────────────────────────────────────────────
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
