// ============================================================
// ELAH WARRIOR — Option 3: Co-Op Invite Links + Auto-Reconnect
// ============================================================
// Adds:
//  1. Auto-generate shareable invite URL (#coop=ROOM_CODE) on
//     room creation, displayed in the lobby.
//  2. On page load, detect #coop=CODE in the URL hash and
//     auto-open the multiplayer modal + join the specified room.
//  3. "📋 COPY INVITE LINK" button in the room lobby view.
//  4. WebSocket graceful reconnect: if the connection drops
//     mid-match or in lobby, automatically retry up to 5 times
//     with exponential backoff before showing an error toast.
// ============================================================

const fs   = require('fs');
const path = require('path');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

const GAME = path.join(__dirname, '..', 'js', 'game.js');
let src = norm(fs.readFileSync(GAME, 'utf8'));

// ── 1. Add invite link generation in renderLobbyView ─────────
// Inject the copy-invite-link section right after mp-room-code is set
const lobbyRoomCodeTarget = norm(`  $('mp-room-code').textContent = room.code;
  $('mp-room-mode-tag').textContent = room.mode === 'pvp' ? 'PVP DUEL' : 'CO-OP CAMPAIGN';
  $('mp-player-count').textContent = room.players.length;`);

const lobbyRoomCodeRepl = norm(`  $('mp-room-code').textContent = room.code;
  $('mp-room-mode-tag').textContent = room.mode === 'pvp' ? 'PVP DUEL' : 'CO-OP CAMPAIGN';
  $('mp-player-count').textContent = room.players.length;

  // ── Invite link: build and display ─────────────────────────
  const baseUrl = location.origin + location.pathname;
  const inviteUrl = baseUrl + '#coop=' + encodeURIComponent(room.code);
  const inviteLinkEl = $('mp-invite-link');
  if (inviteLinkEl) inviteLinkEl.textContent = inviteUrl;
  const copyBtn = $('mp-copy-invite');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        copyBtn.textContent = '✅ COPIED!';
        setTimeout(() => { copyBtn.textContent = '📋 COPY INVITE LINK'; }, 2200);
      } catch (e) {
        // Fallback: select the text
        const r = document.createRange();
        r.selectNode(inviteLinkEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(r);
        copyBtn.textContent = '📋 SELECT & COPY';
        setTimeout(() => { copyBtn.textContent = '📋 COPY INVITE LINK'; }, 2500);
      }
    };
  }`);

if (src.includes(lobbyRoomCodeTarget)) {
  src = src.replace(lobbyRoomCodeTarget, lobbyRoomCodeRepl);
  console.log('✓ renderLobbyView: invite link generation added');
} else if (src.includes('mp-invite-link')) {
  console.log('  (Invite link already patched — skipping)');
} else {
  console.log('✗ renderLobbyView target not found'); process.exit(1);
}

// ── 2. Add auto-join from #coop= URL hash after initMultiplayerUI ──
const initMPEndTarget = norm(`  NET.on('chat', msg => {
    toast(\`<b>\${msg.name}:</b> \${msg.text}\`, 3500);
  });
}`);

const initMPEndRepl = norm(`  NET.on('chat', msg => {
    toast(\`<b>\${msg.name}:</b> \${msg.text}\`, 3500);
  });

  // ── Auto-join from invite URL hash (#coop=ROOM_CODE) ───────
  const hashJoin = (() => {
    try {
      const h = location.hash;
      if (!h.startsWith('#coop=')) return null;
      return decodeURIComponent(h.slice(6)).trim();
    } catch (e) { return null; }
  })();

  if (hashJoin) {
    // Clear the hash so reloads don't re-join
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(async () => {
      audioInit();
      show('menu', false);
      if (mpModal) mpModal.classList.remove('hidden');
      const browserView = $('mp-view-browser');
      const roomView = $('mp-view-room');
      if (browserView) browserView.classList.remove('hidden');
      if (roomView) roomView.classList.add('hidden');
      toast('⚔️ Joining co-op realm via invite link…', 2500);
      try {
        await NET.connect();
        const nm = (nameInput && nameInput.value) || (localStorage.getItem('elah_mp_name') || 'Warrior');
        NET.joinRoom(hashJoin, nm.trim(), mpSelectedHero);
      } catch (e) {
        toast('Could not connect to multiplayer server', 3000);
      }
    }, 1200); // slight delay so the game finishes loading
  }
}`);

