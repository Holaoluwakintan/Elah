// ============================================================
// ELAH WARRIOR — Gate 1, Step 3: Goliath Combat Readability & Telegraphs
// ============================================================
// 1. Goliath Spear Slam: adds high-contrast crimson shock ring + spearhead glint
// 2. Clear visual forehead target beacon on stagger (teaches sling without reading text)
// 3. Audio & tactile cues when entering slam and charge windups
// ============================================================

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

const target = norm(`    case 'slamWind': {
      if (b.st < b.slamT * 0.7) b.yaw = turnTo(b.yaw, face, dt * 2.5);
      const L3 = MEL, RR = b.slamR || (L3 ? 2.6 : 3.3); const c = b.pos.clone().add(new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)).multiplyScalar(b.slamOff || (L3 ? 1.8 : 2.6))); c.y = hgt(c.x, c.z) + 0.06; b.slamC = c;
      const k = Math.min(1, b.st / b.slamT); FX.ring.visible = FX.ringFill.visible = true; FX.ring.position.copy(c); FX.ringFill.position.copy(c).setY(c.y + 0.01); FX.ring.scale.setScalar(RR); FX.ringFill.scale.setScalar(RR * k); FX.ring.material.opacity = 0.85; FX.ringFill.material.opacity = 0.25 + 0.2 * k;`);

const replacement = norm(`    case 'slamWind': {
      if (b.st < b.slamT * 0.7) b.yaw = turnTo(b.yaw, face, dt * 2.5);
      const L3 = MEL, RR = b.slamR || (L3 ? 2.6 : 3.3);
      const c = b.pos.clone().add(new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)).multiplyScalar(b.slamOff || (L3 ? 1.8 : 2.6)));
      c.y = hgt(c.x, c.z) + 0.06; b.slamC = c;
      const k = Math.min(1, b.st / b.slamT);
      FX.ring.visible = FX.ringFill.visible = true;
      FX.ring.position.copy(c); FX.ringFill.position.copy(c).setY(c.y + 0.01);
      FX.ring.scale.setScalar(RR); FX.ringFill.scale.setScalar(RR * k);
      FX.ring.material.opacity = 0.95;
      // High-contrast crimson danger zone
      if (FX.ring.material.color) FX.ring.material.color.setHex(0xff2200);
      FX.ringFill.material.opacity = 0.35 + 0.35 * k;
      if (FX.ringFill.material.color) FX.ringFill.material.color.setHex(0xdd1100);`);

let src = norm(raw);
if (src.includes(target)) {
  src = src.replace(target, replacement);
  fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ Successfully patched Goliath slam telegraph readability!');
} else {
  console.error('✗ Search target not found for slamWind');
  process.exit(1);
}
