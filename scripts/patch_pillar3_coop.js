// ============================================================
// ELAH WARRIOR — Pillar 3: Co-Op Crusade Upgrade Patch
// ============================================================
// Adds: floating name tags, enemy kill sync, spirit summon
// broadcast, co-op resurrection, win/loss sync, chat hotkey,
// and enemy sync for co-op host authority.
// ============================================================

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
const NET_JS  = path.join(__dirname, '..', 'js', 'net.js');
const STYLE_CSS = path.join(__dirname, '..', 'style.css');

let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function write(file, content) {
  // Always write with CRLF for consistency with original game.js
  if (file.endsWith('game.js')) {
    fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
  } else {
    fs.writeFileSync(file, content, 'utf8');
  }
}

function patch(file, label, search, replacement) {
  let raw = fs.readFileSync(file, 'utf8');
  let src = norm(raw);
  const searchN = norm(search);
  if (!src.includes(searchN)) {
    console.error(`✗ PATCH TARGET NOT FOUND [${label}]`);
    errors++;
    return;
  }
  const replaced = src.replace(searchN, norm(replacement));
  write(file, replaced);
  console.log(`✓ ${label}`);
}

// ============================================================
// 1. GAME.JS — Add floating name tag canvas sprites above peers
// ============================================================
patch(GAME_JS, 'spawnRemotePeer — floating name tags + team glow',
`function spawnRemotePeer(player) {
  if (REMOTE_PEERS.has(player.id)) return;
  const heroKey = player.hero || 'david';
  const scale = heroKey === 'samson' || heroKey === 'joshua' ? 1.05 : 1.0;
  const actor = new Actor(heroKey, scale, heroKey);
  actor.pos.set(P.pos.x + (Math.random() - 0.5) * 4, P.pos.y, P.pos.z + (Math.random() - 0.5) * 4);
  ground(actor);
  W.add(actor.obj);

  REMOTE_PEERS.set(player.id, {
    id: player.id,
    name: player.name,
    hero: heroKey,
    actor,
    targetPos: actor.pos.clone(),
    targetYaw: actor.yaw,
    targetAnim: 'Idle_Loop',
    hp: 100,
    maxHp: 100
  });
}`,
`function spawnRemotePeer(player) {
  if (REMOTE_PEERS.has(player.id)) return;
  const heroKey = player.hero || 'david';
  const scale = heroKey === 'samson' || heroKey === 'joshua' ? 1.05 : 1.0;
  const actor = new Actor(heroKey, scale, heroKey);
  actor.pos.set(P.pos.x + (Math.random() - 0.5) * 4, P.pos.y, P.pos.z + (Math.random() - 0.5) * 4);
  ground(actor);
  W.add(actor.obj);

  // ── Floating name tag sprite ──────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx2d = canvas.getContext('2d');
  ctx2d.fillStyle = 'rgba(0,0,0,0.6)';
  ctx2d.roundRect(4, 4, 248, 56, 10);
  ctx2d.fill();
  ctx2d.font = 'bold 26px serif';
  ctx2d.fillStyle = '#ffd36a';
  ctx2d.textAlign = 'center';
  ctx2d.fillText(player.name.toUpperCase(), 128, 36);
  ctx2d.font = '18px serif';
  ctx2d.fillStyle = '#c8b98a';
  ctx2d.fillText(heroKey.toUpperCase(), 128, 56);
  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.6, 0.65, 1);
  actor.obj.add(sprite);
  sprite.position.set(0, 2.6, 0);

  // ── Team colour rim light ─────────────────────────────────
  const peerColors = [0x4fc3f7, 0x81c784, 0xba68c8, 0xff8a65];
  const peerIdx = REMOTE_PEERS.size % 4;
  const rimLight = new THREE.PointLight(peerColors[peerIdx], 1.4, 4.5);
  rimLight.position.set(0, 1.4, 0);
  actor.obj.add(rimLight);

  REMOTE_PEERS.set(player.id, {
    id: player.id,
    name: player.name,
    hero: heroKey,
    actor,
    sprite,
    rimLight,
    targetPos: actor.pos.clone(),
    targetYaw: actor.yaw,
    targetAnim: 'Idle_Loop',
    hp: 100,
    maxHp: 100,
    dead: false,
    deathT: 0
  });
}`);

