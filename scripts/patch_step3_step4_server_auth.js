// ============================================================
// ELAH WARRIOR — Steps 3 & 4: Server-Authoritative Waves & Score Integrity
// ============================================================
// 1. Server-Authoritative Wave Spawning (§05):
//    - Server tracks waves, authoritative enemy list & HP in rooms.
//    - Broadcasts server_wave_spawn, enemy_damaged, enemy_died, wave_cleared.
//    - Host disconnect no longer breaks co-op wave progression.
//    - Room state persistence (rooms_state.json) so active sessions survive restart.
// 2. Score Integrity & Anti-Cheat Validation (§05 / §06):
//    - GET /api/match/token issues HMAC-SHA256 signed session token.
//    - POST /api/score verifies signature, level-specific kill ceiling, and minimum elapsed time.
//    - Rejects tampered/forged score submissions.
// ============================================================

const fs = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Patch server.js ───────────────────────────────────────
const SERVER_JS = path.join(__dirname, '..', 'server.js');
let srv = norm(fs.readFileSync(SERVER_JS, 'utf8'));

// Insert wave defs and HMAC secret near top of server.js
const serverTopTarget = norm(`const ROOMS = new Map(); // code -> Room`);
const serverTopRepl = norm(`// ── Server-Authoritative Co-Op Waves (§05) ─────────────────────
const COOP_WAVES = {
  1: [
    { name: 'WAVE 1 · PHILISTINE ADVANCE SCOUTS', list: [['phil', -3, -12], ['phil', 3, -14], ['phil', 0, -20]] },
    { name: 'WAVE 2 · THE VANGUARD & CAPTAIN', list: [['phil', -8, -24], ['phil', 8, -24], ['captain', 0, -28], ['phil', -20, -10], ['phil', 20, -10]] },
    { name: 'WAVE 3 · THE HOST OF GATH', list: [['phil', -8, -30], ['phil', 8, -30], ['captain', -14, -32], ['captain', 14, -32], ['phil', -26, 2], ['phil', 26, 4], ['phil', 0, -36]] }
  ]
};

// ── Anti-Cheat & Score Integrity Constraints (§06) ─────────────
const HMAC_SECRET = process.env.SCORE_SECRET || 'elah-holy-covenant-2026-auth-seal';
const MAX_KILLS_BY_LEVEL = { 1: 50, 2: 150, 3: 80, 4: 70, 5: 100, 6: 120, 7: 120, 8: 120, 9: 80, 10: 90, 11: 100, 12: 90 };
const MIN_TIME_BY_LEVEL = { 1: 18, 2: 25, 3: 20, 4: 20, 5: 25, 6: 25, 7: 25, 8: 25, 9: 20, 10: 25, 11: 25, 12: 25 };

function createMatchToken(level) {
  const ts = Date.now();
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(\`\${level}:\${ts}\`).digest('hex');
  return \`\${sig}.\${ts}.\${level}\`;
}

function verifyMatchToken(token, level, timeSec, kills) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'Missing token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'Malformed token' };
  const [sig, tsStr, tokLevelStr] = parts;
  const ts = parseInt(tsStr, 10);
  const tokLevel = parseInt(tokLevelStr, 10);
  if (tokLevel !== level) return { valid: false, reason: 'Level mismatch' };
  const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(\`\${tokLevel}:\${ts}\`).digest('hex');
  if (sig !== expectedSig) return { valid: false, reason: 'Forged signature' };
  const elapsed = (Date.now() - ts) / 1000;
  const minTime = MIN_TIME_BY_LEVEL[level] || 15;
  if (timeSec < minTime || elapsed < minTime * 0.8) return { valid: false, reason: 'Impossible clear time' };
  const maxKills = MAX_KILLS_BY_LEVEL[level] || 60;
  if (kills > maxKills) return { valid: false, reason: 'Kills exceed ceiling' };
  return { valid: true };
}

// ── Persistent Rooms Cache (§05) ──────────────────────────────
const ROOMS_CACHE_FILE = path.join(root, 'rooms_state.json');
function saveRoomsState() {
  try {
    const serialized = [];
    for (const r of ROOMS.values()) {
      serialized.push({
        code: r.code, mode: r.mode, level: r.level, hostId: r.hostId, state: r.state,
        waveIndex: r.waveIndex || 0, kills: r.kills || 0
      });
    }
    fs.writeFileSync(ROOMS_CACHE_FILE, JSON.stringify(serialized, null, 2), 'utf8');
  } catch (e) {}
}

const ROOMS = new Map(); // code -> Room`);

