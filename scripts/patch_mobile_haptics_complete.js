const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

// 1. hitstop
if (raw.includes('function hitstop(t, dir = null) {') && !raw.includes("haptic && haptic('hit');")) {
  raw = raw.replace(
    'function hitstop(t, dir = null) {',
    "function hitstop(t, dir = null) {\r\n  haptic && haptic('hit');"
  );
  console.log('✓ hitstop haptic patched');
} else {
  console.log('- hitstop already patched or not found');
}

// 2. startDodge
if (raw.includes('function startDodge(iv) {') && !raw.includes("haptic && haptic('dodge');")) {
  raw = raw.replace(
    'function startDodge(iv) {',
    "function startDodge(iv) {\r\n  haptic && haptic('dodge');"
  );
  console.log('✓ startDodge haptic patched');
} else {
  console.log('- startDodge already patched or not found');
}

// 3. damagePlayer
if (raw.includes('function damagePlayer(dmg, from) {') && !raw.includes("haptic && haptic('damage');")) {
  raw = raw.replace(
    'function damagePlayer(dmg, from) {',
    "function damagePlayer(dmg, from) {\r\n  haptic && haptic('damage');"
  );
  console.log('✓ damagePlayer haptic patched');
} else {
  console.log('- damagePlayer already patched or not found');
}

fs.writeFileSync(GAME_JS, raw, 'utf8');
console.log('Done!');
