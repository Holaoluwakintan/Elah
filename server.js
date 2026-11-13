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
    console.log(`Game started in room ${room.code} [${room.mode}] Level ${room.level}`);
    broadcastRoom(room, {
      type: 'game_started',
      room: getRoomSnapshot(room)
    });
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

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`WebSocket multiplayer ready on ws://localhost:${port}`);
});
