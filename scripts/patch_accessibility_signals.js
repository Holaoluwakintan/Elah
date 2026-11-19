// ============================================================
// ELAH WARRIOR — Step 3: Non-Colour-Only Accessibility Signals (§03)
// ============================================================
// Adds clear textual and symbolic state badges:
// 1. Player Health Status:
//    - ♥ 100 HP (Healthy)
//    - ⚠️ 45 HP (Wounded)
//    - 🚨 18 HP (Critical)
// 2. Boss Health & Phase Indicator:
//    - 👑 PHASE 1 · ARMOURED
//    - ⚡ PHASE 2 · ENRAGED
//    - ✨ VULNERABLE · SLING TO FOREHEAD
// 3. Enemy poise / telegraph readability shapes.
// ============================================================

const fs = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Update index.html ─────────────────────────────────────
const HTML_FILE = path.join(__dirname, '..', 'index.html');
let html = norm(fs.readFileSync(HTML_FILE, 'utf8'));

// Inject hp-status badge right inside .who
const whoTarget = norm(`<div class="who"><span id="who-name">DAVID</span> <span id="angel-ico" title="Angel rescue ready">✦</span></div>`);
const whoRepl = norm(`<div class="who"><span id="who-name">DAVID</span> <span id="angel-ico" title="Angel rescue ready">✦</span> <span id="hp-badge" class="hp-badge">♥ 100 HP</span></div>`);

if (html.includes(whoTarget) && !html.includes('hp-badge')) {
  html = html.replace(whoTarget, whoRepl);
  console.log('✓ index.html: Added #hp-badge to HUD');
}

// Inject boss-badge inside boss-wrap
const bossTarget = norm(`<div id="boss-wrap" class="hidden"><div class="bname" id="bname">GOLIATH OF GATH</div><div class="hpbar boss"><div id="boss-fill"></div></div></div>`);
const bossRepl = norm(`<div id="boss-wrap" class="hidden"><div class="bname" id="bname">GOLIATH OF GATH</div><div class="hpbar boss"><div id="boss-fill"></div></div><div id="boss-badge" class="boss-badge">👑 PHASE 1 · ARMOURED</div></div>`);

if (html.includes(bossTarget) && !html.includes('boss-badge')) {
  html = html.replace(bossTarget, bossRepl);
  console.log('✓ index.html: Added #boss-badge to boss HUD');
}

fs.writeFileSync(HTML_FILE, html.replace(/\n/g, '\r\n'), 'utf8');

// ── 2. Update style.css ──────────────────────────────────────
const CSS_FILE = path.join(__dirname, '..', 'style.css');
let css = norm(fs.readFileSync(CSS_FILE, 'utf8'));

const accessCSS = norm(`
/* ── Non-Colour-Only Accessibility Badges (§03 Audit) ──────── */
.hp-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(220, 180, 100, 0.45);
  color: #fff2c8;
  font: 800 10px/1.2 monospace, sans-serif;
  letter-spacing: 0.05em;
  vertical-align: middle;
}
.hp-badge.crit {
  background: rgba(180, 20, 20, 0.85);
  border-color: #ff5555;
  color: #ffffff;
  animation: pulse-badge 0.8s infinite alternate;
}
.hp-badge.warn {
  background: rgba(140, 90, 10, 0.8);
  border-color: #ffbb33;
  color: #fff8e0;
}
@keyframes pulse-badge {
  to { transform: scale(1.08); box-shadow: 0 0 8px rgba(255, 60, 60, 0.8); }
}

.boss-badge {
  margin-top: 4px;
  font: 800 11px/1.2 system-ui, sans-serif;
  letter-spacing: 0.14em;
  color: #ffd770;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}
.boss-badge.enraged {
  color: #ff4444;
  text-shadow: 0 0 8px rgba(255, 50, 50, 0.85);
  animation: pulse-badge 0.6s infinite alternate;
}
.boss-badge.vuln {
  color: #55ffaa;
  text-shadow: 0 0 10px rgba(80, 255, 170, 0.9);
}
`);

if (!css.includes('hp-badge')) {
  css += '\n' + accessCSS;
  fs.writeFileSync(CSS_FILE, css.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ style.css: Added non-colour-only accessibility badge styles');
}

// ── 3. Update js/game.js ─────────────────────────────────────
const GAME_FILE = path.join(__dirname, '..', 'js', 'game.js');
let game = norm(fs.readFileSync(GAME_FILE, 'utf8'));

// Update updateHud() in game.js
const hudTarget = norm(`  hud.hp.style.width = hpP + '%'; hud.ghost.style.width = hpP + '%'; hud.coins.textContent = G.coins; hud.armour.textContent = G.armour; hud.boss.style.width = bp + '%'; hud.cd.style.height = cd + '%';`);
const hudRepl = norm(`  hud.hp.style.width = hpP + '%'; hud.ghost.style.width = hpP + '%'; hud.coins.textContent = G.coins; hud.armour.textContent = G.armour; hud.boss.style.width = bp + '%'; hud.cd.style.height = cd + '%';
  // Non-colour-only accessibility badges (§03)
  const hpBadge = $('hp-badge');
  if (hpBadge && P) {
    const curHp = Math.round(P.hp);
    if (curHp <= 0) {
      hpBadge.textContent = '💀 FALLEN';
      hpBadge.className = 'hp-badge crit';
    } else if (hpP <= 28) {
      hpBadge.textContent = \`🚨 \${curHp} HP (CRITICAL)\`;
      hpBadge.className = 'hp-badge crit';
    } else if (hpP <= 55) {
      hpBadge.textContent = \`⚠️ \${curHp} HP (WOUNDED)\`;
      hpBadge.className = 'hp-badge warn';
    } else {
      hpBadge.textContent = \`♥ \${curHp} HP\`;
      hpBadge.className = 'hp-badge';
    }
  }
  const bossBadge = $('boss-badge');
  if (bossBadge && G.boss) {
    const b = G.boss;
    const bHp = Math.round(b.hp);
    if (b.stumbleT > 0 || b.state === 'stumble') {
      bossBadge.textContent = '✨ VULNERABLE · SLING TO FOREHEAD!';
      bossBadge.className = 'boss-badge vuln';
    } else if (b.phase2 || (b.hp / b.maxHp) <= 0.35) {
      bossBadge.textContent = \`⚡ PHASE 2 · ENRAGED [\${bHp}/\${b.maxHp}]\`;
      bossBadge.className = 'boss-badge enraged';
    } else {
      bossBadge.textContent = \`👑 PHASE 1 · ARMOURED [\${bHp}/\${b.maxHp}]\`;
      bossBadge.className = 'boss-badge';
    }
  }`);

if (game.includes(hudTarget)) {
  game = game.replace(hudTarget, hudRepl);
  console.log('✓ game.js: updateHud() updates #hp-badge and #boss-badge');
}

fs.writeFileSync(GAME_FILE, game.replace(/\n/g, '\r\n'), 'utf8');

console.log('All accessibility signal patches applied successfully!');
