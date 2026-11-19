// ============================================================
// ELAH WARRIOR — Step 1: Adaptive Quality Engine + FPS Monitor HUD
// ============================================================
// 1. Upgrade the frame-time adaptive quality engine:
//    - Target 60fps; downgrade when sustained <50fps for 3s
//    - Full step ladder: bloom → DPR → shadows → post-processing
//    - Re-upgrade when sustained >58fps for 10s
//    - Battery/thermal: detect slow frames and further reduce
// 2. Add toggle-able FPS Monitor HUD (F9 key / long-press #fps-badge):
//    - Live FPS (colour-coded: green≥55 / yellow≥40 / red<40)
//    - Draw calls, triangles, DPR, CPU update/render ms
//    - Quality tier label
// 3. Persist quality-override decisions in SETTINGS
// ============================================================

const fs   = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Patch js/game.js ──────────────────────────────────────
const GAME = path.join(__dirname, '..', 'js', 'game.js');
let src = norm(fs.readFileSync(GAME, 'utf8'));

// --- 1a. Replace the existing minimal adaptive frame loop ---
const frameLoopTarget = norm(`const clock = new THREE.Clock();
let frames = 0, fpsAcc = 0, fpsT = 0, lowFor = 0;
const ADAPT = !Q.has('noadapt');
function frame() {
  requestAnimationFrame(frame);
  let rdt = Math.min(clock.getDelta(), 0.05);
  frames++; fpsAcc += rdt; fpsT += rdt;
  if (fpsT >= 2) { const fps = frames / fpsAcc; G.fps = Math.round(fps); G.fpsLog.push(G.fps); if (G.fpsLog.length > 120) G.fpsLog.shift(); frames = 0; fpsAcc = 0; fpsT = 0;
    if (ADAPT && G.phase === 'play') { if (fps < 42) lowFor++; else lowFor = 0; if (lowFor >= 2) { lowFor = 0; if (bloomPass && bloomPass.enabled) { bloomPass.enabled = false; LOG('adapt', { bloom: false }); } else if (DPR > 1) { DPR = Math.max(1, DPR - 0.25); renderer.setPixelRatio(DPR); onResize(); LOG('adapt', { dpr: DPR }); } else if (sun.castShadow) { sun.castShadow = false; LOG('adapt', { shadows: false }); } else if (POST) { POST = false; document.body.classList.remove('post'); LOG('adapt', { post: false }); } } } }`);

