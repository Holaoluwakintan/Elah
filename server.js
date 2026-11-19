const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const port = process.env.PORT || 8791;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg'
};

// ------------------------------------------------------------------ HTTP Server
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(root, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// ------------------------------------------------------------------ WebSocket & Multiplayer Rooms
// ── Server-Authoritative Co-Op Waves (§05) ─────────────────────
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
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(`${level}:${ts}`).digest('hex');
  return `${sig}.${ts}.${level}`;
}

function verifyMatchToken(token, level, timeSec, kills) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'Missing token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'Malformed token' };
  const [sig, tsStr, tokLevelStr] = parts;
  const ts = parseInt(tsStr, 10);
  const tokLevel = parseInt(tokLevelStr, 10);
  if (tokLevel !== level) return { valid: false, reason: 'Level mismatch' };
  const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(`${tokLevel}:${ts}`).digest('hex');
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

const ROOMS = new Map(); // code -> Room
let nextPlayerId = 1;

function makeCode() {
  const words = ['ELAH', 'ZION', 'HEBRON', 'MOREH', 'CARMEL', 'SHILOH', 'GILEAD', 'BETHEL', 'TABOR', 'JERICHO'];
  for (const w of words) {
    if (!ROOMS.has(w)) return w;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return ROOMS.has(c) ? makeCode() : c;
}

function sendWS(socket, data) {
  if (socket.destroyed || !socket.writable) return;
  const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function broadcastRoom(room, data, exceptSocket = null) {
  for (const p of room.players.values()) {
    if (p.socket !== exceptSocket) {
      sendWS(p.socket, data);
    }
  }
}

function getRoomSnapshot(room) {
  return {
    code: room.code,
    mode: room.mode,
    level: room.level,
    hostId: room.hostId,
    state: room.state,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      isHost: p.id === room.hostId,
      ready: p.ready
    }))
  };
}

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ];

  socket.write(headers.join('\r\n'));

  const playerId = 'p' + (nextPlayerId++);
  socket.playerId = playerId;
  socket.currentRoom = null;

  let buffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const byte0 = buffer[0];
      const byte1 = buffer[1];
      const opcode = byte0 & 0x0f;
      const masked = (byte1 & 0x80) !== 0;
      let payloadLen = byte1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) break;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) break;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLen = masked ? 4 : 0;
      if (buffer.length < offset + maskKeyLen + payloadLen) break;

      let maskKey = null;
      if (masked) {
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      const payload = buffer.subarray(offset, offset + payloadLen);
      if (masked) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      buffer = buffer.subarray(offset + payloadLen);

      if (opcode === 8) { // close
        socket.end();
        break;
      } else if (opcode === 9) { // ping
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0;
        socket.write(pong);
      } else if (opcode === 1) { // text
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          handleMessage(socket, msg);
        } catch (e) {
          console.error('WS msg parse error:', e);
        }
      }
    }
  });

  const cleanup = () => {
    if (socket.currentRoom) {
      const room = ROOMS.get(socket.currentRoom);
      if (room) {
        room.players.delete(socket.playerId);
        broadcastRoom(room, {
          type: 'player_left',
          playerId: socket.playerId,
          room: getRoomSnapshot(room)
        });
        if (room.players.size === 0) {
          ROOMS.delete(room.code);
          console.log(`Room ${room.code} deleted (empty)`);
        } else if (room.hostId === socket.playerId) {
          const newHost = room.players.keys().next().value;
          room.hostId = newHost;
          broadcastRoom(room, {
            type: 'host_changed',
            hostId: newHost,
            room: getRoomSnapshot(room)
          });
        }
      }
      socket.currentRoom = null;
    }
  };

  socket.on('close', cleanup);
  socket.on('error', cleanup);
});


function serverSpawnWave(room, waveIndex) {
  const waves = COOP_WAVES[room.level] || COOP_WAVES[1];
  if (waveIndex >= waves.length) {
    // Boss wave
    room.waveState = 'boss';
    room.boss = { hp: 500, maxHp: 500, alive: true };
    console.log(`Room ${room.code}: Spawning authoritative Goliath boss`);
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
    id: `e_${waveIndex}_${idx}`,
    kind: def[0],
    x: def[1],
    z: def[2],
    hp: def[0] === 'captain' ? 130 : 66,
    maxHp: def[0] === 'captain' ? 130 : 66,
    alive: true
  }));
  console.log(`Room ${room.code}: Server spawning authoritative ${w.name} (${room.enemies.length} enemies)`);
  broadcastRoom(room, {
    type: 'server_wave_spawn',
    waveIndex,
    name: w.name,
    enemies: room.enemies
  });
  saveRoomsState();
}

