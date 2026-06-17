'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionCase, Clue, StageOutcome, AnyPayload, CipherPayload, LogicPayload, MemoryPayload, RiddlePayload, SequencePayload, ChoicePayload, SynthesisPayload } from '@/lib/missions/caseTypes';
import { MissionResult } from '@/lib/missions/types';

type Phase = 'intro' | 'stage-echo' | 'stage-puzzle' | 'between' | 'result' | 'returning';

interface Props {
  mcase: MissionCase;
  onComplete: (result: MissionResult) => void;
  onLeave?: () => void;
}

export function CaseOverlay({ mcase, onComplete, onLeave }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<StageOutcome | null>(null);
  const [outcomes, setOutcomes] = useState<StageOutcome[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [showClues, setShowClues] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ── 进场：step 0→1→2 自动，step 2 等待用户点击 ──────────────────────────────
  useEffect(() => {
    if (phase !== 'intro') return;
    if (introStep >= 2) return; // step 2 由用户手动点"开始"
    const t = setTimeout(() => setIntroStep(s => s + 1), introStep === 0 ? 2200 : 1600);
    return () => clearTimeout(t);
  }, [phase, introStep]);

  const handleStartFirstStage = useCallback(() => {
    setPhase('stage-echo');
  }, []);

  // ── ECHO 评语：等待用户点击（8s 自动兜底）─────────────────────────────────
  const advanceFromEcho = useCallback(() => {
    setPhase('stage-puzzle');
  }, []);

  // ── 答题完成 ──────────────────────────────────────────────────────────────────
  const handlePuzzleDone = useCallback((outcome: StageOutcome) => {
    const stage = mcase.stages[stageIndex];
    setLastOutcome(outcome);
    setOutcomes(prev => [...prev, outcome]);
    if (outcome === 'correct' && stage.clue) {
      setClues(prev => [...prev, { stageIndex, label: `线索 ${prev.length + 1}`, content: stage.clue! }]);
    }
    setPhase('between');
  }, [stageIndex, mcase.stages]);

  // ── 关卡间反馈：有线索时等用户，无线索 2.5s 自动 ────────────────────────────
  const advanceFromBetween = useCallback(() => {
    const next = stageIndex + 1;
    if (next >= mcase.stages.length) {
      setPhase('result');
    } else {
      setStageIndex(next);
      setPhase('stage-echo');
    }
  }, [stageIndex, mcase.stages.length]);

  // ── 结果展示 5s 后自动返回（也可手动） ────────────────────────────────────
  const finishMission = useCallback(() => {
    const correct = outcomes.filter(o => o === 'correct').length;
    const missionResult: MissionResult = correct >= 8 ? 'perfect' : correct >= 5 ? 'success' : 'fail';
    setPhase('returning');
    setTimeout(() => onComplete(missionResult), 900);
  }, [outcomes, onComplete]);

  useEffect(() => {
    if (phase !== 'result') return;
    const t = setTimeout(finishMission, 5500);
    return () => clearTimeout(t);
  }, [phase, finishMission]);

  const stage = mcase.stages[stageIndex];
  const correct = outcomes.filter(o => o === 'correct').length;
  const inActivePuzzle = phase === 'stage-puzzle' || phase === 'stage-echo' || phase === 'between' || phase === 'intro';

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-[#020814]" />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,180,0.03) 2px, rgba(0,255,180,0.03) 4px)' }} />

      {/* intro / echo / between 阶段的悬浮退出按钮（puzzle 阶段由 Shell 内嵌） */}
      {(phase === 'intro' || phase === 'stage-echo' || phase === 'between') && !showClues && !showExitConfirm && (
        <button
          onClick={() => setShowExitConfirm(true)}
          className="fixed top-3 right-3 z-[60] font-mono text-[11px] text-slate-500 hover:text-slate-300 border border-slate-700/50 hover:border-slate-500 rounded px-2 py-1 bg-[#020814]/80 transition-colors"
        >
          ✕ 退出
        </button>
      )}

      {/* ── 左上角线索按钮 ────────────────────────────────────────────────── */}
      {clues.length > 0 && (phase === 'stage-puzzle' || phase === 'stage-echo') && !showExitConfirm && (
        <button
          onClick={() => setShowClues(v => !v)}
          className="fixed top-3 left-3 z-[60] font-mono text-[10px] text-[#00ffb4]/70 border border-[#00ffb4]/20 rounded px-2 py-1 bg-[#020814]/90 hover:border-[#00ffb4]/50 transition-colors"
        >
          ◈ 线索 ({clues.length})
        </button>
      )}

      {/* ── 退出确认弹窗 ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center px-8 bg-[#020814]/90"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="border border-[#00ffb4]/20 rounded-2xl p-6 bg-[#020814] w-full max-w-xs flex flex-col gap-4">
              <div className="font-mono text-[#00ffb4] text-sm tracking-widest">退出任务</div>
              <div className="font-mono text-xs text-slate-400 leading-relaxed">
                当前任务进度将丢失。<br/>选择操作：
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowExitConfirm(false); finishMission(); }}
                  className="border border-[#00ffb4]/30 text-[#00ffb4] font-mono text-xs py-2.5 rounded-xl hover:bg-[#00ffb4]/10 transition-colors"
                >
                  放弃任务，返回聊天
                </button>
                {onLeave && (
                  <button
                    onClick={() => { setShowExitConfirm(false); onLeave(); }}
                    className="border border-red-500/30 text-red-400 font-mono text-xs py-2.5 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    退出游戏
                  </button>
                )}
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="text-slate-600 font-mono text-xs py-2 hover:text-slate-400 transition-colors"
                >
                  继续闯关
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 线索抽屉 ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showClues && (
          <motion.div
            className="fixed inset-0 z-[55] bg-[#020814]/95 flex flex-col p-6 gap-3 overflow-y-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[#00ffb4] text-sm tracking-widest">已收集线索</div>
              <button onClick={() => setShowClues(false)} className="font-mono text-slate-500 text-xs hover:text-white">✕ 关闭</button>
            </div>
            {clues.map((c, i) => (
              <div key={i} className="border border-[#00ffb4]/20 rounded-lg p-3 bg-[#00ffb4]/3">
                <div className="font-mono text-[10px] text-[#00ffb4]/50 mb-1">第 {c.stageIndex + 1} 关 · {c.label}</div>
                <div className="font-mono text-xs text-slate-300 leading-relaxed">{c.content}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 主内容区 ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <IntroScreen key="intro" mcase={mcase} step={introStep} onStart={handleStartFirstStage} />
        )}
        {phase === 'stage-echo' && (
          <EchoCommentScreen
            key={`echo-${stageIndex}`}
            comment={stage.echoComment}
            stageIndex={stageIndex}
            total={mcase.stages.length}
            onContinue={advanceFromEcho}
          />
        )}
        {phase === 'stage-puzzle' && (
          <PuzzleScreen
            key={`puzzle-${stageIndex}`}
            payload={stage.payload}
            stageIndex={stageIndex}
            total={mcase.stages.length}
            clues={clues}
            onDone={handlePuzzleDone}
            onRequestExit={() => setShowExitConfirm(true)}
          />
        )}
        {phase === 'between' && lastOutcome && (
          <BetweenScreen
            key={`between-${stageIndex}`}
            outcome={lastOutcome}
            clue={lastOutcome === 'correct' ? stage.clue : undefined}
            next={stageIndex + 1}
            total={mcase.stages.length}
            onContinue={advanceFromBetween}
          />
        )}
        {phase === 'result' && (
          <ResultScreen
            key="result"
            mcase={mcase}
            outcomes={outcomes}
            clues={clues}
            correct={correct}
            onExit={finishMission}
          />
        )}
        {phase === 'returning' && <ReturningScreen key="returning" />}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 进场 ──────────────────────────────────────────────────────────────────────
function IntroScreen({ mcase, step, onStart }: { mcase: MissionCase; step: number; onStart: () => void }) {
  const lines = mcase.intro.split('\n');
  return (
    <motion.div className="absolute inset-0 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00ffb4]/20">
        <motion.div className="font-mono text-[#00ffb4] text-xs tracking-widest" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
          ⚠ MIRROR PROTOCOL ACTIVE
        </motion.div>
        <div className="font-mono text-slate-600 text-xs">{mcase.caseNumber}</div>
      </div>

      {step === 0 && (
        <div className="flex-1 flex items-center justify-center">
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} className="absolute left-0 right-0 h-px bg-[#00ffb4]"
              style={{ top: `${10 + i * 11}%` }}
              animate={{ scaleX: [0, 1, 0.7, 0], opacity: [0, 0.7, 0.3, 0] }}
              transition={{ duration: 0.5, delay: i * 0.09 }}
            />
          ))}
          <motion.div className="font-mono text-[#00ffb4] text-sm tracking-widest" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.4, repeat: Infinity }}>
            ESTABLISHING CONNECTION...
          </motion.div>
        </div>
      )}

      {step >= 1 && (
        <div className="flex-1 flex flex-col justify-center px-6 gap-5 pb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#00ffb4]/40 flex items-center justify-center bg-[#00ffb4]/5">
              <motion.div className="text-[#00ffb4] font-mono font-bold text-lg" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}>E</motion.div>
            </div>
            <div className="flex-1">
              <div className="font-mono text-xs text-[#00ffb4]/50 mb-2">ECHO · 系统级访问</div>
              {lines.map((line, i) => (
                <motion.p key={i} className="font-mono text-sm text-slate-300 leading-relaxed mb-1"
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}>
                  {line}
                </motion.p>
              ))}
            </div>
          </div>

          {step >= 2 && (
            <>
              <motion.div className="border border-[#00ffb4]/30 rounded-xl p-4 bg-[#00ffb4]/5"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="font-mono text-xs text-[#00ffb4]/60 mb-1">案件代号</div>
                <div className="font-mono text-white font-bold text-lg">{mcase.title}</div>
                <div className="font-mono text-xs text-slate-500 mt-1">{mcase.caseNumber} · 共 {mcase.stages.length} 关</div>
              </motion.div>
              <motion.button
                onClick={onStart}
                className="border border-[#00ffb4]/50 text-[#00ffb4] font-mono text-sm py-3 rounded-xl hover:bg-[#00ffb4]/10 transition-colors tracking-widest"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.97 }}>
                ▶ 开始闯关
              </motion.button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── ECHO 过渡评语 — 手动继续，8s 自动兜底 ────────────────────────────────────
function EchoCommentScreen({ comment, stageIndex, total, onContinue }: {
  comment: string; stageIndex: number; total: number; onContinue: () => void;
}) {
  const [ready, setReady] = useState(false);
  const called = useRef(false);
  const advance = useCallback(() => {
    if (called.current) return;
    called.current = true;
    onContinue();
  }, [onContinue]);

  // 文字展示完后显示继续按钮（约 1s），8s 兜底自动进入
  useEffect(() => {
    const t1 = setTimeout(() => setReady(true), 1000);
    const t2 = setTimeout(advance, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [advance]);

  return (
    <motion.div className="absolute inset-0 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#00ffb4]/15">
        <div className="font-mono text-[#00ffb4] text-xs tracking-widest">ECHO</div>
        <div className="font-mono text-slate-600 text-xs">第 {stageIndex + 1} / {total} 关</div>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#00ffb4]/40 flex items-center justify-center bg-[#00ffb4]/5">
            <motion.div className="text-[#00ffb4] font-mono text-xs font-bold" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>E</motion.div>
          </div>
          <motion.div className="font-mono text-sm text-slate-300 leading-relaxed" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {comment}
          </motion.div>
        </div>
        <AnimatePresence>
          {ready && (
            <motion.button
              onClick={advance}
              className="self-end border border-[#00ffb4]/30 text-[#00ffb4]/80 font-mono text-xs px-4 py-2 rounded-xl hover:border-[#00ffb4]/60 hover:text-[#00ffb4] transition-colors"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              whileTap={{ scale: 0.96 }}>
              进入谜题 →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── 谜题路由 ──────────────────────────────────────────────────────────────────
function PuzzleScreen({ payload, stageIndex, total, clues, onDone, onRequestExit }: {
  payload: AnyPayload; stageIndex: number; total: number; clues: Clue[];
  onDone: (o: StageOutcome) => void; onRequestExit: () => void;
}) {
  switch (payload.type) {
    case 'cipher':    return <CipherStage    p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'logic':     return <LogicStage     p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'memory':    return <MemoryStage    p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'riddle':    return <RiddleStage    p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'sequence':  return <SequenceStage  p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'choice':    return <ChoiceStage    p={payload} stageIndex={stageIndex} total={total} onDone={onDone} onRequestExit={onRequestExit} />;
    case 'synthesis': return <SynthesisStage p={payload} stageIndex={stageIndex} total={total} clues={clues} onDone={onDone} onRequestExit={onRequestExit} />;
  }
}

// ── 关卡 Shell ────────────────────────────────────────────────────────────────
function Shell({ stageIndex, total, timeLimit, onTimeout, onRequestExit, children }: {
  stageIndex: number; total: number; timeLimit: number;
  onTimeout: () => void; onRequestExit: () => void; children: React.ReactNode;
}) {
  const [rem, setRem] = useState(timeLimit);
  const fired = useRef(false);

  useEffect(() => { setRem(timeLimit); fired.current = false; }, [stageIndex, timeLimit]);

  useEffect(() => {
    if (rem <= 0 && !fired.current) { fired.current = true; onTimeout(); return; }
    if (rem <= 0) return;
    const t = setInterval(() => setRem(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [rem, onTimeout]);

  const pct = rem / timeLimit;
  const col = pct > 0.5 ? '#00ffb4' : pct > 0.25 ? '#fb923c' : '#f87171';

  return (
    <div className="absolute inset-0 flex flex-col pt-10">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00ffb4]/10">
        <div className="h-full bg-[#00ffb4]/30 transition-all duration-300" style={{ width: `${(stageIndex / total) * 100}%` }} />
      </div>
      {/* 顶部栏：进度 + 退出 + 倒计时 */}
      <div className="absolute top-0.5 left-0 right-0 flex items-center px-3 py-2 border-b border-[#00ffb4]/10">
        <div className="font-mono text-[#00ffb4]/60 text-[10px] tracking-widest flex-1">第 {stageIndex + 1} / {total} 关</div>
        <button
          onClick={onRequestExit}
          className="font-mono text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700/40 hover:border-slate-500 rounded px-2 py-0.5 mx-2 transition-colors bg-[#020814]/60"
        >
          退出
        </button>
        <div className="font-mono font-bold text-sm tabular-nums w-8 text-right" style={{ color: col }}>{rem}s</div>
      </div>
      <div className="absolute top-8 left-0 right-0 h-0.5 bg-white/5">
        <div className="h-full transition-all" style={{ backgroundColor: col, width: `${pct * 100}%` }} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  );
}

// ── 密码关 ────────────────────────────────────────────────────────────────────
function CipherStage({ p, stageIndex, total, onDone, onRequestExit }: { p: CipherPayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1200);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-4">
        <div className="font-mono text-xs text-[#00ffb4]/60">密码规则：<span className="text-slate-400">{p.rule}</span></div>
        <div className="border border-[#00ffb4]/30 rounded-xl p-4 bg-[#00ffb4]/5">
          <div className="font-mono text-xs text-[#00ffb4]/50 mb-1">待解码：</div>
          <div className="font-mono text-xl text-[#00ffb4] tracking-widest text-center py-2">{p.encoded}</div>
        </div>
        <div className="font-mono text-xs text-slate-500 mb-1">解码结果是：</div>
        {p.options.map(opt => {
          let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300';
          if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4]' : 'border-red-500 bg-red-500/10 text-red-400';
          if (locked && opt.isCorrect && picked !== opt.id) cls = 'border-[#00ffb4]/40 text-[#00ffb4]/50';
          return (
            <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
              className={`border rounded-xl py-3 font-mono text-sm transition-colors ${cls}`}
              whileTap={!locked ? { scale: 0.97 } : {}}>
              {opt.text}
            </motion.button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── 逻辑关 ────────────────────────────────────────────────────────────────────
function LogicStage({ p, stageIndex, total, onDone, onRequestExit }: { p: LogicPayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1400);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-3">
        {p.context && <div className="font-mono text-xs text-[#00ffb4]/60 bg-[#00ffb4]/5 border border-[#00ffb4]/15 rounded-lg px-3 py-2">{p.context}</div>}
        {p.statements.map((s, i) => (
          <motion.div key={i} className="border border-[#00ffb4]/10 rounded-lg px-3 py-2.5"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}>
            <div className="font-mono text-[10px] text-[#00ffb4]/40 mb-1">{s.speaker}</div>
            <div className="font-mono text-xs text-slate-300 leading-relaxed">{s.text}</div>
          </motion.div>
        ))}
        <div className="font-mono text-xs text-slate-400 mt-1">{p.question}</div>
        {p.options.map(opt => {
          let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300 text-left';
          if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4] text-left' : 'border-red-500 bg-red-500/10 text-red-400 text-left';
          return (
            <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
              className={`border rounded-xl px-3 py-2.5 font-mono text-xs transition-colors ${cls}`}
              whileTap={!locked ? { scale: 0.98 } : {}}>
              {opt.text}
            </motion.button>
          );
        })}
        {locked && picked && (
          <motion.div className="font-mono text-xs text-slate-500 border border-slate-700 rounded-lg p-3 leading-relaxed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {p.explanation}
          </motion.div>
        )}
      </div>
    </Shell>
  );
}

// ── 记忆关 ────────────────────────────────────────────────────────────────────
function MemoryStage({ p, stageIndex, total, onDone, onRequestExit }: { p: MemoryPayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [memPhase, setMemPhase] = useState<'memorize' | 'answer'>('memorize');
  const [countdown, setCountdown] = useState(p.memoryTime);
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (memPhase !== 'memorize') return;
    if (countdown <= 0) { setMemPhase('answer'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [memPhase, countdown]);

  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1200);
  };

  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      {memPhase === 'memorize' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-[#00ffb4]/70">记住以下内容</div>
            <div className="font-mono text-sm font-bold text-orange-400">{countdown}s</div>
          </div>
          {p.profile.map((row, i) => (
            <div key={i} className="border border-[#00ffb4]/15 rounded-lg px-3 py-2 flex gap-3">
              <div className="font-mono text-[10px] text-[#00ffb4]/40 w-16 flex-shrink-0 mt-0.5">{row.label}</div>
              <div className="font-mono text-xs text-slate-200">{row.value}</div>
            </div>
          ))}
          <div className="font-mono text-[10px] text-slate-600 text-center mt-1">档案将在 {countdown} 秒后消失</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-[#00ffb4]/60 bg-[#00ffb4]/5 border border-[#00ffb4]/15 rounded-lg px-3 py-2">
            档案已关闭。根据记忆作答：
          </div>
          <div className="font-mono text-sm text-slate-300 leading-relaxed mt-1">{p.question}</div>
          {p.options.map(opt => {
            let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300';
            if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4]' : 'border-red-500 bg-red-500/10 text-red-400';
            return (
              <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
                className={`border rounded-xl px-3 py-3 font-mono text-xs transition-colors text-left ${cls}`}
                whileTap={!locked ? { scale: 0.98 } : {}}>
                {opt.text}
              </motion.button>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

// ── 谜语关 ────────────────────────────────────────────────────────────────────
function RiddleStage({ p, stageIndex, total, onDone, onRequestExit }: { p: RiddlePayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1200);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-4">
        <div className="border border-[#00ffb4]/20 rounded-xl p-5 bg-[#00ffb4]/3">
          <div className="font-mono text-xs text-[#00ffb4]/50 mb-3">脑筋急转弯</div>
          <div className="font-mono text-sm text-slate-200 leading-relaxed whitespace-pre-line">{p.riddle}</div>
          {p.hint && <div className="font-mono text-[10px] text-slate-600 mt-3 italic">提示：{p.hint}</div>}
        </div>
        {p.options.map(opt => {
          let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300';
          if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4]' : 'border-red-500 bg-red-500/10 text-red-400';
          if (locked && opt.isCorrect && picked !== opt.id) cls = 'border-[#00ffb4]/40 text-[#00ffb4]/50';
          return (
            <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
              className={`border rounded-xl py-3 font-mono text-sm transition-colors ${cls}`}
              whileTap={!locked ? { scale: 0.97 } : {}}>
              {opt.text}
            </motion.button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── 序列关 ────────────────────────────────────────────────────────────────────
function SequenceStage({ p, stageIndex, total, onDone, onRequestExit }: { p: SequencePayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1300);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-4">
        <div className="font-mono text-xs text-[#00ffb4]/60">{p.context}</div>
        <div className="flex gap-2 flex-wrap">
          {p.sequence.map((item, i) => (
            <motion.div key={i}
              className={`border rounded-lg px-3 py-2 font-mono text-sm ${item === '??' || item.includes('?') ? 'border-orange-400/50 text-orange-400 bg-orange-400/5' : 'border-[#00ffb4]/20 text-[#00ffb4] bg-[#00ffb4]/3'}`}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              {item}
            </motion.div>
          ))}
        </div>
        <div className="font-mono text-xs text-slate-400">下一个是：</div>
        <div className="grid grid-cols-2 gap-2">
          {p.options.map(opt => {
            let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300';
            if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4]' : 'border-red-500 bg-red-500/10 text-red-400';
            if (locked && opt.isCorrect && picked !== opt.id) cls = 'border-[#00ffb4]/40 text-[#00ffb4]/50';
            return (
              <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
                className={`border rounded-xl py-3 font-mono text-sm transition-colors ${cls}`}
                whileTap={!locked ? { scale: 0.96 } : {}}>
                {opt.text}
              </motion.button>
            );
          })}
        </div>
        {locked && (
          <motion.div className="font-mono text-xs text-slate-500 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            规律：{p.rule}
          </motion.div>
        )}
      </div>
    </Shell>
  );
}

// ── 通用选择关 ────────────────────────────────────────────────────────────────
function ChoiceStage({ p, stageIndex, total, onDone, onRequestExit }: { p: ChoicePayload; stageIndex: number; total: number; onDone: (o: StageOutcome) => void; onRequestExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1200);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-3">
        {p.paragraphs.map((para, i) => (
          <motion.div key={i} className="border border-[#00ffb4]/10 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-300 leading-relaxed"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>
            {para}
          </motion.div>
        ))}
        <div className="font-mono text-xs text-[#00ffb4]/70 mt-1">{p.question}</div>
        {p.options.map(opt => {
          let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300 text-left';
          if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4] text-left' : 'border-red-500 bg-red-500/10 text-red-400 text-left';
          return (
            <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
              className={`border rounded-xl px-3 py-2.5 font-mono text-xs transition-colors ${cls}`}
              whileTap={!locked ? { scale: 0.98 } : {}}>
              {opt.text}
            </motion.button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── 最终综合关 ────────────────────────────────────────────────────────────────
function SynthesisStage({ p, stageIndex, total, clues, onDone, onRequestExit }: {
  p: SynthesisPayload; stageIndex: number; total: number; clues: Clue[]; onDone: (o: StageOutcome) => void; onRequestExit: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const pick = (id: string, correct: boolean) => {
    if (locked) return;
    setPicked(id); setLocked(true);
    setTimeout(() => onDone(correct ? 'correct' : 'wrong'), 1500);
  };
  return (
    <Shell stageIndex={stageIndex} total={total} timeLimit={p.timeLimit} onTimeout={() => !locked && onDone('timeout')} onRequestExit={onRequestExit}>
      <div className="flex flex-col gap-3">
        <div className="font-mono text-xs text-[#00ffb4] tracking-widest mb-1">◈ 已收集线索</div>
        {clues.length === 0 && (
          <div className="font-mono text-xs text-slate-600 italic">没有收集到线索（答题正确才能获得线索）</div>
        )}
        {clues.map((c, i) => (
          <div key={i} className="border border-[#00ffb4]/15 rounded-lg px-3 py-2 bg-[#00ffb4]/3">
            <div className="font-mono text-[10px] text-[#00ffb4]/40 mb-0.5">{c.label}</div>
            <div className="font-mono text-xs text-slate-300">{c.content}</div>
          </div>
        ))}
        <div className="font-mono text-xs text-[#00ffb4]/70 mt-2 border-t border-[#00ffb4]/10 pt-3">{p.question}</div>
        {p.options.map(opt => {
          let cls = 'border-[#00ffb4]/20 hover:border-[#00ffb4]/50 text-slate-300 text-left';
          if (picked === opt.id) cls = opt.isCorrect ? 'border-[#00ffb4] bg-[#00ffb4]/10 text-[#00ffb4] text-left' : 'border-red-500 bg-red-500/10 text-red-400 text-left';
          return (
            <motion.button key={opt.id} onClick={() => pick(opt.id, opt.isCorrect)} disabled={locked}
              className={`border rounded-xl px-3 py-3 font-mono text-xs transition-colors ${cls}`}
              whileTap={!locked ? { scale: 0.98 } : {}}>
              {opt.text}
            </motion.button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── 关卡间反馈 — 有线索时等用户点击，无线索 2.5s 自动 ────────────────────────
function BetweenScreen({ outcome, clue, next, total, onContinue }: {
  outcome: StageOutcome; clue?: string; next: number; total: number; onContinue: () => void;
}) {
  const correct = outcome === 'correct';
  const timeout = outcome === 'timeout';
  const col = correct ? '#00ffb4' : timeout ? '#fb923c' : '#f87171';
  const hasClue = correct && !!clue;
  const called = useRef(false);
  const advance = useCallback(() => {
    if (called.current) return;
    called.current = true;
    onContinue();
  }, [onContinue]);

  useEffect(() => {
    // 有线索时给 8s 阅读，无线索 2.5s 自动
    const t = setTimeout(advance, hasClue ? 8000 : 2500);
    return () => clearTimeout(t);
  }, [advance, hasClue]);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div className="text-4xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>
        {correct ? '✓' : timeout ? '⏱' : '✗'}
      </motion.div>
      <div className="font-mono font-bold text-lg tracking-wider" style={{ color: col }}>
        {correct ? 'ECHO：正确' : timeout ? 'ECHO：超时' : 'ECHO：判断有误'}
      </div>
      {hasClue && (
        <motion.div className="border border-[#00ffb4]/30 rounded-xl p-4 bg-[#00ffb4]/5 w-full max-w-xs"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="font-mono text-[10px] text-[#00ffb4]/50 mb-2">线索已记录</div>
          <div className="font-mono text-sm text-slate-200 leading-relaxed">{clue}</div>
        </motion.div>
      )}
      {next < total ? (
        <motion.button
          onClick={advance}
          className="border border-white/10 text-slate-500 font-mono text-xs px-5 py-2 rounded-xl hover:border-white/20 hover:text-slate-400 transition-colors mt-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.97 }}>
          继续 · 第 {next + 1} 关 →
        </motion.button>
      ) : (
        <motion.button
          onClick={advance}
          className="border border-[#00ffb4]/30 text-[#00ffb4]/80 font-mono text-xs px-5 py-2 rounded-xl hover:bg-[#00ffb4]/10 transition-colors mt-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.97 }}>
          查看结果 →
        </motion.button>
      )}
    </motion.div>
  );
}

// ── 最终结果 ──────────────────────────────────────────────────────────────────
function ResultScreen({ mcase, outcomes, clues, correct, onExit }: {
  mcase: MissionCase; outcomes: StageOutcome[]; clues: Clue[]; correct: number; onExit: () => void;
}) {
  const total = outcomes.length;
  const pct = Math.round((correct / total) * 100);
  const grade = correct >= 8
    ? { label: '完美破案', color: '#00ffb4', icon: '◈', msg: '你完整还原了真相。情报已上传，本局AI已被锁定。' }
    : correct >= 5
    ? { label: '案件存档', color: '#60a5fa', icon: '◆', msg: '关键线索已获取。情报可信度约60%，建议参考。' }
    : { label: '调查中止', color: '#f87171', icon: '◌', msg: '线索不足。本次调查未能还原真相。' };

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="font-mono text-5xl" style={{ color: grade.color }}
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5 }}>
        {grade.icon}
      </motion.div>
      <motion.div className="font-mono font-bold text-xl tracking-widest" style={{ color: grade.color }}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {grade.label}
      </motion.div>
      <motion.div className="flex flex-col items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <div className="font-mono text-4xl font-bold" style={{ color: grade.color }}>
          {correct}<span className="text-slate-600 text-2xl"> / {total}</span>
        </div>
        <div className="font-mono text-xs text-slate-500">正确率 {pct}%</div>
      </motion.div>
      <motion.div className="flex gap-1.5 flex-wrap justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        {outcomes.map((o, i) => (
          <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: o === 'correct' ? '#00ffb4' : o === 'timeout' ? '#fb923c' : '#f87171' }} />
        ))}
      </motion.div>
      <motion.div className="border rounded-xl p-4 font-mono text-sm text-slate-300 text-center leading-relaxed max-w-xs"
        style={{ borderColor: `${grade.color}30`, backgroundColor: `${grade.color}08` }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        {grade.msg}
      </motion.div>
      <motion.button
        onClick={onExit}
        className="border border-white/10 text-slate-500 font-mono text-xs px-6 py-2 rounded-xl hover:text-slate-300 hover:border-white/20 transition-colors"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        whileTap={{ scale: 0.97 }}>
        返回游戏
      </motion.button>
    </motion.div>
  );
}

// ── 返回 ──────────────────────────────────────────────────────────────────────
function ReturningScreen() {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.8 }}>
      <div className="font-mono text-[#00ffb4] text-sm tracking-widest">↩ 返回会话</div>
    </motion.div>
  );
}
