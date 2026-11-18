// ============================================================
// ELAH WARRIOR — Gate 1, Step 2: Responsive Input Buffering & Parry/Execute Integration
// ============================================================
// 1. Hooks take('parry') and take('execute') in updatePlayer() so Parry and Executions work.
// 2. Adds responsive input buffering (350ms window) across attack, dodge, and parry recoveries.
// ============================================================

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

const searchBlock = norm(`  switch (p.state) {
    case 'idle': case 'move': {
      if (G.stage === 'escape' && ESC) { escapeControl(p, iv, dt, canAct); break; }
      if (canAct && take('dodge')) { startDodge(iv); break; }
      if (canAct && take('attack')) { startAttack(); break; }
      if (canAct && take('sling')) {
        if (G.spirit >= 100 && trySpirit()) break;
        if (LEVEL === 2 && G.fin && !G.fin.collapsing && pushHeld() && nearSpot()) { startPush(); break; }
        if (LEVEL !== 2 && p.slingCd <= 0) { startSling(); break; }
      }
      const sp = (iv.m > 0.7 ? 6.0 : 2.4 + 3.6 * iv.m) * (p._rage ? 1.4 : 1);
      if (iv.m > 0) { p.pos.x += iv.x * sp * dt; p.pos.z += iv.z * sp * dt; p.yaw = turnTo(p.yaw, Math.atan2(iv.x, iv.z), dt * 12); p.play(iv.m > 0.7 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { ts: iv.m > 0.7 ? 1.05 : 0.8 + iv.m * 0.6 }); p.state = 'move'; }
      else { p.play('Idle_Loop'); p.state = 'idle'; }
      break;
    }
    case 'attack': {
      if (iv.m > 0) { p.pos.x += iv.x * 1.2 * dt; p.pos.z += iv.z * 1.2 * dt; }
      if (p.st < p.hitT) { p.pos.x += Math.sin(p.yaw) * 2.0 * dt; p.pos.z += Math.cos(p.yaw) * 2.0 * dt; }
      if (!p.hitDone && p.st >= p.hitT) { p.hitDone = true; staffHit(); }
      if (p.st > p.atkDur * 0.55) { if (take('dodge')) { startDodge(iv); break; } if (take('attack', 0.45)) { startAttack(); break; } }
      if (p.st >= p.atkDur) { p.state = 'idle'; p.combo = 0; }
      break;
    }
    case 'sling': {
      if (!p.released && p.st >= p.relT) { p.released = true; releaseStone(); }
      if (p.st > p.relT + 0.05 && take('dodge')) { startDodge(iv); break; }
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'dodge': {
      const k = p.st < 0.55 ? 1 : Math.max(0, 1 - (p.st - 0.55) * 4);
      p.pos.x += p.dodgeDir.x * 9.5 * k * dt; p.pos.z += p.dodgeDir.z * 9.5 * k * dt;
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'parry': {
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }`);

const replaceBlock = norm(`  switch (p.state) {
    case 'idle': case 'move': {
      if (G.stage === 'escape' && ESC) { escapeControl(p, iv, dt, canAct); break; }
      if (canAct && (take('execute') || (IN.q && IN.q.execute > 0))) {
        IN.q.execute = -9;
        if (typeof tryExecute === 'function' && tryExecute()) break;
      }
      if (canAct && take('parry', 0.35)) { startParry(); break; }
      if (canAct && take('dodge', 0.35)) { startDodge(iv); break; }
      if (canAct && take('attack', 0.35)) { startAttack(); break; }
      if (canAct && take('sling', 0.35)) {
        if (G.spirit >= 100 && trySpirit()) break;
        if (LEVEL === 2 && G.fin && !G.fin.collapsing && pushHeld() && nearSpot()) { startPush(); break; }
        if (LEVEL !== 2 && p.slingCd <= 0) { startSling(); break; }
      }
      const sp = (iv.m > 0.7 ? 6.0 : 2.4 + 3.6 * iv.m) * (p._rage ? 1.4 : 1);
      if (iv.m > 0) { p.pos.x += iv.x * sp * dt; p.pos.z += iv.z * sp * dt; p.yaw = turnTo(p.yaw, Math.atan2(iv.x, iv.z), dt * 12); p.play(iv.m > 0.7 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { ts: iv.m > 0.7 ? 1.05 : 0.8 + iv.m * 0.6 }); p.state = 'move'; }
      else { p.play('Idle_Loop'); p.state = 'idle'; }
      break;
    }
    case 'attack': {
      if (iv.m > 0) { p.pos.x += iv.x * 1.2 * dt; p.pos.z += iv.z * 1.2 * dt; }
      if (p.st < p.hitT) { p.pos.x += Math.sin(p.yaw) * 2.0 * dt; p.pos.z += Math.cos(p.yaw) * 2.0 * dt; }
      if (!p.hitDone && p.st >= p.hitT) { p.hitDone = true; staffHit(); }
      // Action cancellation / buffering during attack recovery
      if (p.st > p.atkDur * 0.52) {
        if (take('parry', 0.35)) { startParry(); break; }
        if (take('dodge', 0.35)) { startDodge(iv); break; }
        if (take('attack', 0.45)) { startAttack(); break; }
      }
      if (p.st >= p.atkDur) { p.state = 'idle'; p.combo = 0; }
      break;
    }
    case 'sling': {
      if (!p.released && p.st >= p.relT) { p.released = true; releaseStone(); }
      if (p.st > p.relT + 0.05 && take('dodge', 0.35)) { startDodge(iv); break; }
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'dodge': {
      const k = p.st < 0.55 ? 1 : Math.max(0, 1 - (p.st - 0.55) * 4);
      p.pos.x += p.dodgeDir.x * 9.5 * k * dt; p.pos.z += p.dodgeDir.z * 9.5 * k * dt;
      // Buffer attack or parry directly out of dodge recovery
      if (p.st >= p.atkDur * 0.7) {
        if (take('parry', 0.35)) { startParry(); break; }
        if (take('attack', 0.35)) { startAttack(); break; }
        if (take('sling', 0.35) && p.slingCd <= 0) { startSling(); break; }
      }
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'parry': {
      if (p.st >= p.atkDur * 0.6) {
        if (take('attack', 0.35)) { startAttack(); break; }
        if (take('dodge', 0.35)) { startDodge(iv); break; }
      }
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }`);

let src = norm(raw);
if (src.includes(searchBlock)) {
  src = src.replace(searchBlock, replaceBlock);
  fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ Successfully patched input buffering and parry/execute responsiveness!');
} else {
  console.error('✗ Search block for player state switch not found');
  process.exit(1);
}
