/**
 * patch_lehi_got.js
 * Level 2 — Samson at Lehi: GoT Cinematic Overhaul
 * ─────────────────────────────────────────────────
 * 1. Encircle the Lehi arena with 400+ Philistine soldiers (instanced, 3-arc formation)
 * 2. Add wicker-shield & spear banners around the perimeter
 * 3. Heat-haze shimmer via shimmering amber ENV (lehi env update)
 * 4. Upgrade GRADE.lehi to scorched GoT palette
 * 5. setEmbers(true) for Lehi (burned cornfields smoke)
 * 6. LEHI_HORDE state variable + updateLehi() tick (heat-haze sun pulse, ember smoke)
 * 7. Enhance samsonSpiritBlast() — shockwave ring + jawbone multi-knockback
 * 8. After-kill "heaps upon heaps" bone-pile decal scatter
 */

'use strict';
const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(GAME_JS, 'utf8');

// helper: safe single replace; throws if pattern not found
function rep(search, replacement) {
  if (!src.includes(search)) {
    throw new Error('PATCH TARGET NOT FOUND:\n' + search.slice(0, 120));
  }
  src = src.replace(search, replacement);
}

// ─── 1. Upgrade GRADE.lehi to scorched GoT palette ───────────────────────────
rep(
  `  lehi:    { sh: [0.90, 0.95, 1.10], hi: [1.10, 0.98, 0.86],  sat: 1.08, con: 1.12, vig: 0.38 },`,
  `  lehi:    { sh: [0.86, 0.91, 1.08], hi: [1.18, 1.00, 0.76],  sat: 1.22, con: 1.18, vig: 0.42 }, // Scorched GoT Lehi`
);

// ─── 2. Enable embers for Lehi in setEnv ─────────────────────────────────────
rep(
  `setEmbers(name === 'carmel' || name === 'belly' || name === 'temple');`,
  `setEmbers(name === 'carmel' || name === 'belly' || name === 'temple' || name === 'lehi');`
);

// ─── 3. Declare LEHI_HORDE global (alongside other world globals) ─────────────
rep(
  `ADULLAM = null; SNOW = null; KISHON = null; TEMPLE = null; DAN = null; WILD = null; JERICHO = null; MOREH = null; DEN = null; CARMEL = null; BELLY = null; HEZEKIAH = null; WORLD = name;`,
  `ADULLAM = null; SNOW = null; KISHON = null; TEMPLE = null; DAN = null; WILD = null; JERICHO = null; MOREH = null; DEN = null; CARMEL = null; BELLY = null; HEZEKIAH = null; LEHI_HORDE = null; WORLD = name;`
);

// ─── 4. Declare variable in the global block (find the ADULLAM declaration line)
rep(
  `let ADULLAM = null, `,
  `let LEHI_HORDE = null, ADULLAM = null, `
);

// ─── 5. Add updateLehi hook to updateWorld ───────────────────────────────────
rep(
  `  if (ADULLAM) updateAdullam(dt);`,
  `  if (LEHI_HORDE) updateLehi(dt);\r\n  if (ADULLAM) updateAdullam(dt);`
);

// ─── 6. Inject GoT Lehi army + heat-haze light into buildLehi() ──────────────
//    Insert before the closing brace of buildLehi (after the campfires block)
const LEHI_END_MARKER = `  for (const [fx, fz, s] of fires) {\r\n    const y = hgt(fx, fz); addFire(fx, y + 0.1, fz, s);\r\n    scatter(ringG, lam, 8, (() => { let k = 0; return () => { const a = (k++ / 8) * Math.PI * 2; return { x: fx + Math.cos(a) * 0.7 * s, y: y + 0.05, z: fz + Math.sin(a) * 0.7 * s, s, ry: a }; }; })());\r\n    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\r\n  }\r\n}`;

