// ============================================================
// ELAH WARRIOR — Option 1: Adullam Sanctum Forge-First Entry
// ============================================================
// When a player beats Level 1 and enters the Cave of Adullam
// for the first time, they are:
//  1. Given a cinematic pull-in toward the Anointing Stone altar.
//  2. Shown a "FORGE OF ISRAEL" scripture card (1 Kings 7:14).
//  3. Immediately dropped into the upgrade panel with one free
//     forge choice using their battle spoils.
//  4. After picking (or skipping), they resume free exploration.
// ============================================================

const fs = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

const GAME = path.join(__dirname, '..', 'js', 'game.js');
let src = norm(fs.readFileSync(GAME, 'utf8'));

// ── 1. Upgrade enterAdullam with first-visit forge cinematic ──
const target = norm(`async function enterAdullam() {
  audioInit();
  show('menu', false);
  show('title', false);
  show('paused', false);
  show('win', false);
  show('upgrade', false);
  show('card', false);

  LEVEL = 1;
  buildWorld('adullam');
  makeHero();
  P.pos.set(0, 0, 4);
  ground(P);
  P.yaw = Math.PI;

  G.phase = 'adullam';
  $('hud').classList.remove('hidden');
  $('boss-wrap').classList.add('hidden');
  $('wave').textContent = 'SANCTUM · CAVE OF ADULLAM (1 SAMUEL 22:1)';
  updateRelicHUD && updateRelicHUD();
}`);

const repl = norm(`async function enterAdullam(fromWin = false) {
  audioInit();
  show('menu', false);
  show('title', false);
  show('paused', false);
  show('win', false);
  show('upgrade', false);
  show('card', false);

  LEVEL = 1;
  buildWorld('adullam');
  makeHero();
  P.pos.set(0, 0, 4);
  ground(P);
  P.yaw = Math.PI;

  G.phase = 'adullam';
  $('hud').classList.remove('hidden');
  $('boss-wrap').classList.add('hidden');
  $('wave').textContent = 'SANCTUM · CAVE OF ADULLAM (1 SAMUEL 22:1)';
  updateRelicHUD && updateRelicHUD();

  // ── First-visit: cinematic pull to the Anointing Stone + Forge card ──
  const isFirstVisit = !SAVE.done || !SAVE.done['adullam_forge'];
  if (fromWin || isFirstVisit) {
    // Mark as visited
    if (SAVE.done) SAVE.done['adullam_forge'] = true;
    writeSave();

    // Brief pause for scene to settle, then cinematic pan to altar
    await new Promise(r => setTimeout(r, 900));
    P.state = 'cine';
    // Altar is at (0, 0, -9.5) — pull camera from behind player toward it
    G.cine = {
      pos: new THREE.Vector3(0, 2.8, -4.0),
      look: new THREE.Vector3(0, 1.1, -9.5),
      snap: false
    };

    // Scripture card — The Forge of Israel
    await card({
      who: 'THE FORGE OF ISRAEL',
      verse: '"And David took the gold that was brought to him… and brought it to Jerusalem. And Hiram was full of wisdom and understanding and cunning to work all works in brass. And he came to king Solomon, and wrought all his work."',
      ref: '1 Kings 7:13–14 (KJV)',
      text: 'The Anointing Stone holds the spoils of Elah. Spend your coins and armour shards to forge bronze armour, strengthen your sling, and temper your staff. Each upgrade carries into every battle.',
      btn: '⚒️ FORGE YOUR WEAPONS'
    });

    // Clear cinematic, let player roam
    G.cine = null;
    P.state = 'idle';
    P.pos.set(0, 0, 4);
    ground(P);
    P.yaw = Math.PI;

    // Open upgrade panel positioned at the Anointing Stone
    await upgradePanel('RETURN TO CAVE');

    // After forging, play a short Shofar triumph and resume sanctum
    SFX.shofar && SFX.shofar();
    toast('⚒️ WEAPONS FORGED · Explore the Cave of Adullam', 3000);
  }
}`);

if (src.includes(target)) {
  src = src.replace(target, repl);
  console.log('✓ enterAdullam upgraded with Forge-First cinematic flow');
} else {
  console.log('✗ enterAdullam target NOT FOUND — checking for partial match...');
  // Check if already patched
  if (src.includes('fromWin = false')) {
    console.log('  (Already patched — skipping)');
  } else {
    console.log('  MANUAL REVIEW REQUIRED');
    process.exit(1);
  }
}

// ── 2. Wire btn-win-adullam to pass fromWin=true ──────────────
const winBtnTarget = norm(`if ($('btn-win-adullam')) $('btn-win-adullam').onclick = enterAdullam;`);
const winBtnRepl   = norm(`if ($('btn-win-adullam')) $('btn-win-adullam').onclick = () => enterAdullam(true);`);

if (src.includes(winBtnTarget)) {
  src = src.replace(winBtnTarget, winBtnRepl);
  console.log('✓ btn-win-adullam passes fromWin=true for Forge-First flow');
} else if (src.includes('enterAdullam(true)')) {
  console.log('  (btn-win-adullam already patched — skipping)');
} else {
  console.log('✗ btn-win-adullam handler not found — manual review needed');
}

// ── Write back ────────────────────────────────────────────────
fs.writeFileSync(GAME, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done!');
