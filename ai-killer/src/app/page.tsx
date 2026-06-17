'use client';
import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { HomePage } from '@/components/Home/HomePage';
import { LobbyScreen } from '@/components/Game/LobbyScreen';
import { ChatScreen } from '@/components/Game/ChatScreen';
import { EliminationScreen } from '@/components/Game/EliminationScreen';
import { VotingScreen } from '@/components/Vote/VotingScreen';
import { ResultsScreen } from '@/components/Results/ResultsScreen';
import { CaseOverlay } from '@/components/Mission/CaseOverlay';
import { NightPhaseScreen } from '@/components/Game/NightPhaseScreen';
import { MissionResult } from '@/lib/missions/types';

export default function Home() {
  const {
    gameState,
    connected,
    skipVoteStatus,
    extendVoteStatus,
    roundExtended,
    typingUsers,
    pendingMission,
    missionIntel,
    nightIntel,
    activeCase,
    createRoom,
    joinRoom,
    startGame,
    sendMessage,
    submitVote,
    submitEliminationVote,
    reactToMessage,
    playAgain,
    playerReady,
    skipToVote,
    extendRound,
    leaveGame,
    reportMissionResult,
    devTriggerMission,
    submitNightAction,
  } = useSocket();

  const handleRunComplete = useCallback((result: MissionResult) => {
    reportMissionResult(result);
  }, [reportMissionResult]);

  const inGame = !!gameState;
  const phase = gameState?.phase;
  const isHost = gameState?.hostId === gameState?.myId;
  const showCase = !!(activeCase && pendingMission);

  return (
    <main className="max-w-md mx-auto min-h-screen relative">
      <div className={`fixed top-2 right-2 z-50 w-2 h-2 rounded-full transition-colors ${connected ? 'bg-green-500' : 'bg-red-500'}`} />

      <AnimatePresence mode="wait">
        {!inGame && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HomePage onCreateRoom={createRoom} onJoinRoom={joinRoom} />
          </motion.div>
        )}
        {inGame && phase === 'lobby' && (
          <motion.div key="lobby" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <LobbyScreen state={gameState!} onStartGame={startGame} onReady={playerReady} onLeave={leaveGame} />
          </motion.div>
        )}
        {inGame && phase === 'night' && (
          <motion.div key={`night-${gameState!.currentRound}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NightPhaseScreen state={gameState!} onSubmitAction={submitNightAction} onLeave={leaveGame} />
          </motion.div>
        )}
        {inGame && phase === 'chat' && (
          <motion.div key={`chat-${gameState!.currentRound}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen">
            <ChatScreen
              state={gameState!}
              onSendMessage={sendMessage}
              onSkipToVote={skipToVote}
              onExtendRound={extendRound}
              onLeave={leaveGame}
              onReact={reactToMessage}
              isHost={isHost}
              skipVoteStatus={skipVoteStatus}
              extendVoteStatus={extendVoteStatus}
              roundExtended={roundExtended}
              typingUsers={typingUsers}
              missionIntel={missionIntel}
              nightIntel={nightIntel}
            />
          </motion.div>
        )}
        {inGame && (phase === 'elimination' || phase === ('elimination-result' as typeof phase)) && (
          <motion.div key="elimination" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <EliminationScreen state={gameState!} onSubmitVote={submitEliminationVote} />
          </motion.div>
        )}
        {inGame && phase === 'vote' && (
          <motion.div key="vote" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <VotingScreen state={gameState!} onSubmitVote={submitVote} onLeave={leaveGame} />
          </motion.div>
        )}
        {inGame && phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ResultsScreen state={gameState!} onPlayAgain={playAgain} isHost={isHost} onLeave={leaveGame} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MIRROR 案件闯关遮罩 — 立即禁用 pointer-events 避免退场动画阻塞操作 */}
      <div style={{ pointerEvents: showCase ? 'auto' : 'none' }}>
        <AnimatePresence>
          {showCase && activeCase && (
            <CaseOverlay
              key={`case-${pendingMission!.triggeredAt ?? 0}`}
              mcase={activeCase}
              onComplete={handleRunComplete}
              onLeave={leaveGame}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Dev 触发面板（仅开发环境） */}
      {process.env.NODE_ENV === 'development' && inGame && phase === 'chat' && !showCase && (
        <div className="fixed bottom-20 right-3 z-40">
          <button
            onClick={() => devTriggerMission()}
            className="bg-[#020814]/95 border border-[#00ffb4]/30 text-[#00ffb4]/70 font-mono text-[10px] px-3 py-1.5 rounded hover:border-[#00ffb4]/60 hover:text-[#00ffb4] transition-colors"
          >
            ◈ 触发任务
          </button>
        </div>
      )}
    </main>
  );
}
