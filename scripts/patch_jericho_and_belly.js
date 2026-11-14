'use strict';
const fs = require('fs');
const path = require('path');
const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(GAME_JS, 'utf8');

// Level 7: Jericho marching army
const J_TARGET = `  addBoulders([[-18, 12, 1.4], [18, 14, 1.5], [-22, -4, 1.6], [22, -6, 1.5], [-12, -20, 1.2], [14, -18, 1.3]], 0x9a8462);\r\n  buildArk(0, hgt(0, 12), 12);\r\n}`;
const J_INJECT = `  addBoulders([[-18, 12, 1.4], [18, 14, 1.5], [-22, -4, 1.6], [22, -6, 1.5], [-12, -20, 1.2], [14, -18, 1.3]], 0x9a8462);
  buildArk(0, hgt(0, 12), 12);

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
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const radius = 34 + rIdx * 3.5;
      const ringCount = LOWQ ? 50 : 150;
      for (let i = 0; i < ringCount; i++) {
        if (idx >= COUNT) break;
        const angle = (i / ringCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * (radius * 0.85) - 10;
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle + Math.PI / 2);
        sc.setScalar(0.9 + rng() * 0.2);
        m4.compose(new THREE.Vector3(x, hgt(x, z) - 0.05, z), qt, sc);
        jInst.setMatrixAt(idx++, m4);
      }
    }
    jInst.count = idx; jInst.instanceMatrix.needsUpdate = true; W.add(jInst);
  }
}`;

if (src.includes(J_TARGET)) {
  src = src.replace(J_TARGET, J_INJECT);
  console.log('✓ Level 7 Jericho army injected');
} else {
  console.log('! J_TARGET not found');
}

// Level 12: Jonah in the Belly
const B_TARGET = `  shaft.position.set(0, hgtBelly(0, 30) + 6, 30); W.add(shaft);\r\n\r\n  setEnv('belly');\r\n}`;
const B_INJECT = `  shaft.position.set(0, hgtBelly(0, 30) + 6, 30); W.add(shaft);

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

  setEnv('belly');
}`;

if (src.includes(B_TARGET)) {
  src = src.replace(B_TARGET, B_INJECT);
  console.log('✓ Level 12 Jonah belly biomechanics injected');
} else {
  console.log('! B_TARGET not found');
}

fs.writeFileSync(GAME_JS, src, 'utf8');
