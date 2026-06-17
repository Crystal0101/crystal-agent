const { io } = require('socket.io-client');

const PERSONA_TAGS = ['毒舌评论家','高知文艺范','内敛观察者','客气官方人','阳光善良派','理性冷静派','幽默段子手'];

async function test(humanMsg, waitMs = 20000) {
  const socket = io('http://localhost:3000', { transports: ['websocket'] });
  await new Promise(r => socket.on('connect', r));

  const state = await new Promise((res, rej) => {
    socket.emit('create-room', {
      playerName: '玩家', avatar: '😎',
      config: { roundDuration: 120, maxRounds: 1, aiCount: 4, aiDifficulty: 'normal', eliminationMode: false }
    }, r => r.success ? res(r.state) : rej(r.error));
  });
  const aiNames = state.participants.filter(p => p.isAI).map(p => p.name);

  const msgs = [];
  socket.on('new-message', m => { if (m.isAI) msgs.push(m); });

  await new Promise(r => {
    socket.on('game-state', s => { if (s.phase === 'chat') r(); });
    socket.emit('start-game', () => {});
  });

  await new Promise(r => setTimeout(r, 300));
  console.log(`\n玩家: "${humanMsg}"`);
  socket.emit('send-message', { content: humanMsg });
  await new Promise(r => setTimeout(r, waitMs));

  msgs.forEach(m => {
    const idx = aiNames.indexOf(m.senderName);
    console.log(`  [${m.senderName}·${PERSONA_TAGS[idx % 7]}] ${m.content}`);
  });

  socket.disconnect();
  return msgs;
}

async function main() {
  await test('不会，知道了会每天活在恐惧里');
  await new Promise(r => setTimeout(r, 1500));
  await test('Alex你怎么看这个话题');
  console.log('\n测试完成');
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
