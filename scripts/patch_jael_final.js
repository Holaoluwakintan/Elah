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

// 2. Jael interaction card in Adullam
const jaelActionAnchor = norm(`      action: async () => {
        await card({
          who: ad.name,
          verse: ad.verse,
          ref: ad.ref,
          text: 'David, in this cave the broken and distressed gather to be forged into God’s mightiest army. Stand steadfast.',
          btn: 'AMEN'
        });
      }`);

const jaelActionReplacement = norm(`      action: async () => {
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
          text: 'David, in this cave the broken and distressed gather to be forged into God’s mightiest army. Stand steadfast.',
          btn: 'AMEN'
        });
      }`);

if (src.includes(jaelActionAnchor) && !src.includes("if (ad.id === 'jael')")) {
  src = src.replace(jaelActionAnchor, jaelActionReplacement);
  console.log('✓ Added Jael Sanctum interaction card');
}

fs.writeFileSync(GAME_JS, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('Finished updating game.js for Jael!');