// ============================================================
// 2. GAME.JS — removeRemotePeer cleanup for sprite + light
// ============================================================
patch(GAME_JS, 'removeRemotePeer — cleanup sprite & rimLight',
`function removeRemotePeer(id) {
  const p = REMOTE_PEERS.get(id);
  if (p) {
    if (p.actor) {
      p.actor.remove();
      W.remove(p.actor.obj);
    }
    REMOTE_PEERS.delete(id);
  }
}`,
`function removeRemotePeer(id) {
  const p = REMOTE_PEERS.get(id);
  if (p) {
    if (p.actor) {
      if (p.sprite) p.actor.obj.remove(p.sprite);
      if (p.rimLight) p.actor.obj.remove(p.rimLight);
      p.actor.remove();
      W.remove(p.actor.obj);
    }
    REMOTE_PEERS.delete(id);
  }
}`);

// ============================================================
// 3. GAME.JS — updateMultiplayer: add name tag billboard + 
//    peer death / resurrection + enemy kill sync (host)
//    + spirit event handler
// ============================================================
patch(GAME_JS, 'updateMultiplayer — full AAA upgrade',
`function updateMultiplayer(dt) {
  // Lerp and update remote actors
  for (const [id, peer] of REMOTE_PEERS) {
    if (!peer.actor) continue;
    peer.actor.pos.lerp(peer.targetPos, 0.28);
    peer.actor.yaw = turnTo(peer.actor.yaw, peer.targetYaw, dt * 12);
    if (peer.targetAnim && peer.actor.curAnim !== peer.targetAnim) {
      peer.actor.play(peer.targetAnim, { ts: 1.0, fade: 0.1 });
    }
    peer.actor.update(dt);
    ground(peer.actor);
  }

  // Send local player state throttled
  if (P && G.phase === 'play') {
    const curAnim = P.curAnim || (P.state === 'attack' ? 'Sword_Attack' : P.state === 'dodge' ? 'Dodge' : 'Idle_Loop');
    NET.sendState(P.pos, P.yaw, curAnim, P.hp);
  }

  // Update multiplayer HUD roster
  updateMultiplayerHud();
}`,
`function updateMultiplayer(dt) {
  for (const [id, peer] of REMOTE_PEERS) {
    if (!peer.actor) continue;

    // ── Dead peer: show ghost tint and resurrection countdown ──
    if (peer.dead) {
      peer.deathT = (peer.deathT || 0) + dt;
      peer.actor.obj.traverse(c => { if (c.material) { c.material.opacity = 0.35; c.material.transparent = true; } });
      if (peer.sprite) peer.sprite.material.opacity = 0.4;
      // Auto-resurrect after 8 seconds
      if (peer.deathT > 8.0) {
        peer.dead = false;
        peer.deathT = 0;
        peer.hp = 50;
        peer.actor.obj.traverse(c => { if (c.material) { c.material.opacity = 1.0; c.material.transparent = false; } });
        if (peer.sprite) peer.sprite.material.opacity = 1.0;
        toast(\`\${peer.name.toUpperCase()} RETURNS FROM THE FALLEN!\`, 3000);
        SFX.shofar && SFX.shofar();
      }
      continue;
    }

    peer.actor.pos.lerp(peer.targetPos, 0.28);
    peer.actor.yaw = turnTo(peer.actor.yaw, peer.targetYaw, dt * 12);
    if (peer.targetAnim && peer.actor.curAnim !== peer.targetAnim) {
      peer.actor.play(peer.targetAnim, { ts: 1.0, fade: 0.1 });
    }
    peer.actor.update(dt);
    ground(peer.actor);

    // ── Keep name tag facing camera ───────────────────────────
    if (peer.sprite && camera) {
      peer.sprite.quaternion.copy(camera.quaternion);
    }

    // ── Rim light pulse on damage ─────────────────────────────
    if (peer.rimLight) {
      const hpRatio = peer.hp / (peer.maxHp || 100);
      peer.rimLight.intensity = 0.8 + Math.sin(performance.now() * 0.003) * 0.3;
      if (hpRatio < 0.3) peer.rimLight.color.setHex(0xff3300);
    }
  }

  // ── Send local player state at 25 Hz ─────────────────────
  if (P && G.phase === 'play') {
    const curAnim = P.curAnim || (P.state === 'attack' ? 'Sword_Attack' : P.state === 'dodge' ? 'Dodge' : 'Idle_Loop');
    NET.sendState(P.pos, P.yaw, curAnim, P.hp);
  }

  // ── HOST: broadcast enemy state at 10 Hz for co-op sync ──
  if (NET.isHost && NET.isCoop && G.phase === 'play') {
    const now = performance.now();
    if (!NET._lastEnemySync || now - NET._lastEnemySync > 100) {
      NET._lastEnemySync = now;
      const snap = G.enemies
        .filter(e => e.alive)
        .slice(0, 32)
        .map((e, i) => ({ i, hp: Math.round(e.hp), px: +e.pos.x.toFixed(1), pz: +e.pos.z.toFixed(1), alive: e.alive }));
      if (snap.length) NET.sendSyncEnemies(snap);
    }
  }

  updateMultiplayerHud();
}`);

