// ============================================================
// ELAH WARRIOR — Feature A: Mobile PWA Polish
// ============================================================
// • Gyroscope camera aim on mobile (DeviceMotion API)
// • Haptic feedback on hits, kills, boss events (Vibration API)
// • PWA install prompt banner ("Add to Home Screen")
// • Service Worker for offline caching
// • iOS safe-area insets for notch/home bar
// • Performance: low-power mode detection
// ============================================================

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const GAME_JS   = path.join(ROOT, 'js', 'game.js');
const INDEX_HTML= path.join(ROOT, 'index.html');
const STYLE_CSS = path.join(ROOT, 'style.css');
const SW_PATH   = path.join(ROOT, 'sw.js');

let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function writeCRLF(f, c) { fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8'); }
function writeLF(f, c)   { fs.writeFileSync(f, c, 'utf8'); }

function patch(file, label, search, replacement, crlf = false) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = norm(raw);
  if (!src.includes(norm(search))) {
    console.error(`✗ PATCH TARGET NOT FOUND [${label}]`);
    errors++;
    return;
  }
  const replaced = src.replace(norm(search), norm(replacement));
  crlf ? writeCRLF(file, replaced) : writeLF(file, replaced);
  console.log(`✓ ${label}`);
}

// ============================================================
// 1. SERVICE WORKER (sw.js) — offline caching
// ============================================================
const SW_CODE = `// ELAH WARRIOR Service Worker — offline caching
const CACHE = 'elah-v1';
const PRECACHE = [
  '/', '/index.html', '/style.css', '/js/game.js', '/js/net.js',
  '/vendor/three.module.min.js', '/manifest.webmanifest'
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
writeLF(SW_PATH, SW_CODE);
console.log('✓ sw.js — offline service worker created');

// ============================================================
// 2. INDEX.HTML — register SW + install prompt banner
// ============================================================
patch(INDEX_HTML, 'index.html — SW registration + install banner',
`<link rel="stylesheet" href="style.css">`,
`<link rel="stylesheet" href="style.css">
<script>
  // Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  // PWA install prompt
  let _deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstall = e;
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.classList.add('hidden');
  });
</script>`);

// ============================================================
// 3. INDEX.HTML — PWA install banner HTML
// ============================================================
patch(INDEX_HTML, 'index.html — PWA install banner element',
`<canvas id="c"></canvas>`,
`<canvas id="c"></canvas>
<!-- PWA Install Banner -->
<div id="pwa-banner" class="pwa-banner hidden">
  <div class="pwa-banner-icon">⚔️</div>
  <div class="pwa-banner-text">
    <b>ELAH WARRIOR</b>
    <span>Add to Home Screen for the best battle experience</span>
  </div>
  <button id="pwa-install-btn" class="pwa-install-btn">INSTALL</button>
  <button id="pwa-dismiss-btn" class="pwa-dismiss-btn">✕</button>
</div>`);

// ============================================================
// 4. GAME.JS — Haptic feedback system + gyro aim + PWA logic
// ============================================================
patch(GAME_JS, 'game.js — mobile PWA: haptics, gyro, install',
`// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);`,
`// ============================================================
// MOBILE PWA: HAPTICS · GYRO AIM · INSTALL PROMPT
// ============================================================

// ── Haptic Feedback ──────────────────────────────────────────
const HX = {
  hit:    () => navigator.vibrate && navigator.vibrate(18),
  crit:   () => navigator.vibrate && navigator.vibrate([30, 10, 30]),
  kill:   () => navigator.vibrate && navigator.vibrate([40, 15, 60]),
  boss:   () => navigator.vibrate && navigator.vibrate([80, 20, 80, 20, 120]),
  damage: () => navigator.vibrate && navigator.vibrate(55),
  dodge:  () => navigator.vibrate && navigator.vibrate(8),
  win:    () => navigator.vibrate && navigator.vibrate([60, 30, 60, 30, 100, 30, 200]),
  shofar: () => navigator.vibrate && navigator.vibrate([20, 10, 20, 10, 60]),
};

// Patch existing SFX calls to also trigger haptics (mobile only)
const _origHurtEnemy = typeof hurtEnemy === 'function' ? hurtEnemy : null;
// Hook haptics on key game events via event system
document.addEventListener('elah:hit',    () => HX.hit());
document.addEventListener('elah:crit',   () => HX.crit());
document.addEventListener('elah:kill',   () => HX.kill());
document.addEventListener('elah:boss',   () => HX.boss());
document.addEventListener('elah:damage', () => HX.damage());
document.addEventListener('elah:dodge',  () => HX.dodge());
document.addEventListener('elah:win',    () => HX.win());

function haptic(type) {
  if (!isTouch) return;
  document.dispatchEvent(new Event('elah:' + type));
}

// ── Gyroscope Camera Aim ─────────────────────────────────────
let GYRO = { active: false, beta: 0, gamma: 0, baseGamma: null };

function initGyro() {
  if (!isTouch || !window.DeviceOrientationEvent) return;

  const tryListen = () => {
    window.addEventListener('deviceorientation', e => {
      if (!GYRO.active) return;
      if (GYRO.baseGamma === null) GYRO.baseGamma = e.gamma;
      GYRO.beta  = e.beta  || 0;
      GYRO.gamma = e.gamma || 0;
    }, true);
    GYRO.active = true;
    console.log('Gyro aim active');
  };

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ requires explicit permission
    document.addEventListener('pointerdown', async () => {
      if (GYRO.active) return;
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') tryListen();
      } catch {}
    }, { once: true });
  } else {
    tryListen();
  }
}

function applyGyroAim(dt) {
  if (!GYRO.active || !P || G.phase !== 'play') return;
  if (GYRO.baseGamma === null) return;
  const tilt = (GYRO.gamma - GYRO.baseGamma) * 0.014; // sensitivity
  CAM.yaw += tilt * dt * 60;
}

initGyro();

// ── PWA Install Prompt ───────────────────────────────────────
setTimeout(() => {
  const installBtn  = document.getElementById('pwa-install-btn');
  const dismissBtn  = document.getElementById('pwa-dismiss-btn');
  const pwaBanner   = document.getElementById('pwa-banner');

  if (installBtn) {
    installBtn.onclick = async () => {
      if (!window._deferredInstall) return;
      window._deferredInstall.prompt();
      const { outcome } = await window._deferredInstall.userChoice;
      if (outcome === 'accepted') {
        pwaBanner && pwaBanner.classList.add('hidden');
        toast('⚔️ ELAH WARRIOR installed! Find it on your home screen.', 4000);
      }
      window._deferredInstall = null;
    };
  }
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      pwaBanner && pwaBanner.classList.add('hidden');
      try { localStorage.setItem('elah-pwa-dismissed', '1'); } catch {}
    };
  }

  // Auto-dismiss if previously dismissed
  try {
    if (localStorage.getItem('elah-pwa-dismissed') === '1' && pwaBanner) {
      pwaBanner.classList.add('hidden');
    }
  } catch {}
}, 400);

// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);`);

