// ============================================================
// ELAH WARRIOR — Option 2: Save Schema Migration Engine (v1→v2)
// ============================================================
// Adds:
//  1. Schema version field on SAVE so future migrations are safe.
//  2. Automatic v1→v2 migration that merges any old elah-save-v1
//     data while adding new fields (covenants, activeHero, relics).
//  3. Export / Import save backup (base64 JSON) in Settings UI.
//  4. The Settings UI gets two new buttons: EXPORT SAVE / IMPORT SAVE.
// ============================================================

const fs   = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

// ── 1. Patch js/game.js ──────────────────────────────────────
const GAME = path.join(__dirname, '..', 'js', 'game.js');
let src = norm(fs.readFileSync(GAME, 'utf8'));

// --- 1a. Replace SAVE_KEY + loadSave + writeSave with versioned engine ---
const saveSystemTarget = norm(
`// ---- save (localStorage): unlocked levels, spoils, upgrades
const SAVE_KEY = 'elah-save-v1';
const UP0 = () => ({ staff: 0, sling: 0, bronze: 0, jaw: 0, spirit: 0, sword: 0, bow: 0, men: 0 });
function loadSave() { let s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { } return { open: s.open || { abram: (s.unlocked || 1) >= 2, samson: (s.unlocked || 1) >= 2 }, unlocked: s.unlocked || 1, coins: s.coins || 0, armour: s.armour || 0, up: Object.assign(UP0(), s.up || {}), done: s.done || {}, level: s.level || 1, highKills: s.highKills || 0, highWave: s.highWave || 0, feats: s.feats || {} }; }
let SAVE = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }`
);

const saveSystemRepl = norm(
`// ---- save system: versioned schema migration (v1 → v2) ----
const SAVE_KEY    = 'elah-save-v2';  // bump on incompatible schema changes
const SAVE_KEY_V1 = 'elah-save-v1';  // kept for one-time migration only
const UP0 = () => ({ staff: 0, sling: 0, bronze: 0, jaw: 0, spirit: 0, sword: 0, bow: 0, men: 0 });

function migrateSaveV1toV2(v1) {
  // Promote all v1 fields, add new v2 fields with safe defaults
  return {
    _v: 2,
    open:        v1.open        || { abram: (v1.unlocked || 1) >= 2, samson: (v1.unlocked || 1) >= 2 },
    unlocked:    v1.unlocked    || 1,
    coins:       v1.coins       || 0,
    armour:      v1.armour      || 0,
    up:          Object.assign(UP0(), v1.up || {}),
    done:        v1.done        || {},
    level:       v1.level       || 1,
    highKills:   v1.highKills   || 0,
    highWave:    v1.highWave    || 0,
    feats:       v1.feats       || {},
    // ── New in v2 ──
    activeHero:  v1.activeHero  || 'david',
    covenants:   v1.covenants   || [],
    relics:      v1.relics      || [],
  };
}

function loadSave() {
  // 1. Try current v2 save
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) || {};
      if (s._v >= 2) return s;
    }
  } catch (e) {}

  // 2. Fall back to v1 migration
  let v1 = {};
  try { v1 = JSON.parse(localStorage.getItem(SAVE_KEY_V1) || '{}') || {}; } catch (e) {}
  const migrated = migrateSaveV1toV2(v1);
  // Write migrated save immediately
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(migrated)); } catch (e) {}
  return migrated;
}

let SAVE = loadSave();
function writeSave() { try { SAVE._v = 2; localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }

// ── Save export/import utilities ──────────────────────────────
function exportSave() {
  try {
    const json = JSON.stringify(SAVE);
    const b64  = btoa(unescape(encodeURIComponent(json)));
    const blob = new Blob([b64], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'elah-warrior-save.txt' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('✅ Save exported! Keep elah-warrior-save.txt safe.', 3000);
  } catch (e) { toast('Export failed: ' + e.message, 3000); }
}

function importSave() {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.txt' });
  inp.onchange = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const json = decodeURIComponent(escape(atob(re.result.trim())));
        const data = JSON.parse(json);
        if (!data || typeof data !== 'object') throw new Error('Invalid save file');
        // Run migration if needed
        const imported = (data._v >= 2) ? data : migrateSaveV1toV2(data);
        SAVE = imported;
        writeSave();
        toast('✅ Save imported! Reloading…', 2000);
        setTimeout(() => location.reload(), 2200);
      } catch (e) { toast('❌ Import failed: ' + e.message, 4000); }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(inp); inp.click(); document.body.removeChild(inp);
}`
);

