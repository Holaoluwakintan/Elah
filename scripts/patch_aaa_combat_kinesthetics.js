'use strict';
/**
 * patch_aaa_combat_kinesthetics.js (CRLF-safe version)
 */

const fs = require('fs');
const path = require('path');
const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(GAME_JS, 'utf8');

function norm(str) { return str.replace(/\r\n/g, '\n'); }

function rep(search, replacement, label) {
  const normSrc = norm(src);
  const normSearch = norm(search);
  if (!normSrc.includes(normSearch)) {
    throw new Error(`PATCH TARGET NOT FOUND [${label || '?'}]:\n${normSearch.slice(0, 120)}`);
  }
  const isCRLF = src.includes('\r\n');
  const finalReplacement = isCRLF ? replacement.replace(/\r?\n/g, '\r\n') : replacement.replace(/\r\n/g, '\n');
  const finalSearch = isCRLF ? search.replace(/\r?\n/g, '\r\n') : search.replace(/\r\n/g, '\n');
  src = src.replace(finalSearch, finalReplacement);
  console.log('  ✓', label || search.slice(0, 60));
}

// ─── 1. Add Directional Camera Shake & Visceral Sub-bass Audio to SFX ───────
const SFX_ANCHOR = `    noise(2.5, 450, 180, 0.18, 'bandpass', 1.8);
  },
};`;

const SFX_INJECT = `    noise(2.5, 450, 180, 0.18, 'bandpass', 1.8);
  },
  // ── AAA Visceral Kinesthetic Synthesizers ──
  boneCrunch: () => {
    if (!AU.ctx || !AU.on) return;
    const c = AU.ctx, t = c.currentTime;
    // 35Hz Sub-bass punch (chest-thumping physical impact)
    const sub = c.createOscillator(), sg = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(75, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.14);
    sg.gain.setValueAtTime(0.7, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    sub.connect(sg); sg.connect(AU.master);
    sub.start(t); sub.stop(t + 0.24);

    // Bone fracture crackle
    noise(0.08, 1800, 350, 0.5, 'bandpass', 2.5);
    noise(0.12, 600, 120, 0.65, 'lowpass', 1.2, 0.02);
  },
  heavyDeflect: () => {
    if (!AU.ctx || !AU.on) return;
    const c = AU.ctx, t = c.currentTime;
    // High-tensile bronze clang
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.45);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g); g.connect(AU.master);
    osc.start(t); osc.stop(t + 0.52);

    // Sub-harmonic body reverberation
    tone('sine', 95, 40, 0.3, 0.55);
    noise(0.15, 3200, 800, 0.35, 'highpass', 1.0);
  },
  fleshGore: () => {
    noise(0.18, 480, 90, 0.5, 'lowpass', 1.6);
    smp('hit', 0.8, 0.85);
  }
};`;

rep(SFX_ANCHOR, SFX_INJECT, 'SFX.boneCrunch & heavyDeflect audio');

// ─── 2. Upgrade Directional Camera Kick in hitstop() ─────────────────────────
const HITSTOP_TARGET = `function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); if (t >= 0.08) { G.kick = Math.max(G.kick || 0, Math.min(1, t * 7)); vibrate(Math.round(12 + t * 120)); } }`;
const HITSTOP_INJECT = `function hitstop(t, dir = null) {
  G.hitstop = Math.max(G.hitstop, t);
  if (t >= 0.06) {
    G.kick = Math.max(G.kick || 0, Math.min(1.4, t * 8.5));
    vibrate(Math.round(15 + t * 140));
    // Trigger chromatic aberration distortion punch on post-processing shader
    if (gradePass && gradePass.uniforms.uChroma) {
      gradePass.uniforms.uChroma.value = Math.min(1.4, Math.max(gradePass.uniforms.uChroma.value || 0, t * 4.5));
    }
    // Directional camera displacement vector
    if (dir && CAM) {
      CAM.kickX = (dir.x || 0) * 0.18;
      CAM.kickZ = (dir.z || 0) * 0.18;
    }
  }
}`;

rep(HITSTOP_TARGET, HITSTOP_INJECT, 'hitstop directional kick & chroma punch');

// ─── 3. Upgrade sparks() with Tangent-Aligned Arcs ───────────────────────────
const SPARKS_TARGET = `function sparks(p, n = 8, power = 1) {
  if (!FX.spk) return; if (LOWQ) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) { const s = FX.spk[FX.spkI = (FX.spkI + 1) % FX.spk.length]; s.max = s.life = 0.25 + Math.random() * 0.35; s.p.copy(p); s.v.set((Math.random() - 0.5) * 7, 1 + Math.random() * 5, (Math.random() - 0.5) * 7).multiplyScalar(power); }
  FX.spkOn = 1;
}`;