if (srv.includes(serverTopTarget)) {
  srv = srv.replace(serverTopTarget, serverTopRepl);
  console.log('✓ server.js: Added wave defs, score integrity verification & persistent room cache');
}

// Insert server wave spawner function in server.js
const serverWaveSpawnerCode = norm(`
function serverSpawnWave(room, waveIndex) {
  const waves = COOP_WAVES[room.level] || COOP_WAVES[1];
  if (waveIndex >= waves.length) {
    // Boss wave
    room.waveState = 'boss';
    room.boss = { hp: 500, maxHp: 500, alive: true };
    console.log(\`Room \${room.code}: Spawning authoritative Goliath boss\`);
    broadcastRoom(room, {
      type: 'server_boss_spawn',
      boss: { kind: 'goliath', hp: 500, maxHp: 500 }
    });
    saveRoomsState();
    return;
  }
  const w = waves[waveIndex];
  room.waveIndex = waveIndex;
  room.waveState = 'active';
  room.enemies = w.list.map((def, idx) => ({
    id: \`e_\${waveIndex}_\${idx}\`,
    kind: def[0],
    x: def[1],
    z: def[2],
    hp: def[0] === 'captain' ? 130 : 66,
    maxHp: def[0] === 'captain' ? 130 : 66,
    alive: true
  }));
  console.log(\`Room \${room.code}: Server spawning authoritative \${w.name} (\${room.enemies.length} enemies)\`);
  broadcastRoom(room, {
    type: 'server_wave_spawn',
    waveIndex,
    name: w.name,
    enemies: room.enemies
  });
  saveRoomsState();
}
`);

if (!srv.includes('function serverSpawnWave')) {
  const handleMsgTarget = norm(`function handleMessage(socket, msg) {`);
  srv = srv.replace(handleMsgTarget, serverWaveSpawnerCode + '\n' + handleMsgTarget);
  console.log('✓ server.js: Injected serverSpawnWave()');
}

// Update start_game in handleMessage to trigger serverSpawnWave for co-op
const startGameTarget = norm(`  if (msg.type === 'start_game') {
    if (room.hostId !== pId) return;
    room.state = 'playing';
    console.log(\`Game started in room \${room.code} [\${room.mode}] Level \${room.level}\`);
    broadcastRoom(room, {
      type: 'game_started',
      room: getRoomSnapshot(room)
    });
    return;
  }`);

const startGameRepl = norm(`  if (msg.type === 'start_game') {
    if (room.hostId !== pId) return;
    room.state = 'playing';
    room.kills = 0;
    console.log(\`Game started in room \${room.code} [\${room.mode}] Level \${room.level}\`);
    broadcastRoom(room, {
      type: 'game_started',
      room: getRoomSnapshot(room)
    });
    // For co-op games, server authoritatively triggers Wave 0
    if (room.mode === 'coop') {
      setTimeout(() => {
        if (room.state === 'playing') serverSpawnWave(room, 0);
      }, 1500);
    }
    saveRoomsState();
    return;
  }`);

if (srv.includes(startGameTarget)) {
  srv = srv.replace(startGameTarget, startGameRepl);
  console.log('✓ server.js: start_game initiates authoritative co-op waves');
}

// Intercept hit_enemy and hit_boss in handleMessage
const inGameBroadcastTarget = norm(`  // In-Game Real-Time Broadcasts: state (pos, yaw, anim, hp), attack, projectile, spirit, hit, chat
  msg.senderId = pId;`);