if (src.includes(initMPEndTarget)) {
  src = src.replace(initMPEndTarget, initMPEndRepl);
  console.log('✓ initMultiplayerUI: #coop= URL hash auto-join added');
} else if (src.includes('hashJoin')) {
  console.log('  (Auto-join hash already patched — skipping)');
} else {
  console.log('✗ initMultiplayerUI end target not found'); process.exit(1);
}

// ── 3. Add reconnect logic to NET connection handling ─────────
// Inject reconnect handling right after the NET.connect call in the MP button handler
const netConnectTarget = norm(`    btnMp.onclick = async () => {
      audioInit();
      show('menu', false);
      mpModal.classList.remove('hidden');
      $('mp-view-browser').classList.remove('hidden');
      $('mp-view-room').classList.add('hidden');
      try {
        await NET.connect();
        NET.listRooms();
      } catch (e) {
        toast('Could not connect to multiplayer server', 3000);
      }
    };`);

const netConnectRepl = norm(`    btnMp.onclick = async () => {
      audioInit();
      show('menu', false);
      mpModal.classList.remove('hidden');
      $('mp-view-browser').classList.remove('hidden');
      $('mp-view-room').classList.add('hidden');
      try {
        await NET.connect();
        NET.listRooms();
        // ── Graceful auto-reconnect ────────────────────────────
        NET.onDisconnect = async () => {
          if (!mpModal || mpModal.classList.contains('hidden')) return;
          let attempt = 0;
          const MAX_RETRIES = 5;
          const delay = (ms) => new Promise(r => setTimeout(r, ms));
          while (attempt < MAX_RETRIES) {
            attempt++;
            const wait = Math.min(1000 * Math.pow(2, attempt - 1), 16000); // 1s, 2s, 4s, 8s, 16s
            toast(\`🔄 Connection lost — reconnecting (\${attempt}/\${MAX_RETRIES})…\`, wait - 100);
            await delay(wait);
            try {
              await NET.connect();
              if (NET.room) {
                NET.rejoinRoom(NET.room.code, NET.name, mpSelectedHero);
                toast('✅ Reconnected to realm!', 2500);
              } else {
                NET.listRooms();
              }
              return; // Success — stop retry loop
            } catch (re) { /* keep retrying */ }
          }
          toast('❌ Could not reconnect. Please refresh and try again.', 5000);
        };
      } catch (e) {
        toast('Could not connect to multiplayer server', 3000);
      }
    };`);

if (src.includes(netConnectTarget)) {
  src = src.replace(netConnectTarget, netConnectRepl);
  console.log('✓ btn-mp: graceful auto-reconnect with exponential backoff added');
} else if (src.includes('onDisconnect')) {
  console.log('  (Reconnect handler already patched — skipping)');
} else {
  console.log('✗ btn-mp onclick target not found'); process.exit(1);
}