const LEHI_INSERTION = `  for (const [fx, fz, s] of fires) {
    const y = hgt(fx, fz); addFire(fx, y + 0.1, fz, s);
    scatter(ringG, lam, 8, (() => { let k = 0; return () => { const a = (k++ / 8) * Math.PI * 2; return { x: fx + Math.cos(a) * 0.7 * s, y: y + 0.05, z: fz + Math.sin(a) * 0.7 * s, s, ry: a }; }; })());
    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE HOST OF THE PHILISTINES AT LEHI (Judges 15:9–14) — GoT Cinematic Ring
  // "Then the Philistines went up, and pitched in Judah, and spread themselves in Lehi."
  // Three concentric arcs of a thousand men encircle the arena on every side.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    // Soldier silhouette: bronze helmet, desert-brown tunic, wicker-round shield, short spear
    const lhHelm   = new THREE.CylinderGeometry(0.11, 0.13, 0.11, 6).translate(0, 1.74, 0);
    const lhBody   = new THREE.CylinderGeometry(0.17, 0.13, 0.68, 6).translate(0, 1.26, 0);
    const lhSpear  = new THREE.CylinderGeometry(0.025, 0.02, 2.8, 4).rotateZ(0.14).translate(0.22, 1.9, 0);
    // wicker round shield — prominent disc on the forearm
    const lhShield = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 7).rotateX(Math.PI / 2).translate(-0.26, 1.28, 0.14);
    const lhGeo    = mergeGeometries([lhHelm.toNonIndexed(), lhBody.toNonIndexed(), lhSpear.toNonIndexed(), lhShield.toNonIndexed()]);

    // Scorched bronze & crimson-red Philistine palette
    const lhMat    = new THREE.MeshStandardMaterial({ color: 0x7a3818, roughness: 0.72, metalness: 0.52 });

    const COUNT    = LOWQ ? 140 : 420;

    // Three overlapping arcs: south, east-flank, west-flank
    // South arc (behind Samson): z = +35 to +70, full 180°
    // East arc: x = +34 to +70, z = -20 to +30
    // West arc: x = -34 to -70, z = -20 to +30
    // North arc (behind Philistine camp): z = -40 to -70

    const lhInst = new THREE.InstancedMesh(lhGeo, lhMat, COUNT);
    lhInst.castShadow = false; lhInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let iIdx = 0;
    const placeLehi = (x, z, faceYaw, s) => {
      if (iIdx >= COUNT) return;
      const y = hgt(x, z) - 0.05;
      q.setFromAxisAngle(new THREE.Vector3(0,1,0), faceYaw);
      sc.setScalar(s);
      m4.compose(new THREE.Vector3(x, y, z), q, sc);
      lhInst.setMatrixAt(iIdx++, m4);
    };

    // south arc — 2 rows, spaced ~2.4 m
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8;
      const nS = LOWQ ? 20 : 60;
      for (let i = 0; i < nS; i++) {
        const t = (i / (nS - 1)) - 0.5;
        const x = t * 130, z = r0 + Math.abs(t) * 6 + rng() * 2 - 1;
        placeLehi(x, z, 0, 0.88 + rng() * 0.24); // face north (toward Samson)
      }
    }
    // east flank arc
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8;
      const nE = LOWQ ? 15 : 42;
      for (let i = 0; i < nE; i++) {
        const t = (i / (nE - 1)) - 0.5;
        const x = r0 + Math.abs(t) * 6 + rng() * 2 - 1, z = t * 90;
        placeLehi(x, z, -Math.PI * 0.5, 0.88 + rng() * 0.24); // face west
      }
    }
    // west flank arc
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8;
      const nW = LOWQ ? 15 : 42;
      for (let i = 0; i < nW; i++) {
        const t = (i / (nW - 1)) - 0.5;
        const x = -(r0 + Math.abs(t) * 6 + rng() * 2 - 1), z = t * 90;
        placeLehi(x, z, Math.PI * 0.5, 0.88 + rng() * 0.24); // face east
      }
    }
    // north arc (behind the Philistine camp tents)
    for (let row = 0; row < 2; row++) {
      const r0 = 44 + row * 2.6;
      const nN = LOWQ ? 20 : 50;
      for (let i = 0; i < nN; i++) {
        const t = (i / (nN - 1)) - 0.5;
        const x = t * 110, z = -(r0 + Math.abs(t) * 5 + rng() * 2 - 1);
        placeLehi(x, z, Math.PI, 0.88 + rng() * 0.24); // face south
      }
    }

    lhInst.count = iIdx;
    lhInst.instanceMatrix.needsUpdate = true;
    W.add(lhInst);

    // ── Philistine war banners — crimson cloth on stone-grey poles, encircling the arena ──
    const lhPole   = new THREE.CylinderGeometry(0.045, 0.055, 5.0, 5).translate(0, 2.5, 0);
    const lhFlag   = new THREE.PlaneGeometry(1.5, 2.2).rotateY(-Math.PI * 0.5).translate(0, 3.7, 0.75);
    const lhBanG   = mergeGeometries([lhPole.toNonIndexed(), lhFlag.toNonIndexed()]);
    const lhBanMat = new THREE.MeshStandardMaterial({ color: 0x8e1a10, side: THREE.DoubleSide, roughness: 0.9 });
    const BAN = LOWQ ? 10 : 24;
    scatter(lhBanG, lhBanMat, BAN, () => {
      const a = rng() * Math.PI * 2;
      const r = 36 + rng() * 10;
      const x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r;
      return { x, y: hgt(x, z), z, s: 1.0 + rng() * 0.3, ry: a + Math.PI };
    });

    // ── Scorching heat: a warm sun-orange point light hovering high, shimmering ──
    const lhSun = new THREE.PointLight(0xff8c30, LOWQ ? 0 : 55, 180, 1.4);
    lhSun.position.set(18, 48, -22); W.add(lhSun);

    // ── Bone-pile mesh pool: "heaps upon heaps" (Judges 15:16) ──────────────────
    // Small flat ellipsoids that spawn where enemies die (placed by onLehiKill)
    const heapGeo  = new THREE.SphereGeometry(0.42, 5, 3).scale(1.4, 0.18, 1.1);
    const heapMat  = new THREE.MeshLambertMaterial({ color: 0xe8d8b8, flatShading: true });
    const HEAP_MAX = LOWQ ? 20 : 50;
    const heapMesh = new THREE.InstancedMesh(heapGeo, heapMat, HEAP_MAX);
    heapMesh.frustumCulled = false; heapMesh.count = 0; W.add(heapMesh);

    LEHI_HORDE = { sun: lhSun, t: 0, heapMesh, heapIdx: 0, HEAP_MAX };
  }
}`;