const SPARKS_INJECT = `function sparks(p, n = 8, power = 1, normalDir = null) {
  if (!FX.spk) return; if (LOWQ) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const s = FX.spk[FX.spkI = (FX.spkI + 1) % FX.spk.length];
    s.max = s.life = 0.22 + Math.random() * 0.38;
    s.p.copy(p);
    if (normalDir) {
      // Fan out violently along the tangent deflection arc
      const spread = 0.8;
      const vx = normalDir.x * 4.5 + (Math.random() - 0.5) * 7 * spread;
      const vy = 1.5 + Math.random() * 5.5;
      const vz = normalDir.z * 4.5 + (Math.random() - 0.5) * 7 * spread;
      s.v.set(vx, vy, vz).multiplyScalar(power);
    } else {
      s.v.set((Math.random() - 0.5) * 8, 1 + Math.random() * 6, (Math.random() - 0.5) * 8).multiplyScalar(power);
    }
  }
  FX.spkOn = 1;
}`;

rep(SPARKS_TARGET, SPARKS_INJECT, 'sparks directional arc upgrade');

// ─── 4. Integrate Bone-Crunch and Kinetic Hitstop into hurtEnemy() ────────────
const HURT_ENEMY_TARGET = `  const hp = e.pos.clone().setY(e.pos.y + 1.3); blood(hp, dir, crit ? 24 : 14, crit ? 1.3 : 0.95); flashAt(hp, crit ? 1.9 : 1.3, crit ? 0.2 : 0.14, 0xfff0d0); flashAt(hp.clone().addScaledVector(dir, 0.15), crit ? 1.1 : 0.7, 0.09, 0xff7a40); SFX.hit();
  if (crit) { hitstop(0.11); shake(0.32); }`;

const HURT_ENEMY_INJECT = `  const hp = e.pos.clone().setY(e.pos.y + 1.3); blood(hp, dir, crit ? 28 : 16, crit ? 1.4 : 1.0); flashAt(hp, crit ? 2.2 : 1.4, crit ? 0.22 : 0.15, 0xfff0d0); flashAt(hp.clone().addScaledVector(dir, 0.15), crit ? 1.2 : 0.8, 0.09, 0xff7a40); SFX.hit();
  // AAA Visceral impact feedback
  if (crit) {
    SFX.boneCrunch && SFX.boneCrunch();
    hitstop(0.15, dir); // 150ms micro-freeze frame
    shake(0.42);
    sparks(hp, 14, 1.3, dir);
  } else {
    hitstop(0.065, dir); // 65ms standard crisp hitstop
    shake(0.18);
    sparks(hp, 6, 0.9, dir);
  }`;

rep(HURT_ENEMY_TARGET, HURT_ENEMY_INJECT, 'hurtEnemy AAA hitstop & bone crunch');

// ─── 5. Upgrade handlePerfectParry with Heavy Deflect & Sparks Arc ───────────
const PARRY_TARGET = `  SFX.parry();
  SFX.clang();
  shake(0.38);
  hitstop(0.085); // 85ms freeze frame
  hurtFlash(0.2);

  // Spark explosion at weapon clash point
  const contact = P.pos.clone().add(from).multiplyScalar(0.5).setY(P.pos.y + 1.25);
  flashAt(contact, 3.0, 0.35, 0xffe066);
  puff(contact, 1.2, 0.45, new THREE.Vector3(0, 1.8, 0));`;

const PARRY_INJECT = `  SFX.parry();
  SFX.heavyDeflect && SFX.heavyDeflect();
  shake(0.55);
  hitstop(0.12); // 120ms Sekiro-grade freeze frame
  hurtFlash(0.25);
  bloomPulse(1.5, 0.4);

  // Spark explosion along deflection tangent
  const contact = P.pos.clone().add(from).multiplyScalar(0.5).setY(P.pos.y + 1.25);
  flashAt(contact, 3.6, 0.4, 0xffe880);
  const deflNorm = P.pos.clone().sub(from).setY(0).normalize();
  sparks(contact, 24, 1.6, deflNorm);
  puff(contact, 1.6, 0.5, new THREE.Vector3(0, 2.2, 0));`;

rep(PARRY_TARGET, PARRY_INJECT, 'handlePerfectParry heavy deflect & sparks arc');

// ─── 6. Upgrade Execution with Bone Crunch & Climax Freeze Frame ─────────────
const EXEC_TARGET = `  // Lethal impact
  shake(0.75);
  hitstop(0.12);
  flashAt(e.pos.clone().setY(e.pos.y + 1.2), 4.2, 0.4, 0xffffff);
  hurtFlash(0.35);
  SFX.clang();
  SFX.execute();`;

const EXEC_INJECT = `  // Lethal impact
  shake(0.95);
  hitstop(0.22); // 220ms God of War execution freeze frame
  flashAt(e.pos.clone().setY(e.pos.y + 1.2), 5.5, 0.5, 0xffffff);
  hurtFlash(0.45);
  bloomPulse(2.4, 0.8);
  SFX.clang();
  SFX.execute();
  SFX.boneCrunch && SFX.boneCrunch();
  SFX.fleshGore && SFX.fleshGore();`;

rep(EXEC_TARGET, EXEC_INJECT, 'triggerExecution bone crunch & freeze frame');

// ─── Write Back ─────────────────────────────────────────────────────────────
fs.writeFileSync(GAME_JS, src, 'utf8');
console.log('\n🎉 AAA Combat Kinesthetics & Game Feel Overhaul applied successfully!');
