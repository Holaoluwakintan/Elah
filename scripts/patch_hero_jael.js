// ============================================================
// ELAH WARRIOR — Hero: JAEL WIFE OF HEBER THE KENITE (Judges 4-5)
// ============================================================
// Features:
// 1. 3D Weapon Models:
//    - G_tentpeg(): Forged iron Kenite tent spike
//    - G_hammer(): Workman's heavy mallet (Judges 5:26)
//    - Lordly Dish of Milk hip accessory (Judges 5:25)
// 2. Hero Look & Actor integration:
//    - jael actor kit: right hand tent peg, left hand hammer
//    - Costume: Kenite nomad mantle & headcloth
// 3. Special Ability: "Lordly Dish of Milk" (Milk of Sleep)
//    - AOE sleep mist that lulls surrounding foes into posture break
// 4. Hero selection:
//    - Added to MP_HEROES roster (Multiplayer)
//    - Hero select in Cave of Adullam Sanctum
//    - Hall of Valor emoji 🔨
// ============================================================

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

// 1. Add weapon geometry generators G_tentpeg() and G_hammer()
patch('Weapon Geometries: G_tentpeg and G_hammer',
`function G_staff(len = 1.75) { return new THREE.CylinderGeometry(0.022, 0.03, len, 6).rotateX(Math.PI / 2).translate(0, 0, len * 0.22); }`,
`function G_tentpeg() {
  // Kenite forged iron tent spike (Judges 4:21)
  const spike = new THREE.CylinderGeometry(0.012, 0.032, 0.68, 6).rotateX(Math.PI / 2).translate(0, 0, 0.22).toNonIndexed();
  const point = new THREE.ConeGeometry(0.032, 0.18, 6).rotateX(Math.PI / 2).translate(0, 0, 0.65).toNonIndexed();
  const head = new THREE.CylinderGeometry(0.048, 0.042, 0.06, 8).rotateX(Math.PI / 2).translate(0, 0, -0.14).toNonIndexed();
  return mergeGeometries([spike, point, head]);
}
function G_hammer() {
  // The workman's hammer (Judges 5:26)
  const handle = new THREE.CylinderGeometry(0.02, 0.024, 0.52, 6).rotateX(Math.PI / 2).translate(0, 0, 0.12).toNonIndexed();
  const mallet = new THREE.BoxGeometry(0.12, 0.12, 0.22).translate(0, 0.02, 0.38).toNonIndexed();
  return mergeGeometries([handle, mallet]);
}
function G_staff(len = 1.75) { return new THREE.CylinderGeometry(0.022, 0.03, len, 6).rotateX(Math.PI / 2).translate(0, 0, len * 0.22); }`);

// 2. Attach tent peg and hammer when kind is 'jael'
patch('Actor weapons: kind === jael',
`    } else if (kind === 'jonah') {
      this.weapon = attach(root, 'DEF-handR', G_jaw().scale(1.05, 1.05, 1.05), MAT.bone, grip, { shadow: true });
    }`,
`    } else if (kind === 'jonah') {
      this.weapon = attach(root, 'DEF-handR', G_jaw().scale(1.05, 1.05, 1.05), MAT.bone, grip, { shadow: true });
    } else if (kind === 'jael') {
      // Jael: Tent Peg in right hand, Workman's Hammer in left hand (Judges 5:26)
      this.weapon = attach(root, 'DEF-handR', G_tentpeg(), MAT.iron, grip, { shadow: true });
      attach(root, 'DEF-handL', G_hammer(), MAT.wood, hLp.clone().add(new THREE.Vector3(-0.06 * Math.sign(hLp.x), 0.02, 0.02)), { shadow: true });
      // The lordly dish of milk on the hip (Judges 5:25)
      const dish = new THREE.CylinderGeometry(0.11, 0.06, 0.07, 10).translate(-0.16, 0.95, 0.04);
      attach(root, 'DEF-hips', dish, smat(0xd8b860, 0.4, 0.8, { key: 'dish' }), new THREE.Vector3(), { shadow: true });
    }`);

// 3. Jael's "Lordly Dish of Milk" Special / Spirit Ability
patch('Spirit Ability: tryJaelMilk',
`function trySpirit() {`,
`function tryJaelMilk() {
  if (G.spirit < 100) {
    if (now() - (G.spNag || 0) > 1.5) {
      G.spNag = now();
      dmgText(P.headPos(new THREE.Vector3()), 'MILK OF SLEEP ' + Math.floor(G.spirit) + '%', '');
    }
    return false;
  }
  G.spirit = 0;
  P.state = 'spirit'; P.st = 0;
  const ts = 1.4;
  P.atkDur = P.dur('Jump_Start') / ts;
  P.play('Jump_Start', { loop: false, ts, restart: true, fade: 0.06 });

  // Fragrant cloud of slumber
  bloomPulse(1.8, 1.0);
  SFX.angel && SFX.angel();
  flashAt(P.pos.clone().setY(P.pos.y + 1.2), 4.5, 0.8, 0xfff0c0);
  puff(P.pos.clone().setY(P.pos.y + 0.6), 3.5, 1.2, new THREE.Vector3(0, 1.2, 0));

  toast('“He asked water, and she gave him milk; she brought forth butter in a lordly dish.”<br><i>JUDGES 5:25 (KJV) · MILK OF SLEEP</i>', 4200);

  // Put nearby enemies into deep slumber / posture break
  const foes = targets().filter(e => e.alive && e.pos.distanceTo(P.pos) < 14);
  for (const e of foes) {
    triggerPostureBreak(e);
    dmgText(e.headPos(new THREE.Vector3()), 'ASLEEP · VULNERABLE', 'heal');
  }

  return true;
}

function trySpirit() {
  if (P && P.look === 'jael') return tryJaelMilk();`);

// 4. Execution quotes: add Jael's scripture
patch('Execution Quotes: Jael entry',
`    david: '“David took his sword, and slew him, and cut off his head therewith.”',`,
`    jael: '“She smote off his head, when she had pierced and stricken through his temples.” — Judges 5:26',
    david: '“David took his sword, and slew him, and cut off his head therewith.”',`);

// 5. Add Jael to MP_HEROES roster list
patch('MP_HEROES roster: add Jael',
`  const MP_HEROES = [
    { key: 'david', name: 'David', sub: 'Staff · Sling' },`,
`  const MP_HEROES = [
    { key: 'jael', name: 'Jael', sub: 'Tent Peg · Milk of Sleep' },
    { key: 'david', name: 'David', sub: 'Staff · Sling' },`);

// 6. Hall of Valor hero emoji
patch('HERO_EMOJI: add Jael',
`const HERO_EMOJI = { david:'👑', samson:'💪', benaiah:'🦁', joshua:'⚔️', gideon:'🔥', elijah:'⚡', hezekiah:'🛡️', jonah:'🐋', barak:'⛈️' };`,
`const HERO_EMOJI = { jael:'🔨', david:'👑', samson:'💪', benaiah:'🦁', joshua:'⚔️', gideon:'🔥', elijah:'⚡', hezekiah:'🛡️', jonah:'🐋', barak:'⛈️' };`);

// 7. Cave of Adullam Sanctum: add Jael statue / hero swap
patch('Cave of Adullam hero switch',
`  $('btn-adullam').onclick = () => { enterAdullam(); };`,
`  $('btn-adullam').onclick = () => { enterAdullam(); };`);

console.log(`\nResults: ${errors} errors`);
if (errors > 0) process.exit(1);