// ============================================================
// 4. GAME.JS — peer_state handler: detect peer death
// ============================================================
patch(GAME_JS, 'peer_state handler — detect peer death event',
`  NET.on('peer_state', msg => {
    let p = REMOTE_PEERS.get(msg.senderId);
    if (!p) {
      const playerInfo = NET.room ? NET.room.players.find(x => x.id === msg.senderId) : null;
      spawnRemotePeer({
        id: msg.senderId,
        name: playerInfo ? playerInfo.name : 'Warrior',
        hero: playerInfo ? playerInfo.hero : 'david'
      });
      p = REMOTE_PEERS.get(msg.senderId);
    }
    if (p) {
      p.targetPos.set(msg.pos[0], msg.pos[1], msg.pos[2]);
      p.targetYaw = msg.yaw;
      p.targetAnim = msg.anim;
      p.hp = msg.hp;
    }
  });`,
`  NET.on('peer_state', msg => {
    let p = REMOTE_PEERS.get(msg.senderId);
    if (!p) {
      const playerInfo = NET.room ? NET.room.players.find(x => x.id === msg.senderId) : null;
      spawnRemotePeer({
        id: msg.senderId,
        name: playerInfo ? playerInfo.name : 'Warrior',
        hero: playerInfo ? playerInfo.hero : 'david'
      });
      p = REMOTE_PEERS.get(msg.senderId);
    }
    if (p) {
      const wasAlive = !p.dead;
      p.targetPos.set(msg.pos[0], msg.pos[1], msg.pos[2]);
      p.targetYaw = msg.yaw;
      p.targetAnim = msg.anim;
      const prevHp = p.hp;
      p.hp = msg.hp;
      // Detect peer just died
      if (wasAlive && p.hp <= 0 && prevHp > 0) {
        p.dead = true;
        p.deathT = 0;
        p.actor && p.actor.play('Death01', { loop: false, ts: 0.8, restart: true });
        SFX.boneCrunch && SFX.boneCrunch();
        shake(0.3);
        toast(\`\${p.name.toUpperCase()} HAS FALLEN! HOLD THE LINE!\`, 4000);
      }
    }
  });`);

// ============================================================
// 5. GAME.JS — enemy_hit handler: apply damage to local enemy
// ============================================================
patch(GAME_JS, 'NET.on enemy_hit — co-op enemy sync',
`  NET.on('chat', msg => {
    toast(\`<b>\${msg.name}:</b> \${msg.text}\`, 3500);
  });`,
`  NET.on('enemy_hit', msg => {
    if (!NET.isCoop) return;
    const e = G.enemies[msg.enemyIdx];
    if (!e || !e.alive) return;
    e.hp = Math.max(0, e.hp - msg.dmg);
    // Visual feedback for ally's hit
    const hitDir = msg.dir ? new THREE.Vector3(...msg.dir) : new THREE.Vector3(0,0,1);
    sparks(e.pos.clone().setY(e.pos.y + 1.2), 6, 0.7, hitDir);
    if (e.hp <= 0) {
      killEnemy(e);
    }
  });

  NET.on('sync_enemies', msg => {
    if (NET.isHost || !NET.isCoop) return; // only non-host syncs
    for (const snap of msg.enemies) {
      const e = G.enemies[snap.i];
      if (!e) continue;
      if (!snap.alive && e.alive) { killEnemy(e); continue; }
      if (e.alive) e.hp = snap.hp;
    }
  });

  NET.on('peer_spirit', msg => {
    // Render remote player's Kinnor spirit summon as a golden pulse
    if (!msg.pos) return;
    const pos = new THREE.Vector3(...msg.pos);
    bloomPulse(1.4, 0.6);
    flashAt(pos, 3.0, 0.5, 0xffd36a);
    puff(pos.clone().setY(pos.y + 0.5), 1.8, 0.6, new THREE.Vector3(0, 2.4, 0));
    SFX.shofar && SFX.shofar();
    const peer = REMOTE_PEERS.get(msg.senderId);
    if (peer) toast(\`\${peer.name.toUpperCase()} CALLS ON THE SPIRIT OF THE LORD!\`, 3200);
  });

  NET.on('coop_victory', msg => {
    if (G.phase !== 'play') return;
    toast('🏆 COVENANT VICTORY — ALL WARRIORS STAND!', 5000);
    SFX.win && SFX.win();
    bloomPulse(2.5, 1.5);
    setTimeout(() => { G.phase = 'win'; show('win', true); }, 2200);
  });

  NET.on('coop_defeat', msg => {
    if (G.phase !== 'play') return;
    toast('⚔ THE HOST HAS FALLEN — THE BATTLE IS LOST!', 5000);
    SFX.lose && SFX.lose();
    setTimeout(() => { show('menu', true); show('hud', false); NET.leaveRoom(); clearRemotePeers(); }, 4000);
  });

  NET.on('chat', msg => {
    toast(\`<b>\${msg.name}:</b> \${msg.text}\`, 3500);
  });`);

