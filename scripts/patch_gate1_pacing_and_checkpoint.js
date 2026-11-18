// ============================================================
// ELAH WARRIOR — Gate 1, Step 5: Chapter 1 Pacing & Instant Boss Checkpoint
// ============================================================
// 1. Wave 1 Pacing: Advance scout spawns closer so player gets action within 15 seconds.
// 2. Boss Checkpoint: When retrying after death against Goliath, skips dialog cards
//    and drops straight into the duel with combat ready.
// 3. Level 1 Victory Flow: Direct prominent route to the Cave of Adullam Sanctum.
// ============================================================

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Wave 1 Pacing: Immediate engagement ──────────────────
const waveTarget = norm(`const WAVES = [
  { name: 'WAVE 1 · THE PHILISTINES COME DOWN', list: [['phil', -6, -32], ['phil', 0, -34], ['phil', 6, -32]] },
  { name: 'WAVE 2 · THEIR CAPTAIN JOINS', list: [['phil', -12, -30], ['phil', 12, -30], ['captain', 0, -35], ['phil', -36, -4], ['phil', 36, -2]] },
  { name: 'WAVE 3 · THE HOST OF GATH', list: [['phil', -8, -32], ['phil', 8, -32], ['captain', -16, -34], ['captain', 16, -34], ['phil', -36, 4], ['phil', 36, 6], ['phil', 0, -40], ['phil', -36, -10]] },
];`);

const waveRepl = norm(`const WAVES = [
  { name: 'WAVE 1 · PHILISTINE ADVANCE SCOUTS', list: [['phil', -3, -12], ['phil', 3, -14], ['phil', 0, -20]] },
  { name: 'WAVE 2 · THE VANGUARD & CAPTAIN', list: [['phil', -8, -24], ['phil', 8, -24], ['captain', 0, -28], ['phil', -20, -10], ['phil', 20, -10]] },
  { name: 'WAVE 3 · THE HOST OF GATH', list: [['phil', -8, -30], ['phil', 8, -30], ['captain', -14, -32], ['captain', 14, -32], ['phil', -26, 2], ['phil', 26, 4], ['phil', 0, -36]] },
];`);

let src = norm(raw);
if (src.includes(waveTarget)) {
  src = src.replace(waveTarget, waveRepl);
  console.log('✓ Wave 1 pacing tightened for immediate action');
} else {
  console.log('- Wave target not matched');
}

// ── 2. Boss Checkpoint: Instant retry without re-reading cards ──
const bossFightTarget = norm(`async function bossFight() {
  speakVoice('Am I a dog, that thou comest to me with staves? Come to me, and I will give thy flesh unto the fowls of the air!', 'boss');
  G.resumeWave = 3; G.phase = 'cine'; G.seq = 2; $('wave').textContent = 'THE CHAMPION OF GATH'; document.body.classList.add('cine');
  P.state = 'cine'; P.pos.set(0, 0, 8); ground(P); P.yaw = Math.PI;
  const b = spawnGoliath(); LOG('boss_start');
  G.cine = { follow: b, off: new THREE.Vector3(3.8, 2.2, 6.5), lookUp: 3.6 };
  SFX.roar();
  await until(() => b.pos.z >= -14);
  b.play('Idle_Talking_Loop');
  await card({ who: 'GOLIATH OF GATH', verse: '“I defy the armies of Israel this day; give me a man, that we may fight together.”', ref: '1 SAMUEL 17:10 (KJV)', btn: 'ANSWER HIM' });
  G.cine = { pos: new THREE.Vector3(P.pos.x + 1.8, P.pos.y + 1.7, P.pos.z - 2.6), look: P.pos.clone().setY(P.pos.y + 1.5), snap: true };
  P.yaw = 0; P.play('Idle_Talking_Loop');
  await card({ who: 'DAVID', verse: '“Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts…”', ref: '1 SAMUEL 17:45 (KJV)', tips: '<b>Moses:</b> His armour turns the staff. <b>Dodge</b> his slam and his charge. When he stumbles, a glow marks his forehead: <b>sling it</b>.', btn: 'FIGHT' });
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; b.state = 'stalk'; b.st = 0;
  $('boss-wrap').classList.remove('hidden'); $('wave').textContent = 'SEQUENCE 2 OF 4 · GOLIATH'; G.phase = 'play'; seqBanner(2);
}`);

