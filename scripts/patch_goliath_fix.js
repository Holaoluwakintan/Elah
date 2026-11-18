// Fix patches that failed due to unicode escape differences
const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let errors = 0;

function norm(s) { return s.replace(/\r\n/g, '\n'); }
function writeCRLF(f, c) { fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8'); }

function patch(label, search, replacement) {
  const raw = fs.readFileSync(GAME_JS, 'utf8');
  const src = norm(raw);
  if (!src.includes(norm(search))) {
    console.error(`✗ NOT FOUND [${label}]`);
    errors++;
    return;
  }
  writeCRLF(GAME_JS, src.replace(norm(search), norm(replacement)));
  console.log(`✓ ${label}`);
}

// ============================================================
// 1. bossHeadHit — insert phase 2 stone catch at the top
// ============================================================
patch('bossHeadHit — phase 2 stone catch',
`function bossHeadHit(b, s) {
  if (LEVEL === 3 || LEVEL === 4) return hurtBoss(b, s.dmg * (LEVEL === 4 ? 0.45 : 1.4), s.v.clone().setY(0).normalize(), 'sling');
  const p = b.headPos(new THREE.Vector3()); const open = bossWindow(b);
  if (!open) { SFX.clang(); flashAt(p, 1.4, 0.2, 0xffe6a0); b.hp = Math.max(30, b.hp - 6); dmgText(p, 'CLANG', ''); toast('"…an helmet of brass upon his head…" Wait until he stumbles!<i>1 SAMUEL 17:5</i>', 2600); LOG('boss_head_blocked'); return; }
  const dmg = 60 + 15 * G.up.sling; b.hp -= dmg; b.flash = 1; LOG('boss_head', { dmg, hp: Math.round(b.hp) });
  SFX.hit(); SFX.clang(); blood(p, s.v.clone().setY(0).normalize(), 22, 1.3); flashAt(p, 2.2, 0.25); dmgText(p, Math.round(dmg) + '!', 'crit'); hitstop(0.12); shake(0.5);
  if (b.hp <= 0) { b.hp = 0; killBoss(b); return; }
  b.state = 'reel'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.8, restart: true, fade: 0.08 }); prompt('');
}`,
`function bossHeadHit(b, s) {
  if (LEVEL === 3 || LEVEL === 4) return hurtBoss(b, s.dmg * (LEVEL === 4 ? 0.45 : 1.4), s.v.clone().setY(0).normalize(), 'sling');
  const p = b.headPos(new THREE.Vector3()); const open = bossWindow(b);

  // ── Phase 2: Goliath CATCHES the stone! ──────────────────
  if (LEVEL === 1 && b.phase2 && !b.stoneCaught) {
    b.stoneCaught = true;
    b.stoneThrowCd = 2.2;
    SFX.clang && SFX.clang();
    flashAt(p, 3.5, 0.4, 0xff4400);
    shake(0.5); hitstop(0.1);
    bloomPulse(1.2, 0.5);
    dmgText(p.clone().setY(p.y + 0.8), 'CAUGHT!', 'crit');
    b.state = 'stalk'; b.st = 0;
    setTimeout(() => {
      toast('"Is thy God a God of hills only? Thou comest with a sling — I shall return thy stone!"<i>Goliath — Phase 2</i>', 4000);
      prompt('HE HOLDS THE STONE — DODGE OR USE YOUR STAFF!');
    }, 400);
    b.play('Idle_Talking_Loop', { ts: 0.5, fade: 0.2 });
    LOG('boss_phase2_catch');
    return;
  }

  if (!open) { SFX.clang(); flashAt(p, 1.4, 0.2, 0xffe6a0); b.hp = Math.max(30, b.hp - 6); dmgText(p, 'CLANG', ''); toast('"…an helmet of brass upon his head…" Wait until he stumbles!<i>1 SAMUEL 17:5</i>', 2600); LOG('boss_head_blocked'); return; }
  const dmg = 60 + 15 * G.up.sling; b.hp -= dmg; b.flash = 1; LOG('boss_head', { dmg, hp: Math.round(b.hp) });
  SFX.hit(); SFX.clang(); blood(p, s.v.clone().setY(0).normalize(), 22, 1.3); flashAt(p, 2.2, 0.25); dmgText(p, Math.round(dmg) + '!', 'crit'); hitstop(0.12); shake(0.5);
  if (b.hp <= 0) { b.hp = 0; killBoss(b); return; }
  b.state = 'reel'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.8, restart: true, fade: 0.08 }); prompt('');
}`);

// ============================================================
// 2. updateBoss — phase 2 trigger block (after summoned line)
// ============================================================
patch('updateBoss — phase 2 rage trigger + stone throw',
`  if (b.alive && !b.summoned && b.hp < b.maxHp * 0.5 && b.state !== 'intro') { b.summoned = true; if (LEVEL === 3) { spawnEnemy('phil', -26, -14, 0); spawnEnemy('phil', 26, -12, 0.8); spawnEnemy('archer', 0, -27, 1.4); SFX.horn(); toast('<b>The king\u2019s guard rushes to his side!</b> Your servants meet them.', 2600); } else { spawnEnemy('phil', -34, -6, 0); spawnEnemy('phil', 34, -4, 0.8); SFX.horn(); toast('<b>The Philistines rush to aid their champion!</b>', 2600); } LOG('boss_summon'); }
  if (b.state === 'dead' && b.faceDown && LEVEL !== 3) {`,
`  if (b.alive && !b.summoned && b.hp < b.maxHp * 0.5 && b.state !== 'intro') { b.summoned = true; if (LEVEL === 3) { spawnEnemy('phil', -26, -14, 0); spawnEnemy('phil', 26, -12, 0.8); spawnEnemy('archer', 0, -27, 1.4); SFX.horn(); toast('<b>The king\u2019s guard rushes to his side!</b> Your servants meet them.', 2600); } else { spawnEnemy('phil', -34, -6, 0); spawnEnemy('phil', 34, -4, 0.8); SFX.horn(); toast('<b>The Philistines rush to aid their champion!</b>', 2600); } LOG('boss_summon'); }

  // ── Phase 2: Trigger at 35% HP (Level 1 Goliath only) ───
  if (LEVEL === 1 && b.alive && !b.phase2 && b.hp < b.maxHp * 0.35 && b.state !== 'intro') {
    b.phase2 = true; b.stoneCaught = false; b.berserking = true;
    if (b.rageLight) b.rageLight.intensity = 2.8;
    b.obj.traverse(c => { if (c.material && c.material.color) { c.material.emissive = new THREE.Color(0.4, 0.0, 0.0); c.material.emissiveIntensity = 0.6; } });
    b.chargeCd = Math.min(b.chargeCd, 1.0); b.atkCd = Math.min(b.atkCd, 0.5); b.winK = 0.65;
    shake(1.4); bloomPulse(2.2, 1.2); godRayPulse && godRayPulse(0.3);
    if (gradePass && gradePass.uniforms.uChroma) gradePass.uniforms.uChroma.value = 1.2;
    SFX.roar && SFX.roar(); SFX.shatter && SFX.shatter();
    flashAt(b.pos.clone().setY(b.pos.y + 2), 6.0, 0.6, 0xff2200);
    setTimeout(() => { toast('"Thou art but a youth! Come to me, and I will give thy flesh unto the fowls of the air AND the beasts of the field!"<br><i>Goliath PHASE 2 — ENRAGED</i>', 4500); prompt('GOLIATH IS ENRAGED — DODGE HIS THROWS!'); }, 500);
    LOG('boss_phase2_start');
  }

  // ── Phase 2: Rage aura + stone throw countdown ───────────
  if (LEVEL === 1 && b.phase2 && b.alive) {
    if (b.rageLight) b.rageLight.intensity = 2.0 + Math.sin(now() * 8) * 1.2;
    if (b.stoneCaught && b.stoneThrowCd > 0) {
      b.stoneThrowCd -= dt;
      if (b.stoneThrowCd <= 0) {
        b.stoneCaught = false;
        const throwDir = P.pos.clone().sub(b.pos).setY(0).normalize(); throwDir.y = 0.15;
        const throwPos = b.pos.clone().setY(b.pos.y + 2.2);
        const st = stones && stones.find(s => s.life <= 0);
        if (st) { st.pos.copy(throwPos); st.v.copy(throwDir).multiplyScalar(28); st.life = 2.0; st.dmg = 45; st.m.visible = true; }
        else if (P.pos.distanceTo(b.pos) < 18) { damagePlayer(45, b.pos); }
        SFX.sling && SFX.sling(); SFX.roar && SFX.roar();
        flashAt(throwPos, 2.5, 0.3, 0xff6600);
        dmgText(throwPos.clone().setY(throwPos.y + 0.5), 'HURLED!', 'crit');
        prompt('INCOMING — DODGE!');
        b.stoneThrowCd = 4.5 + Math.random() * 2.0;
        LOG('boss_stone_throw');
      }
    }
  }

  if (b.state === 'dead' && b.faceDown && LEVEL !== 3) {`);

if (errors === 0) {
  console.log('\n✅ All Goliath Phase 2 patches applied!');
} else {
  console.error(`\n✗ ${errors} patch(es) still failing.`);
  process.exit(1);
}