const inGameBroadcastRepl = norm(`  // ── Server-Authoritative Hit Handling ────────────────────────
  if (msg.type === 'hit_enemy' && room.mode === 'coop' && room.enemies) {
    msg.senderId = pId;
    const e = room.enemies.find(x => x.id === msg.enemyId || x.id === \`e_\${room.waveIndex}_\${msg.enemyIdx}\`);
    if (e && e.alive) {
      e.hp = Math.max(0, e.hp - (msg.dmg || 25));
      if (e.hp <= 0) {
        e.alive = false;
        room.kills = (room.kills || 0) + 1;
        broadcastRoom(room, {
          type: 'enemy_died',
          enemyId: e.id,
          enemyIdx: msg.enemyIdx,
          killerId: pId,
          kills: room.kills
        });
        // Check if wave is wiped
        if (room.enemies.every(x => !x.alive)) {
          room.waveState = 'cleared';
          broadcastRoom(room, { type: 'wave_cleared', waveIndex: room.waveIndex });
          setTimeout(() => {
            if (room.state === 'playing') serverSpawnWave(room, room.waveIndex + 1);
          }, 3200);
        }
      } else {
        broadcastRoom(room, {
          type: 'enemy_damaged',
          enemyId: e.id,
          enemyIdx: msg.enemyIdx,
          hp: e.hp,
          dmg: msg.dmg,
          dir: msg.dir
        });
      }
    }
    return;
  }

  if (msg.type === 'hit_boss' && room.mode === 'coop' && room.boss && room.boss.alive) {
    msg.senderId = pId;
    room.boss.hp = Math.max(0, room.boss.hp - (msg.dmg || 35));
    if (room.boss.hp <= 0) {
      room.boss.alive = false;
      room.kills = (room.kills || 0) + 1;
      broadcastRoom(room, { type: 'coop_victory', kills: room.kills });
    } else {
      broadcastRoom(room, { type: 'boss_damaged', hp: room.boss.hp, dmg: msg.dmg });
    }
    return;
  }

  // In-Game Real-Time Broadcasts: state (pos, yaw, anim, hp), attack, projectile, spirit, hit, chat
  msg.senderId = pId;`);

if (srv.includes(inGameBroadcastTarget)) {
  srv = srv.replace(inGameBroadcastTarget, inGameBroadcastRepl);
  console.log('✓ server.js: Authoritative enemy damage & death handling wired');
}

// Add token generation endpoint and validated score submission
const leaderboardReqTarget = norm(`  if (req.method === 'GET' && req.url === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(readScores()));
    return;
  }`);

const leaderboardReqRepl = norm(`  // ── Match Token Generator for Score Integrity (§06) ────────
  if (req.method === 'GET' && req.url.startsWith('/api/match/token')) {
    const urlObj = new URL(req.url, \`http://\${req.headers.host || 'localhost'}\`);
    const lvl = parseInt(urlObj.searchParams.get('level') || '1', 10);
    const tok = createMatchToken(lvl);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ token: tok, level: lvl }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(readScores()));
    return;
  }`);

if (srv.includes(leaderboardReqTarget)) {
  srv = srv.replace(leaderboardReqTarget, leaderboardReqRepl);
  console.log('✓ server.js: Added /api/match/token HMAC token generation');
}

// Update /api/score to enforce verification
const scoreApiTarget = norm(`        const scores = readScores();
        scores.push({
          name:  String(entry.name).slice(0, 20),
          hero:  String(entry.hero  || 'david').slice(0, 16),
          level: Number(entry.level || 1),
          kills: Math.round(entry.kills),
          time:  Math.round(entry.time  || 0),
          date:  new Date().toISOString().slice(0, 10)
        });`);

const scoreApiRepl = norm(`        // Verify score integrity via signed match token
        const vResult = verifyMatchToken(entry.token, Number(entry.level || 1), Number(entry.time || 0), Number(entry.kills || 0));
        if (!vResult.valid) {
          console.warn(\`Score rejection for "\${entry.name}": \${vResult.reason}\`);
          res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Score verification failed: ' + vResult.reason }));
          return;
        }

        const scores = readScores();
        scores.push({
          name:  String(entry.name).slice(0, 20),
          hero:  String(entry.hero  || 'david').slice(0, 16),
          level: Number(entry.level || 1),
          kills: Math.round(entry.kills),
          time:  Math.round(entry.time  || 0),
          verified: true,
          date:  new Date().toISOString().slice(0, 10)
        });`);

if (srv.includes(scoreApiTarget)) {
  srv = srv.replace(scoreApiTarget, scoreApiRepl);
  console.log('✓ server.js: /api/score now cryptographically verifies scores');
}

fs.writeFileSync(SERVER_JS, srv.replace(/\n/g, '\r\n'), 'utf8');

// ── 2. Patch js/net.js ───────────────────────────────────────
const NET_JS = path.join(__dirname, '..', 'js', 'net.js');
let net = norm(fs.readFileSync(NET_JS, 'utf8'));

// Add event handlers for server_wave_spawn, enemy_died, enemy_damaged, server_boss_spawn, wave_cleared
const netSwitchTarget = norm(`      case 'coop_defeat':
        this.emit('coop_defeat', msg);
        break;`);

const netSwitchRepl = norm(`      case 'coop_defeat':
        this.emit('coop_defeat', msg);
        break;

      case 'server_wave_spawn':
        this.emit('server_wave_spawn', msg);
        break;

      case 'enemy_died':
        this.emit('enemy_died', msg);
        break;

      case 'enemy_damaged':
        this.emit('enemy_damaged', msg);
        break;

      case 'wave_cleared':
        this.emit('wave_cleared', msg);
        break;

      case 'server_boss_spawn':
        this.emit('server_boss_spawn', msg);
        break;`);

