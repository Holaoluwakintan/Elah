// Fix: inject phase 2 catch into bossHeadHit using line index
const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');

const raw = fs.readFileSync(GAME_JS, 'utf8');
// Split on CRLF, work line by line
const lines = raw.split('\r\n');

// Find the bossHeadHit function start (look for exact pattern)
let fnStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'function bossHeadHit(b, s) {') {
    fnStart = i;
    break;
  }
}

if (fnStart === -1) {
  console.error('Could not find bossHeadHit function');
  process.exit(1);
}

console.log(`Found bossHeadHit at line ${fnStart + 1}`);

// The 3rd line of the function (index fnStart+2) is the `const open` line
// We want to insert phase-2 code AFTER the `const p...const open` line
// and BEFORE the `if (!open)` line

const INJECT = [
  '',
  '  // \u2500\u2500 Phase 2: Goliath CATCHES the stone! \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '  if (LEVEL === 1 && b.phase2 && !b.stoneCaught) {',
  '    b.stoneCaught = true;',
  '    b.stoneThrowCd = 2.2;',
  '    SFX.clang && SFX.clang();',
  '    flashAt(p, 3.5, 0.4, 0xff4400);',
  '    shake(0.5); hitstop(0.1);',
  '    bloomPulse(1.2, 0.5);',
  `    dmgText(p.clone().setY(p.y + 0.8), 'CAUGHT!', 'crit');`,
  `    b.state = 'stalk'; b.st = 0;`,
  '    setTimeout(() => {',
  `      toast('"Is thy God a God of hills only? I shall return thy stone!"<i>Goliath \u2014 Phase 2</i>', 4000);`,
  `      prompt('HE HOLDS THE STONE \u2014 DODGE OR STRIKE WITH YOUR STAFF!');`,
  '    }, 400);',
  `    b.play('Idle_Talking_Loop', { ts: 0.5, fade: 0.2 });`,
  `    LOG('boss_phase2_catch');`,
  '    return;',
  '  }',
  '',
];

// Insert after line fnStart+2 (the `const p = b.headPos...` line)
const insertAt = fnStart + 3; // after function decl, LEVEL check, const p line
lines.splice(insertAt, 0, ...INJECT);

fs.writeFileSync(GAME_JS, lines.join('\r\n'), 'utf8');
console.log(`\u2713 bossHeadHit \u2014 phase 2 stone catch injected at line ${insertAt + 1}`);
console.log('\u2713 All Goliath Phase 2 patches complete!');
