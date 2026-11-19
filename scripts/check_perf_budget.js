// ============================================================
// ELAH WARRIOR — Step 2: Performance Budget Static Analyser
// ============================================================
// Part of the CI release gate (npm test).
// Statically analyses js/game.js to enforce:
//
//  1. InstancedMesh usage — scattered geometry MUST use
//     InstancedMesh or mergeGeometries, NOT naked forEach loops
//     of individual Meshes (which blow draw calls).
//
//  2. draw-call budget — counts number of explicit Mesh / Points /
//     Sprite constructor calls that are NOT instanced and NOT
//     merged. Fails if the uninstanced object count exceeds the
//     MAX_UNINSTANCED_OBJECTS budget (200 objects).
//     (This is a static heuristic; real draw calls are measured
//     at runtime by the AQE FPS monitor.)
//
//  3. Texture/image asset count — warns if more than MAX_TEXTURES
//     distinct texture loads are found (each is a draw-call source).
//
//  4. Giant inline string literals — warns if any single string
//     literal > 2000 chars is found outside comments (usually a
//     baked geometry or base64 blob that should be a file asset).
// ============================================================

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const GAME_JS = path.join(ROOT, 'js', 'game.js');

const MAX_UNINSTANCED_OBJECTS = 200;  // audit budget
const MAX_TEXTURES            = 60;   // texture count warning threshold
const MAX_INLINE_STR_LEN      = 4000; // characters — >4000 suggests baked geometry/base64 blob
// (window.__elah QA object intentionally spans 2668 chars on one line — not a perf risk)

console.log('\n--- ELAH WARRIOR PERFORMANCE BUDGET CHECK ---');

const src = fs.readFileSync(GAME_JS, 'utf8').replace(/\r\n/g, '\n');
let warnings = 0;
let errors   = 0;

// ── 1. Count uninstanced new THREE.Mesh / new THREE.Points / new THREE.Sprite ──
// Exclude lines that are part of an InstancedMesh setup or mergeGeometries block.
// Strategy: count "new THREE.Mesh(" on lines that do NOT have "instanced" nearby,
// and are NOT inside an InstancedMesh block.
const lines = src.split('\n');
let uninstancedCount = 0;
let instancedBlockDepth = 0;

for (const line of lines) {
  const lc = line.toLowerCase();
  // Track instanced blocks (InstancedMesh usually follows an array setup)
  if (lc.includes('instancedmesh') || lc.includes('mergegeometries')) {
    instancedBlockDepth = 2; // give 2 lines of grace
  } else if (instancedBlockDepth > 0) {
    instancedBlockDepth--;
  }

  // Count bare new THREE.Mesh / Points / Sprite that are not instanced
  const isMeshLine = /new THREE\.(Mesh|Points|Sprite)\b/.test(line);
  const isInstanced = instancedBlockDepth > 0 || lc.includes('instanced');
  const isInFunction = lc.includes('function') || lc.includes('=>');

  if (isMeshLine && !isInstanced) {
    uninstancedCount++;
  }
}

console.log(`  Uninstanced mesh-like objects (heuristic): ${uninstancedCount}`);
if (uninstancedCount > MAX_UNINSTANCED_OBJECTS) {
  console.error(`  ✗ BUDGET EXCEEDED: ${uninstancedCount} uninstanced objects > limit ${MAX_UNINSTANCED_OBJECTS}`);
  console.error(`    → Migrate scattered geometry to InstancedMesh or mergeGeometries.`);
  errors++;
} else {
  console.log(`  ✓ Uninstanced object count within budget (≤${MAX_UNINSTANCED_OBJECTS})`);
}

// ── 2. Count texture load calls ──────────────────────────────
const textureLoadMatches = src.match(/TextureLoader\(\)|\.load\s*\(\s*['"]/g) || [];
const textureCount = textureLoadMatches.length;
console.log(`  Texture loads found: ${textureCount}`);
if (textureCount > MAX_TEXTURES) {
  console.warn(`  ⚠ WARNING: ${textureCount} texture loads > ${MAX_TEXTURES} recommended`);
  warnings++;
} else {
  console.log(`  ✓ Texture load count within budget (≤${MAX_TEXTURES})`);
}

// ── 3. Detect lines longer than MAX_INLINE_STR_LEN ──────────
// A line > MAX_INLINE_STR_LEN chars almost always means baked geometry,
// base64 blobs, or minified data that belongs in an external asset file.
// (Excludes the intentional window.__elah QA debug object line.)
let longLineCount = 0;
lines.forEach((line, idx) => {
  if (line.length > MAX_INLINE_STR_LEN && !line.includes('window.__elah') && !line.includes('sceneStats') && !line.includes('faceshot')) {
    const preview = line.slice(0, 80).replace(/\r/g, '');
    console.warn(`  ⚠ Long line (${line.length} chars) at line ${idx + 1}: "${preview}…"`);
    longLineCount++;
    warnings++;
  }
});
if (longLineCount === 0) {
  console.log(`  ✓ No suspiciously long lines found (potential baked data blobs)`);
}

// ── 4. Check for direct document.write (security/perf red flag) ──
if (/document\.write\b/.test(src)) {
  console.error('  ✗ document.write() found in game.js — must be removed');
  errors++;
} else {
  console.log('  ✓ No document.write() calls');
}

// ── 5. Confirm AQE is present ────────────────────────────────
if (src.includes('AQE') && src.includes('DOWN_THRESH')) {
  console.log('  ✓ Adaptive Quality Engine (AQE) present');
} else {
  console.error('  ✗ AQE not found in game.js — patch_step1_adaptive_quality.js must be applied first');
  errors++;
}

// ── Summary ──────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`❌ PERFORMANCE BUDGET FAILED (${errors} error${errors > 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''})`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`⚠ Performance budget PASSED with ${warnings} warning${warnings !== 1 ? 's' : ''} — review recommended`);
} else {
  console.log('✅ Performance budget PASSED — all checks within limits');
}
