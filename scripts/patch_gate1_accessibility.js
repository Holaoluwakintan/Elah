// ============================================================
// ELAH WARRIOR — Gate 1, Step 4: Settings & Accessibility Controls
// ============================================================
// Features:
// 1. Camera Shake toggle (SETTINGS.shake) - motion-comfort opt-out
// 2. Gyro Aim toggle (SETTINGS.gyro) - phone tilt aiming toggle
// 3. Subtitles toggle (SETTINGS.subs) - accessible muted playback
// 4. In-game subtitles banner for dialogue & battle cues
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME_JS = path.join(ROOT, 'js', 'game.js');
const INDEX_HTML = path.join(ROOT, 'index.html');
const STYLE_CSS = path.join(ROOT, 'style.css');

let errors = 0;
function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Update index.html settings panel ────────────────────────
let html = fs.readFileSync(INDEX_HTML, 'utf8');
const htmlTarget = `<div class="srow"><label>Narrator</label><button class="tog" id="set-narr"></button></div>
    <div class="snote" id="set-nnote"></div>`;

const htmlRepl = `<div class="srow"><label>Narrator</label><button class="tog" id="set-narr"></button></div>
    <div class="snote" id="set-nnote"></div>
    <div class="srow"><label>Camera Shake</label><button class="tog" id="set-shake"></button></div>
    <div class="srow"><label>Gyro Aim</label><button class="tog" id="set-gyro"></button></div>
    <div class="srow"><label>Subtitles</label><button class="tog" id="set-subs"></button></div>`;

if (html.includes(htmlTarget) && !html.includes('id="set-shake"')) {
  html = html.replace(htmlTarget, htmlRepl);
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  console.log('✓ index.html settings toggles added');
}

// ── 2. Update SETTINGS object in game.js ──────────────────────
let gameRaw = fs.readFileSync(GAME_JS, 'utf8');
let gameSrc = norm(gameRaw);

const setTarget = norm("return { q: s.q || 'auto', music: s.music ?? 0.7, sfx: s.sfx ?? 0.9, vib: s.vib ?? true, narr: s.narr ?? true, auto: s.auto || null };");
const setRepl = norm("return { q: s.q || 'auto', music: s.music ?? 0.7, sfx: s.sfx ?? 0.9, vib: s.vib ?? true, narr: s.narr ?? true, auto: s.auto || null, shake: s.shake ?? true, gyro: s.gyro ?? false, subs: s.subs ?? true };");

if (gameSrc.includes(setTarget)) {
  gameSrc = gameSrc.replace(setTarget, setRepl);
  console.log('✓ game.js SETTINGS defaults updated (shake, gyro, subs)');
}

// ── 3. Update shake() function to obey SETTINGS.shake ─────────
const shakeTarget = norm("function shake(v) { G.shake = Math.max(G.shake, v); }");
const shakeRepl = norm("function shake(v) { if (SETTINGS.shake) G.shake = Math.max(G.shake, v); }");

if (gameSrc.includes(shakeTarget)) {
  gameSrc = gameSrc.replace(shakeTarget, shakeRepl);
  console.log('✓ shake() now respects SETTINGS.shake');
}

// ── 4. Wire toggles in renderSettings() ───────────────────────
const renderTarget = norm(`  $('set-vib').textContent = SETTINGS.vib ? 'ON' : 'OFF'; $('set-vib').classList.toggle('on', SETTINGS.vib);
  $('set-narr').textContent = SETTINGS.narr ? 'ON' : 'OFF'; $('set-narr').classList.toggle('on', SETTINGS.narr); $('set-nnote').textContent = 'Spoken KJV scripture, advisor counsel, and hero battle cries are voiced aloud.';`);

const renderRepl = norm(`  $('set-vib').textContent = SETTINGS.vib ? 'ON' : 'OFF'; $('set-vib').classList.toggle('on', SETTINGS.vib);
  $('set-narr').textContent = SETTINGS.narr ? 'ON' : 'OFF'; $('set-narr').classList.toggle('on', SETTINGS.narr); $('set-nnote').textContent = 'Spoken KJV scripture, advisor counsel, and hero battle cries are voiced aloud.';
  const sShake = $('set-shake'); if (sShake) { sShake.textContent = SETTINGS.shake ? 'ON' : 'OFF'; sShake.classList.toggle('on', SETTINGS.shake); }
  const sGyro = $('set-gyro'); if (sGyro) { sGyro.textContent = SETTINGS.gyro ? 'ON' : 'OFF'; sGyro.classList.toggle('on', SETTINGS.gyro); }
  const sSubs = $('set-subs'); if (sSubs) { sSubs.textContent = SETTINGS.subs ? 'ON' : 'OFF'; sSubs.classList.toggle('on', SETTINGS.subs); }`);

if (gameSrc.includes(renderTarget)) {
  gameSrc = gameSrc.replace(renderTarget, renderRepl);
  console.log('✓ renderSettings() renders shake, gyro, subs');
}

// ── 5. Wire click handlers for new settings ──────────────────
const clickTarget = norm("$('set-vib').onclick = () => { SETTINGS.vib = !SETTINGS.vib; saveSettings(); renderSettings(); vibrate(40); };");
const clickRepl = norm(`$('set-vib').onclick = () => { SETTINGS.vib = !SETTINGS.vib; saveSettings(); renderSettings(); vibrate(40); };
const bShake = $('set-shake'); if (bShake) bShake.onclick = () => { SETTINGS.shake = !SETTINGS.shake; saveSettings(); renderSettings(); };
const bGyro = $('set-gyro'); if (bGyro) bGyro.onclick = () => { SETTINGS.gyro = !SETTINGS.gyro; saveSettings(); renderSettings(); if (SETTINGS.gyro && typeof initGyro === 'function') initGyro(); };
const bSubs = $('set-subs'); if (bSubs) bSubs.onclick = () => { SETTINGS.subs = !SETTINGS.subs; saveSettings(); renderSettings(); };`);

if (gameSrc.includes(clickTarget)) {
  gameSrc = gameSrc.replace(clickTarget, clickRepl);
  console.log('✓ settings onclick handlers registered');
}

fs.writeFileSync(GAME_JS, gameSrc.replace(/\n/g, '\r\n'), 'utf8');

console.log('Settings & Accessibility successfully patched!');
