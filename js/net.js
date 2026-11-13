// ====================================================================================================
// ELAH WARRIOR — Real-Time Multiplayer Network Client (RFC 6455 WebSockets)
// ====================================================================================================

class NetworkClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.room = null;
    this.isMultiplayer = false;
    this.isHost = false;
    this.isPvP = false;
    this.isCoop = false;
    this.peers = new Map(); // id -> { id, name, hero, actor, targetPos, targetYaw, targetAnim, hp, maxHp, label }
    this.listeners = new Map();
    this.lastStateSend = 0;
    this.stateSendRate = 1 / 25; // 25 updates/sec
    this.name = localStorage.getItem('elah_mp_name') || 'Warrior';
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
  }

  off(event, cb) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(f => f !== cb));
  }

  emit(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => { try { cb(data); } catch(e) { console.error('NET listener err:', e); } });
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${location.host}`;
      console.log('Connecting to ELAH multiplayer server at:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('Connected to ELAH multiplayer realm!');
        this.emit('connected');
        resolve();
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse WS msg:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.isMultiplayer = false;
        console.log('Disconnected from multiplayer server.');
        this.emit('disconnected');
      };

      this.ws.onerror = (err) => {
        console.error('WS Error:', err);
        reject(err);
      };
    });
  }

  send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'room_list':
        this.emit('room_list', msg.rooms);
        break;

      case 'room_joined':
        this.playerId = msg.playerId;
        this.room = msg.room;
        this.isMultiplayer = true;
        this.isHost = msg.room.hostId === msg.playerId;
        this.isPvP = msg.room.mode === 'pvp';
        this.isCoop = msg.room.mode === 'coop';
        this.emit('room_joined', msg.room);
        break;

      case 'player_joined':
        this.room = msg.room;
        this.emit('player_joined', msg);
        break;

      case 'player_left':
        this.room = msg.room;
        this.emit('player_left', msg);
        break;

      case 'host_changed':
        this.room = msg.room;
        this.isHost = msg.hostId === this.playerId;
        this.emit('host_changed', msg);
        break;

      case 'lobby_updated':
        this.room = msg.room;
        this.isHost = msg.room.hostId === this.playerId;
        this.isPvP = msg.room.mode === 'pvp';
        this.isCoop = msg.room.mode === 'coop';
        this.emit('lobby_updated', msg.room);
        break;

      case 'game_started':
        this.room = msg.room;
        this.emit('game_started', msg.room);
        break;

      case 'error':
        this.emit('error', msg.message);
        break;

      // Real-time game events
      case 'state':
        this.emit('peer_state', msg);
        break;

      case 'attack':
        this.emit('peer_attack', msg);
        break;

      case 'shoot_projectile':
        this.emit('peer_projectile', msg);
        break;

      case 'spirit':
        this.emit('peer_spirit', msg);
        break;

      case 'hit_player':
        this.emit('player_hit', msg);
        break;

      case 'hit_enemy':
        this.emit('enemy_hit', msg);
        break;

      case 'sync_enemies':
        this.emit('sync_enemies', msg);
        break;

      case 'chat':
        this.emit('chat', msg);
        break;
    }
  }

  // Lobby actions
  listRooms() {
    this.send({ type: 'list_rooms' });
  }

  createRoom(name, mode = 'coop', level = 1, hero = 'david') {
    this.name = name;
    localStorage.setItem('elah_mp_name', name);
    this.send({ type: 'create_room', name, mode, level, hero });
  }

  joinRoom(code, name, hero = 'david') {
    this.name = name;
    localStorage.setItem('elah_mp_name', name);
    this.send({ type: 'join_room', code, name, hero });
  }

  updateLobby(updates) {
    this.send({ type: 'update_lobby', ...updates });
  }

  startGame() {
    this.send({ type: 'start_game' });
  }

  leaveRoom() {
    this.send({ type: 'leave_room' });
    this.room = null;
    this.isMultiplayer = false;
    this.peers.clear();
  }

  // Real-time broadcast helpers
  sendState(pos, yaw, anim, hp) {
    const t = performance.now() / 1000;
    if (t - this.lastStateSend < this.stateSendRate) return;
    this.lastStateSend = t;
    this.send({
      type: 'state',
      pos: [+(pos.x.toFixed(2)), +(pos.y.toFixed(2)), +(pos.z.toFixed(2))],
      yaw: +(yaw.toFixed(3)),
      anim,
      hp: Math.round(hp)
    });
  }

  sendAttack(atkType, dir) {
    this.send({
      type: 'attack',
      atkType,
      dir: [+(dir.x.toFixed(3)), +(dir.y.toFixed(3)), +(dir.z.toFixed(3))]
    });
  }

  sendProjectile(kind, pos, dir, speed) {
    this.send({
      type: 'shoot_projectile',
      kind,
      pos: [+(pos.x.toFixed(2)), +(pos.y.toFixed(2)), +(pos.z.toFixed(2))],
      dir: [+(dir.x.toFixed(3)), +(dir.y.toFixed(3)), +(dir.z.toFixed(3))],
      speed
    });
  }

  sendSpirit(hero, pos) {
    this.send({
      type: 'spirit',
      hero,
      pos: [+(pos.x.toFixed(2)), +(pos.y.toFixed(2)), +(pos.z.toFixed(2))]
    });
  }

  sendHitPlayer(targetId, dmg, dir) {
    this.send({
      type: 'hit_player',
      targetId,
      dmg: Math.round(dmg),
      dir: [+(dir.x.toFixed(3)), +(dir.y.toFixed(3)), +(dir.z.toFixed(3))]
    });
  }

  sendHitEnemy(enemyIdx, dmg, dir) {
    this.send({
      type: 'hit_enemy',
      enemyIdx,
      dmg: Math.round(dmg),
      dir: [+(dir.x.toFixed(3)), +(dir.y.toFixed(3)), +(dir.z.toFixed(3))]
    });
  }

  sendSyncEnemies(enemiesData) {
    this.send({
      type: 'sync_enemies',
      enemies: enemiesData
    });
  }

  sendChat(text) {
    this.send({ type: 'chat', text, name: this.name });
  }
}

export const NET = new NetworkClient();