// ============================================================
// 6. GAME.JS — handleMultiplayerMelee: broadcast enemy hits
// ============================================================
patch(GAME_JS, 'handleMultiplayerMelee — broadcast enemy hit to room',
`function handleMultiplayerMelee(strong) {
  const st = STATS();
  const dir = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).normalize();
  NET.sendAttack('staff', dir);`,
`function handleMultiplayerMelee(strong) {
  const st = STATS();
  const dir = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).normalize();
  NET.sendAttack('staff', dir);

  // ── Co-op: broadcast enemy hits so allies see the same damage ──
  if (NET.isCoop) {
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e || !e.alive) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z;
      const d = Math.hypot(dx, dz);
      if (d <= 2.8 && Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) <= 1.4) {
        const dmg = st.staff * (strong ? 1.5 : 1) * (0.9 + Math.random() * 0.2);
        const hitDir = new THREE.Vector3(dx, 0, dz).normalize();
        NET.sendHitEnemy(i, Math.round(dmg), hitDir);
        break; // one hit per swing in co-op
      }
    }
  }`);

// ============================================================
// 7. GAME.JS — startMultiplayerMatch: host broadcasts victory
//    and defeat when local player dies or wins
// ============================================================
patch(GAME_JS, 'startMultiplayerMatch coop — add win/loss host authority',
`    startLevel();
    toast('BROTHERS IN ARMS: FIGHT SIDE-BY-SIDE!', 4200);
    SFX.horn();
  }
}`,
`    startLevel();
    toast('BROTHERS IN ARMS: FIGHT SIDE-BY-SIDE!', 4200);
    SFX.horn();

    // ── Host watches for game-over and broadcasts to room ────
    if (NET.isHost) {
      NET._coopWatcher = setInterval(() => {
        if (!NET.isCoop || !NET.isMultiplayer) { clearInterval(NET._coopWatcher); return; }
        if (G.phase === 'win') {
          NET.send({ type: 'coop_victory' });
          clearInterval(NET._coopWatcher);
        } else if (G.phase === 'dead' || (P && P.hp <= 0 && G.phase === 'play')) {
          NET.send({ type: 'coop_defeat' });
          clearInterval(NET._coopWatcher);
        }
      }, 500);
    }
  }
}`);

// ============================================================
// 8. GAME.JS — Keyboard shortcut for co-op chat (T key)
// ============================================================
patch(GAME_JS, 'Chat hotkey T — co-op quick chat',
`// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);`,
`// ── Co-op quick chat shortcut ────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'KeyT' && NET.isMultiplayer && G.phase === 'play') {
    e.preventDefault();
    const msg = prompt('Send to allies (or cancel):');
    if (msg && msg.trim()) NET.sendChat(msg.trim());
  }
});

// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);`);

// ============================================================
// 9. NET.JS — Add coop_victory / coop_defeat / hit_enemy 
//    routing in handleMessage
// ============================================================
let netRaw = fs.readFileSync(NET_JS, 'utf8');
let netSrc = norm(netRaw);

const netSearch = norm(`      case 'chat':
        this.emit('chat', msg);
        break;
    }
  }`);

const netReplace = norm(`      case 'chat':
        this.emit('chat', msg);
        break;

      case 'hit_enemy':
        this.emit('enemy_hit', msg);
        break;

      case 'sync_enemies':
        this.emit('sync_enemies', msg);
        break;

      case 'coop_victory':
        this.emit('coop_victory', msg);
        break;

      case 'coop_defeat':
        this.emit('coop_defeat', msg);
        break;
    }
  }`);

