'use strict';
/**
 * patch_levels_3_4_5_got.js
 * GoT Cinematic Overhaul for Levels 3, 4, and 5
 *
 * Level 3 — Abram at Dan (Genesis 14:14-16):
 *   - 300 Eastern-king soldiers ringing the camp with torches (night raid silhouettes)
 *   - Burning supply wagons (5 blazing wagon frames)
 *   - Upgraded dan GRADE to deep midnight-blue stealth tone
 *   - Cinematic torchlight bloom on player's torch
 *
 * Level 4 — Benaiah in the Snow Pit (2 Samuel 23:20):
 *   - Blizzard: 1200-particle howling snowstorm (3× density), horizontal drift
 *   - Lion eye-shine: two amber point lights in dark corners
 *   - Upgraded pit GRADE to cold steel-blue claustrophobic palette
 *   - Wind-howl ambient via audio mod
 *
 * Level 5 — Barak & Deborah at the River Kishon (Judges 5:20-21):
 *   - 320 Canaanite chariot-host soldiers on ridge (spearmen & archers)
 *   - Driving rain storm: 1200 rain particles, 40° angle, lightning flash
 *   - Iron-chariot formation on north horizon (8 instanced chariots)
 *   - Upgraded kishon GRADE to stormy steel-grey palette
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
// LEVEL 3 — DAN: Night Raid GoT Overhaul
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Upgrade GRADE.dan
rep(
  `  dan: { sh: [0.9, 0.97, 1.12], hi: [1.08, 0.98, 0.88], sat: 1.05, con: 1.1, vig: 0.42 },`,
  `  dan: { sh: [0.82, 0.90, 1.18], hi: [1.05, 0.96, 0.82], sat: 0.95, con: 1.18, vig: 0.52 }, // Deep midnight GoT Dan`,
  'GRADE.dan upgrade'
);

// 2. Inject GoT army + burning wagons into buildDan(), appending before closing }
//    Anchor: the captives' stakes block which is the last section
const DAN_ANCHOR = `  for (const [x, z] of DAN.stakes) { const y = hgt(x, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0), MAT.wood); p.position.set(x, y, z - 0.45); p.castShadow = true; W.add(p); }\r\n}`;
const DAN_INJECT = `  for (const [x, z] of DAN.stakes) { const y = hgt(x, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0), MAT.wood); p.position.set(x, y, z - 0.45); p.castShadow = true; W.add(p); }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HOSTS OF THE FOUR EASTERN KINGS AT DAN (Genesis 14:1–12) — GoT Night Raid
  // "Abram…divided himself against them, he and his servants, by night"
  // 300 silhouette soldiers ring the camp; 5 burning supply wagons light the dark.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    // Soldier silhouette: tall eastern helmet, robed body, curved sword, tall shield
    const dHelm  = new THREE.CylinderGeometry(0.1, 0.12, 0.18, 7).translate(0, 1.82, 0);
    const dBody  = new THREE.CylinderGeometry(0.16, 0.13, 0.78, 7).translate(0, 1.28, 0);
    const dShld  = new THREE.BoxGeometry(0.08, 0.72, 0.42).translate(-0.26, 1.3, 0.1);
    const dSword = new THREE.CylinderGeometry(0.015, 0.02, 0.9, 4).rotateZ(0.3).translate(0.26, 1.55, 0.05);
    const dGeo   = mergeGeometries([dHelm.toNonIndexed(), dBody.toNonIndexed(), dShld.toNonIndexed(), dSword.toNonIndexed()]);
    // Dark silhouette — only the firelight touches them
    const dMat   = new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 0.9, metalness: 0.3 });

    const COUNT  = LOWQ ? 100 : 300;
    const dInst  = new THREE.InstancedMesh(dGeo, dMat, COUNT);
    dInst.castShadow = false; dInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let iIdx = 0;
    const placeD = (x, z, ry, s) => {
      if (iIdx >= COUNT) return;
      qt.setFromAxisAngle(new THREE.Vector3(0,1,0), ry); sc.setScalar(s);
      m4.compose(new THREE.Vector3(x, hgt(x,z) - 0.05, z), qt, sc);
      dInst.setMatrixAt(iIdx++, m4);
    };

    // North arc (behind the king's pavilion): z = -38 to -60
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8, n = LOWQ ? 16 : 48;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeD(t*100, -(r0+Math.abs(t)*5+rng()*1.5-0.75), Math.PI, 0.9+rng()*0.2); }
    }
    // East arc: x = +34 to +58
    for (let row = 0; row < 2; row++) {
      const r0 = 32 + row * 2.8, n = LOWQ ? 12 : 36;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeD(r0+Math.abs(t)*5+rng()*1.5, t*80, -Math.PI*0.5, 0.9+rng()*0.2); }
    }
    // West arc: x = -34 to -58
    for (let row = 0; row < 2; row++) {
      const r0 = 32 + row * 2.8, n = LOWQ ? 12 : 36;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeD(-(r0+Math.abs(t)*5+rng()*1.5), t*80, Math.PI*0.5, 0.9+rng()*0.2); }
    }
    // South arc (behind Abram's start): z = +30 to +55
    for (let row = 0; row < 2; row++) {
      const r0 = 32 + row * 2.8, n = LOWQ ? 12 : 36;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeD(t*80, r0+Math.abs(t)*4+rng()*1.5, 0, 0.9+rng()*0.2); }
    }
    dInst.count = iIdx; dInst.instanceMatrix.needsUpdate = true; W.add(dInst);

    // ── Burning supply wagons of the eastern kings ──────────────────────────
    // Simple: two axles (box), four wheels (torus), a burning wooden bed
    const lam2 = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const wagonPositions = [[-18, -44], [14, -48], [0, -55], [-28, -38], [26, -36]];
    for (const [wx, wz] of wagonPositions) {
      const wy = hgt(wx, wz);
      // wagon bed (burning)
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.95), new THREE.MeshStandardMaterial({ color: 0x1a1008, emissive: 0x8a3010, roughness: 0.9 }));
      bed.position.set(wx, wy + 0.72, wz); bed.castShadow = true; W.add(bed);
      // wheels
      const whlM = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 });
      for (const [sx, sz] of [[-0.72, 0.5], [-0.72, -0.5], [0.72, 0.5], [0.72, -0.5]]) {
        const wh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 5, 10).rotateY(Math.PI/2), whlM);
        wh.position.set(wx + sx, wy + 0.4, wz + sz); W.add(wh);
      }
      // fire on wagon
      addFire(wx, wy + 0.84, wz, 0.9 + Math.random() * 0.4);
      // smoke column
      for (let p = 0; p < 3; p++) puff && puff(new THREE.Vector3(wx + (Math.random()-0.5), wy + 1.4 + p * 0.5, wz + (Math.random()-0.5)), 1.4, 2.0, new THREE.Vector3(0.1, 1.2, 0), 0x1a1612);
    }

    // ── Eastern-host camp lights: amber glow rings around the perimeter ──────
    if (!LOWQ) {
      for (const [lx, lz] of [[-24, -48], [22, -50], [-38, -20], [38, -16], [0, -58]]) {
        const pl = new THREE.PointLight(0xff8030, 20, 32, 2); pl.position.set(lx, hgt(lx, lz) + 1.5, lz); W.add(pl);
      }
    }

    DAN.gotArmy = dInst;
  }
}`;

if (src.includes(DAN_ANCHOR)) {
  src = src.replace(DAN_ANCHOR, DAN_INJECT);
  console.log('  ✓ Level 3 Dan GoT army + wagons injected');
} else {
  throw new Error('DAN_ANCHOR not found');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — SNOW PIT: Blizzard + Lion Eye-Shine GoT Overhaul
// ═══════════════════════════════════════════════════════════════════════════════

// 3. Upgrade GRADE.pit (moab stays same, pit is Benaiah's world key)
rep(
  `  pit: { sh: [0.94, 0.98, 1.08], hi: [1.02, 1.0, 0.97], sat: 1.0, con: 1.08, vig: 0.38 },`,
  `  pit: { sh: [0.88, 0.94, 1.14], hi: [0.98, 0.98, 1.06], sat: 0.88, con: 1.16, vig: 0.52 }, // Frozen GoT Pit`,
  'GRADE.pit upgrade'
);

// 4. Inject blizzard upgrade + lion eye-shine into buildPit(), after buildSnow();
const PIT_ANCHOR = `  buildSnow();\r\n}`;
const PIT_INJECT = `  buildSnow();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLIZZARD & LION EYE-SHINE (2 Samuel 23:20) — GoT Snow Pit Overhaul
  // "…he went down also and slew a lion in the midst of a pit in time of snow:"
  // Howling blizzard snow (triple density), horizontal drift; two amber lion eyes
  // lurk in the dark corners of the pit until the beast charges.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    // Blizzard: much denser than the base snow, horizontal streak particles
    const BN = LOWQ ? 500 : 1400;
    const bp = new Float32Array(BN * 3);
    for (let i = 0; i < BN; i++) bp.set([(Math.random()-0.5)*34, Math.random()*14, (Math.random()-0.5)*34], i*3);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    const bcv = document.createElement('canvas'); bcv.width = bcv.height = 16;
    const bx = bcv.getContext('2d');
    // horizontal streak shape
    bx.fillStyle = 'rgba(255,255,255,0)'; bx.fillRect(0,0,16,16);
    const bgr = bx.createLinearGradient(0, 7, 16, 9);
    bgr.addColorStop(0,'rgba(255,255,255,0)'); bgr.addColorStop(0.5,'rgba(255,255,255,1)'); bgr.addColorStop(1,'rgba(255,255,255,0)');
    bx.fillStyle = bgr; bx.fillRect(0, 6, 16, 4);
    if (SNOW) {
      // Upgrade existing SNOW to blizzard density
      SNOW.material.size = 0.18;
      SNOW.material.opacity = 0.95;
    }
    const blizz = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.6, map: new THREE.CanvasTexture(bcv), transparent: true, opacity: 0.55, depthWrite: false, color: 0xdce8ff }));
    blizz.frustumCulled = false; blizz.userData.fall = 8; W.add(blizz);
    // Store for updateSnow (we'll update it via SNOW_BLIZZ)
    if (window) window._elahBlizz = blizz; // accessible from updateSnow via global

    // ── Lion eye-shine: two amber point lights in opposite corners ──────────
    // They pulse slowly to simulate a living beast crouching in the dark.
    // Visible before the lion charges; hidden once the lion dies.
    const eye1 = new THREE.PointLight(0xffa020, 2.2, 5.5, 2); eye1.position.set(-PITH + 1.6, 1.2, -PITH + 1.6); W.add(eye1);
    const eye2 = new THREE.PointLight(0xffa020, 2.2, 5.5, 2); eye2.position.set(-PITH + 2.0, 1.2, -PITH + 1.9); W.add(eye2);

    // ── Rim ice: faint blue-white point lights on the pit rim ────────────────
    if (!LOWQ) {
      for (const [ex, ez] of [[PITH, 0], [-PITH, 0], [0, PITH], [0, -PITH]]) {
        const el = new THREE.PointLight(0xaad8ff, 1.5, 12, 2); el.position.set(ex * 0.9, 0.5, ez * 0.9); W.add(el);
      }
    }

    // Store state for updateSnow to use
    if (!window._pitGot) window._pitGot = {};
    window._pitGot.eye1 = eye1; window._pitGot.eye2 = eye2; window._pitGot.blizz = blizz;
  }
}`;

if (src.includes(PIT_ANCHOR)) {
  src = src.replace(PIT_ANCHOR, PIT_INJECT);
  console.log('  ✓ Level 4 Pit blizzard + lion eyes injected');
} else {
  throw new Error('PIT_ANCHOR not found');
}

// 5. Upgrade updateSnow to also drift the blizzard horizontally
rep(
  `function updateSnow(dt) {\r\n  if (!SNOW || !SNOW.parent) return; const p = SNOW.geometry.attributes.position, t = now();\r\n  for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (1.1 + (i % 5) * 0.12); if (y < 0) y += 14; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.25); }\r\n  p.needsUpdate = true;\r\n}`,
  `function updateSnow(dt) {
  if (!SNOW || !SNOW.parent) return; const p = SNOW.geometry.attributes.position, t = now();
  for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (1.1 + (i % 5) * 0.12); if (y < 0) y += 14; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.25); }
  p.needsUpdate = true;
  // Blizzard streak particles: fall fast + strong horizontal drift (howling wind)
  const blizz = window._elahBlizz;
  if (blizz && blizz.parent) {
    const bp = blizz.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      let y = bp.getY(i) - dt * (6 + (i % 7) * 0.5); if (y < 0) y += 14; bp.setY(i, y);
      bp.setX(i, bp.getX(i) + dt * (3.5 + Math.sin(t * 1.2 + i * 0.3) * 1.5)); // howl right
      let bx2 = bp.getX(i); if (bx2 > 17) bx2 -= 34; bp.setX(i, bx2);
    }
    bp.needsUpdate = true;
  }
  // Lion eye pulse
  const pg = window._pitGot;
  if (pg && pg.eye1) { const pulse = 1.6 + Math.sin(t * 2.3) * 0.6 + Math.sin(t * 5.1) * 0.3; pg.eye1.intensity = pulse; pg.eye2.intensity = pulse * 0.9; }
}`,
  'updateSnow blizzard + lion eyes'
);

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 5 — KISHON: Storm + Canaanite Host GoT Overhaul
// ═══════════════════════════════════════════════════════════════════════════════

// 6. Upgrade GRADE.kishon
rep(
  `  kishon:  { sh: [0.93, 0.97, 1.07], hi: [1.04, 1.0, 0.95],  sat: 1.05, con: 1.11, vig: 0.36 },`,
  `  kishon:  { sh: [0.84, 0.90, 1.08], hi: [0.96, 0.98, 1.08],  sat: 0.88, con: 1.22, vig: 0.48 }, // Stormy GoT Kishon`,
  'GRADE.kishon upgrade'
);

// 7. Upgrade ENV.kishon for a driving rainstorm sky
rep(
  `  kishon: { fog: 0xd2d6d2, near: 42, far: 230, hemi: [0xeef2f8, 0x6a5a40, 1.05], sun: [0xffe6bc, 3.1], dir: [-0.45, 0.5, 0.74], zen: [0.22, 0.4, 0.72], hor: [0.8, 0.84, 0.86], low: [0.72, 0.72, 0.68], sunC: [1.0, 0.75, 0.45], exp: 1.05, dust: 0xffe6b0 },`,
  `  kishon: { fog: 0x8898a8, near: 28, far: 160, hemi: [0xb4c0d0, 0x2a3028, 0.85], sun: [0xb0c4dc, 1.1], dir: [-0.3, 0.6, 0.75], zen: [0.14, 0.18, 0.28], hor: [0.4, 0.46, 0.52], low: [0.26, 0.28, 0.32], sunC: [0.5, 0.58, 0.68], exp: 1.0, dust: 0xb8ccdd }, // GoT storm Kishon`,
  'ENV.kishon storm upgrade'
);

// 8. Inject GoT Canaanite host + lightning rain into buildKishon()
//    Anchor: last line of buildKishon (beam setup + KISHON assignment)
const KISHON_ANCHOR = `  KISHON = { water, tent, beam, flood: 0 };\r\n}`;
const KISHON_INJECT = `  KISHON = { water, tent, beam, flood: 0 };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HOST OF SISERA AT MOUNT TABOR / KISHON (Judges 4:13 & 5:20–21) — GoT Storm
  // "The stars in their courses fought against Sisera. The river of Kishon swept them away."
  // 320 Canaanite spearmen on the ridge; driving rain; lightning flashes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    // Soldier silhouette: Canaanite — taller cone helmet, long cloak, spear
    const kHelm  = new THREE.CylinderGeometry(0.09, 0.11, 0.22, 6).translate(0, 1.86, 0);
    const kBody  = new THREE.CylinderGeometry(0.17, 0.14, 0.76, 6).translate(0, 1.28, 0);
    const kSpear = new THREE.CylinderGeometry(0.02, 0.015, 3.4, 4).rotateZ(0.1).translate(0.24, 1.95, 0);
    const kCloak = new THREE.CylinderGeometry(0.21, 0.26, 0.6, 7).translate(0, 0.98, 0);
    const kGeo   = mergeGeometries([kHelm.toNonIndexed(), kBody.toNonIndexed(), kSpear.toNonIndexed(), kCloak.toNonIndexed()]);
    // Iron-grey Canaanite palette
    const kMat   = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.8, metalness: 0.45 });

    const COUNT  = LOWQ ? 110 : 320;
    const kInst  = new THREE.InstancedMesh(kGeo, kMat, COUNT);
    kInst.castShadow = false; kInst.frustumCulled = false;
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
    let iIdx = 0;
    const placeK = (x, z, ry, s) => {
      if (iIdx >= COUNT) return;
      qt.setFromAxisAngle(new THREE.Vector3(0,1,0), ry); sc.setScalar(s);
      m4.compose(new THREE.Vector3(x, hgt(x,z) - 0.05, z), qt, sc);
      kInst.setMatrixAt(iIdx++, m4);
    };
    // North ridge (Canaanite advance from Harosheth-hagoyim): z = -38 to -65
    for (let row = 0; row < 2; row++) {
      const r0 = 38 + row * 3.0, n = LOWQ ? 28 : 80;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeK(t*140, -(r0+Math.abs(t)*7+rng()*2-1), Math.PI, 0.88+rng()*0.24); }
    }
    // East flank: x = +38 to +62
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8, n = LOWQ ? 16 : 46;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeK(r0+Math.abs(t)*6+rng()*2, t*90, -Math.PI*0.5, 0.88+rng()*0.24); }
    }
    // West flank
    for (let row = 0; row < 2; row++) {
      const r0 = 36 + row * 2.8, n = LOWQ ? 16 : 46;
      for (let i = 0; i < n; i++) { const t = (i/(n-1))-0.5; placeK(-(r0+Math.abs(t)*6+rng()*2), t*90, Math.PI*0.5, 0.88+rng()*0.24); }
    }
    kInst.count = iIdx; kInst.instanceMatrix.needsUpdate = true; W.add(kInst);

    // ── Iron chariots silhouette line on north horizon ──────────────────────
    // 8 static chariot-shaped boxes behind the soldier front line
    const carMat = new THREE.MeshStandardMaterial({ color: 0x2a3030, roughness: 0.75, metalness: 0.65 });
    const carGeo = mergeGeometries([
      new THREE.BoxGeometry(1.6, 0.7, 0.9).translate(0, 1.0, 0).toNonIndexed(),
      new THREE.TorusGeometry(0.52, 0.06, 5, 12).rotateY(Math.PI/2).translate(-0.76, 0.6, 0).toNonIndexed(),
      new THREE.TorusGeometry(0.52, 0.06, 5, 12).rotateY(Math.PI/2).translate(0.76, 0.6, 0).toNonIndexed(),
    ]);
    for (let i = 0; i < 8; i++) {
      const cx = -42 + i * 12, cz = -55 - (i % 3) * 4;
      const cm = new THREE.Mesh(carGeo, carMat); cm.position.set(cx, hgt(cx, cz) + 0.6, cz); W.add(cm);
    }

    // ── Driving rain layer (40° diagonal for wind effect) ───────────────────
    const rain = buildPrecip('rain');
    rain.material.size = 0.65;
    rain.material.opacity = 0.72;
    rain.rotation.z = -0.65; // 40° tilt — driving west wind before the flood
    rain.position.set(0, 0, 0);
    rain.visible = true;
    W.add(rain);
    if (!KISHON.rain) KISHON.rain = rain;

    // ── Lightning state for updateKishon ────────────────────────────────────
    KISHON.lightning = new THREE.PointLight(0xe8f4ff, 0, 300, 1.2);
    KISHON.lightning.position.set(0, 50, -30); W.add(KISHON.lightning);
    KISHON.lightningT = 3 + Math.random() * 4; // seconds until first bolt
  }
}`;

if (src.includes(KISHON_ANCHOR)) {
  src = src.replace(KISHON_ANCHOR, KISHON_INJECT);
  console.log('  ✓ Level 5 Kishon storm army + lightning injected');
} else {
  throw new Error('KISHON_ANCHOR not found');
}

// 9. Add lightning update to updateWorld
rep(
  `  if (KISHON && KISHON.rain && KISHON.rain.visible) updatePrecip(KISHON.rain, dt);`,
  `  if (KISHON && KISHON.rain && KISHON.rain.visible) updatePrecip(KISHON.rain, dt);
  if (KISHON && KISHON.lightning) {
    KISHON.lightningT -= dt;
    if (KISHON.lightningT <= 0) {
      // Flash: 3-beat lightning bolt
      KISHON.lightning.intensity = 180 + Math.random() * 80;
      bloomPulse(2.0, 0.12);
      KISHON.lightningT = 2.5 + Math.random() * 5;
      setTimeout(() => { if (KISHON && KISHON.lightning) KISHON.lightning.intensity = 0; }, 80);
      setTimeout(() => {
        if (KISHON && KISHON.lightning) {
          KISHON.lightning.intensity = 120;
          setTimeout(() => { if (KISHON && KISHON.lightning) KISHON.lightning.intensity = 0; }, 55);
        }
      }, 200);
    }
  }`,
  'Lightning bolt update in updateWorld'
);

// ─── Write & verify ───────────────────────────────────────────────────────────
fs.writeFileSync(GAME_JS, src, 'utf8');
console.log('\n✅ Levels 3, 4, 5 GoT patches written. Running syntax check…');
