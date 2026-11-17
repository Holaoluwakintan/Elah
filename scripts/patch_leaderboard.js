// ============================================================
// ELAH WARRIOR — Feature B: Hall of Valor Leaderboard
// ============================================================
// • server.js: GET /api/leaderboard + POST /api/score (file-backed)
// • index.html: 🏆 HALL OF VALOR button + modal
// • game.js: submit score on winGame(), fetch on menu open
// • style.css: leaderboard modal + trophy table styles
// ============================================================

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const SERVER_JS = path.join(ROOT, 'server.js');
const GAME_JS   = path.join(ROOT, 'js', 'game.js');
const INDEX_HTML= path.join(ROOT, 'index.html');
const STYLE_CSS = path.join(ROOT, 'style.css');

let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function writeCRLF(file, content) { fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8'); }
function writeLF(file, content)   { fs.writeFileSync(file, content, 'utf8'); }

function patch(file, label, search, replacement, crlf = false) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = norm(raw);
  const searchN = norm(search);
  if (!src.includes(searchN)) {
    console.error(`✗ PATCH TARGET NOT FOUND [${label}]`);
    errors++;
    return;
  }
  const replaced = src.replace(searchN, norm(replacement));
  crlf ? writeCRLF(file, replaced) : writeLF(file, replaced);
  console.log(`✓ ${label}`);
}

// ============================================================
// 1. SERVER.JS — Add leaderboard REST endpoints
// ============================================================
patch(SERVER_JS, 'server.js — leaderboard REST API',
`server.listen(port, () => {
  console.log(\`Server listening on http://localhost:\${port}\`);
  console.log(\`WebSocket multiplayer ready on ws://localhost:\${port}\`);
});`,
`// ------------------------------------------------------------------ Leaderboard API
const SCORES_FILE = path.join(root, 'scores.json');

function readScores() {
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch { return []; }
}
function writeScores(arr) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(arr.slice(0, 100), null, 2), 'utf8');
}

server.on('request', (req, res) => {
  if (req.method === 'GET' && req.url === '/api/leaderboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(readScores()));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/score') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.name || typeof entry.kills !== 'number') {
          res.writeHead(400); res.end('Bad payload'); return;
        }
        const scores = readScores();
        scores.push({
          name:  String(entry.name).slice(0, 20),
          hero:  String(entry.hero  || 'david').slice(0, 16),
          level: Number(entry.level || 1),
          kills: Math.round(entry.kills),
          time:  Math.round(entry.time  || 0),
          date:  new Date().toISOString().slice(0, 10)
        });
        scores.sort((a, b) => b.kills - a.kills);
        writeScores(scores);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ rank: scores.findIndex(s => s.name === entry.name && s.kills === entry.kills) + 1 }));
      } catch { res.writeHead(400); res.end('Parse error'); }
    });
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
});

server.listen(port, () => {
  console.log(\`Server listening on http://localhost:\${port}\`);
  console.log(\`WebSocket multiplayer ready on ws://localhost:\${port}\`);
});`);

// ============================================================
// 2. INDEX.HTML — Hall of Valor button in menu + modal
// ============================================================
patch(INDEX_HTML, 'index.html — Hall of Valor button',
`    <button id="btn-mp" class="gold mp-btn" style="margin-top:2px;box-shadow:0 6px 24px rgba(220,150,40,.45);">⚔️ MULTIPLAYER REALM</button>`,
`    <button id="btn-mp" class="gold mp-btn" style="margin-top:2px;box-shadow:0 6px 24px rgba(220,150,40,.45);">⚔️ MULTIPLAYER REALM</button>
    <button id="btn-leaderboard" class="gold" style="margin-top:2px;background:linear-gradient(180deg,#5a3a1a,#2a1a08);box-shadow:0 4px 18px rgba(180,120,30,.4);letter-spacing:.1em;">🏆 HALL OF VALOR · RANKINGS</button>`);