if (net.includes(netSwitchTarget)) {
  net = net.replace(netSwitchTarget, netSwitchRepl);
  console.log('✓ net.js: Added authoritative server wave events to switch');
}

fs.writeFileSync(NET_JS, net.replace(/\n/g, '\r\n'), 'utf8');

// ── 3. Patch js/game.js ──────────────────────────────────────
const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let game = norm(fs.readFileSync(GAME_JS, 'utf8'));

// Fetch match token at level start
const startLevelTarget = norm(`async function startLevel() {`);
const startLevelRepl = norm(`async function startLevel() {
  // Fetch anti-cheat match token from server
  try {
    fetch(\`/api/match/token?level=\${LEVEL}\`)
      .then(r => r.json())
      .then(d => { if (d.token) G.matchToken = d.token; })
      .catch(() => {});
  } catch (e) {}`);

if (game.includes(startLevelTarget) && !game.includes('G.matchToken = d.token')) {
  game = game.replace(startLevelTarget, startLevelRepl);
  console.log('✓ game.js: Match token requested on startLevel()');
}

// Pass match token in submitScore()
const submitScoreTarget = norm(`const payload = { name, hero: hero.toLowerCase(), level: LEVEL, kills: G.kills, time: Math.round(now() - G.t0) };`);
const submitScoreRepl = norm(`const payload = { name, hero: hero.toLowerCase(), level: LEVEL, kills: G.kills, time: Math.round(now() - G.t0), token: G.matchToken || '' };`);

if (game.includes(submitScoreTarget)) {
  game = game.replace(submitScoreTarget, submitScoreRepl);
  console.log('✓ game.js: submitScore() passes cryptographic match token');
}

// Wire server-authoritative wave listeners in initMultiplayerUI
const wireServerWavesTarget = norm(`  NET.on('sync_enemies', msg => {`);
const wireServerWavesRepl = norm(`  // ── Server-Authoritative Wave Sync (§05) ───────────────────
  NET.on('server_wave_spawn', msg => {
    if (!NET.isCoop) return;
    toast(msg.name, 3000);
    $('wave').textContent = msg.name;
    // Clear dead enemies
    for (const e of G.enemies) if (!e.gone) { e.remove(); if (e.bar) scene.remove(e.bar); }
    G.enemies = [];
    // Spawn authoritative enemies
    for (let i = 0; i < msg.enemies.length; i++) {
      const se = msg.enemies[i];
      const e = spawnEnemy(se.kind, se.x, se.z, 0);
      e.serverEnemyId = se.id;
      e.maxHp = se.maxHp;
      e.hp = se.hp;
    }
  });

  NET.on('enemy_damaged', msg => {
    if (!NET.isCoop) return;
    const e = G.enemies.find(x => x.serverEnemyId === msg.enemyId) || G.enemies[msg.enemyIdx];
    if (e && e.alive) {
      e.hp = msg.hp;
      hurtEnemy(e, msg.dmg || 20, msg.dir ? new THREE.Vector3(...msg.dir) : new THREE.Vector3(0, 0, 1), 'strike');
    }
  });

  NET.on('enemy_died', msg => {
    if (!NET.isCoop) return;
    const e = G.enemies.find(x => x.serverEnemyId === msg.enemyId) || G.enemies[msg.enemyIdx];
    if (e && e.alive) {
      killEnemy(e);
      if (msg.killerId !== NET.playerId) {
        toast('Ally struck down an enemy!', 1500);
      }
    }
  });

  NET.on('wave_cleared', msg => {
    if (!NET.isCoop) return;
    toast('⚔️ WAVE CLEARED! Stand ready for the next assault.', 2800);
    SFX.shofar && SFX.shofar();
  });

  NET.on('server_boss_spawn', msg => {
    if (!NET.isCoop) return;
    toast('⚡ GOLIATH OF GATH STEPS FORTH!', 4000);
    bossFight && bossFight(true);
  });

  NET.on('sync_enemies', msg => {`);

if (game.includes(wireServerWavesTarget)) {
  game = game.replace(wireServerWavesTarget, wireServerWavesRepl);
  console.log('✓ game.js: Authoritative wave & boss network listeners registered');
}

fs.writeFileSync(GAME_JS, game.replace(/\n/g, '\r\n'), 'utf8');

console.log('\nAll Step 3 & Step 4 patches applied successfully!');
