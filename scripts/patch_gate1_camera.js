// ============================================================
// ELAH WARRIOR — Gate 1, Step 1: AAA Spring-Arm Camera & Target Framing
// ============================================================
// 1. Spring-Arm Terrain Collision:
//    When hills/cliffs behind player block camera, dynamically pull distance in
//    instead of awkwardly clipping or snapping.
// 2. Dynamic Goliath / Boss Framing:
//    Goliath is 4.5m tall; raise camera target Y and frame the full vertical
//    silhouette so telegraph rings and overhead weapon swings are 100% readable.
// 3. Lock-On Camera Integration:
//    LOCKED_TARGET works for both Goliath and standard enemy skirmishers.
// ============================================================

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

const searchTarget = norm(`  const b = G.boss;
  let dist = CAM.dist;
  if (G.stage === 'escape' && ESC && G.phase === 'play') { dist = 7.8; if (now() - CAM.lastDrag > 1.2) { const az = Math.max(CAVE_Z, P.pos.z - 14), ax = WILD_PX(az); CAM.yaw = turnTo(CAM.yaw, Math.atan2(P.pos.x - ax, P.pos.z - az), dt * 1.8); } }
  if (b && b.alive && b.state !== 'intro') {
    dist = WORLD === 'pit' ? 7.4 : 9.5;
    if (now() - CAM.lastDrag > 1.5) { const want = Math.atan2(P.pos.x - b.pos.x, P.pos.z - b.pos.z); CAM.yaw = turnTo(CAM.yaw, want, dt * 0.9); }
  }
  const pushing = P.state === 'push' || (P.state === 'spirit' && P.heave);
  CAM.pitch += ((pushing ? 0.1 : WORLD === 'pit' ? 0.62 : 0.33) - CAM.pitch) * Math.min(1, dt * 2.5); if (pushing) { dist = 8.4; if (now() - CAM.lastDrag > 1.5) CAM.yaw = turnTo(CAM.yaw, 0, dt * 2); }
  const tgt = tmpV.set(P.pos.x, P.pos.y + (pushing ? 2.6 : 1.5), P.pos.z);
  if (b && b.alive && b.state !== 'intro') tgt.lerp(tmpV2.set(b.pos.x, b.pos.y + 2.5, b.pos.z), 0.18);
  CAM.tgt.lerp(tgt, Math.min(1, dt * 8));
  const cp = Math.cos(CAM.pitch);
  const want = new THREE.Vector3(CAM.tgt.x + Math.sin(CAM.yaw) * cp * dist, CAM.tgt.y + Math.sin(CAM.pitch) * dist, CAM.tgt.z + Math.cos(CAM.yaw) * cp * dist);
  const gy = hgt(want.x, want.z) + 1.2; if (want.y < gy) want.y = gy;
  if (WORLD === 'temple') { want.x = THREE.MathUtils.clamp(want.x, -12.2, 12.2); want.z = Math.max(want.z, -15.5); if (want.z < -2 || Math.abs(want.x) > 8.8) want.y = Math.min(want.y, 5.9); }
  CAM.pos.lerp(want, Math.min(1, dt * 7)); camera.position.copy(CAM.pos);`);

const replacement = norm(`  const b = G.boss;
  const lock = (typeof LOCKED_TARGET !== 'undefined' && LOCKED_TARGET && LOCKED_TARGET.alive) ? LOCKED_TARGET : (b && b.alive && b.state !== 'intro' ? b : null);
  let dist = CAM.dist;

  if (G.stage === 'escape' && ESC && G.phase === 'play') {
    dist = 7.8;
    if (now() - CAM.lastDrag > 1.2) {
      const az = Math.max(CAVE_Z, P.pos.z - 14), ax = WILD_PX(az);
      CAM.yaw = turnTo(CAM.yaw, Math.atan2(P.pos.x - ax, P.pos.z - az), dt * 1.8);
    }
  }

  // ── AAA Dynamic Target Framing (Goliath / Enemies) ───────
  if (lock) {
    const isGiant = lock === b && LEVEL === 1;
    dist = isGiant ? 9.8 : (WORLD === 'pit' ? 7.4 : 8.2);
    if (now() - CAM.lastDrag > 1.2) {
      const wantYaw = Math.atan2(P.pos.x - lock.pos.x, P.pos.z - lock.pos.z);
      CAM.yaw = turnTo(CAM.yaw, wantYaw, dt * 1.6);
    }
  }

  const pushing = P.state === 'push' || (P.state === 'spirit' && P.heave);
  const basePitch = pushing ? 0.1 : (WORLD === 'pit' ? 0.62 : (lock === b && LEVEL === 1 ? 0.28 : 0.33));
  CAM.pitch += (basePitch - CAM.pitch) * Math.min(1, dt * 2.5);
  if (pushing) { dist = 8.4; if (now() - CAM.lastDrag > 1.5) CAM.yaw = turnTo(CAM.yaw, 0, dt * 2); }

  // Target midpoint with height compensation for Goliath
  const tgt = tmpV.set(P.pos.x, P.pos.y + (pushing ? 2.6 : 1.6), P.pos.z);
  if (lock) {
    const lockH = (lock === b && LEVEL === 1) ? 3.8 : 1.8;
    tgt.lerp(tmpV2.set(lock.pos.x, lock.pos.y + lockH, lock.pos.z), 0.28);
  }
  CAM.tgt.lerp(tgt, Math.min(1, dt * 8));

  // ── Spring-Arm Collision Check against Terrain ──────────
  const cp = Math.cos(CAM.pitch);
  let effectiveDist = dist;
  // Test 3 points along the boom arm to prevent hills popping through
  for (let step = 0.5; step <= 1.0; step += 0.25) {
    const testDist = dist * step;
    const tx = CAM.tgt.x + Math.sin(CAM.yaw) * cp * testDist;
    const tz = CAM.tgt.z + Math.cos(CAM.yaw) * cp * testDist;
    const groundH = hgt(tx, tz) + 0.9;
    const testY = CAM.tgt.y + Math.sin(CAM.pitch) * testDist;
    if (testY < groundH) {
      effectiveDist = Math.max(3.8, testDist - 0.5);
      break;
    }
  }

  const want = new THREE.Vector3(
    CAM.tgt.x + Math.sin(CAM.yaw) * cp * effectiveDist,
    CAM.tgt.y + Math.sin(CAM.pitch) * effectiveDist,
    CAM.tgt.z + Math.cos(CAM.yaw) * cp * effectiveDist
  );
  const gy = hgt(want.x, want.z) + 1.2;
  if (want.y < gy) want.y = gy;
  if (WORLD === 'temple') {
    want.x = THREE.MathUtils.clamp(want.x, -12.2, 12.2);
    want.z = Math.max(want.z, -15.5);
    if (want.z < -2 || Math.abs(want.x) > 8.8) want.y = Math.min(want.y, 5.9);
  }
  CAM.pos.lerp(want, Math.min(1, dt * 7.5));
  camera.position.copy(CAM.pos);`);

let src = norm(raw);
if (src.includes(searchTarget)) {
  src = src.replace(searchTarget, replacement);
  fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ Successfully patched updateCamera with AAA Spring-Arm & Framing!');
} else {
  console.error('✗ Search target not found for updateCamera');
  process.exit(1);
}