// ============================================================
// 3. INDEX.HTML — Leaderboard modal (before closing </body>)
// ============================================================
patch(INDEX_HTML, 'index.html — leaderboard modal HTML',
`</body>`,
`<!-- Hall of Valor Leaderboard Modal -->
<div id="lb-modal" class="hidden" style="position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);">
  <div style="background:linear-gradient(180deg,#1a0e04,#0d0804);border:1.5px solid rgba(220,170,80,0.4);border-radius:14px;width:min(560px,96vw);max-height:88vh;overflow-y:auto;padding:28px 24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
      <div>
        <div style="font-size:11px;letter-spacing:.18em;color:#a09070;margin-bottom:4px;">BLOSSOM PRESENTS</div>
        <div style="font-size:22px;font-weight:bold;color:#ffd36a;letter-spacing:.12em;">🏆 HALL OF VALOR</div>
      </div>
      <button id="lb-close" style="background:none;border:none;color:#a09070;font-size:22px;cursor:pointer;">✕</button>
    </div>
    <div style="font-size:11px;color:#8a7050;margin-bottom:14px;text-align:center;letter-spacing:.08em;">"The LORD is a man of war." — Exodus 15:3</div>
    <div id="lb-tabs" style="display:flex;gap:8px;margin-bottom:16px;">
      <button class="lb-tab active" data-tab="kills" style="flex:1;padding:7px;border:1px solid rgba(220,170,80,0.35);border-radius:7px;background:rgba(255,211,106,0.12);color:#ffd36a;font-size:12px;letter-spacing:.08em;cursor:pointer;">⚔️ MOST KILLS</button>
      <button class="lb-tab" data-tab="speed" style="flex:1;padding:7px;border:1px solid rgba(255,255,255,0.1);border-radius:7px;background:rgba(255,255,255,0.03);color:#a09070;font-size:12px;letter-spacing:.08em;cursor:pointer;">⚡ SPEED RUN</button>
    </div>
    <div id="lb-list" style="min-height:200px;">
      <div style="text-align:center;color:#6a5a40;padding:40px;">Loading the chronicles…</div>
    </div>
    <div id="lb-my-rank" style="margin-top:14px;padding:10px 14px;background:rgba(255,211,106,0.07);border:1px solid rgba(220,170,80,0.2);border-radius:8px;font-size:12px;color:#c8b98a;text-align:center;display:none;"></div>
  </div>
</div>
</body>`);

// ============================================================
// 4. GAME.JS — Submit score on winGame() + leaderboard fetch
// ============================================================
patch(GAME_JS, 'game.js — submit score on winGame',
`  if (BOT && Q.has('chain') && NX) setTimeout(() => $('btn-next').click(), 3500);
}`,
`  if (BOT && Q.has('chain') && NX) setTimeout(() => $('btn-next').click(), 3500);

  // ── Submit score to Hall of Valor leaderboard ─────────────
  submitScore();
}

function submitScore() {
  try {
    const name = (localStorage.getItem('elah_mp_name') || localStorage.getItem('elah-player-name') || 'Anonymous').slice(0, 20);
    const hero = ($('who-name') && $('who-name').textContent) || 'DAVID';
    const payload = { name, hero: hero.toLowerCase(), level: LEVEL, kills: G.kills, time: Math.round(now() - G.t0) };
    fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json())
      .then(d => {
        if (d.rank && d.rank <= 10) {
          setTimeout(() => toast(\`🏆 YOU RANKED #\${d.rank} IN THE HALL OF VALOR!\`, 5000), 1200);
          if (d.rank === 1) { bloomPulse && bloomPulse(2.0, 1.0); SFX.shofar && SFX.shofar(); }
        }
      })
      .catch(() => {}); // silent fail — leaderboard is optional
  } catch (e) {}
}`, true);

