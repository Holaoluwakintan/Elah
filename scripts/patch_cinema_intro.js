// ============================================================
// ELAH WARRIOR — Feature D: Cinematic Level 1 Intro
// ============================================================
// Scripture-card cinematic before Level 1 gameplay begins:
// • Widescreen black bars
// • 3 scripture panels fade in/out (1 Sam 17:4, 17:32, 17:45)
// • Camera sweeps across Valley of Elah
// • Fade to gameplay — skippable on any key/tap
// ============================================================

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const GAME_JS   = path.join(ROOT, 'js', 'game.js');
const STYLE_CSS = path.join(ROOT, 'style.css');

let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function writeCRLF(file, content) { fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8'); }
function writeLF(file, content)   { fs.writeFileSync(file, content, 'utf8'); }

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
// 1. GAME.JS — cinemaIntro() function + hook into startLevel
// ============================================================
patch(GAME_JS, 'game.js — cinemaIntro function + Level 1 hook',
`function startLevel() {
  show('title', false); show('win', false); $('hud').classList.remove('hidden'); if (isTouch || BOT) $('touch').classList.remove('hidden');
  SAVE.level = LEVEL; writeSave(); G.cine = null;
  resetRun(true); MOSES.play('Idle_Loop'); MOSES.obj.visible = true; LOG('level_start', { level: LEVEL });
  if (LEVEL === 2 && Q.get('dev') === 'temple') {`,
`// ============================================================
// CINEMATIC SCRIPTURE INTRO
// ============================================================

const CINEMA_PANELS = [
  {
    location: 'THE VALLEY OF ELAH · 1004 BC',
    verse: '"And there went out a champion out of the camp of the Philistines, named Goliath of Gath, whose height was six cubits and a span."',
    ref: '1 Samuel 17:4 (KJV)',
    duration: 3800
  },
  {
    location: '',
    verse: '"And David said to Saul, Let no man\'s heart fail because of him; thy servant will go and fight with this Philistine."',
    ref: '1 Samuel 17:32 (KJV)',
    duration: 3800
  },
  {
    location: '',
    verse: '"Then said David to the Philistine, Thou comest to me with a sword… but I come to thee in the name of the LORD of hosts…"',
    ref: '1 Samuel 17:45 (KJV)',
    duration: 3800
  }
];

let _cinemaSkipped = false;

async function cinemaIntro() {
  if (SAVE.done && SAVE.done[1] && !Q.has('intro')) return; // only on first play
  _cinemaSkipped = false;

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'cinema-overlay';
  overlay.className = 'cinema-overlay';
  overlay.innerHTML = \`
    <div class="cinema-bars-top"></div>
    <div class="cinema-bars-bot"></div>
    <div id="cinema-panel" class="cinema-panel"></div>
    <div class="cinema-skip">PRESS ANY KEY TO SKIP</div>
  \`;
  document.body.appendChild(overlay);

  const skipHandler = () => { _cinemaSkipped = true; };
  document.addEventListener('keydown', skipHandler, { once: false });
  overlay.addEventListener('pointerdown', skipHandler, { once: false });

  // Animate camera sweep across Valley of Elah
  G.cine = {
    pos: new THREE.Vector3(-18, 4.5, 8),
    look: new THREE.Vector3(0, 1.0, 0)
  };

  const panel = document.getElementById('cinema-panel');

  for (let i = 0; i < CINEMA_PANELS.length; i++) {
    if (_cinemaSkipped) break;
    const cp = CINEMA_PANELS[i];

    // Slowly sweep camera
    const camTargets = [
      { pos: new THREE.Vector3(-18, 4.5, 8),  look: new THREE.Vector3(0, 1.0, 0) },
      { pos: new THREE.Vector3(0,   5.0, 20), look: new THREE.Vector3(0, 0.8, 0) },
      { pos: new THREE.Vector3(14,  3.8, 10), look: new THREE.Vector3(0, 1.0, 0) }
    ];
    const ct = camTargets[i % camTargets.length];
    if (G.cine) {
      G.cine.pos.lerp(ct.pos, 0.05);
      G.cine.look.lerp(ct.look, 0.05);
    }

    // Fade in panel
    panel.innerHTML = \`
      \${cp.location ? \`<div class="cinema-location">\${cp.location}</div>\` : ''}
      <blockquote class="cinema-verse">\${cp.verse}</blockquote>
      <cite class="cinema-ref">\${cp.ref}</cite>
    \`;
    panel.classList.remove('cinema-panel-visible');
    await sleep(80);
    panel.classList.add('cinema-panel-visible');

    // Hold for duration
    const t0 = performance.now();
    while (performance.now() - t0 < cp.duration && !_cinemaSkipped) {
      await sleep(60);
      // Animate camera
      if (G.cine) {
        G.cine.pos.lerp(ct.pos, 0.012);
        G.cine.look.lerp(ct.look, 0.012);
      }
    }

    if (_cinemaSkipped) break;

    // Fade out panel
    panel.classList.remove('cinema-panel-visible');
    await sleep(500);
  }

  // Final fade to black then gameplay
  overlay.style.transition = 'opacity 0.9s ease';
  overlay.style.opacity = '1';

  // Flash of divine light
  bloomPulse && bloomPulse(2.0, 0.6);
  await sleep(300);

  overlay.style.opacity = '0';
  await sleep(900);

  // Cleanup
  document.removeEventListener('keydown', skipHandler);
  overlay.removeEventListener('pointerdown', skipHandler);
  G.cine = null;
  document.body.removeChild(overlay);
}

function startLevel() {
  show('title', false); show('win', false); $('hud').classList.remove('hidden'); if (isTouch || BOT) $('touch').classList.remove('hidden');
  SAVE.level = LEVEL; writeSave(); G.cine = null;
  resetRun(true); MOSES.play('Idle_Loop'); MOSES.obj.visible = true; LOG('level_start', { level: LEVEL });
  if (LEVEL === 2 && Q.get('dev') === 'temple') {`, true);

// ============================================================
// 2. GAME.JS — trigger cinemaIntro before flow() on Level 1
// ============================================================
patch(GAME_JS, 'game.js — cinemaIntro trigger before Level 1 flow()',
`  if (LEVEL === 2 && Q.get('dev') === 'temple') { resetRun(false); finale(true); } else if (LEVEL === 3 && Q.get('dev') === 'king') { G.t0 = now(); kingFight(); } else if (LEVEL === 3 && Q.get('dev') === 'end') { G.t0 = now(); endingL3(); } else if (LEVEL === 3) flow3(); else if (LEVEL === 4 && Q.get('dev') === 'pit') { G.t0 = now(); pitFight(); } else if (LEVEL === 4 && Q.get('dev') === 'egypt') { G.t0 = now(); egyptFight(); } else if (LEVEL === 4) flow4(); else if (LEVEL === 5 && Q.get('dev') === 'chariots') { G.t0 = now(); chariotSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'river') { G.t0 = now(); riverSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'pursue') { G.t0 = now(); pursueSisera(); } else if (LEVEL === 5) flow5(); else if (LEVEL === 6 && Q.get('dev') === 'barley') { G.t0 = now(); barleySeq(); } else if (LEVEL === 6 && Q.get('dev') === 'lentil') { G.t0 = now(); lentilSeq(); } else if (LEVEL === 6 && Q.get('dev') === 'well') { G.t0 = now(); wellSeq(); } else if (LEVEL === 6) flow6(); else if (LEVEL === 7) flow7(); else if (LEVEL === 11) flow11(); else if (LEVEL === 12) flow12(); else if (LEVEL === 10) flow10(); else if (LEVEL === 9) flow9(); else if (LEVEL === 8) flow8(); else if (LEVEL === 2) flow2(); else if (Q.get('dev') === 'escape') { G.t0 = now(); runEscape(false); } else if (Q.get('dev') === 'jub') { G.t0 = now(); afterGoliath(); } else flow();`,
`  if (LEVEL === 2 && Q.get('dev') === 'temple') { resetRun(false); finale(true); } else if (LEVEL === 3 && Q.get('dev') === 'king') { G.t0 = now(); kingFight(); } else if (LEVEL === 3 && Q.get('dev') === 'end') { G.t0 = now(); endingL3(); } else if (LEVEL === 3) flow3(); else if (LEVEL === 4 && Q.get('dev') === 'pit') { G.t0 = now(); pitFight(); } else if (LEVEL === 4 && Q.get('dev') === 'egypt') { G.t0 = now(); egyptFight(); } else if (LEVEL === 4) flow4(); else if (LEVEL === 5 && Q.get('dev') === 'chariots') { G.t0 = now(); chariotSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'river') { G.t0 = now(); riverSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'pursue') { G.t0 = now(); pursueSisera(); } else if (LEVEL === 5) flow5(); else if (LEVEL === 6 && Q.get('dev') === 'barley') { G.t0 = now(); barleySeq(); } else if (LEVEL === 6 && Q.get('dev') === 'lentil') { G.t0 = now(); lentilSeq(); } else if (LEVEL === 6 && Q.get('dev') === 'well') { G.t0 = now(); wellSeq(); } else if (LEVEL === 6) flow6(); else if (LEVEL === 7) flow7(); else if (LEVEL === 11) flow11(); else if (LEVEL === 12) flow12(); else if (LEVEL === 10) flow10(); else if (LEVEL === 9) flow9(); else if (LEVEL === 8) flow8(); else if (LEVEL === 2) flow2(); else if (Q.get('dev') === 'escape') { G.t0 = now(); runEscape(false); } else if (Q.get('dev') === 'jub') { G.t0 = now(); afterGoliath(); } else { cinemaIntro().then(() => flow()); }`, true);

// ============================================================
// 3. STYLE.CSS — Cinematic intro styles
// ============================================================
const CINEMA_CSS = `
/* ── Cinematic Scripture Intro ───────────────────────────── */
.cinema-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: all;
}
.cinema-bars-top,
.cinema-bars-bot {
  position: absolute;
  left: 0; right: 0;
  height: 13vh;
  background: #000;
  z-index: 2001;
}
.cinema-bars-top { top: 0; }
.cinema-bars-bot { bottom: 0; }

.cinema-panel {
  position: relative;
  z-index: 2002;
  max-width: 680px;
  padding: 0 32px;
  text-align: center;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.75s ease, transform 0.75s ease;
}
.cinema-panel.cinema-panel-visible {
  opacity: 1;
  transform: translateY(0);
}
.cinema-location {
  font-size: 11px;
  letter-spacing: 0.22em;
  color: #806040;
  margin-bottom: 20px;
  text-transform: uppercase;
}
.cinema-verse {
  font-size: clamp(14px, 2.2vw, 20px);
  font-style: italic;
  color: #f3e2c0;
  line-height: 1.65;
  margin: 0 0 16px;
  text-shadow: 0 2px 18px rgba(0,0,0,0.9);
  font-family: 'Georgia', serif;
}
.cinema-ref {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: #ffd36a;
  font-style: normal;
}
.cinema-skip {
  position: absolute;
  bottom: 16vh;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(255,255,255,0.3);
  z-index: 2003;
  animation: cinema-blink 2.4s infinite;
}
@keyframes cinema-blink {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.7; }
}
`;

let cssRaw = fs.readFileSync(STYLE_CSS, 'utf8');
if (!cssRaw.includes('cinema-overlay')) {
  fs.writeFileSync(STYLE_CSS, cssRaw + CINEMA_CSS, 'utf8');
  console.log('✓ style.css — cinematic scripture intro styles');
} else {
  console.log('✓ style.css — cinema styles already present, skipping');
}

// ============================================================
// SUMMARY
// ============================================================
if (errors === 0) {
  console.log('\n🎬 Feature D — Cinematic Scripture Intro complete!');
  console.log('   • 3-panel scripture fade-in (1 Sam 17:4, 17:32, 17:45)');
  console.log('   • Widescreen black bars (cinematic letterbox)');
  console.log('   • Camera sweeps across Valley of Elah during panels');
  console.log('   • Divine bloom flash on transition to gameplay');
  console.log('   • Skippable: any key / tap');
  console.log('   • Only shows on first play (skips if level 1 already beaten)');
} else {
  console.error(`\n✗ ${errors} patch(es) failed — check targets above.`);
  process.exit(1);
}