function handleMessage(socket, msg) {
  const pId = socket.playerId;

  if (msg.type === 'list_rooms') {
    const list = [];
    for (const r of ROOMS.values()) {
      if (r.state === 'lobby' && r.players.size < 4) {
        list.push({
          code: r.code,
          mode: r.mode,
          level: r.level,
          playersCount: r.players.size,
          maxPlayers: r.mode === 'pvp' ? 2 : 4
        });
      }
    }
    sendWS(socket, { type: 'room_list', rooms: list });
    return;
  }

  if (msg.type === 'create_room') {
    const code = makeCode();
    const room = {
      code,
      mode: msg.mode || 'coop',
      level: msg.level || 1,
      hostId: pId,
      state: 'lobby',
      players: new Map()
    };
    room.players.set(pId, {
      id: pId,
      name: msg.name || 'Warrior',
      hero: msg.hero || 'david',
      socket,
      ready: true
    });
    ROOMS.set(code, room);
    socket.currentRoom = code;
    console.log(`Room ${code} created by ${msg.name || pId} [${room.mode}]`);
    sendWS(socket, {
      type: 'room_joined',
      playerId: pId,
      room: getRoomSnapshot(room)
    });
    return;
  }

  if (msg.type === 'join_room') {
    const code = (msg.code || '').trim().toUpperCase();
    const room = ROOMS.get(code);
    if (!room) {
      sendWS(socket, { type: 'error', message: `Room "${code}" not found.` });
      return;
    }
    const maxP = room.mode === 'pvp' ? 2 : 4;
    if (room.players.size >= maxP) {
      sendWS(socket, { type: 'error', message: `Room "${code}" is full.` });
      return;
    }
    room.players.set(pId, {
      id: pId,
      name: msg.name || 'Warrior ' + room.players.size,
      hero: msg.hero || (room.mode === 'pvp' ? 'goliath' : 'benaiah'),
      socket,
      ready: false
    });
    socket.currentRoom = code;
    console.log(`Player ${msg.name || pId} joined room ${code}`);
    sendWS(socket, {
      type: 'room_joined',
      playerId: pId,
      room: getRoomSnapshot(room)
    });
    broadcastRoom(room, {
      type: 'player_joined',
      player: {
        id: pId,
        name: msg.name,
        hero: msg.hero
      },
      room: getRoomSnapshot(room)
    }, socket);
    return;
  }

  const room = socket.currentRoom ? ROOMS.get(socket.currentRoom) : null;
  if (!room) return;

  if (msg.type === 'update_lobby') {
    const p = room.players.get(pId);
    if (p) {
      if (msg.hero) p.hero = msg.hero;
      if (msg.ready !== undefined) p.ready = msg.ready;
      if (msg.level && room.hostId === pId) room.level = msg.level;
      if (msg.mode && room.hostId === pId) room.mode = msg.mode;
      broadcastRoom(room, {
        type: 'lobby_updated',
        room: getRoomSnapshot(room)
      });
    }
    return;
  }

  if (msg.type === 'start_game') {
    if (room.hostId !== pId) return;
    room.state = 'playing';
    room.kills = 0;
    console.log(`Game started in room ${room.code} [${room.mode}] Level ${room.level}`);
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
  }

  // ── Server-Authoritative Hit Handling ────────────────────────
  if (msg.type === 'hit_enemy' && room.mode === 'coop' && room.enemies) {
    msg.senderId = pId;
    const e = room.enemies.find(x => x.id === msg.enemyId || x.id === `e_${room.waveIndex}_${msg.enemyIdx}`);
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
  msg.senderId = pId;
  if (msg.targetId) {
    const targetPlayer = room.players.get(msg.targetId);
    if (targetPlayer) sendWS(targetPlayer.socket, msg);
  } else {
    broadcastRoom(room, msg, socket);
  }
}

// ------------------------------------------------------------------ Leaderboard API
const SCORES_FILE = path.join(root, 'scores.json');

function readScores() {
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch { return []; }
}
function writeScores(arr) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(arr.slice(0, 100), null, 2), 'utf8');
}

server.on('request', (req, res) => {
  // ── Match Token Generator for Score Integrity (§06) ────────
  if (req.method === 'GET' && req.url.startsWith('/api/match/token')) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
  }
  if (req.method === 'POST' && req.url === '/api/score') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.name || typeof entry.kills !== 'number') {
          res.writeHead(400); res.end('Bad payload'); return;
        }
        // Verify score integrity via signed match token
        const vResult = verifyMatchToken(entry.token, Number(entry.level || 1), Number(entry.time || 0), Number(entry.kills || 0));
        if (!vResult.valid) {
          console.warn(`Score rejection for "${entry.name}": ${vResult.reason}`);
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
        });
        scores.sort((a, b) => b.kills - a.kills);
        writeScores(scores);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ rank: scores.findIndex(s => s.name === entry.name && s.kills === entry.kills) + 1 }));
      } catch { res.writeHead(400); res.end('Parse error'); }
    });
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`WebSocket multiplayer ready on ws://localhost:${port}`);
});