// ============================================================
// 5. GAME.JS — Leaderboard modal open/close + fetch
// ============================================================
patch(GAME_JS, 'game.js — leaderboard modal UI init',
`// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);`,
`// Initialize UI when document is ready
setTimeout(initMultiplayerUI, 300);

// ── Hall of Valor Leaderboard ────────────────────────────────
let lbCurrentTab = 'kills';

function openLeaderboard() {
  const modal = $('lb-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  fetchLeaderboard();
}

function fetchLeaderboard() {
  const listEl = $('lb-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center;color:#6a5a40;padding:40px;">Loading the chronicles…</div>';
  fetch('/api/leaderboard')
    .then(r => r.json())
    .then(scores => renderLeaderboard(scores))
    .catch(() => {
      listEl.innerHTML = '<div style="text-align:center;color:#6a5a40;padding:40px;">Chronicles unavailable — the server must be running locally.</div>';
    });
}

function renderLeaderboard(scores) {
  const listEl = $('lb-list');
  if (!listEl) return;
  if (!scores || scores.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;color:#6a5a40;padding:40px;">No warriors recorded yet. Be the first!</div>';
    return;
  }
  const sorted = lbCurrentTab === 'speed'
    ? [...scores].filter(s => s.time > 0).sort((a, b) => a.time - b.time)
    : [...scores].sort((a, b) => b.kills - a.kills);

  const HERO_EMOJI = { david:'👑', samson:'💪', benaiah:'🦁', joshua:'⚔️', gideon:'🔥', elijah:'⚡', hezekiah:'🛡️', jonah:'🐋', barak:'⛈️' };
  const LEVEL_NAMES = { 1:'Valley of Elah', 2:'Lehi', 3:'Hobah', 4:'The Pit', 5:'Kishon', 6:'Adullam', 7:'Jericho', 8:'Midian', 9:'Den of Lions', 10:'Carmel', 11:'Jerusalem', 12:'The Deep' };

  listEl.innerHTML = sorted.slice(0, 20).map((s, i) => {
    const em = HERO_EMOJI[s.hero] || '⚔️';
    const rank = i + 1;
    const rankStyle = rank === 1 ? 'color:#ffd36a;font-size:16px;' : rank === 2 ? 'color:#c0c0c0;' : rank === 3 ? 'color:#cd7f32;' : 'color:#6a5a40;';
    const stat = lbCurrentTab === 'speed'
      ? \`\${Math.floor(s.time/60)}:\${String(s.time%60).padStart(2,'0')}\`
      : \`\${s.kills.toLocaleString()} kills\`;
    return \`<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.05);\${rank===1?'background:rgba(255,211,106,0.07);border-radius:7px;':''}">
      <span style="width:28px;text-align:center;font-weight:bold;\${rankStyle}">\${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</span>
      <span style="font-size:18px;">\${em}</span>
      <span style="flex:1;font-size:13px;color:#f3e2c0;font-weight:bold;">\${s.name}</span>
      <span style="font-size:11px;color:#8a7050;">\${LEVEL_NAMES[s.level] || 'Level '+s.level}</span>
      <span style="font-size:12px;color:#ffd36a;font-weight:bold;">\${stat}</span>
    </div>\`;
  }).join('');
}

setTimeout(() => {
  const btnLb = $('btn-leaderboard');
  const lbModal = $('lb-modal');
  const lbClose = $('lb-close');
  const lbTabs = document.querySelectorAll('.lb-tab');

  if (btnLb) {
    btnLb.onclick = () => {
      audioInit();
      show('menu', false);
      openLeaderboard();
    };
  }
  if (lbClose) {
    lbClose.onclick = () => {
      lbModal.classList.add('hidden');
      show('menu', true);
    };
  }
  if (lbTabs) {
    lbTabs.forEach(tab => {
      tab.onclick = () => {
        lbTabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = 'rgba(255,255,255,0.03)';
          t.style.borderColor = 'rgba(255,255,255,0.1)';
          t.style.color = '#a09070';
        });
        tab.classList.add('active');
        tab.style.background = 'rgba(255,211,106,0.12)';
        tab.style.borderColor = 'rgba(220,170,80,0.35)';
        tab.style.color = '#ffd36a';
        lbCurrentTab = tab.dataset.tab;
        fetchLeaderboard();
      };
    });
  }
}, 320);`, true);

// ============================================================
// SUMMARY
// ============================================================
if (errors === 0) {
  console.log('\n🏆 Feature B — Hall of Valor Leaderboard complete!');
  console.log('   • server.js: GET /api/leaderboard + POST /api/score (scores.json)');
  console.log('   • index.html: 🏆 HALL OF VALOR button + modal with tabs');
  console.log('   • game.js: submitScore() on winGame(), top-10 rank toast');
  console.log('   • Leaderboard tabs: Most Kills | Speed Run');
  console.log('   • Hero emojis, level names, rank medals 🥇🥈🥉');
} else {
  console.error(`\n✗ ${errors} patch(es) failed — check targets above.`);
  process.exit(1);
}