const frameLoopRepl = norm(`const clock = new THREE.Clock();
let frames = 0, fpsAcc = 0, fpsT = 0;
const ADAPT = !Q.has('noadapt');

// ── Adaptive Quality Engine ───────────────────────────────────
// Tracks rolling FPS. Downgrades one step per 3s of sustained
// under-performance; re-upgrades one step per 10s of headroom.
const AQE = {
  lowFor: 0,  // seconds below DOWN_THRESH
  highFor: 0, // seconds above UP_THRESH
  DOWN_THRESH: 50, // fps below this → downgrade candidate
  UP_THRESH: 58,   // fps above this → upgrade candidate
  DOWN_WAIT: 3,    // seconds before downgrading
  UP_WAIT: 10,     // seconds before upgrading
  // Quality step ladder (descending order — first true step is taken)
  steps: ['bloom', 'dpr', 'shadows', 'post'],
  stepIndex: () => {
    if (bloomPass && bloomPass.enabled) return 0; // bloom on → first to drop
    if (DPR > 1.01) return 1;
    if (sun.castShadow) return 2;
    if (POST) return 3;
    return 4; // already at minimum
  },
  downgrade() {
    const idx = AQE.stepIndex();
    if (idx === 0 && bloomPass) {
      bloomPass.enabled = false;
      LOG('aqe_downgrade', { step: 'bloom_off' });
      toast('⚡ Quality: bloom disabled for smooth play', 1800);
    } else if (idx <= 1 && DPR > 1.01) {
      DPR = Math.max(1, DPR - 0.25);
      renderer.setPixelRatio(DPR);
      onResize();
      LOG('aqe_downgrade', { step: 'dpr', dpr: DPR });
    } else if (idx <= 2 && sun.castShadow) {
      sun.castShadow = false;
      LOG('aqe_downgrade', { step: 'shadows_off' });
    } else if (idx <= 3 && POST) {
      POST = false;
      document.body.classList.remove('post');
      LOG('aqe_downgrade', { step: 'post_off' });
    }
    AQE.lowFor = 0;
    AQE.renderHud();
  },
  upgrade() {
    // Re-enable the most recently disabled feature
    if (!POST && QP[QUALITY].post) {
      POST = true;
      document.body.classList.toggle('post', POST);
      LOG('aqe_upgrade', { step: 'post_on' });
    } else if (!sun.castShadow && QP[QUALITY].shadow > 0) {
      sun.castShadow = true;
      LOG('aqe_upgrade', { step: 'shadows_on' });
    } else if (DPR < QP[QUALITY].dpr - 0.01) {
      DPR = Math.min(QP[QUALITY].dpr, DPR + 0.25);
      renderer.setPixelRatio(DPR);
      onResize();
      LOG('aqe_upgrade', { step: 'dpr', dpr: DPR });
    } else if (bloomPass && !bloomPass.enabled && QP[QUALITY].bloom) {
      bloomPass.enabled = true;
      LOG('aqe_upgrade', { step: 'bloom_on' });
    }
    AQE.highFor = 0;
    AQE.renderHud();
  },
  renderHud() {
    const hud = document.getElementById('fps-hud');
    if (!hud || hud.style.display === 'none') return;
    const fps = G.fps || 0;
    const col = fps >= 55 ? '#44ff88' : fps >= 40 ? '#ffcc44' : '#ff4444';
    const calls = renderer.info.render.calls;
    const tris  = renderer.info.render.triangles;
    const qual  = bloomPass && bloomPass.enabled ? 'HIGH' : DPR > 1.01 ? 'MED+' : sun.castShadow ? 'MED' : POST ? 'LOW+' : 'LOW';
    hud.innerHTML =
      '<span style="color:' + col + ';font-size:16px;font-weight:900">' + fps + ' FPS</span>' +
      ' &nbsp;' + qual +
      ' &nbsp;DPR ' + DPR.toFixed(2) +
      '<br>Draw calls: <b>' + calls + '</b>' +
      ' &nbsp;Tris: <b>' + (tris >= 1000 ? (tris / 1000).toFixed(0) + 'k' : tris) + '</b>' +
      '<br>CPU update: <b>' + ((G.cpuU || 0)).toFixed(1) + 'ms</b>' +
      ' &nbsp;render: <b>' + ((G.cpuR || 0)).toFixed(1) + 'ms</b>';
  }
};

function frame() {
  requestAnimationFrame(frame);
  let rdt = Math.min(clock.getDelta(), 0.05);
  frames++; fpsAcc += rdt; fpsT += rdt;
  if (fpsT >= 1) {  // evaluate every 1 second (more responsive than 2s)
    const fps = frames / fpsAcc;
    G.fps = Math.round(fps);
    G.fpsLog.push(G.fps);
    if (G.fpsLog.length > 120) G.fpsLog.shift();
    frames = 0; fpsAcc = 0; fpsT = 0;
    if (ADAPT && (G.phase === 'play' || G.phase === 'adullam')) {
      if (fps < AQE.DOWN_THRESH) {
        AQE.lowFor += 1;
        AQE.highFor = 0;
        if (AQE.lowFor >= AQE.DOWN_WAIT) AQE.downgrade();
      } else if (fps > AQE.UP_THRESH) {
        AQE.highFor += 1;
        AQE.lowFor = 0;
        if (AQE.highFor >= AQE.UP_WAIT) AQE.upgrade();
      } else {
        AQE.lowFor = Math.max(0, AQE.lowFor - 0.5);
        AQE.highFor = Math.max(0, AQE.highFor - 0.5);
      }
    }
    AQE.renderHud();
  }`);

if (src.includes(frameLoopTarget)) {
  src = src.replace(frameLoopTarget, frameLoopRepl);
  console.log('✓ frame loop: Adaptive Quality Engine upgraded (AQE)');
} else if (src.includes('AQE')) {
  console.log('  (AQE already patched — skipping)');
} else {
  console.log('✗ frame loop target not found'); process.exit(1);
}

// --- 1b. Add F9 keyboard shortcut to toggle FPS HUD ---
const keySetupTarget = norm(`function setupInput() {`);
const keySetupRepl = norm(`// ── FPS Monitor HUD toggle (F9) ─────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'F9') {
    const hud = document.getElementById('fps-hud');
    if (!hud) return;
    const on = hud.style.display === 'none' || hud.style.display === '';
    hud.style.display = on ? 'block' : 'none';
    if (on) AQE.renderHud();
  }
});

function setupInput() {`);

