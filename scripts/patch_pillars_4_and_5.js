'use strict';
/**
 * patch_pillars_4_and_5.js
 */

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
const INDEX_HTML = path.join(__dirname, '..', 'index.html');
const STYLE_CSS = path.join(__dirname, '..', 'style.css');

let gameSrc = fs.readFileSync(GAME_JS, 'utf8');
let htmlSrc = fs.readFileSync(INDEX_HTML, 'utf8');
let cssSrc = fs.readFileSync(STYLE_CSS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

function repGame(search, replacement, label) {
  const normSrc = norm(gameSrc);
  const normSearch = norm(search);
  if (!normSrc.includes(normSearch)) {
    throw new Error(`PATCH TARGET NOT FOUND in game.js [${label}]:\n${normSearch.slice(0, 100)}`);
  }
  const isCRLF = gameSrc.includes('\r\n');
  const finalReplacement = isCRLF ? replacement.replace(/\r?\n/g, '\r\n') : replacement.replace(/\r\n/g, '\n');
  const finalSearch = isCRLF ? search.replace(/\r?\n/g, '\r\n') : search.replace(/\r\n/g, '\n');
  gameSrc = gameSrc.replace(finalSearch, finalReplacement);
  console.log('  ✓ game.js:', label);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PILLAR 4: AUDIO — KINNOR (DAVID'S 10-STRING LYRE) SYNTHESIZER
// ─────────────────────────────────────────────────────────────────────────────
const LYRE_TARGET = `function mString(t, f, dur, v = 1, cut = 900) {`;
const LYRE_INJECT = `// Plucked Kinnor (Ancient 10-string Lyre of David) synthesizer
function mKinnor(t, f, v = 1) {
  if (!AU.ctx || !AU.on) return;
  const c = AU.ctx;
  // Fundamental plucked string with natural metallic decay
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.45 * v, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  o.connect(g); mOut(g, 0.45);
  o.start(t); o.stop(t + 1.7);

  // High sympathetic harmonic ring
  const h = c.createOscillator(), hg = c.createGain();
  h.type = 'sine';
  h.frequency.setValueAtTime(f * 2.76, t);
  hg.gain.setValueAtTime(0.18 * v, t);
  hg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  h.connect(hg); mOut(hg, 0.5);
  h.start(t); h.stop(t + 0.95);
}

function mString(t, f, dur, v = 1, cut = 900) {`;

repGame(LYRE_TARGET, LYRE_INJECT, 'Kinnor (David Lyre) Synthesizer');

// Insert Kinnor arpeggios into musicSchedule for tranquil and heroic moments
const SCHED_TARGET = `    if (s === 0) mPad(t, f0, st * 16, 0.6 + I * 0.5);`;
const SCHED_INJECT = `    if (s === 0) mPad(t, f0, st * 16, 0.6 + I * 0.5);
    // Lyre of David (Kinnor) melodic voice
    if (s === 0 || s === 6 || s === 12) {
      const lyrePitch = f0 * (s === 0 ? 2 : s === 6 ? 3 : 2.5);
      mKinnor(t, lyrePitch, 0.6 + (1 - Math.min(1, I)) * 0.4);
    }`;

repGame(SCHED_TARGET, SCHED_INJECT, 'Lyre arpeggio in musicSchedule');

// ─────────────────────────────────────────────────────────────────────────────
// 2. PILLAR 5: LIVE-OPS & RELIC WAR BONDS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const LIVE_OPS_BLOCK = `
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PILLAR 5: LIVE-OPS & RELIC WAR BONDS ("CHRONICLES OF THE COVENANT")
// Season 1: THE SIFTING OF GIDEON (Judges 7:4–7)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LIVE_OPS = {
  season: 1,
  seasonName: 'SEASON 1 · THE SIFTING OF GIDEON',
  verse: '“The people are yet too many; bring them down unto the water, and I will try them for thee there…” — JUDGES 7:4',
  endsInDays: 42,
  globalGoal: 1000000,
  globalCurrent: 384520, // Community Midianite slay counter
  tiers: [
    { tier: 1, xpReq: 0, title: 'Recruit of the Spring of Harod', reward: 'Pitcher of Gideon (Relic)', icon: '🏺', unlocked: true },
    { tier: 2, xpReq: 150, title: 'Warrior of the Three Hundred', reward: 'Torches of Moreh (Aura VFX)', icon: '🔥', unlocked: false },
    { tier: 3, xpReq: 350, title: 'Shieldbearer of Ephraim', reward: 'Gilded Bronze Greaves (Armor Skin)', icon: '🛡️', unlocked: false },
    { tier: 4, xpReq: 600, title: 'Captain of the Valley', reward: 'Shofar of Jubilee (Soundpack)', icon: '📯', unlocked: false },
    { tier: 5, xpReq: 1000, title: 'Champion of Mount Tabor', reward: 'Sword of the LORD & of Gideon', icon: '⚔️', unlocked: false },
  ]
};

function getWarBondXP() {
  const save = loadSave();
  return (save.highKills || 0) * 12 + (Object.keys(save.done || {}).length) * 100;
}

function openLiveOpsModal() {
  const modal = $('liveops-modal');
  if (!modal) return;
  const xp = getWarBondXP();
  $('lo-season').textContent = LIVE_OPS.seasonName;
  $('lo-verse').textContent = LIVE_OPS.verse;
  $('lo-xp').textContent = xp + ' WAR BOND MEDALS';
  
  const progPct = Math.min(100, Math.round((LIVE_OPS.globalCurrent / LIVE_OPS.globalGoal) * 100));
  $('lo-prog-fill').style.width = progPct + '%';
  $('lo-prog-text').textContent = LIVE_OPS.globalCurrent.toLocaleString() + ' / ' + LIVE_OPS.globalGoal.toLocaleString() + ' (' + progPct + '%) MIDIANITES SMITTEN GLOBALLY';

  const list = $('lo-tiers');
  list.innerHTML = '';
  for (const t of LIVE_OPS.tiers) {
    const isUnlocked = xp >= t.xpReq;
    const card = document.createElement('div');
    card.className = 'lo-card' + (isUnlocked ? ' claimed' : '');
    card.innerHTML = '<div class="lo-icon">' + t.icon + '</div>' +
      '<div class="lo-info">' +
        '<b>' + t.title + '</b>' +
        '<span>' + t.reward + '</span>' +
        '<small>' + (isUnlocked ? '✓ CLAIMED & EQUIPPED' : 'Requires ' + t.xpReq + ' Medals') + '</small>' +
      '</div>';
    list.appendChild(card);
  }
  show('liveops-modal', true);
}
`;

// Insert LIVE_OPS code before async function boot()
const BOOT_TARGET = `async function boot() {`;
repGame(BOOT_TARGET, LIVE_OPS_BLOCK + '\nasync function boot() {', 'Live-Ops & Relic War Bonds Code');

// Hook button in menu setup
const MENU_HOOK_TARGET = `if ($('btn-endless')) $('btn-endless').onclick = startEndlessHorde;`;
const MENU_HOOK_INJECT = `if ($('btn-endless')) $('btn-endless').onclick = startEndlessHorde;
if ($('btn-liveops')) $('btn-liveops').onclick = openLiveOpsModal;
if ($('lo-close')) $('lo-close').onclick = () => { show('liveops-modal', false); };`;

repGame(MENU_HOOK_TARGET, MENU_HOOK_INJECT, 'Live-Ops button click handlers');

// ─────────────────────────────────────────────────────────────────────────────
// 3. INDEX.HTML: ADD WAR BONDS & SEASON LIVE-OPS MODAL
// ─────────────────────────────────────────────────────────────────────────────
const HTML_MENU_BTN_TARGET = `    <button id="btn-endless" class="gold" style="background:linear-gradient(180deg,#8b2a1a,#4a1208);box-shadow:0 4px 18px rgba(220,60,30,.45);margin-top:2px;">⚔️ DAVID'S TEN THOUSANDS · ENDLESS</button>`;
const HTML_MENU_BTN_INJECT = `    <button id="btn-endless" class="gold" style="background:linear-gradient(180deg,#8b2a1a,#4a1208);box-shadow:0 4px 18px rgba(220,60,30,.45);margin-top:2px;">⚔️ DAVID'S TEN THOUSANDS · ENDLESS</button>
    <button id="btn-liveops" class="gold" style="background:linear-gradient(180deg,#244e6b,#122938);box-shadow:0 4px 18px rgba(36,78,107,.5);margin-top:2px;letter-spacing:.08em;">📜 SEASON 1 · RELIC WAR BONDS</button>`;

if (htmlSrc.includes(HTML_MENU_BTN_TARGET)) {
  htmlSrc = htmlSrc.replace(HTML_MENU_BTN_TARGET, HTML_MENU_BTN_INJECT);
  console.log('  ✓ index.html: Live-Ops menu button injected');
}

const HTML_MODAL_TARGET = `<!-- Scroll of Mighty Acts (Achievements Modal) -->`;
const HTML_MODAL_INJECT = `<!-- Season 1: Relic War Bonds Live-Ops Modal -->
<div id="liveops-modal" class="screen">
  <div class="lo-box">
    <div class="thead" style="margin-bottom:8px;">
      <div>
        <div class="tbrand" id="lo-season">SEASON 1 · THE SIFTING OF GIDEON</div>
        <div class="ttl">CHRONICLES OF THE COVENANT</div>
      </div>
    </div>
    <div class="lo-verse" id="lo-verse"></div>
    
    <div class="lo-global">
      <div class="lo-gl-title">COMMUNITY CRUSADE OBJECTIVE</div>
      <div class="lo-prog-bar"><div class="lo-prog-fill" id="lo-prog-fill"></div></div>
      <div class="lo-prog-text" id="lo-prog-text"></div>
    </div>

    <div class="lo-medals">YOUR RANK: <b id="lo-xp">0 WAR BOND MEDALS</b></div>

    <div class="lo-tiers" id="lo-tiers"></div>
    
    <div class="cbtns" style="margin-top:16px;">
      <button id="lo-close" class="gold">RETURN TO BATTLE</button>
    </div>
  </div>
</div>

<!-- Scroll of Mighty Acts (Achievements Modal) -->`;

if (htmlSrc.includes(HTML_MODAL_TARGET)) {
  htmlSrc = htmlSrc.replace(HTML_MODAL_TARGET, HTML_MODAL_INJECT);
  console.log('  ✓ index.html: Live-Ops modal injected');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STYLE.CSS: STYLING FOR WAR BONDS MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CSS_INJECT = `
/* ── Pillar 5: Season War Bonds Live-Ops Modal ── */
#liveops-modal { background: rgba(8, 12, 18, 0.94); backdrop-filter: blur(16px); z-index: 120; display: none; align-items: center; justify-content: center; }
#liveops-modal.show { display: flex; }
.lo-box { width: 92%; max-width: 620px; max-height: 88vh; overflow-y: auto; background: linear-gradient(180deg, #182230, #0c121a); border: 1px solid #3a526c; border-radius: 12px; padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.85); color: #e8eaec; font-family: inherit; }
.lo-verse { font-style: italic; color: #a4b8cc; font-size: 0.85rem; line-height: 1.4; margin-bottom: 16px; border-left: 3px solid #ffd700; padding-left: 10px; }
.lo-global { background: #0f1722; border: 1px solid #283a4e; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
.lo-gl-title { font-size: 0.75rem; letter-spacing: 0.12em; color: #7a94b0; font-weight: 700; margin-bottom: 6px; }
.lo-prog-bar { width: 100%; height: 10px; background: #080d14; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
.lo-prog-fill { height: 100%; width: 38%; background: linear-gradient(90deg, #2b6cb0, #4299e1); transition: width 0.4s ease; }
.lo-prog-text { font-size: 0.78rem; color: #cbd5e0; font-weight: 600; text-align: right; }
.lo-medals { font-size: 0.9rem; letter-spacing: 0.08em; color: #ffd700; margin-bottom: 14px; text-transform: uppercase; }
.lo-tiers { display: flex; flex-direction: column; gap: 8px; max-height: 42vh; overflow-y: auto; padding-right: 4px; }
.lo-card { display: flex; align-items: center; gap: 14px; background: #131c28; border: 1px solid #233446; border-radius: 8px; padding: 10px 14px; transition: transform 0.2s; }
.lo-card.claimed { border-color: #ffd700; background: linear-gradient(90deg, #1e2838, #18202c); }
.lo-icon { font-size: 1.8rem; width: 44px; text-align: center; }
.lo-info { display: flex; flex-direction: column; }
.lo-info b { font-size: 0.95rem; color: #f7fafc; }
.lo-info span { font-size: 0.82rem; color: #ffd700; margin-top: 1px; }
.lo-info small { font-size: 0.72rem; color: #718096; margin-top: 2px; }
.lo-card.claimed .lo-info small { color: #48bb78; font-weight: 600; }
`;

cssSrc += '\n' + CSS_INJECT;

fs.writeFileSync(GAME_JS, gameSrc, 'utf8');
fs.writeFileSync(INDEX_HTML, htmlSrc, 'utf8');
fs.writeFileSync(STYLE_CSS, cssSrc, 'utf8');

console.log('\n🎉 Pillars 4 & 5 (Orchestral Kinnor Lyre & Live-Ops War Bonds) applied successfully!');