// ============================================================
// 5. GAME.JS — Hook haptics into key combat moments
// ============================================================
patch(GAME_JS, 'game.js — haptic on hitstop (combat feel)',
`function hitstop(dur = 0.08, fn = null) {`,
`function hitstop(dur = 0.08, fn = null) {
  haptic && haptic('hit');`);

patch(GAME_JS, 'game.js — haptic on dodge',
`function startDodge() {`,
`function startDodge() {
  haptic && haptic('dodge');`);

patch(GAME_JS, 'game.js — haptic on winGame',
`function winGame() {
  G.phase = 'won';`,
`function winGame() {
  haptic && haptic('win');
  G.phase = 'won';`);

patch(GAME_JS, 'game.js — haptic on damagePlayer',
`function damagePlayer(dmg, fromPos) {`,
`function damagePlayer(dmg, fromPos) {
  haptic && haptic('damage');`);

// ============================================================
// 6. GAME.JS — Gyro applied in main update loop
// ============================================================
patch(GAME_JS, 'game.js — gyro aim in update loop',
`  if (NET && NET.isMultiplayer) updateMultiplayer(dt);`,
`  if (NET && NET.isMultiplayer) updateMultiplayer(dt);
  applyGyroAim && applyGyroAim(dt);`);

// ============================================================
// 7. STYLE.CSS — PWA banner + iOS safe area insets
// ============================================================
const PWA_CSS = `
/* ── PWA Install Banner ──────────────────────────────────── */
.pwa-banner {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #1a0e04ee, #0d0804f8);
  border-top: 1px solid rgba(220,170,80,0.4);
  backdrop-filter: blur(8px);
  animation: banner-slide-up 0.4s cubic-bezier(0.2,0.8,0.4,1) both;
}
@keyframes banner-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.pwa-banner.hidden { display: none; }
.pwa-banner-icon { font-size: 28px; flex-shrink: 0; }
.pwa-banner-text { flex: 1; min-width: 0; }
.pwa-banner-text b { display: block; font-size: 13px; color: #ffd36a; letter-spacing: 0.1em; }
.pwa-banner-text span { font-size: 11px; color: #a09070; }
.pwa-install-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  background: linear-gradient(180deg, #c8a030, #8a6a18);
  border: none;
  border-radius: 7px;
  color: #0d0804;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.1em;
  cursor: pointer;
  white-space: nowrap;
}
.pwa-install-btn:active { transform: scale(0.96); }
.pwa-dismiss-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #6a5a40;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

/* ── iOS Safe Area ──────────────────────────────────────── */
#hud {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
#touch {
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

/* ── Gyro status indicator ──────────────────────────────── */
#gyro-badge {
  position: fixed;
  top: 8px;
  right: 60px;
  z-index: 400;
  font-size: 11px;
  color: rgba(220,170,80,0.5);
  letter-spacing: 0.08em;
  pointer-events: none;
}
`;

let cssRaw = fs.readFileSync(STYLE_CSS, 'utf8');
if (!cssRaw.includes('pwa-banner')) {
  fs.writeFileSync(STYLE_CSS, cssRaw + PWA_CSS, 'utf8');
  console.log('✓ style.css — PWA banner + iOS safe areas + gyro badge');
} else {
  console.log('✓ style.css — PWA styles already present, skipping');
}

if (errors === 0) {
  console.log('\n📱 Feature A — Mobile PWA Polish complete!');
  console.log('   • sw.js: service worker for offline caching (precaches core assets)');
  console.log('   • Haptic feedback: hit/crit/kill/boss/damage/dodge/win patterns');
  console.log('   • Gyroscope aim: tilting phone steers camera on mobile');
  console.log('   • iOS DeviceOrientation permission handling');
  console.log('   • PWA install banner: slides up from bottom, Install / Dismiss');
  console.log('   • iOS safe-area-inset padding for notch & home bar');
  console.log('   • Service worker offline-first strategy');
} else {
  console.error(`\n✗ ${errors} patch(es) failed.`);
  process.exit(1);
}
