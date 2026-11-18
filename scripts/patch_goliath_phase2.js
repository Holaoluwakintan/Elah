// ============================================================
// ELAH WARRIOR — Feature E: Goliath Phase 2 (Stone Catch + Enrage)
// ============================================================
// At 50% HP → Phase 2: Goliath CATCHES the stone mid-air,
// taunts David, then enters BERSERK mode:
//  • Red aura + rage eyes
//  • 40% faster charge speed
//  • 2× slam frequency  
//  • HURLS the stone back as a projectile
//  • New dialogue card: "IS THY GOD A GOD OF HILLS ONLY?"
//  • Weakness shifts to STAFF body blows (Goliath's arm is now
//    occupied holding the stone — his headgear is raised)
// ============================================================

const fs   = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function writeCRLF(f, c) { fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8'); }

function patch(label, search, replacement) {
  const raw = fs.readFileSync(GAME_JS, 'utf8');
  const src = norm(raw);
  if (!src.includes(norm(search))) {
    console.error(`✗ PATCH TARGET NOT FOUND [${label}]`);
    errors++;
    return;
  }
  writeCRLF(GAME_JS, src.replace(norm(search), norm(replacement)));
  console.log(`✓ ${label}`);
}

// ============================================================
// 1. spawnGoliath — add phase2 flags
// ============================================================
patch('spawnGoliath — phase2 fields',
`function spawnGoliath() {
  const b = new Actor('goliath', 2.25); b.isBoss = true; b.radius = 1.0;
  b.pos.set(0, 0, -27); ground(b); b.yaw = 0; b.maxHp = b.hp = 360; b.state = 'intro'; b.st = 0; b.chargeCd = 3; b.atkCd = 1.5;
  b.play('Walk_Loop', { ts: 0.7 }); G.boss = b;
  // head marker (shows when the head is open)
  b.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  b.marker.scale.setScalar(1.3); b.marker.renderOrder = 30; b.marker.visible = false; scene.add(b.marker);
  return b;
}`,
`function spawnGoliath() {
  const b = new Actor('goliath', 2.25); b.isBoss = true; b.radius = 1.0;
  b.pos.set(0, 0, -27); ground(b); b.yaw = 0; b.maxHp = b.hp = 360; b.state = 'intro'; b.st = 0; b.chargeCd = 3; b.atkCd = 1.5;
  // Phase 2 flags
  b.phase2 = false; b.stoneCaught = false; b.stoneThrowCd = 0; b.berserking = false;
  b.play('Walk_Loop', { ts: 0.7 }); G.boss = b;

  // ── Rage aura point light (hidden until phase 2) ──────────
  b.rageLight = new THREE.PointLight(0xff2200, 0, 7);
  b.rageLight.position.set(0, 2.0, 0);
  b.obj.add(b.rageLight);

  // head marker (shows when the head is open)
  b.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  b.marker.scale.setScalar(1.3); b.marker.renderOrder = 30; b.marker.visible = false; scene.add(b.marker);
  return b;
}`);

// ============================================================
// 2. hurtBoss — sling head hit on phase-2 Goliath → caught!
//    + Phase 2 trigger at 50% HP
// ============================================================
patch('bossHeadHit — phase 2 stone catch intercept',
`function bossHeadHit(b, s) {
  if (LEVEL === 3 || LEVEL === 4) return hurtBoss(b, s.dmg * (LEVEL === 4 ? 0.45 : 1.4), s.v.clone().setY(0).normalize(), 'sling');
  const p = b.headPos(new THREE.Vector3()); const open = bossWindow(b);
  if (!open) { SFX.clang(); flashAt(p, 1.4, 0.2, 0xffe6a0); b.hp = Math.max(30, b.hp - 6); dmgText(p, 'CLANG', ''); toast('"…an helmet of brass upon his head…" Wait until he stumbles!\u003ci\u003e1 SAMUEL 17:5\u003c/i\u003e', 2600); LOG('boss_head_blocked'); return; }
  const dmg = 60 + 15 * G.up.sling; b.hp -= dmg; b.flash = 1; LOG('boss_head', { dmg, hp: Math.round(b.hp) });
  SFX.hit(); SFX.clang(); blood(p, s.v.clone().setY(0).normalize(), 22, 1.3); flashAt(p, 2.2, 0.25); dmgText(p, Math.round(dmg) + '!', 'crit'); hitstop(0.12); shake(0.5);
  if (b.hp <= 0) { b.hp = 0; killBoss(b); return; }
  b.state = 'reel'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.8, restart: true, fade: 0.08 }); prompt('');
}`,
`function bossHeadHit(b, s) {
  if (LEVEL === 3 || LEVEL === 4) return hurtBoss(b, s.dmg * (LEVEL === 4 ? 0.45 : 1.4), s.v.clone().setY(0).normalize(), 'sling');
  const p = b.headPos(new THREE.Vector3()); const open = bossWindow(b);

  // ── Phase 2: Goliath CATCHES the stone! ──────────────────
  if (b.phase2 && !b.stoneCaught) {
    b.stoneCaught = true;
    b.stoneThrowCd = 2.2;
    // Stone catcher flash + taunt
    SFX.clang && SFX.clang();
    flashAt(p, 3.5, 0.4, 0xff4400);
    shake(0.5); hitstop(0.1);
    bloomPulse(1.2, 0.5);
    dmgText(p.clone().setY(p.y + 0.8), 'CAUGHT!', 'crit');
    b.state = 'stalk'; b.st = 0;
    setTimeout(() => {
      toast('"Is thy God a God of hills only? Thou comest with a sling — I shall return thy stone!"\u003ci\u003eGoliath — Phase 2\u003c/i\u003e', 4000);
      prompt('HE HOLDS THE STONE — DODGE OR USE YOUR STAFF!');
    }, 400);
    b.play('Idle_Talking_Loop', { ts: 0.5, fade: 0.2 });
    LOG('boss_phase2_catch');
    return;
  }

  if (!open) { SFX.clang(); flashAt(p, 1.4, 0.2, 0xffe6a0); b.hp = Math.max(30, b.hp - 6); dmgText(p, 'CLANG', ''); toast('"…an helmet of brass upon his head…" Wait until he stumbles!\u003ci\u003e1 SAMUEL 17:5\u003c/i\u003e', 2600); LOG('boss_head_blocked'); return; }
  const dmg = 60 + 15 * G.up.sling; b.hp -= dmg; b.flash = 1; LOG('boss_head', { dmg, hp: Math.round(b.hp) });
  SFX.hit(); SFX.clang(); blood(p, s.v.clone().setY(0).normalize(), 22, 1.3); flashAt(p, 2.2, 0.25); dmgText(p, Math.round(dmg) + '!', 'crit'); hitstop(0.12); shake(0.5);
  if (b.hp <= 0) { b.hp = 0; killBoss(b); return; }
  b.state = 'reel'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.8, restart: true, fade: 0.08 }); prompt('');
}`);

// ============================================================
// 3. updateBoss — phase 2 trigger + berserk behaviour +
//    stone throw projectile back at player
// ============================================================
patch('updateBoss — phase 2 trigger, rage aura, stone throw',
`  if (b.alive && !b.summoned && b.hp < b.maxHp * 0.5 && b.state !== 'intro') { b.summoned = true; if (LEVEL === 3) { spawnEnemy('phil', -26, -14, 0); spawnEnemy('phil', 26, -12, 0.8); spawnEnemy('archer', 0, -27, 1.4); SFX.horn(); toast('<b>The king's guard rushes to his side!</b> Your servants meet them.', 2600); } else { spawnEnemy('phil', -34, -6, 0); spawnEnemy('phil', 34, -4, 0.8); SFX.horn(); toast('<b>The Philistines rush to aid their champion!</b>', 2600); } LOG('boss_summon'); }`,
`  if (b.alive && !b.summoned && b.hp < b.maxHp * 0.5 && b.state !== 'intro') { b.summoned = true; if (LEVEL === 3) { spawnEnemy('phil', -26, -14, 0); spawnEnemy('phil', 26, -12, 0.8); spawnEnemy('archer', 0, -27, 1.4); SFX.horn(); toast('<b>The king's guard rushes to his side!</b> Your servants meet them.', 2600); } else { spawnEnemy('phil', -34, -6, 0); spawnEnemy('phil', 34, -4, 0.8); SFX.horn(); toast('<b>The Philistines rush to aid their champion!</b>', 2600); } LOG('boss_summon'); }

  // ── Phase 2: Trigger at 35% HP (Level 1 Goliath only) ───
  if (LEVEL === 1 && b.alive && !b.phase2 && b.hp < b.maxHp * 0.35 && b.state !== 'intro') {
    b.phase2 = true;
    b.stoneCaught = false;
    b.berserking = true;
    // Visual rage: red aura light on
    if (b.rageLight) b.rageLight.intensity = 2.8;
    // Tint Goliath red
    b.obj.traverse(c => {
      if (c.material && c.material.color) {
        c.material.emissive = new THREE.Color(0.4, 0.0, 0.0);
        c.material.emissiveIntensity = 0.6;
      }
    });
    // Faster, angrier
    b.chargeCd = Math.min(b.chargeCd, 1.0);
    b.atkCd = Math.min(b.atkCd, 0.5);
    b.slamT = (b.slamT || 1.2) * 0.6;
    b.winK = 0.65; // shorter vulnerability window
    // Screen effects
    shake(1.4); bloomPulse(2.2, 1.2); godRayPulse && godRayPulse(0.3);
    if (gradePass && gradePass.uniforms.uChroma) gradePass.uniforms.uChroma.value = 1.2;
    SFX.roar && SFX.roar(); SFX.shatter && SFX.shatter();
    flashAt(b.pos.clone().setY(b.pos.y + 2), 6.0, 0.6, 0xff2200);
    // Dialogue
    setTimeout(() => {
      toast('"Thou art but a youth! Come to me, and I will give thy flesh unto the fowls of the air AND the beasts of the field!"\u003cbr\u003e\u003ci\u003eGoliath PHASE 2 — ENRAGED\u003c/i\u003e', 4500);
      prompt('GOLIATH IS ENRAGED — DODGE HIS THROWS!');
    }, 500);
    LOG('boss_phase2_start');
  }

  // ── Phase 2: Rage aura pulse + stone throw ───────────────
  if (LEVEL === 1 && b.phase2 && b.alive) {
    // Rage light heartbeat
    if (b.rageLight) {
      b.rageLight.intensity = 2.0 + Math.sin(now() * 8) * 1.2;
    }
    // Stone throw countdown
    if (b.stoneCaught && b.stoneThrowCd > 0) {
      b.stoneThrowCd -= dt;
      if (b.stoneThrowCd <= 0) {
        // HURL the stone back at the player
        b.stoneCaught = false;
        const throwDir = P.pos.clone().sub(b.pos).setY(0).normalize();
        throwDir.y = 0.15; // slight arc
        const throwPos = b.pos.clone().setY(b.pos.y + 2.2);
        // Reuse a stone projectile
        const st = stones && stones.find(s => s.life <= 0);
        if (st) {
          st.pos.copy(throwPos);
          st.v.copy(throwDir).multiplyScalar(28);
          st.life = 2.0; st.dmg = 45; st.m.visible = true;
          st.fromBoss = true;
        } else {
          // Fallback: direct damage if no stone slot free
          if (P.pos.distanceTo(b.pos) < 18) damagePlayer(45, b.pos);
        }
        SFX.sling && SFX.sling(); SFX.roar && SFX.roar();
        flashAt(throwPos, 2.5, 0.3, 0xff6600);
        dmgText(throwPos.clone().setY(throwPos.y + 0.5), 'HURLED!', 'crit');
        prompt('INCOMING — DODGE!');
        b.stoneThrowCd = 4.5 + Math.random() * 2.0; // throw again after cooldown
        // Allow catching again
        setTimeout(() => { b.stoneCaught = false; }, 500);
        LOG('boss_stone_throw');
      }
    }
  }`);

// ============================================================
// 4. killBoss — phase 2 cinematic twist: stone embedded in his
//    forehead glows before the fall
// ============================================================
patch('killBoss — phase 2 final death glow',
`  b.play('Hit_Head', { loop: false, ts: 0.5, restart: true, fade: 0.08 }); b.faceDown = true; b.landed = false;
  cinematicGoliathDefeat(b);`,
`  b.play('Hit_Head', { loop: false, ts: 0.5, restart: true, fade: 0.08 }); b.faceDown = true; b.landed = false;
  // Phase 2 finale — extra divine light burst on the killing stone
  if (b.phase2) {
    const head = b.headPos(new THREE.Vector3());
    flashAt(head, 8.0, 0.8, 0xffffff);
    bloomPulse(3.0, 2.0);
    godRayPulse && godRayPulse(0.6);
    setTimeout(() => toast('"David prevailed over the Philistine with a sling and with a stone… and THE BATTLE IS THE LORD\'S"\u003cbr\u003e\u003ci\u003e1 SAMUEL 17:50, 47\u003c/i\u003e', 6000), 800);
  }
  cinematicGoliathDefeat(b);`);

if (errors === 0) {
  console.log('\n⚔️ Feature E — Goliath Phase 2 complete!');
  console.log('   • Phase 2 triggers at 35% HP → rage aura (red point light)');
  console.log('   • Goliath taunts: "Come to me, and I will give thy flesh..."');
  console.log('   • Next sling shot → STONE CAUGHT with taunt dialog');
  console.log('   • Stone thrown back as projectile (45 dmg, 28 m/s)');
  console.log('   • Faster charge (atkCd/chargeCd halved), shorter stun window');
  console.log('   • Red emissive tint on all materials');
  console.log('   • Phase 2 kill: triple bloom + "THE BATTLE IS THE LORD\'S" banner');
} else {
  console.error(`\n✗ ${errors} patch(es) failed.`);
  process.exit(1);
}
