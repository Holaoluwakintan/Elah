const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

let src = norm(raw);

// 1. setLevelUI Jael check
const uiTarget = norm("document.body.dataset.level = LEVEL; lastHud = '';");
const uiRepl = norm(`if (P && P.look === 'jael') {
    $('who-name').textContent = 'JAEL';
    $('b-attack').innerHTML = ICONS.tentpeg;
    $('b-sling').innerHTML = ICONS.milk;
    $('b-attack').setAttribute('aria-label', 'Tent peg strike');
    $('b-sling').setAttribute('aria-label', 'Milk of sleep');
  }
  document.body.dataset.level = LEVEL; lastHud = '';`);

if (src.includes(uiTarget) && !src.includes("P.look === 'jael'")) {
  src = src.replace(uiTarget, uiRepl);
  console.log('✓ Hooked Jael UI into setLevelUI');
}

// 2. Add Jael to advData in Adullam
const advTarget = norm(`    {
      id: 'josheb', name: 'JOSHEB · CHIEF OF THE MIGHTY MEN',
      pos: new THREE.Vector3(8.5, 0, 1.5), yaw: -1.6,
      look: 'davidking',
      verse: '"He lifted up his spear against eight hundred, whom he slew at one time."',
      ref: '2 Samuel 23:8 (KJV)'
    }`);

const advRepl = norm(`    {
      id: 'josheb', name: 'JOSHEB · CHIEF OF THE MIGHTY MEN',
      pos: new THREE.Vector3(8.5, 0, 1.5), yaw: -1.6,
      look: 'davidking',
      verse: '"He lifted up his spear against eight hundred, whom he slew at one time."',
      ref: '2 Samuel 23:8 (KJV)'
    },
    {
      id: 'jael', name: 'JAEL · HEROINE OF THE KENITES',
      pos: new THREE.Vector3(-2.2, 0, 8.2), yaw: 0.35,
      look: 'jael',
      verse: '"Blessed above women shall Jael the wife of Heber the Kenite be."',
      ref: 'Judges 5:24 (KJV)'
    }`);

if (src.includes(advTarget) && !src.includes("id: 'jael', name: 'JAEL")) {
  src = src.replace(advTarget, advRepl);
  console.log('✓ Added Jael actor to Adullam advisors list');
}

// 3. Jael interaction card in Adullam
const jaelActionAnchor = norm(`      action: async () => {
        await card({
          who: ad.name,
          verse: ad.verse,
          ref: ad.ref,
          btn: 'AMEN'
        });
      }`);

const jaelActionReplacement = norm(`      action: async () => {
        if (ad.id === 'jael') {
          const chooseJael = await card({
            who: 'JAEL · HEROINE OF THE KENITES',
            text: '“She put her hand to the nail, and her right hand to the workmen’s hammer; and with the hammer she smote Sisera…”<br><br><b>Weapon:</b> Forged Tent Peg & Workman’s Mallet<br><b>Ability:</b> Lordly Dish of Milk (Area of Effect Sleep)',
            verse: ad.verse,
            ref: ad.ref,
            btn: 'WALK IN HER STEPS (PLAY AS JAEL)',
            btn2: 'AMEN'
          });
          if (chooseJael) {
            P.remove();
            P = new Actor('jael', 0.98, 'jael');
            P.pos.set(0, 0, 4); ground(P); P.yaw = Math.PI;
            P.play('Idle_Loop');
            setLevelUI();
            toast('You now fight as Jael!', 3200);
            SFX.shofar && SFX.shofar();
          }
          return;
        }
        await card({
          who: ad.name,
          verse: ad.verse,
          ref: ad.ref,
          btn: 'AMEN'
        });
      }`);

if (src.includes(jaelActionAnchor) && !src.includes("if (ad.id === 'jael')")) {
  src = src.replace(jaelActionAnchor, jaelActionReplacement);
  console.log('✓ Added Jael Sanctum interaction card');
}

fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done!');