// The marker uses Windows CRLF inside the fires loop but we need a consistent replace
// Use a simpler anchor: the last line of buildLehi closing brace
const SIMPLE_MARKER = `    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\r\n  }\r\n}`;
const SIMPLE_MARKER_LF = `    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\n  }\n}`;

const INJECTION_CRLF = `    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\r\n  }\r\n\r\n  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n  // THE HOST OF THE PHILISTINES AT LEHI (Judges 15:9–14) — GoT Cinematic Ring\r\n  // "Then the Philistines went up, and pitched in Judah, and spread themselves in Lehi."\r\n  // Three arcs of four hundred men encircle the arena on every side.\r\n  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n  {\r\n    const lhHelm   = new THREE.CylinderGeometry(0.11, 0.13, 0.11, 6).translate(0, 1.74, 0);\r\n    const lhBody   = new THREE.CylinderGeometry(0.17, 0.13, 0.68, 6).translate(0, 1.26, 0);\r\n    const lhSpear  = new THREE.CylinderGeometry(0.025, 0.02, 2.8, 4).rotateZ(0.14).translate(0.22, 1.9, 0);\r\n    const lhShield = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 7).rotateX(Math.PI / 2).translate(-0.26, 1.28, 0.14);\r\n    const lhGeo    = mergeGeometries([lhHelm.toNonIndexed(), lhBody.toNonIndexed(), lhSpear.toNonIndexed(), lhShield.toNonIndexed()]);\r\n    const lhMat    = new THREE.MeshStandardMaterial({ color: 0x7a3818, roughness: 0.72, metalness: 0.52 });\r\n    const COUNT    = LOWQ ? 140 : 420;\r\n    const lhInst   = new THREE.InstancedMesh(lhGeo, lhMat, COUNT);\r\n    lhInst.castShadow = false; lhInst.frustumCulled = false;\r\n    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();\r\n    let iIdx = 0;\r\n    const placeLehi = (x, z, faceYaw, s) => {\r\n      if (iIdx >= COUNT) return;\r\n      const y = hgt(x, z) - 0.05;\r\n      qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceYaw);\r\n      sc.setScalar(s);\r\n      m4.compose(new THREE.Vector3(x, y, z), qt, sc);\r\n      lhInst.setMatrixAt(iIdx++, m4);\r\n    };\r\n    for (let row = 0; row < 2; row++) {\r\n      const r0 = 36 + row * 2.8, nS = LOWQ ? 20 : 60;\r\n      for (let i = 0; i < nS; i++) { const t = (i / (nS - 1)) - 0.5; const x = t * 130, z = r0 + Math.abs(t) * 6 + rng() * 2 - 1; placeLehi(x, z, 0, 0.88 + rng() * 0.24); }\r\n    }\r\n    for (let row = 0; row < 2; row++) {\r\n      const r0 = 36 + row * 2.8, nE = LOWQ ? 15 : 42;\r\n      for (let i = 0; i < nE; i++) { const t = (i / (nE - 1)) - 0.5; const x = r0 + Math.abs(t) * 6 + rng() * 2 - 1, z = t * 90; placeLehi(x, z, -Math.PI * 0.5, 0.88 + rng() * 0.24); }\r\n    }\r\n    for (let row = 0; row < 2; row++) {\r\n      const r0 = 36 + row * 2.8, nW = LOWQ ? 15 : 42;\r\n      for (let i = 0; i < nW; i++) { const t = (i / (nW - 1)) - 0.5; const x = -(r0 + Math.abs(t) * 6 + rng() * 2 - 1), z = t * 90; placeLehi(x, z, Math.PI * 0.5, 0.88 + rng() * 0.24); }\r\n    }\r\n    for (let row = 0; row < 2; row++) {\r\n      const r0 = 44 + row * 2.6, nN = LOWQ ? 20 : 50;\r\n      for (let i = 0; i < nN; i++) { const t = (i / (nN - 1)) - 0.5; const x = t * 110, z = -(r0 + Math.abs(t) * 5 + rng() * 2 - 1); placeLehi(x, z, Math.PI, 0.88 + rng() * 0.24); }\r\n    }\r\n    lhInst.count = iIdx; lhInst.instanceMatrix.needsUpdate = true; W.add(lhInst);\r\n    const lhPole   = new THREE.CylinderGeometry(0.045, 0.055, 5.0, 5).translate(0, 2.5, 0);\r\n    const lhFlag   = new THREE.PlaneGeometry(1.5, 2.2).rotateY(-Math.PI * 0.5).translate(0, 3.7, 0.75);\r\n    const lhBanG   = mergeGeometries([lhPole.toNonIndexed(), lhFlag.toNonIndexed()]);\r\n    const lhBanMat = new THREE.MeshStandardMaterial({ color: 0x8e1a10, side: THREE.DoubleSide, roughness: 0.9 });\r\n    scatter(lhBanG, lhBanMat, LOWQ ? 10 : 24, () => { const a = rng() * Math.PI * 2, r = 36 + rng() * 10, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r; return { x, y: hgt(x, z), z, s: 1.0 + rng() * 0.3, ry: a + Math.PI }; });\r\n    const lhSun = new THREE.PointLight(0xff8c30, LOWQ ? 0 : 55, 180, 1.4); lhSun.position.set(18, 48, -22); W.add(lhSun);\r\n    const heapGeo  = new THREE.SphereGeometry(0.42, 5, 3).scale(1.4, 0.18, 1.1);\r\n    const heapMat  = new THREE.MeshLambertMaterial({ color: 0xe8d8b8, flatShading: true });\r\n    const HEAP_MAX = LOWQ ? 20 : 50;\r\n    const heapMesh = new THREE.InstancedMesh(heapGeo, heapMat, HEAP_MAX);\r\n    heapMesh.frustumCulled = false; heapMesh.count = 0; W.add(heapMesh);\r\n    LEHI_HORDE = { sun: lhSun, t: 0, heapMesh, heapIdx: 0, HEAP_MAX };\r\n  }\r\n}`;

