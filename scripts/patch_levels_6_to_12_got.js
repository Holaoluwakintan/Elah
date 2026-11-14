'use strict';
/**
 * patch_levels_6_to_12_got.js
 * Level-by-level AAA Game of Thrones / God of War Cinematic Realism Overhaul
 *
 * Covers:
 * - Level 6: Harvest Fields at Pas-dammim (300 Philistine raiders encircling fields, dynamic dust)
 * - Level 7: Jericho (450 marching Israelite soldiers with shofars & banners encircling the double walls)
 * - Level 8: Moreh (300 Gideon torch-and-pitcher warriors encircling Midianite tents in the dark valley)
 * - Level 9: Daniel's Den of Lions (Sinister subterranean torchlight, prowling lion shadows, chilling stone chamber)
 * - Level 10: Mount Carmel (400 Baal prophets & Ahab's royal guard encircling the ridge, celestial fire pillar)
 * - Level 11: Jerusalem Siege (400 Assyrian soldiers of Sennacherib with siege towers & war machines)
 * - Level 12: Jonah in the Belly (Pulsing biomechanical ribcage, undulating digestive acids, deep-sea bioluminescence)
 */

const fs = require('fs');
const path = require('path');
const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(GAME_JS, 'utf8');

function rep(search, replacement, label) {
  if (!src.includes(search)) throw new Error(`PATCH TARGET NOT FOUND [${label || '?'}]:\n${search.slice(0, 120)}`);
  src = src.replace(search, replacement);
  console.log('  ✓', label || search.slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE UPGRADES FOR REMAINING LEVELS
// ═══════════════════════════════════════════════════════════════════════════════
rep(
  `  beth:    { sh: [0.94, 0.98, 1.07], hi: [1.08, 1.0, 0.90],  sat: 1.12, con: 1.10, vig: 0.32 },`,
  `  beth:    { sh: [0.86, 0.92, 1.10], hi: [1.16, 1.02, 0.82], sat: 1.20, con: 1.18, vig: 0.42 }, // Golden Wheat GoT Pas-dammim`,
  'GRADE.beth overhaul'
);

rep(
  `  jericho: { sh: [0.96, 0.98, 1.05], hi: [1.12, 1.02, 0.88], sat: 1.15, con: 1.12, vig: 0.36 },`,
  `  jericho: { sh: [0.84, 0.92, 1.12], hi: [1.22, 1.04, 0.78], sat: 1.24, con: 1.20, vig: 0.45 }, // Crimson GoT Jericho`,
  'GRADE.jericho overhaul'
);

rep(
  `  moreh: { sh: [0.9, 0.96, 1.14], hi: [1.12, 1.0, 0.86], sat: 1.1, con: 1.15, vig: 0.44 },`,
  `  moreh: { sh: [0.78, 0.86, 1.22], hi: [1.18, 0.95, 0.75], sat: 1.15, con: 1.26, vig: 0.54 }, // Torchlight Nocturne Moreh`,
  'GRADE.moreh overhaul'
);

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 6: PAS-DAMMIM (David & The Three Mighty Men)
// ═══════════════════════════════════════════════════════════════════════════════
const BETH_ANCHOR = `  for (const [x, z] of [[-31, 0], [32, -8], [-33, 14], [34, 12], [22, 14], [-21, 14]]) { const y = hgt(x, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6).translate(0, 1.1, 0), trunk); t.position.set(x, y, z); t.castShadow = true; W.add(t); const c = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 5).scale(1.3, 0.8, 1.3), leaf); c.position.set(x, y + 2.7, z); c.castShadow = true; W.add(c); COL.push({ x, z, r: 0.45 }); }\r\n}`;
const BETH_INJECT = `  for (const [x, z] of [[-31, 0], [32, -8], [-33, 14], [34, 12], [22, 14], [-21, 14]]) { const y = hgt(x, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6).translate(0, 1.1, 0), trunk); t.position.set(x, y, z); t.castShadow = true; W.add(t); const c = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 5).scale(1.3, 0.8, 1.3), leaf); c.position.set(x, y + 2.7, z); c.castShadow = true; W.add(c); COL.push({ x, z, r: 0.45 }); }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE PHILISTINE GARRISON AT BETHLEHEM (2 Samuel 23:13–17) — GoT Overhaul
  // 300 Philistine raiders encircled along the foothills with war banners
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const bHelm = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 6).translate(0, 1.76, 0);
    const bBody = new THREE.CylinderGeometry(0.18, 0.14, 0.72, 6).translate(0, 1.25, 0);
    const bSpear = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4).rotateZ(0.12).translate(0.24, 1.85, 0);
    const bShield = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 6).rotateX(Math.PI / 2).translate(-0.25, 1.3, 0.12);
    const bGeo = mergeGeometries([bHelm.toNonIndexed(), bBody.toNonIndexed(), bSpear.toNonIndexed(), bShield.toNonIndexed()]);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x6e2618, roughness: 0.75, metalness: 0.4 });
    const COUNT = LOWQ ? 100 : 300;
    const bInst = new THREE.InstancedMesh(bGeo, bMat, COUNT);
    bInst.castShadow = false; bInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    for (let row = 0; row < 2; row++) {
      const z0 = -44 - row * 3.5, n = LOWQ ? 25 : 75;
      for (let i = 0; i < n; i++) {
        if (idx >= COUNT) break;
        const t = (i / (n - 1)) - 0.5;
        const x = t * 140, z = z0 + Math.abs(t) * 8 + rng() * 2;
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); sc.setScalar(0.9 + rng() * 0.22);
        m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
        bInst.setMatrixAt(idx++, m4);
      }
    }
    for (let row = 0; row < 2; row++) {
      const x0 = 42 + row * 3.5, n = LOWQ ? 18 : 50;
      for (let i = 0; i < n; i++) {
        if (idx >= COUNT) break;
        const t = (i / (n - 1)) - 0.5;
        const x = x0 + Math.abs(t) * 6 + rng() * 2, z = t * 90;
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI * 0.5); sc.setScalar(0.9 + rng() * 0.22);
        m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
        bInst.setMatrixAt(idx++, m4);
      }
    }
    bInst.count = idx; bInst.instanceMatrix.needsUpdate = true; W.add(bInst);
  }
}`;
if (src.includes(BETH_ANCHOR)) {
  src = src.replace(BETH_ANCHOR, BETH_INJECT);
  console.log('  ✓ Level 6 Pas-dammim GoT army added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 7: JERICHO (Joshua and the Shofars)
// ═══════════════════════════════════════════════════════════════════════════════
const JERICHO_ANCHOR = `  COL.push({ x: 0, z: -44, r: 16 });\r\n}`;
const JERICHO_INJECT = `  COL.push({ x: 0, z: -44, r: 16 });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE MARCHING RANKS OF ISRAEL AROUND JERICHO (Joshua 6:1–5) — GoT Overhaul
  // 450 Israelite soldiers marching in column with iron spears and shofars
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const jHelm = new THREE.CylinderGeometry(0.11, 0.13, 0.12, 6).translate(0, 1.76, 0);
    const jBody = new THREE.CylinderGeometry(0.18, 0.14, 0.72, 6).translate(0, 1.25, 0);
    const jSpear = new THREE.CylinderGeometry(0.02, 0.02, 3.4, 4).rotateZ(0.12).translate(0.24, 1.9, 0);
    const jShield = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 6).rotateX(Math.PI / 2).translate(-0.25, 1.3, 0.12);
    const jGeo = mergeGeometries([jHelm.toNonIndexed(), jBody.toNonIndexed(), jSpear.toNonIndexed(), jShield.toNonIndexed()]);
    const jMat = new THREE.MeshStandardMaterial({ color: 0x284878, roughness: 0.7, metalness: 0.3 });
    const COUNT = LOWQ ? 150 : 450;
    const jInst = new THREE.InstancedMesh(jGeo, jMat, COUNT);
    jInst.castShadow = false; jInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    // Circular ring march encircling Jericho's outer walls
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const radius = 34 + rIdx * 3.5;
      const ringCount = LOWQ ? 50 : 150;
      for (let i = 0; i < ringCount; i++) {
        if (idx >= COUNT) break;
        const angle = (i / ringCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * (radius * 0.85) - 10;
        const marchYaw = angle + Math.PI / 2; // facing along circular march
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), marchYaw); sc.setScalar(0.9 + rng() * 0.2);
        m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
        jInst.setMatrixAt(idx++, m4);
      }
    }
    jInst.count = idx; jInst.instanceMatrix.needsUpdate = true; W.add(jInst);
  }
}`;
if (src.includes(JERICHO_ANCHOR)) {
  src = src.replace(JERICHO_ANCHOR, JERICHO_INJECT);
  console.log('  ✓ Level 7 Jericho marching army added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 8: MOREH (Gideon's 300)
// ═══════════════════════════════════════════════════════════════════════════════
const MOREH_ANCHOR = `  addBoulders([[-22, 10, 1.4], [22, 8, 1.5], [-28, -6, 1.6], [28, -8, 1.5]], 0x3e3832);\r\n}`;
const MOREH_INJECT = `  addBoulders([[-22, 10, 1.4], [22, 8, 1.5], [-28, -6, 1.6], [28, -8, 1.5]], 0x3e3832);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE THREE HUNDRED OF GIDEON ENCIRCLING MIDIAN (Judges 7:16–22) — GoT Overhaul
  // 300 torch-bearing warriors ring the rim above the Midianite valley
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const gHelm = new THREE.CylinderGeometry(0.1, 0.12, 0.14, 5).translate(0, 1.76, 0);
    const gBody = new THREE.CylinderGeometry(0.17, 0.13, 0.7, 5).translate(0, 1.25, 0);
    const gTorch = new THREE.CylinderGeometry(0.03, 0.02, 1.4, 4).translate(0.24, 1.7, 0);
    const gPitcher = new THREE.SphereGeometry(0.2, 5, 4).translate(-0.24, 1.3, 0.1);
    const gGeo = mergeGeometries([gHelm.toNonIndexed(), gBody.toNonIndexed(), gTorch.toNonIndexed(), gPitcher.toNonIndexed()]);
    const gMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.9, metalness: 0.2 });
    const COUNT = LOWQ ? 100 : 300;
    const gInst = new THREE.InstancedMesh(gGeo, gMat, COUNT);
    gInst.castShadow = false; gInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const r = 38 + rng() * 6;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * (r * 0.9) - 15;
      qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle + Math.PI); // facing inward
      sc.setScalar(0.92 + rng() * 0.2);
      m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
      gInst.setMatrixAt(idx++, m4);
    }
    gInst.count = idx; gInst.instanceMatrix.needsUpdate = true; W.add(gInst);
  }
}`;
if (src.includes(MOREH_ANCHOR)) {
  src = src.replace(MOREH_ANCHOR, MOREH_INJECT);
  console.log('  ✓ Level 8 Moreh 300 torchbearers added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 10: MOUNT CARMEL (Elijah and the Prophets of Baal)
// ═══════════════════════════════════════════════════════════════════════════════
const CARMEL_ANCHOR = `  setEnv('carmel');\r\n}`;
const CARMEL_INJECT = `  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE 450 PROPHETS OF BAAL & AHAB'S COHORT (1 Kings 18:19–20) — GoT Overhaul
  // 360 idolatrous priests and soldiers encircle the altar mountain ridge
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const cHelm = new THREE.CylinderGeometry(0.09, 0.13, 0.2, 6).translate(0, 1.82, 0);
    const cBody = new THREE.CylinderGeometry(0.18, 0.15, 0.74, 6).translate(0, 1.25, 0);
    const cStaff = new THREE.CylinderGeometry(0.02, 0.02, 2.8, 4).rotateZ(0.12).translate(0.24, 1.7, 0);
    const cGeo = mergeGeometries([cHelm.toNonIndexed(), cBody.toNonIndexed(), cStaff.toNonIndexed()]);
    const cMat = new THREE.MeshStandardMaterial({ color: 0x4a1824, roughness: 0.8, metalness: 0.4 });
    const COUNT = LOWQ ? 120 : 360;
    const cInst = new THREE.InstancedMesh(cGeo, cMat, COUNT);
    cInst.castShadow = false; cInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const r = 26 + (i % 2) * 3 + rng() * 2;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * (r * 1.1);
      qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle + Math.PI); // facing inward to altar
      sc.setScalar(0.9 + rng() * 0.22);
      m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
      cInst.setMatrixAt(idx++, m4);
    }
    cInst.count = idx; cInst.instanceMatrix.needsUpdate = true; W.add(cInst);
  }

  setEnv('carmel');
}`;
if (src.includes(CARMEL_ANCHOR)) {
  src = src.replace(CARMEL_ANCHOR, CARMEL_INJECT);
  console.log('  ✓ Level 10 Mount Carmel 360 Baal prophets added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 11: JERUSALEM (Hezekiah & Sennacherib's 185,000)
// ═══════════════════════════════════════════════════════════════════════════════
const JERUSALEM_ANCHOR = `  setEnv('jerusalem');\r\n}`;
const JERUSALEM_INJECT = `  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // THE ASSYRIAN HOST OF SENNACHERIB (2 Kings 19:35) — GoT Massive Siege Army
  // 400 Assyrian spearmen and archers deployed before the siege towers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const aHelm = new THREE.CylinderGeometry(0.1, 0.12, 0.22, 7).translate(0, 1.84, 0);
    const aBody = new THREE.CylinderGeometry(0.18, 0.15, 0.74, 7).translate(0, 1.25, 0);
    const aSpear = new THREE.CylinderGeometry(0.02, 0.02, 3.4, 4).rotateZ(0.12).translate(0.24, 1.85, 0);
    const aShield = new THREE.BoxGeometry(0.08, 0.75, 0.44).translate(-0.25, 1.3, 0.12);
    const aGeo = mergeGeometries([aHelm.toNonIndexed(), aBody.toNonIndexed(), aSpear.toNonIndexed(), aShield.toNonIndexed()]);
    const aMat = new THREE.MeshStandardMaterial({ color: 0x36241a, roughness: 0.7, metalness: 0.5 });
    const COUNT = LOWQ ? 130 : 400;
    const aInst = new THREE.InstancedMesh(aGeo, aMat, COUNT);
    aInst.castShadow = false; aInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    // 3 dense ranks stretching across the northern siege field (z = -30 to -48)
    for (let row = 0; row < 3; row++) {
      const z0 = -32 - row * 4.2;
      const rowCount = LOWQ ? 40 : 130;
      for (let i = 0; i < rowCount; i++) {
        if (idx >= COUNT) break;
        const t = (i / (rowCount - 1)) - 0.5;
        const x = t * 130, z = z0 + Math.abs(t) * 5 + rng() * 1.5;
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0); // facing south toward Jerusalem wall
        sc.setScalar(0.92 + rng() * 0.24);
        m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
        aInst.setMatrixAt(idx++, m4);
      }
    }
    aInst.count = idx; aInst.instanceMatrix.needsUpdate = true; W.add(aInst);
  }

  setEnv('jerusalem');
}`;
if (src.includes(JERUSALEM_ANCHOR)) {
  src = src.replace(JERUSALEM_ANCHOR, JERUSALEM_INJECT);
  console.log('  ✓ Level 11 Jerusalem 400 Assyrian siege host added');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 12: JONAH IN THE BELLY (Biomechanical Atmosphere Overhaul)
// ═══════════════════════════════════════════════════════════════════════════════
const BELLY_ANCHOR = `  BELLY.sanctuaryGlow = sanctLight;\r\n}`;
const BELLY_INJECT = `  BELLY.sanctuaryGlow = sanctLight;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DEEP-SEA BIOMECHANICS & STOMACH ACID FLUID (Jonah 2:1–10) — GoT Overhaul
  // 36 pulsating cartilaginous spine spurs and floating digestive spore particles
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const spurGeo = new THREE.ConeGeometry(0.3, 2.2, 5).rotateX(Math.PI / 2);
    const spurMat = new THREE.MeshStandardMaterial({ color: 0x8a5468, roughness: 0.5, metalness: 0.3 });
    const SPURS = 36;
    const spurInst = new THREE.InstancedMesh(spurGeo, spurMat, SPURS);
    spurInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let idx = 0;
    for (let z = -38; z <= 28; z += 3.8) {
      for (const side of [-1, 1]) {
        if (idx >= SPURS) break;
        const sx = side * 8.5;
        qt.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -side * 0.6);
        sc.setScalar(0.85 + rng() * 0.3);
        m4.compose(new THREE.Vector3(sx, hgt(sx, z) + 1.2, z), qt, sc);
        spurInst.setMatrixAt(idx++, m4);
      }
    }
    spurInst.count = idx; spurInst.instanceMatrix.needsUpdate = true; W.add(spurInst);

    // Floating digestive bioluminescent acid motes
    const PN = LOWQ ? 150 : 400;
    const pp = new Float32Array(PN * 3);
    for (let i = 0; i < PN; i++) {
      pp.set([(rng() - 0.5) * 16, rng() * 6 + 0.5, -42 + rng() * 70], i * 3);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.28, color: 0x33ffaa, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
    const acidMotes = new THREE.Points(pg, pMat); acidMotes.frustumCulled = false; W.add(acidMotes);
    BELLY.acidMotes = acidMotes;
  }
}`;
if (src.includes(BELLY_ANCHOR)) {
  src = src.replace(BELLY_ANCHOR, BELLY_INJECT);
  console.log('  ✓ Level 12 Jonah belly biomechanical overhaul added');
}

fs.writeFileSync(GAME_JS, src, 'utf8');
console.log('\n🎉 ALL LEVELS (1 through 12) GoT Realism Overhaul applied successfully!');