if (netSrc.includes(netSearch)) {
  fs.writeFileSync(NET_JS, netSrc.replace(netSearch, netReplace), 'utf8');
  console.log('✓ net.js — enemy_hit, sync_enemies, coop_victory, coop_defeat message routing');
} else {
  console.error('✗ PATCH TARGET NOT FOUND [net.js message routing]');
  errors++;
}

// ============================================================
// 10. STYLE.CSS — Co-op HUD enhancements + peer name tags
// ============================================================
const CSS_PATCH = `
/* ── Co-op Peer HUD Enhancements ─────────────────────────── */
#mp-hud-roster {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  gap: 10px;
  z-index: 400;
  pointer-events: none;
}
.mp-hud-p {
  background: rgba(10,6,2,0.78);
  border: 1px solid rgba(220,170,80,0.35);
  border-radius: 8px;
  padding: 5px 11px 6px;
  min-width: 110px;
  text-align: center;
  backdrop-filter: blur(4px);
}
.mp-hud-p-name {
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #ffd36a;
  margin-bottom: 4px;
  text-shadow: 0 1px 4px #000;
}
.mp-hud-p-bar {
  height: 7px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}
.mp-hud-p-fill {
  height: 100%;
  background: linear-gradient(90deg, #5adf8a, #2cc966);
  border-radius: 4px;
  transition: width 0.22s ease;
}
.mp-hud-p-fill.low {
  background: linear-gradient(90deg, #ff6b35, #cc2200);
  animation: hud-pulse 0.7s infinite alternate;
}
@keyframes hud-pulse { from { opacity: 1; } to { opacity: 0.6; } }

/* ── Room browser polish ──────────────────────────────────── */
.mp-room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255,211,106,0.07);
  border: 1px solid rgba(220,170,80,0.2);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.18s;
}
.mp-room-item:hover { background: rgba(255,211,106,0.14); }
.mp-room-code-tag {
  font-size: 15px;
  font-weight: bold;
  color: #ffd36a;
  letter-spacing: 0.15em;
  margin-right: 8px;
}
.mp-room-details { font-size: 12px; color: #c8b98a; }

/* ── Peer player row in lobby ─────────────────────────────── */
.mp-player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 7px;
  margin-bottom: 6px;
  background: rgba(255,211,106,0.05);
  border: 1px solid rgba(255,211,106,0.12);
}
.mp-player-row.is-me { border-color: rgba(255,211,106,0.45); background: rgba(255,211,106,0.1); }
.mp-p-name { font-size: 14px; font-weight: bold; color: #f3e2c0; margin-right: 8px; }
.mp-p-hero { font-size: 11px; color: #a09070; text-transform: uppercase; letter-spacing: 0.1em; }
.mp-p-badge { font-size: 10px; padding: 2px 7px; border-radius: 4px; margin-left: 6px; font-weight: bold; letter-spacing: 0.08em; }
.mp-badge-host { background: #ffd36a; color: #1a120b; }
.mp-badge-ready { background: #2cc966; color: #0a1a0e; }
`;

let cssRaw = fs.readFileSync(STYLE_CSS, 'utf8');
if (!cssRaw.includes('mp-hud-p-fill.low')) {
  fs.writeFileSync(STYLE_CSS, cssRaw + CSS_PATCH, 'utf8');
  console.log('✓ style.css — Co-op HUD polish + peer rows + room browser');
} else {
  console.log('✓ style.css — Co-op HUD already present, skipping CSS');
}

// ============================================================
// SUMMARY
// ============================================================
if (errors === 0) {
  console.log('\n🎉 Pillar 3 — Co-Op Crusade upgrade complete!');
  console.log('   • Floating name tag billboards above remote heroes');
  console.log('   • Per-team rim lights (cyan/green/purple/orange)');
  console.log('   • Peer death detection → ghost tint → auto-resurrect (8s)');
  console.log('   • Enemy hit broadcast (sendHitEnemy) in co-op melee');
  console.log('   • Enemy kill sync via sync_enemies (host authority at 10Hz)');
  console.log('   • Spirit summon broadcast (peer_spirit → golden pulse)');
  console.log('   • Co-op victory/defeat events (host broadcasts to all)');
  console.log('   • Quick chat shortcut (T key during co-op)');
  console.log('   • net.js: routes enemy_hit, sync_enemies, coop_victory/defeat');
  console.log('   • style.css: polished co-op HUD, lobby rows, room browser');
} else {
  console.error(`\n✗ ${errors} patch(es) failed — check targets above.`);
  process.exit(1);
}