// Try CRLF first, then LF
const ANCHOR_CRLF = `    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\r\n  }\r\n}`;
const ANCHOR_LF   = `    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());\n  }\n}`;

if (src.includes(ANCHOR_CRLF)) {
  src = src.replace(ANCHOR_CRLF, INJECTION_CRLF);
} else if (src.includes(ANCHOR_LF)) {
  src = src.replace(ANCHOR_LF, INJECTION_CRLF.replace(/\r\n/g, '\n'));
} else {
  throw new Error('Could not find buildLehi closing anchor for GoT injection');
}

// ─── 7. Add updateLehi function (before the Temple section) ──────────────────
const TEMPLE_SECTION = `// ---- the temple of Dagon (Gaza): a flat hall, colonnades, a roof full of people, two middle pillars`;
rep(
  TEMPLE_SECTION,
  `// ---- updateLehi: shimmer + heap-pile spawn hook\r\nfunction updateLehi(dt) {\r\n  const H = LEHI_HORDE; if (!H) return; H.t += dt; const t = H.t;\r\n  if (H.sun) H.sun.intensity = 55 + Math.sin(t * 2.1) * 8 + Math.sin(t * 5.7) * 4; // heat shimmer\r\n}\r\n// Called by hurtEnemy when WORLD==='lehi' and enemy is killed — spawn a heap\r\nfunction onLehiKill(e) {\r\n  const H = LEHI_HORDE; if (!H) return;\r\n  const idx = H.heapIdx % H.HEAP_MAX; H.heapIdx++; H.heapMesh.count = Math.min(H.heapIdx, H.HEAP_MAX);\r\n  const m4 = new THREE.Matrix4(); const ry = Math.random() * Math.PI * 2;\r\n  m4.makeRotationY(ry); m4.setPosition(e.pos.x + (Math.random() - 0.5) * 0.6, hgt(e.pos.x, e.pos.z) + 0.05, e.pos.z + (Math.random() - 0.5) * 0.6);\r\n  H.heapMesh.setMatrixAt(idx, m4); H.heapMesh.instanceMatrix.needsUpdate = true;\r\n}\r\n\r\n// ---- the temple of Dagon (Gaza): a flat hall, colonnades, a roof full of people, two middle pillars`
);