// Write game.js
fs.writeFileSync(GAME, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ js/game.js written');

// ── 4. Patch index.html — add invite link UI to room lobby view ──
const HTML = path.join(__dirname, '..', 'index.html');
let html = norm(fs.readFileSync(HTML, 'utf8'));

// Find the mp-room-code display area and add the invite link section after it
const mpRoomCodeTarget = norm(`id="mp-room-code"`);
// Search context to find the right place
const mpRoomLineIdx = html.indexOf('mp-room-code');
if (mpRoomLineIdx === -1) {
  console.log('✗ Could not find mp-room-code in index.html');
  process.exit(1);
}

// Find the closing of that element's parent row to inject invite UI after it
// Look for the mp-player-count area, then inject after the roster container
const mpCodesArea = html.indexOf('mp-room-code-tag');
if (mpCodesArea === -1) {
  // Search for the room code element used in the lobby view
  // We need to add the invite section inside mp-view-room if it's in HTML
  const mpViewRoom = html.indexOf('mp-view-room');
  if (mpViewRoom === -1) {
    console.log('- mp-view-room not found in HTML (may be generated dynamically — skipping HTML patch)');
  } else {
    console.log('- mp-view-room exists but mp-room-code-tag not found (dynamic HTML)');
  }
} else {
  console.log('- mp-room-code-tag found — skipping static HTML patch (room view is dynamic)');
}

// The room lobby view is rendered dynamically in renderLobbyView() — we need to patch
// the roster builder to include the invite section in the DOM
// Add the invite link elements to the roster render in game.js after players list

const rosterBuildTarget = norm(`  const rosterBox = $('mp-players-roster');
  if (rosterBox) {
    rosterBox.innerHTML = '';
    for (const p of room.players) {`);

const rosterBuildRepl = norm(`  // ── Invite link section (create if not already in DOM) ──
  let inviteSection = $('mp-invite-section');
  if (!inviteSection) {
    inviteSection = document.createElement('div');
    inviteSection.id = 'mp-invite-section';
    inviteSection.className = 'mp-invite-section';
    inviteSection.innerHTML = \`
      <div class="mp-invite-label">📨 INVITE A WARRIOR</div>
      <div class="mp-invite-url" id="mp-invite-link">…</div>
      <button class="mp-copy-invite-btn ghost-sm" id="mp-copy-invite">📋 COPY INVITE LINK</button>
    \`;
    const roomView = $('mp-view-room');
    if (roomView) roomView.insertBefore(inviteSection, roomView.querySelector('.mp-players-section') || roomView.firstChild);
  }

  const rosterBox = $('mp-players-roster');
  if (rosterBox) {
    rosterBox.innerHTML = '';
    for (const p of room.players) {`);

if (src.includes(rosterBuildTarget)) {
  // Apply this second patch to game.js
  let src2 = norm(fs.readFileSync(GAME, 'utf8'));
  if (!src2.includes('mp-invite-section')) {
    src2 = src2.replace(rosterBuildTarget, rosterBuildRepl);
    fs.writeFileSync(GAME, src2.replace(/\n/g, '\r\n'), 'utf8');
    console.log('✓ renderLobbyView: invite section DOM injection added');
  } else {
    console.log('  (invite-section DOM injection already present)');
  }
} else {
  console.log('  (roster build target not found — may be already patched)');
}

// ── 5. Patch style.css — invite link styles ──────────────────
const CSS = path.join(__dirname, '..', 'style.css');
let css = norm(fs.readFileSync(CSS, 'utf8'));

const inviteCSS = norm(`
/* ── Co-Op Invite Link Section ─────────────────────────────── */
.mp-invite-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 10px 0 14px 0;
  padding: 10px 14px;
  background: rgba(30, 18, 6, 0.75);
  border: 1px solid rgba(220, 170, 80, 0.4);
  border-radius: 10px;
}
.mp-invite-label {
  font: 700 10px system-ui, sans-serif;
  letter-spacing: .18em;
  color: var(--gold, #e8c46a);
}
.mp-invite-url {
  font: 400 10px system-ui, monospace;
  color: rgba(220, 200, 150, 0.85);
  word-break: break-all;
  text-align: center;
  max-width: 320px;
}
.mp-copy-invite-btn {
  padding: 6px 16px;
  font: 700 10px system-ui, sans-serif;
  letter-spacing: .14em;
  background: rgba(60, 40, 15, 0.9);
  border: 1px solid rgba(220, 170, 80, 0.55);
  border-radius: 6px;
  color: var(--gold, #e8c46a);
  cursor: pointer;
  transition: background .2s;
}
.mp-copy-invite-btn:hover { background: rgba(100, 65, 20, 0.95); }
`);

if (!css.includes('mp-invite-section')) {
  css += inviteCSS;
  fs.writeFileSync(CSS, css.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ style.css: Invite link section styles added');
} else {
  console.log('  (invite CSS already present)');
}

console.log('All Option 3 patches applied!');
