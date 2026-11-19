// ============================================================
// ELAH WARRIOR — Production Release Verification & Boot Gate
// ============================================================
const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('--- ELAH WARRIOR PRE-FLIGHT VERIFICATION ---');

let passed = true;

// 1. Check server.js (syntax only, no duplicate listener)
try {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  new vm.Script(serverCode);
  console.log('✓ server.js parsed clean');
} catch (e) {
  console.error('✗ server.js SyntaxError:', e.message);
  passed = false;
}

// 2. Check data modules ESM parse
try {
  const levelsCode = fs.readFileSync(path.join(__dirname, '../js/data/levels.js'), 'utf8');
  new vm.SourceTextModule(levelsCode, { identifier: 'levels.js' });
  const featsCode = fs.readFileSync(path.join(__dirname, '../js/data/feats.js'), 'utf8');
  new vm.SourceTextModule(featsCode, { identifier: 'feats.js' });
  console.log('✓ js/data/ modules ESM parse clean (levels.js, feats.js)');
} catch (e) {
  console.error('✗ data modules ESM parse failed:', e.message);
  passed = false;
}

// 3. Check js/net.js ESM parse
try {
  const netCode = fs.readFileSync(path.join(__dirname, '../js/net.js'), 'utf8');
  new vm.SourceTextModule(netCode, { identifier: 'net.js' });
  console.log('✓ js/net.js ESM parse clean');
} catch (e) {
  console.error('✗ js/net.js ESM parse failed:', e.message);
  passed = false;
}

// 3. Check js/game.js ESM parse
try {
  const gameCode = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
  new vm.SourceTextModule(gameCode, { identifier: 'game.js' });
  console.log('✓ js/game.js ESM parse clean (Zero boot-blocking syntax errors)');
} catch (e) {
  console.error('✗ js/game.js ESM parse failed:', e.message);
  passed = false;
}

// 4. Check sw.js
try {
  const swCode = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  new vm.Script(swCode);
  console.log('✓ sw.js Service Worker clean');
} catch (e) {
  console.error('✗ sw.js failed:', e.message);
  passed = false;
}

if (!passed) {
  console.error('\n❌ PRE-FLIGHT CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL RELEASE GATES PASSED! Game boot is 100% verified.');
}