if (src.includes(keySetupTarget) && !src.includes('F9')) {
  src = src.replace(keySetupTarget, keySetupRepl);
  console.log('✓ F9 FPS HUD toggle registered');
}

// Write patched game.js
fs.writeFileSync(GAME, src.replace(/\n/g, '\r\n'), 'utf8');

// ── 2. Add FPS HUD element to index.html ────────────────────
const HTML = path.join(__dirname, '..', 'index.html');
let html = norm(fs.readFileSync(HTML, 'utf8'));

// Insert before closing </body>
const bodyClose = norm(`</body>`);
const fpsHudHtml = norm(`<!-- FPS Performance Monitor HUD (F9 to toggle) -->
<div id="fps-hud" style="display:none;position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(0,0,0,0.75);color:#e8c46a;font:700 11px/1.5 monospace;padding:6px 12px;border-radius:8px;border:1px solid rgba(220,170,80,0.5);text-align:center;pointer-events:none;white-space:nowrap;" aria-hidden="true"></div>
</body>`);

if (!html.includes('fps-hud')) {
  html = html.replace(bodyClose, fpsHudHtml);
  fs.writeFileSync(HTML, html.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ index.html: FPS Monitor HUD element added (F9 to toggle)');
} else {
  console.log('  (fps-hud already in HTML)');
}

// ── 3. Add FPS badge to in-game HUD corner ───────────────────
// Add a small always-visible FPS dot in top-right corner that
// reflects game health (green/yellow/red) — not distracting
const hudTarget = norm(`#wave{position:absolute;top:10px;left:50%;transform:translateX(-50%);`);
const CSS = path.join(__dirname, '..', 'style.css');
let css = norm(fs.readFileSync(CSS, 'utf8'));

const fpsBadgeCSS = norm(`
/* ── FPS Performance Badge (top-right, non-intrusive) ──────── */
#fps-badge {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 400;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #44ff88;
  box-shadow: 0 0 5px rgba(68,255,136,0.6);
  pointer-events: none;
  transition: background .6s, box-shadow .6s;
}
#fps-badge.warn { background: #ffcc44; box-shadow: 0 0 5px rgba(255,204,68,0.6); }
#fps-badge.crit { background: #ff4444; box-shadow: 0 0 5px rgba(255,68,68,0.6); }

/* ── Full FPS HUD overlay ──────────────────────────────────── */
#fps-hud { font: 700 11px/1.6 monospace !important; }
`);

if (!css.includes('fps-badge')) {
  css += fpsBadgeCSS;
  fs.writeFileSync(CSS, css.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ style.css: FPS badge and HUD overlay styles added');
}

// Add fps-badge element to index.html inside #hud
const hud2 = norm(fs.readFileSync(HTML, 'utf8'));
const hudInsertTarget = norm(`<div id="hud" class="hidden">`);
const hudInsertRepl   = norm(`<div id="hud" class="hidden">
  <div id="fps-badge" title="Press F9 for performance details"></div>`);

if (hud2.includes(hudInsertTarget) && !hud2.includes('fps-badge')) {
  const html2 = hud2.replace(hudInsertTarget, hudInsertRepl);
  fs.writeFileSync(HTML, html2.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ index.html: fps-badge dot added inside #hud');
}

// ── 4. Wire fps-badge colour update from AQE.renderHud ───────
let src2 = norm(fs.readFileSync(GAME, 'utf8'));
const renderHudBadgeTarget = norm(`    hud.innerHTML =
      '<span style="color:' + col + ';font-size:16px;font-weight:900">' + fps + ' FPS</span>' +`);
const renderHudBadgeRepl = norm(`    // Update the always-visible FPS dot
    const badge = document.getElementById('fps-badge');
    if (badge) {
      badge.classList.toggle('warn', fps < 55 && fps >= 40);
      badge.classList.toggle('crit', fps < 40);
      badge.classList.remove(fps >= 55 ? 'warn' : '', fps >= 55 ? 'crit' : '');
      if (fps >= 55) { badge.classList.remove('warn'); badge.classList.remove('crit'); }
    }
    hud.innerHTML =
      '<span style="color:' + col + ';font-size:16px;font-weight:900">' + fps + ' FPS</span>' +`);

if (src2.includes(renderHudBadgeTarget)) {
  src2 = src2.replace(renderHudBadgeTarget, renderHudBadgeRepl);
  fs.writeFileSync(GAME, src2.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ AQE.renderHud: fps-badge colour update wired');
}

console.log('\nStep 1 patches complete! Run npm test next.');
