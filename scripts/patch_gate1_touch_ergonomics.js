// ============================================================
// ELAH WARRIOR — Gate 1, Step 4: Touch Controls Ergonomics & Sizing
// ============================================================
// Implements customizable touch layouts:
// - Standard (Default balanced layout)
// - Large (Larger hitboxes & buttons for comfortable thumbs / small screens)
// - Left-Handed (Mirrors joystick to right, combat buttons to left)
// ============================================================

const fs = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Update index.html: Add Touch Layout row to Settings ──
const HTML_FILE = path.join(__dirname, '..', 'index.html');
let html = norm(fs.readFileSync(HTML_FILE, 'utf8'));

const htmlTarget = norm(`<div class="srow"><label>Subtitles</label><button class="tog" id="set-subs"></button></div>`);
const htmlRepl = norm(`<div class="srow"><label>Subtitles</label><button class="tog" id="set-subs"></button></div>
    <div class="srow"><label>Touch Controls</label><div class="seg" id="set-touch-layout"><button data-tl="standard">DEFAULT</button><button data-tl="large">LARGE</button><button data-tl="left">SOUTHPAW</button></div></div>`);

if (html.includes(htmlTarget) && !html.includes('set-touch-layout')) {
  html = html.replace(htmlTarget, htmlRepl);
  fs.writeFileSync(HTML_FILE, html.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ index.html: Added Touch Controls layout selector to Settings');
} else {
  console.log('- index.html target already patched or not found');
}

// ── 2. Update style.css: Add .touch-large and .touch-left classes ──
const CSS_FILE = path.join(__dirname, '..', 'style.css');
let css = norm(fs.readFileSync(CSS_FILE, 'utf8'));

const cssTouchAdditions = norm(`
/* ── Touch Ergonomics & Accessibility Layouts ──────────────── */
#touch.touch-large #stick {
  width: 148px; height: 148px; margin: -74px 0 0 -74px;
}
#touch.touch-large #knob {
  width: 62px; height: 62px; margin: -31px 0 0 -31px;
}
#touch.touch-large #b-attack {
  width: 104px; height: 104px;
}
#touch.touch-large #b-sling {
  width: 88px; height: 88px;
  right: calc(max(18px, env(safe-area-inset-right)) + 116px);
}
#touch.touch-large #b-dodge {
  width: 74px; height: 74px;
  bottom: 140px;
}
#touch.touch-large #b-parry {
  width: 74px; height: 74px;
  right: calc(max(18px, env(safe-area-inset-right)) + 98px);
  bottom: 114px;
}
#touch.touch-large #b-lock {
  width: 58px; height: 58px;
  right: calc(max(18px, env(safe-area-inset-right)) + 180px);
  bottom: 96px;
}

/* Southpaw / Left-handed mirrored touch layout */
#touch.touch-left #stick-zone {
  left: auto; right: 0;
}
#touch.touch-left #stick {
  left: auto; right: 110px;
}
#touch.touch-left #b-attack {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 0px);
}
#touch.touch-left #b-sling {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 104px);
}
#touch.touch-left #b-dodge {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 14px);
}
#touch.touch-left #b-parry {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 88px);
}
#touch.touch-left #b-lock {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 160px);
}
#touch.touch-left #b-exec {
  right: auto; left: calc(max(18px, env(safe-area-inset-left)) + 48px);
}
`);

if (!css.includes('touch.touch-left')) {
  css += '\n' + cssTouchAdditions;
  fs.writeFileSync(CSS_FILE, css.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ style.css: Added .touch-large and .touch-left classes');
} else {
  console.log('- style.css already contains touch layout rules');
}

// ── 3. Update js/game.js: SETTINGS, applyTouchLayout, renderSettings ──
const GAME_FILE = path.join(__dirname, '..', 'js', 'game.js');
let game = norm(fs.readFileSync(GAME_FILE, 'utf8'));

// Patch SETTINGS default
const setDefTarget = norm("return { q: s.q || 'auto', music: s.music ?? 0.7, sfx: s.sfx ?? 0.9, vib: s.vib ?? true, narr: s.narr ?? true, auto: s.auto || null, shake: s.shake ?? true, gyro: s.gyro ?? false, subs: s.subs ?? true };");
const setDefRepl = norm("return { q: s.q || 'auto', music: s.music ?? 0.7, sfx: s.sfx ?? 0.9, vib: s.vib ?? true, narr: s.narr ?? true, auto: s.auto || null, shake: s.shake ?? true, gyro: s.gyro ?? false, subs: s.subs ?? true, touchLayout: s.touchLayout || 'standard' };");

if (game.includes(setDefTarget)) {
  game = game.replace(setDefTarget, setDefRepl);
  console.log('✓ game.js: Added touchLayout to SETTINGS');
}

// Add applyTouchLayout function
const applyTouchCode = norm(`
function applyTouchLayout() {
  const t = $('touch');
  if (!t) return;
  t.classList.toggle('touch-large', SETTINGS.touchLayout === 'large');
  t.classList.toggle('touch-left', SETTINGS.touchLayout === 'left');
}
`);

const homeStickTarget = norm("const homeStick = () => { stick.style.left = '110px'; stick.style.top = 'calc(100% - 110px)'; knob.style.transform = ''; stick.classList.remove('active'); };");
const homeStickRepl = norm("const homeStick = () => { stick.style.left = (SETTINGS.touchLayout === 'left') ? 'calc(100% - 110px)' : '110px'; stick.style.top = 'calc(100% - 110px)'; knob.style.transform = ''; stick.classList.remove('active'); };");

if (game.includes(homeStickTarget)) {
  game = game.replace(homeStickTarget, homeStickRepl);
  console.log('✓ game.js: homeStick supports left/right positioning');
}

// Update renderSettings and listeners
const renderSetTarget = norm(`  const sSubs = $('set-subs'); if (sSubs) { sSubs.textContent = SETTINGS.subs ? 'ON' : 'OFF'; sSubs.classList.toggle('on', SETTINGS.subs); }
}`);

const renderSetRepl = norm(`  const sSubs = $('set-subs'); if (sSubs) { sSubs.textContent = SETTINGS.subs ? 'ON' : 'OFF'; sSubs.classList.toggle('on', SETTINGS.subs); }
  document.querySelectorAll('#set-touch-layout button').forEach(b => b.classList.toggle('on', b.dataset.tl === (SETTINGS.touchLayout || 'standard')));
}`);

if (game.includes(renderSetTarget)) {
  game = game.replace(renderSetTarget, renderSetRepl);
  console.log('✓ game.js: renderSettings handles #set-touch-layout');
}

const listenerTarget = norm(`const bSubs = $('set-subs'); if (bSubs) bSubs.onclick = () => { SETTINGS.subs = !SETTINGS.subs; saveSettings(); renderSettings(); };`);
const listenerRepl = norm(`const bSubs = $('set-subs'); if (bSubs) bSubs.onclick = () => { SETTINGS.subs = !SETTINGS.subs; saveSettings(); renderSettings(); };
document.querySelectorAll('#set-touch-layout button').forEach(b => b.onclick = () => {
  SETTINGS.touchLayout = b.dataset.tl;
  saveSettings();
  applyTouchLayout();
  renderSettings();
});`);

if (game.includes(listenerTarget)) {
  game = game.replace(listenerTarget, listenerRepl);
  console.log('✓ game.js: Wire #set-touch-layout button clicks');
}

// Ensure applyTouchLayout() is called at init
const initHookTarget = norm(`setupInput();`);
const initHookRepl = norm(`setupInput(); applyTouchLayout();`);

if (game.includes(initHookTarget) && !game.includes('setupInput(); applyTouchLayout();')) {
  game = game.replace(initHookTarget, initHookRepl);
  console.log('✓ game.js: Hooked applyTouchLayout into setupInput');
}

// Add applyTouchLayout definition before setupInput
if (!game.includes('function applyTouchLayout()')) {
  const beforeInput = norm(`function setupInput() {`);
  game = game.replace(beforeInput, applyTouchCode + '\n' + beforeInput);
  console.log('✓ game.js: Injected applyTouchLayout definition');
}

fs.writeFileSync(GAME_FILE, game.replace(/\n/g, '\r\n'), 'utf8');
console.log('All touch ergonomics patches applied successfully!');