const bossFightRepl = norm(`async function bossFight(isRetry = false) {
  G.resumeWave = 3;
  P.pos.set(0, 0, 8); ground(P); P.yaw = Math.PI;

  // On death retry: jump straight into combat without repeating dialogue cards
  if (isRetry || G.bossRetrying) {
    G.bossRetrying = false;
    G.phase = 'play';
    G.cine = null;
    document.body.classList.remove('cine');
    P.state = 'idle';
    const b = spawnGoliath();
    b.pos.set(0, 0, -14); ground(b);
    b.state = 'stalk'; b.st = 0;
    $('boss-wrap').classList.remove('hidden');
    $('wave').textContent = 'SEQUENCE 2 OF 4 · GOLIATH (CHECKPOINT)';
    SFX.shofar && SFX.shofar();
    toast('CHECKPOINT · GOLIATH OF GATH', 2500);
    return;
  }

  speakVoice('Am I a dog, that thou comest to me with staves? Come to me, and I will give thy flesh unto the fowls of the air!', 'boss');
  G.phase = 'cine'; G.seq = 2; $('wave').textContent = 'THE CHAMPION OF GATH'; document.body.classList.add('cine');
  P.state = 'cine';
  const b = spawnGoliath(); LOG('boss_start');
  G.cine = { follow: b, off: new THREE.Vector3(3.8, 2.2, 6.5), lookUp: 3.6 };
  SFX.roar();
  await until(() => b.pos.z >= -14);
  b.play('Idle_Talking_Loop');
  await card({ who: 'GOLIATH OF GATH', verse: '“I defy the armies of Israel this day; give me a man, that we may fight together.”', ref: '1 SAMUEL 17:10 (KJV)', btn: 'ANSWER HIM' });
  G.cine = { pos: new THREE.Vector3(P.pos.x + 1.8, P.pos.y + 1.7, P.pos.z - 2.6), look: P.pos.clone().setY(P.pos.y + 1.5), snap: true };
  P.yaw = 0; P.play('Idle_Talking_Loop');
  await card({ who: 'DAVID', verse: '“Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts…”', ref: '1 SAMUEL 17:45 (KJV)', tips: '<b>Moses:</b> His armour turns the staff. <b>Dodge</b> his slam and his charge. When he stumbles, a glow marks his forehead: <b>sling it</b>.', btn: 'FIGHT' });
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; b.state = 'stalk'; b.st = 0;
  $('boss-wrap').classList.remove('hidden'); $('wave').textContent = 'SEQUENCE 2 OF 4 · GOLIATH'; G.phase = 'play'; seqBanner(2);
}`);

if (src.includes(bossFightTarget)) {
  src = src.replace(bossFightTarget, bossFightRepl);
  console.log('✓ bossFight upgraded with instant-action checkpoint retry');
} else {
  console.log('- bossFight target not matched');
}

// ── 3. Wire retry button to flag bossRetrying ────────────────
const retryTarget = norm("else if (LEVEL === 3) { if (G.resumeWave >= 4) chaseToHobah(); else kingFight(); } else bossFight();");
const retryRepl = norm("else if (LEVEL === 3) { if (G.resumeWave >= 4) chaseToHobah(); else kingFight(); } else { G.bossRetrying = true; bossFight(true); }");

if (src.includes(retryTarget)) {
  src = src.replace(retryTarget, retryRepl);
  console.log('✓ btn-retry calls instant bossFight checkpoint');
}

// ── 4. Level 1 win screen highlights Cave of Adullam ─────────
const winLevel1Target = norm(`  if (LEVEL === 1 && WILD) { const cv = WILD.cave; P.state = 'cine'; G.cine = { pos: new THREE.Vector3(cv.x + 2.5, cv.y + 2.2, cv.z + 9), look: new THREE.Vector3(cv.x, cv.y + 1.6, cv.z) }; }`);

const winLevel1Repl = norm(`  if (LEVEL === 1 && WILD) {
    const cv = WILD.cave; P.state = 'cine'; G.cine = { pos: new THREE.Vector3(cv.x + 2.5, cv.y + 2.2, cv.z + 9), look: new THREE.Vector3(cv.x, cv.y + 1.6, cv.z) };
    const bAdullam = $('btn-win-adullam');
    if (bAdullam) {
      bAdullam.classList.remove('ghost');
      bAdullam.classList.add('gold');
      bAdullam.textContent = '🏛️ ENTER CAVE OF ADULLAM';
    }
  }`);

if (src.includes(winLevel1Target)) {
  src = src.replace(winLevel1Target, winLevel1Repl);
  console.log('✓ Level 1 win screen promotes Cave of Adullam journey');
}

fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done!');
