// ============================================================
// ELAH WARRIOR — Option 1 (GitHub Pages Path Fix) & Option 3 (Gamepad API)
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME_JS = path.join(ROOT, 'js', 'game.js');
const INDEX_HTML = path.join(ROOT, 'index.html');
const SW_JS = path.join(ROOT, 'sw.js');

let errors = 0;
function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Fix index.html serviceWorker path ────────────────────────
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
if (indexHtml.includes("navigator.serviceWorker.register('/sw.js')")) {
  indexHtml = indexHtml.replace(
    "navigator.serviceWorker.register('/sw.js')",
    "navigator.serviceWorker.register('./sw.js')"
  );
  fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');
  console.log('✓ index.html — service worker path updated to relative ./sw.js');
} else {
  console.log('index.html already has relative sw path');
}

// ── 2. Fix sw.js cache paths for GitHub Pages sub-path ──────────
const SW_CODE = `// ELAH WARRIOR Service Worker — offline caching (supports root and /Elah/ sub-path)
const CACHE = 'elah-v2';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './js/game.js',
  './js/net.js',
  './vendor/three.module.min.js',
  './manifest.webmanifest'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
`;
fs.writeFileSync(SW_JS, SW_CODE, 'utf8');
console.log('✓ sw.js — relative precache paths updated');

// ── 3. Add Gamepad Support to game.js ───────────────────────────
let gameRaw = fs.readFileSync(GAME_JS, 'utf8');
let gameSrc = norm(gameRaw);

// Hook GP.rumble into vibrate function
const vibTarget = norm("const vibrate = (ms) => { if (SETTINGS.vib && navigator.vibrate && !BOT) try { navigator.vibrate(ms); } catch (e) { } };");
const vibRepl = norm("const vibrate = (ms) => { if (typeof GP !== 'undefined' && GP.rumble) GP.rumble(ms, 0.5, 0.85); if (SETTINGS.vib && navigator.vibrate && !BOT) try { navigator.vibrate(ms); } catch (e) { } };");

if (gameSrc.includes(vibTarget)) {
  gameSrc = gameSrc.replace(vibTarget, vibRepl);
  console.log('✓ vibrate — added Gamepad dual-rumble motor trigger');
}

// Add pollGamepad and readKeys hook
const readKeysTarget = norm(`function readKeys() {
  const k = IN.keys; IN.kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); IN.ky = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (k.KeyQ) CAM.yaw += 0.03; if (k.KeyE) CAM.yaw -= 0.03;
}`);

const GAMEPAD_SYSTEM = `// ============================================================
// CONSOLE GAMEPAD / CONTROLLER SUPPORT (HTML5 Gamepad API)
// ============================================================
const GP = {
  lastButtons: {},
  connected: false,
  rumble: (dur = 100, weak = 0.5, strong = 0.85) => {
    try {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
          gp.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: Math.min(600, dur),
            weakMagnitude: weak,
            strongMagnitude: strong
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }
};

window.addEventListener('gamepadconnected', (e) => {
  GP.connected = true;
  const name = (e.gamepad.id || 'CONTROLLER').replace(/\\(.*\\)/, '').trim().toUpperCase();
  toast(\`🎮 \${name.slice(0, 24)} READY\`, 3500);
  SFX.shofar && SFX.shofar();
});
window.addEventListener('gamepaddisconnected', () => {
  GP.connected = false;
  toast('🎮 CONTROLLER DISCONNECTED', 2500);
});

function pollGamepad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const g of gps) { if (g && g.connected) { gp = g; break; } }
  if (!gp) return;

  const deadzone = 0.18;

  // Left Stick: Move
  const ax0 = gp.axes[0] || 0, ax1 = gp.axes[1] || 0;
  if (Math.hypot(ax0, ax1) > deadzone) {
    IN.kx = ax0;
    IN.ky = ax1;
  }

  // Right Stick: Camera Look
  const rx = gp.axes[2] || 0;
  if (Math.abs(rx) > deadzone) {
    CAM.yaw -= rx * 0.045;
  }

  // D-Pad navigation
  if (gp.buttons[14] && gp.buttons[14].pressed) IN.kx = -1;
  if (gp.buttons[15] && gp.buttons[15].pressed) IN.kx = 1;
  if (gp.buttons[12] && gp.buttons[12].pressed) IN.ky = -1;
  if (gp.buttons[13] && gp.buttons[13].pressed) IN.ky = 1;

  const isPress = (idx) => {
    const b = gp.buttons[idx];
    const down = b && (typeof b === 'object' ? b.pressed : b > 0.5);
    const was = GP.lastButtons[idx];
    GP.lastButtons[idx] = down;
    return down && !was;
  };

  // Button 0 (A / Cross): Attack / Confirm
  if (isPress(0)) {
    audioInit();
    if (G.phase === 'title' || G.phase === 'upgrade') {
      const go = $('up-go') || $('btn-start');
      if (go && go.offsetParent !== null) go.click();
    } else {
      press('attack');
    }
  }

  // Button 1 (B / Circle): Dodge Roll
  if (isPress(1)) { press('dodge'); }

  // Button 2 (X / Square): Sling / Bow ranged strike
  if (isPress(2)) { press('sling'); }

  // Button 3 (Y / Triangle): Execute if vulnerable, else Spirit special
  if (isPress(3)) {
    if (typeof tryExecute === 'function' && tryExecute()) {
      // executed!
    } else if (typeof trySpirit === 'function') {
      trySpirit();
    }
  }

  // Button 4 (LB / L1): Parry deflection
  if (isPress(4)) { press('parry'); }

  // Button 5 (RB / R1): Lock-on Target
  if (isPress(5)) { toggleLockOn && toggleLockOn(); }

  // Button 6 (LT / L2 trigger): Push pillars / Secondary
  IN.push = gp.buttons[6] && (typeof gp.buttons[6] === 'object' ? gp.buttons[6].value > 0.4 : gp.buttons[6] > 0.4);

  // Button 7 (RT / R2 trigger): Heavy attack / Sling release
  if (isPress(7)) { press('sling'); }

  // Button 8 (Select/Share) / 9 (Start/Options): Pause / Menu
  if (isPress(8) || isPress(9)) {
    if (G.phase === 'title') {
      const b = $('btn-start'); if (b) b.click();
    } else {
      togglePause();
    }
  }

  // Button 10 (L3 Left Stick Click): Sprint / Roll
  if (isPress(10)) { press('dodge'); }

  // Button 11 (R3 Right Stick Click): Lock-on
  if (isPress(11)) { toggleLockOn && toggleLockOn(); }
}

function readKeys() {
  const k = IN.keys; IN.kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); IN.ky = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (k.KeyQ) CAM.yaw += 0.03; if (k.KeyE) CAM.yaw -= 0.03;
  pollGamepad();
}`;

if (gameSrc.includes(readKeysTarget)) {
  gameSrc = gameSrc.replace(readKeysTarget, norm(GAMEPAD_SYSTEM));
  console.log('✓ readKeys — integrated pollGamepad() + GP dual-analog controller support');
} else {
  console.error('✗ NOT FOUND [readKeys target]');
  errors++;
}

fs.writeFileSync(GAME_JS, gameSrc.replace(/\n/g, '\r\n'), 'utf8');

if (errors === 0) {
  console.log('\n🎮 Option 1 & Option 3 Complete!');
} else {
  console.error(`\nErrors encountered: ${errors}`);
  process.exit(1);
}
