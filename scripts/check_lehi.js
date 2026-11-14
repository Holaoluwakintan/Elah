const fs = require('fs');
const s = fs.readFileSync('C:/Users/USERR/.gemini/antigravity/scratch/Elah/js/game.js','utf8');
console.log('LEHI_HORDE:', s.includes('LEHI_HORDE'));
console.log('onLehiKill:', s.includes('onLehiKill'));
console.log('HEAP_MAX:', s.includes('HEAP_MAX'));
console.log('Scorched GoT:', s.includes('Scorched GoT Lehi'));
console.log('lehi embers:', s.includes("name === 'lehi'"));
console.log('updateLehi:', s.includes('function updateLehi'));
console.log('heaps upon heaps toast:', s.includes('HEAPS UPON HEAPS'));