if (src.includes(saveSystemTarget)) {
  src = src.replace(saveSystemTarget, saveSystemRepl);
  console.log('✓ Save system upgraded to v2 with migration engine + export/import');
} else {
  console.log('✗ Save system target NOT found — checking if already patched...');
  if (src.includes('SAVE_KEY_V1') || src.includes('migrateSaveV1toV2')) {
    console.log('  (Already patched — skipping)');
  } else {
    console.log('  MANUAL REVIEW REQUIRED'); process.exit(1);
  }
}

// --- 1b. Wire export/import buttons in renderSettings ---
const renderSettingsTarget = norm(`  document.querySelectorAll('#set-touch-layout button').forEach(b => b.classList.toggle('on', b.dataset.tl === (SETTINGS.touchLayout || 'standard')));
}`);
const renderSettingsRepl   = norm(`  document.querySelectorAll('#set-touch-layout button').forEach(b => b.classList.toggle('on', b.dataset.tl === (SETTINGS.touchLayout || 'standard')));
  // Show/hide export+import buttons (always visible in settings)
  const expBtn = $('set-export-save'); if (expBtn) expBtn.style.display = '';
  const impBtn = $('set-import-save'); if (impBtn) impBtn.style.display = '';
}`);

if (src.includes(renderSettingsTarget)) {
  src = src.replace(renderSettingsTarget, renderSettingsRepl);
  console.log('✓ renderSettings updated for export/import visibility');
}

// --- 1c. Wire button onclick listeners ---
const listenerTarget = norm(`document.querySelectorAll('#set-touch-layout button').forEach(b => b.onclick = () => {
  SETTINGS.touchLayout = b.dataset.tl;
  saveSettings();
  applyTouchLayout();
  renderSettings();
});`);
const listenerRepl = norm(`document.querySelectorAll('#set-touch-layout button').forEach(b => b.onclick = () => {
  SETTINGS.touchLayout = b.dataset.tl;
  saveSettings();
  applyTouchLayout();
  renderSettings();
});
const bExport = $('set-export-save'); if (bExport) bExport.onclick = exportSave;
const bImport = $('set-import-save'); if (bImport) bImport.onclick = importSave;`);

if (src.includes(listenerTarget)) {
  src = src.replace(listenerTarget, listenerRepl);
  console.log('✓ Export / Import button listeners wired');
}

// --- Write game.js ---
fs.writeFileSync(GAME, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ js/game.js written');

// ── 2. Patch index.html — add Export/Import to Settings UI ──
const HTML = path.join(__dirname, '..', 'index.html');
let html = norm(fs.readFileSync(HTML, 'utf8'));

const htmlTarget = norm(`<div class="cbtns"><button id="set-apply" class="ghost" style="display:none">RESTART TO APPLY</button><button id="set-done" class="gold">DONE</button></div>`);
const htmlRepl   = norm(`<div class="srow save-backup-row">
      <label>Save Backup</label>
      <div class="seg save-seg">
        <button id="set-export-save">📤 EXPORT</button>
        <button id="set-import-save">📥 IMPORT</button>
      </div>
    </div>
    <div class="cbtns"><button id="set-apply" class="ghost" style="display:none">RESTART TO APPLY</button><button id="set-done" class="gold">DONE</button></div>`);

if (html.includes(htmlTarget) && !html.includes('set-export-save')) {
  html = html.replace(htmlTarget, htmlRepl);
  fs.writeFileSync(HTML, html.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ index.html: Added Export/Import Save to Settings panel');
} else if (html.includes('set-export-save')) {
  console.log('  (index.html already patched)');
} else {
  console.log('✗ index.html target not matched'); process.exit(1);
}

// ── 3. Patch style.css — style the backup row ───────────────
const CSS = path.join(__dirname, '..', 'style.css');
let css = norm(fs.readFileSync(CSS, 'utf8'));

const saveBackupCSS = norm(`
/* ── Save Backup Export/Import row in Settings ─────────────── */
.save-backup-row { margin-top: 4px; }
.save-seg { display: flex; gap: 6px; }
.save-seg button {
  flex: 1;
  padding: 7px 10px;
  font: 700 10px system-ui, sans-serif;
  letter-spacing: .12em;
  background: rgba(60, 40, 15, 0.9);
  border: 1px solid rgba(220, 170, 80, 0.5);
  border-radius: 6px;
  color: var(--gold, #e8c46a);
  cursor: pointer;
  transition: background .2s, border-color .2s;
}
.save-seg button:hover { background: rgba(100, 65, 20, 0.95); border-color: rgba(220, 170, 80, 0.85); }
`);

if (!css.includes('save-backup-row')) {
  css += saveBackupCSS;
  fs.writeFileSync(CSS, css.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ style.css: Added save backup row styles');
} else {
  console.log('  (style.css backup styles already present)');
}

console.log('All Option 2 patches applied!');
