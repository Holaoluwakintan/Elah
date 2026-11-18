const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let raw = fs.readFileSync(GAME_JS, 'utf8');

// 1. Add ICONS.tentpeg and ICONS.milk
if (!raw.includes("tentpeg: '<svg")) {
  raw = raw.replace(
    "const ICONS = {",
    `const ICONS = {
  tentpeg: '<svg viewBox="0 0 64 64"><path d="M28 8 L36 8 L34 46 L32 58 L30 46 Z" fill="#e8e4dc"/><rect x="24" y="6" width="16" height="5" rx="2" fill="#d6a650"/></svg><span>TENT PEG</span>',
  milk: '<svg viewBox="0 0 64 64"><path d="M16 24 C16 44 20 54 32 54 C44 54 48 44 48 24 Z" fill="#fff5dd"/><path d="M14 22 Q32 28 50 22" stroke="#d6a650" stroke-width="4" fill="none"/></svg><span>MILK</span><i id="sling-cd"></i>',`
  );
  console.log('✓ Added ICONS.tentpeg and ICONS.milk');
}

// 2. setLevelUI Jael weapon display
if (!raw.includes("if (P && P.look === 'jael')")) {
  raw = raw.replace(
    "document.body.dataset.level = LEVEL; lastHud = '';",
    `if (P && P.look === 'jael') {
    $('who-name').textContent = 'JAEL';
    $('b-attack').innerHTML = ICONS.tentpeg;
    $('b-sling').innerHTML = ICONS.milk;
    $('b-attack').setAttribute('aria-label', 'Tent peg strike');
    $('b-sling').setAttribute('aria-label', 'Milk of sleep');
  }
  document.body.dataset.level = LEVEL; lastHud = '';`
  );
  console.log('✓ Hooked Jael UI into setLevelUI');
}

// 3. Add Jael to Cave of Adullam Sanctum
const advAnchor = `{
      id: 'josheb', name: 'JOSHEB · CHIEF OF THE MIGHTY MEN',
      pos: new THREE.Vector3(8.5, 0, 1.5), yaw: -1.6,
      look: 'davidking',
      verse: '"He lifted up his spear against eight hundred, whom he slew at one time."',
      ref: '2 Samuel 23:8 (KJV)'
    }`;

const jaelAdv = `{
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
    }`;

if (raw.includes(advAnchor) && !raw.includes("id: 'jael', name: 'JAEL")) {
  raw = raw.replace(advAnchor, jaelAdv);
  console.log('✓ Added Jael actor to Adullam advisors list');
}

// 4. Jael interaction card in Adullam
const jaelActionAnchor = `action: async () => {
        await card({
          who: ad.name,
          verse: ad.verse,
          ref: ad.ref,
          btn: 'AMEN'
        });
      }`;

const jaelActionReplacement = `action: async () => {
        if (ad.id === 'jael') {
          const chooseJael = await card({
            who: 'JAEL · HEROINE OF THE KENITES',
            text: '“She put her hand to the nail, and her right hand to the workmen’s hammer; and with the hammer she smote Sisera…”<br><br><b>Weapon:</b> Forged Tent Peg & Workman’s Hammer<br><b>Ability:</b> Lordly Dish of Milk (Area of Effect Sleep)',
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
      }`;

if (raw.includes(jaelActionAnchor) && !raw.includes("if (ad.id === 'jael')")) {
  raw = raw.replace(jaelActionAnchor, jaelActionReplacement);
  console.log('✓ Added Jael Sanctum interaction card');
}

fs.writeFileSync(GAME_JS, raw, 'utf8');
console.log('All Jael enhancements patched cleanly!');