// ─── 8. Hook onLehiKill into hurtEnemy on enemy death ────────────────────────
// Find the place where enemy.alive is set to false (the kill path in hurtEnemy)
const KILL_HOOK_SRC = `function hurtEnemy(e, dmg, dir, src, crit = false, from = P) {`;
// We need to find where e.alive is set to false and add the hook there.
// Look for the specific block:
const KILL_LINE_SEARCH = `e.alive = false; e.hp = 0;`;
if (!src.includes(KILL_LINE_SEARCH)) {
  // Try alternate
  const alt = `e.alive = false;`;
  const idx2 = src.indexOf('function hurtEnemy');
  const chunk = src.slice(idx2, idx2 + 1200);
  console.warn('WARN: exact kill line not found, check manually. Chunk around hurtEnemy:\n', chunk.slice(0, 400));
} else {
  // Insert onLehiKill call right after e.alive = false; e.hp = 0;
  rep(
    `e.alive = false; e.hp = 0;`,
    `e.alive = false; e.hp = 0; if (WORLD === 'lehi') onLehiKill(e);`
  );
}

// ─── 9. Enhance samsonSpiritBlast — add heavy jawbone multi-shockwave ────────
// After the existing blast, add a secondary ground-crack ring and toast
rep(
  `  if (P.heave && G.fin && !G.fin.collapsing) { G.fin.prog = Math.min(1, G.fin.prog + 0.2); dmgText(P.pos.clone().setY(P.pos.y + 2.4), 'MIGHTY HEAVE', 'crit'); SFX.rumble(); }\r\n}`,
  `  if (P.heave && G.fin && !G.fin.collapsing) { G.fin.prog = Math.min(1, G.fin.prog + 0.2); dmgText(P.pos.clone().setY(P.pos.y + 2.4), 'MIGHTY HEAVE', 'crit'); SFX.rumble(); }\r\n  // GoT extra: bone-fracture ground crack — secondary shockwave at half-radius\r\n  if (WORLD === 'lehi') {\r\n    const R2 = 5; G.slow = Math.max(G.slow || 0, 0.25); G.slowT = Math.max(G.slowT || 0, 0.6);\r\n    for (const e of G.enemies) {\r\n      if (!e.alive || !e.obj.visible) continue;\r\n      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);\r\n      if (d > R2 && d <= 14) { // outer ring — throw enemies to ground\r\n        const dir2 = new THREE.Vector3(dx, 0, dz).normalize();\r\n        e.vel.addScaledVector(dir2, 9 * (1 - d / 14 * 0.5));\r\n        if (e.alive) { e.state = 'hit'; e.st = 0; e.stun = Math.max(e.stun || 0, 2.4); e.play('Hit_Chest', { loop: false, restart: true, ts: 0.7 }); }\r\n      }\r\n    }\r\n    dmgText(P.pos.clone().setY(P.pos.y + 2.6), 'HEAPS UPON HEAPS', 'crit');\r\n    bloomPulse(1.6, 0.8);\r\n  }\r\n}`
);

// ─── Write & verify ───────────────────────────────────────────────────────────
fs.writeFileSync(GAME_JS, src, 'utf8');
console.log('✅ Lehi GoT patch written. Running syntax check…');
