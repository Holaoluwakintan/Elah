import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ------------------------------------------------------------------ setup
const Q = new URLSearchParams(location.search);
const BOT = Q.has('bot');
// ---- settings (localStorage 'elah-settings'): graphics quality, music + sound volume, vibration
const SET_KEY = 'elah-settings';
function detectQuality() {
  // a quick guess from the GPU name, memory and screen; the in-game frame-rate watch corrects it later
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'low';
    const ext = gl.getExtension('WEBGL_debug_renderer_info'); const r = ((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '').toLowerCase();
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, touch = matchMedia('(pointer:coarse)').matches;
    if (/swiftshader|llvmpipe|software|mali-[t4]|mali-g31|mali-g51|mali-g52|powervr|adreno \(tm\) [345]\d\d|adreno 5|sgx|ge8320|ge8322|img/.test(r) || mem <= 3 || cores <= 4 && touch) return 'low';
    if (touch) { if (/apple|adreno \(tm\) (7|8)\d\d|adreno (7|8)|mali-g7[1-9]\d|mali-g6[1-9]\d|immortalis|xclipse/.test(r) && mem >= 6) return 'high'; return 'med'; }
    if (/intel.*(hd|uhd) graphics [2-6]\d\d\b|intel\(r\) hd/.test(r)) return 'med';
    return 'high';
  } catch (e) { return 'med'; }
}
const SETTINGS = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; } catch (e) { } return { q: s.q || 'auto', music: s.music ?? 0.7, sfx: s.sfx ?? 0.9, vib: s.vib ?? true, auto: s.auto || null }; })();
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); } catch (e) { } }
if (!SETTINGS.auto) { SETTINGS.auto = detectQuality(); saveSettings(); }
const QQ = Q.get('q');
let QUALITY = ['low', 'med', 'high'].includes(QQ) ? QQ : SETTINGS.q !== 'auto' ? SETTINGS.q : SETTINGS.auto;
const LOWQ = QUALITY === 'low';
const QP = { low: { dpr: 1, shadow: 0, bloom: false, post: false, sky: 0 }, med: { dpr: 1.25, shadow: 1024, bloom: false, post: true, sky: 1 }, high: { dpr: 1.75, shadow: 2048, bloom: true, post: true, sky: 1 } };
const vibrate = (ms) => { if (SETTINGS.vib && navigator.vibrate && !BOT) try { navigator.vibrate(ms); } catch (e) { } };
const HD = +(Q.get('hd') || 0);
// ---- save (localStorage): unlocked levels, spoils, upgrades
const SAVE_KEY = 'elah-save-v1';
const UP0 = () => ({ staff: 0, sling: 0, bronze: 0, jaw: 0, spirit: 0, sword: 0, bow: 0, men: 0 });
function loadSave() { let s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { } return { open: s.open || { abram: (s.unlocked || 1) >= 2, samson: (s.unlocked || 1) >= 2 }, unlocked: s.unlocked || 1, coins: s.coins || 0, armour: s.armour || 0, up: Object.assign(UP0(), s.up || {}), done: s.done || {}, level: s.level || 1 }; }
let SAVE = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }
// =====================================================================================================
// STORY & LEVEL ORDER: everything Michael may want to change lives in this block.
//  · LEVEL_ORDER is the order on the title screen and the order levels unlock. Move a line to reorder.
//    run = which built level it plays (1 = David: Elah to Adullam, 2 = Samson, 3 = Abram). soon = a "coming soon" card.
//  · STORY_L1 holds Level 1's sequences: the opening cinematic shots (seconds, words, verse), the counsel card,
//    the jubilation, the escape tuning and the cave card. Every verse is KJV, word for word.
// =====================================================================================================
const LEVEL_ORDER = [
  { key: 'david', run: 1, name: 'David', place: 'From Elah to Adullam', sub: 'FROM ELAH TO ADULLAM' },
  { key: 'abram', run: 3, name: 'Abram rescues Lot', place: 'Dan · The night attack', sub: 'ABRAM RESCUES LOT' },
  { key: 'benaiah', run: 4, name: 'Benaiah', place: 'Moab · The pit · The Egyptian', sub: 'BENAIAH, A VALIANT MAN' },
  { key: 'deborah', run: 5, name: 'Deborah and Barak', place: 'Mount Tabor · The river Kishon', sub: 'DEBORAH AND BARAK' },
  { key: 'samson', run: 2, name: 'Samson', place: 'Lehi · The house of Dagon', sub: 'THE STRENGTH OF SAMSON' },
  { key: 'mighty', run: 6, name: 'David’s mighty men', place: 'Pasdammim · The well of Bethlehem', sub: 'DAVID AND HIS MIGHTY MEN' },
];
const STORY_L1 = {
  sequences: ['The Philistine armies', 'Goliath', 'Jubilation', 'Escape to Adullam'],   // shown as "SEQUENCE n OF 4 · …"
  // Opening cinematic (tap to skip). shot = which camera set-up plays (defy, prize, vision, resolve); sec = seconds on screen.
  intro: [
    { shot: 'defy', sec: 1.4, head: 'Goliath defies Israel', text: '“I defy the armies of Israel this day…”', ref: '1 Samuel 17:10' },
    { shot: 'prize', sec: 1.4, head: 'The king’s prize', text: '“…the king will enrich him with great riches, and will give him his daughter…”', ref: '1 Samuel 17:25' },
    { shot: 'vision', sec: 2.0, look: 'vision', head: 'If the Philistine wins…', text: '“…then shall ye be our servants, and serve us.”', ref: '1 Samuel 17:9' },
    { shot: 'resolve', sec: 1.2, head: 'Not for the prize. For Israel.', text: '“…for the battle is the LORD’S…”', ref: '1 Samuel 17:47' },
  ],
  counsel: { who: 'MOSES · YOUR ADVISOR', text: 'Not for the king’s riches, David, but for Israel. First the armies of the Philistines, then their champion. Remember what you told Saul:', verse: '“The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.”', ref: '1 SAMUEL 17:37 (KJV)', tips: '<b>Staff</b> for close fighting. <b>Sling</b> from afar. <b>Dodge</b> their blows. Gather the <b>spoils</b> of the fallen to grow stronger.', btn: 'I AM READY' },
  jubilation: [
    { shot: 'praise', sec: 4.6, head: 'Israel rejoices', text: '“Saul hath slain his thousands, and David his ten thousands.”', ref: '1 Samuel 18:7' },
    { shot: 'jealous', sec: 3.0, look: 'dark', head: 'But Saul…', text: '“And Saul was very wroth… And Saul eyed David from that day and forward.”', ref: '1 Samuel 18:8–9' },
  ],
  escapeCard: { who: 'SEQUENCE 4 OF 4 · ESCAPE TO ADULLAM', text: 'Saul now seeks your life, and his soldiers are many. <b>Do not fight back.</b> Run for the cave of Adullam.', verse: '“…and David fled, and escaped that night.”', ref: '1 SAMUEL 19:10 (KJV)', btn: 'RUN' },
  escapeTips: { touch: '<b>SPRINT</b> (hold) while stamina lasts · <b>ROLL</b> through their hands · <b>HIDE</b> beside a rock and they lose you · Getting caught costs health', keys: '<b>Shift / J</b> (hold) sprint · <b>Space</b> roll · <b>K / C</b> hide beside a rock · Getting caught costs health' },
  // Escape tuning. groups: when David passes z = at, n soldiers appear, from behind him or waiting ahead on the slopes.
  escape: {
    runSpeed: 6.0, sprintSpeed: 8.7, stamina: 100, sprintDrain: 24, staminaRegen: 15, hunterSpeed: [5.0, 5.7],
    catchDmg: 14, grabRange: 2.1, lungeSpeed: 7.6, sight: 19, hiddenSee: 3.2, hideNear: 1.8, maxActive: 14,
    groups: [
      { at: 99, n: 6, from: 'behind' }, { at: -10, n: 3, from: 'ahead' }, { at: -32, n: 4, from: 'ahead' }, { at: -48, n: 3, from: 'behind' },
      { at: -68, n: 4, from: 'ahead' }, { at: -92, n: 4, from: 'ahead' }, { at: -108, n: 3, from: 'behind' }, { at: -122, n: 4, from: 'ahead' },
    ],
  },
  cave: { who: 'THE CAVE OF ADULLAM', verse: '“David therefore departed thence, and escaped to the cave Adullam: and when his brethren and all his father’s house heard it, they went down thither to him. And every one that was in distress, and every one that was in debt, and every one that was discontented, gathered themselves unto him; and he became a captain over them: and there were with him about four hundred men.”', ref: '1 SAMUEL 22:1–2 (KJV)', btn: 'CONTINUE' },
};
// Level 2 on the title (run 3): Abram rescues Lot (Genesis 14). Same shape as STORY_L1.
const STORY_L3 = {
  sequences: ['Night raid at Dan', 'Free Lot', 'The divided attack', 'Chedorlaomer', 'The chase to Hobah'],
  waveSeq: [1, 2, 3],   // which sequence each wave belongs to (the king is 4, the chase 5)
  intro: [
    { shot: 'taken', sec: 2.0, head: 'The kings of the east take Lot', text: '“And they took Lot, Abram’s brother’s son, who dwelt in Sodom, and his goods, and departed.”', ref: 'Genesis 14:12' },
    { shot: 'escaped', sec: 1.6, head: 'One that had escaped', text: '“And there came one that had escaped, and told Abram the Hebrew…”', ref: 'Genesis 14:13' },
    { shot: 'armed', sec: 2.0, head: 'Abram arms his servants', text: '“…he armed his trained servants, born in his own house, three hundred and eighteen…”', ref: 'Genesis 14:14' },
  ],
  counsel: { who: 'MOSES · YOUR ADVISOR', text: 'Lot and the people are bound in the camp of the four kings at Dan. Divide your servants and strike by night.', tips: '<b>Sword</b> up close. <b>Bow</b> from afar. <b>Dodge</b> their blows. <b>Stand by the captives</b> to cut them free. Your <b>servants</b> fight beside you. Gather the <b>spoils</b> for upgrades.', btn: 'ATTACK BY NIGHT' },
  // difficulty: multipliers on the eastern soldiers and the king (1 = the first version)
  hard: { hp: 1.42, dmg: 1.32, speed: 0.35, attackers: 1, kingHp: 1.2 },
};
// Benaiah (run 4): 2 Samuel 23:20–23 and 1 Chronicles 11:22–25. Same shape as STORY_L3, plus the lion and the Egyptian.
const STORY_L4 = {
  sequences: ['Two lionlike men of Moab', 'The lion in the pit', 'The Egyptian'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'moab', sec: 1.9, head: 'Two lionlike men of Moab', text: '“…he slew two lionlike men of Moab…”', ref: '2 Samuel 23:20' },
    { shot: 'pit', sec: 1.9, head: 'A lion in a pit, in time of snow', text: '“…he went down also and slew a lion in the midst of a pit in time of snow:”', ref: '2 Samuel 23:20' },
    { shot: 'egypt', sec: 2.0, head: 'An Egyptian, five cubits high', text: '“And he slew an Egyptian, a man of great stature, five cubits high; and in the Egyptian’s hand was a spear like a weaver’s beam…”', ref: '1 Chronicles 11:23' },
  ],
  counsel: { who: 'MOSES · YOUR ADVISOR', text: 'Benaiah son of Jehoiada, the raiders of Moab are on the border, and two lionlike men lead them. Go out and meet them.', tips: '<b>Staff</b> up close. <b>Sling</b> from afar. <b>Dodge</b> their blows. Gather the <b>spoils</b> for upgrades.', btn: 'GO OUT TO MOAB' },
  // difficulty: multipliers on the soldiers of Moab (Benaiah comes after Abram, so it is harder)
  hard: { hp: 1.5, dmg: 1.38, speed: 0.4, attackers: 1 },
  lionman: { hp: 420, dmg: 26, speed: 3.2, scale: 1.22 },
  lion: { hp: 900, scale: 1.05, leap: 3.1, ring: 2.3, win: 0.6, open: 1.25,
    card: { who: 'THE LION IN THE PIT', text: 'Snow is falling. A lion has come down into the pit, and Benaiah goes down after it.', verse: '“…he went down also and slew a lion in the midst of a pit in time of snow:”', ref: '2 SAMUEL 23:20 (KJV)', tips: '<b>Moses:</b> Watch the ring when it crouches, then <b>dodge</b> the pounce. When it lands or strikes the wall it is open: <b>strike hard</b>.', btn: 'GO DOWN' } },
  egypt: { hp: 1150, scale: 1.75, disarmAt: 0.5, win: 0.8, open: 1.35,
    card: { who: 'THE EGYPTIAN · FIVE CUBITS HIGH', verse: '“And he slew an Egyptian, a goodly man: and the Egyptian had a spear in his hand; but he went down to him with a staff, and plucked the spear out of the Egyptian’s hand, and slew him with his own spear.”', ref: '2 SAMUEL 23:21 (KJV)', tips: '<b>Moses:</b> His spear is like a weaver’s beam. <b>Dodge</b> the sweep and the charge, strike when he stumbles, and wear him down: then <b>pluck the spear</b> from his hand.', btn: 'GO DOWN TO HIM' } },
  end: { who: 'BENAIAH SON OF JEHOIADA', text: 'Over David’s guard.', verse: '“These things did Benaiah the son of Jehoiada, and had the name among three mighty men. He was more honourable than the thirty, but he attained not to the first three. And David set him over his guard.”', ref: '2 SAMUEL 23:22–23 (KJV)', btn: 'CONTINUE' },
};
// Deborah and Barak (run 5): Judges 4–5. Barak is played; Deborah sends him and counsels him; Jael ends it.
const STORY_L5 = {
  sequences: ['Down from mount Tabor', 'The chariots of iron', 'The river Kishon', 'Pursue Sisera'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'chariots', sec: 2.0, head: 'Nine hundred chariots of iron', text: '“…for he had nine hundred chariots of iron; and twenty years he mightily oppressed the children of Israel.”', ref: 'Judges 4:3' },
    { shot: 'palm', sec: 2.0, head: 'Deborah sends Barak', text: '“Up; for this is the day in which the LORD hath delivered Sisera into thine hand: is not the LORD gone out before thee?”', ref: 'Judges 4:14' },
    { shot: 'tabor', sec: 1.8, head: 'Down from mount Tabor', text: '“So Barak went down from mount Tabor, and ten thousand men after him.”', ref: 'Judges 4:14' },
  ],
  counsel: { who: 'DEBORAH · PROPHETESS, JUDGE OF ISRAEL', text: 'Barak, meet his foot soldiers on the plain. Do not stand before his chariots: step out of their path. The LORD will fight for you.', verse: '“And I will draw unto thee to the river Kishon Sisera, the captain of Jabin’s army, with his chariots and his multitude; and I will deliver him into thine hand.”', ref: 'JUDGES 4:7 (KJV)', tips: '<b>Sword</b> up close. <b>Bow</b> from afar. <b>Dodge</b> out of a chariot’s red lane. Your <b>men</b> fight beside you.', btn: 'DOWN FROM TABOR' },
  hard: { hp: 1.5, dmg: 1.4, speed: 0.42, attackers: 1 },
  // the chariots: how many run, how fast, how long the red lane warns first, and how many must sink in the mud before the river rises
  chariots: { count: 3, passes: 5, gap: 1.5, warn: 1.35, speed: 14, mudSpeed: 8, dmg: 30, stuck: 4, tip: '<b>Chariots of iron!</b> Iron turns the sword. Watch for the <b>red lane</b> and get out of it, or <b>dodge</b>.' },
  tent: { x: -17, z: -13 },
  rearguard: [['phil', -10, -10], ['phil', 6, -12], ['captain', -4, -15], ['archer', 12, -16], ['shield', -14, -6], ['phil', 16, -6]],
  jael: { who: 'JAEL · THE WIFE OF HEBER', verse: '“Then Jael Heber’s wife took a nail of the tent, and took an hammer in her hand, and went softly unto him, and smote the nail into his temples, and fastened it into the ground: for he was fast asleep and weary. So he died.”', ref: 'JUDGES 4:21 (KJV)', btn: 'CONTINUE' },
  end: { who: 'JAEL COMES OUT TO MEET BARAK', verse: '“And, behold, as Barak pursued Sisera, Jael came out to meet him, and said unto him, Come, and I will shew thee the man whom thou seekest. And when he came into her tent, behold, Sisera lay dead, and the nail was in his temples.”', ref: 'JUDGES 4:22 (KJV)', btn: 'CONTINUE' },
};
// Samson (run 2): Israel under the Philistines, Samson's resolve, the Spirit of the LORD comes upon him; then Lehi and the house of Dagon
const STORY_L2 = {
  sequences: ['Bound at Lehi', 'A thousand men with the jawbone', 'The house of Dagon'],
  waveSeq: [1, 2, 2],   // which sequence each Lehi wave belongs to (the temple is 3)
  intro: [
    { shot: 'oppress', sec: 2.1, look: 'dark', head: 'Forty years under the Philistines', text: '“…and the LORD delivered them into the hand of the Philistines forty years.”', ref: 'Judges 13:1' },
    { shot: 'resolve', sec: 1.6, head: 'Samson will not stand by', text: '“…he shall begin to deliver Israel out of the hand of the Philistines.”', ref: 'Judges 13:5' },
    { shot: 'spirit', sec: 2.1, head: 'The Spirit of the LORD', text: '“…and the Spirit of the LORD came mightily upon him…”', ref: 'Judges 15:14' },
  ],
  // harder than before: soldiers' health, damage, speed, one more attacker at a time; temple guards come faster (seconds between pulses)
  hard: { hp: 1.32, dmg: 1.22, speed: 0.28, attackers: 1, finaleSpawn: 7.6 },
};
// David the mighty man (run 6): David, grown, with his three mighty men (2 Samuel 23:8–17; 1 Chronicles 11:10–19)
const STORY_L6 = {
  sequences: ['Adino and the eight hundred', 'Eleazar at Pasdammim', 'Shammah in the field of lentiles', 'The well of Bethlehem'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'mighty', sec: 2.0, head: 'David and his mighty men', text: '“These be the names of the mighty men whom David had…”', ref: '2 Samuel 23:8' },
    { shot: 'host', sec: 1.9, head: 'The valley of Rephaim', text: '“…and the troop of the Philistines pitched in the valley of Rephaim.”', ref: '2 Samuel 23:13' },
    { shot: 'garrison', sec: 1.9, head: 'A garrison in Bethlehem', text: '“And David was then in an hold, and the garrison of the Philistines was then in Bethlehem.”', ref: '2 Samuel 23:14' },
  ],
  counsel: { who: 'COUNSEL · DAVID AND HIS MIGHTY MEN', text: 'David, you are a man of war now, and your three mighty men fight beside you: Adino, Eleazar and Shammah. When one falls, he rises again.', verse: '“He teacheth my hands to war, so that a bow of steel is broken by mine arms.”', ref: 'PSALM 18:34 (KJV)', tips: '<b>Sword</b> up close, <b>bow</b> at range, <b>dodge</b> their blows. Each mighty man has his own battle: stay with him.', btn: 'TO BATTLE' },
  // the three, in the order they fight beside David; dmg multiplies their sword
  men: [{ look: 'adino', name: 'ADINO', dmg: 1.35 }, { look: 'eleazar', name: 'ELEAZAR', dmg: 1.25 }, { look: 'shammah', name: 'SHAMMAH', dmg: 1.25 }],
  hard: { hp: 1.45, dmg: 1.3, speed: 0.4, attackers: 1 },
  // Sequence 1: the host comes in great numbers but each man is weaker; the counter runs to eight hundred
  horde: { total: 800, hp: 0.5, verse: '“…the same was Adino the Eznite: he lift up his spear against eight hundred, whom he slew at one time.”', ref: '2 SAMUEL 23:8' },
  // Sequence 2: the people flee; David and Eleazar hold the barley for `secs` seconds (the clock runs only while David stands in it)
  barley: { x: -11, z: -5, r: 6.5, secs: 38, every: 2.4, max: 7,
    start: '“…when they defied the Philistines that were there gathered together to battle, and the men of Israel were gone away:”', startRef: '2 SAMUEL 23:9',
    end: '“He arose, and smote the Philistines until his hand was weary, and his hand clave unto the sword: and the LORD wrought a great victory that day…”', endRef: '2 SAMUEL 23:10' },
  // Sequence 3: Philistine raiders run for the lentiles; each one standing in the field tramples it (`trample` per second)
  lentiles: { x: 11, z: -5, r: 6, trample: 3.2,
    groups: [[['phil', 26, -16], ['phil', 28, -10], ['captain', 27, -20]], [['phil', -6, -22], ['phil', 4, -23], ['shield', 0, -24], ['archer', 10, -22]], [['phil', 27, 6], ['phil', 26, 12], ['captain', 26, -2], ['phil', 18, -22], ['shield', 24, -18]]],
    gap: 9,
    start: '“And the Philistines were gathered together into a troop, where was a piece of ground full of lentiles: and the people fled from the Philistines.”', startRef: '2 SAMUEL 23:11',
    end: '“But he stood in the midst of the ground, and defended it, and slew the Philistines: and the LORD wrought a great victory.”', endRef: '2 SAMUEL 23:12' },
  // Sequence 4: you are the three. Break through the host to the well by the gate, draw water, bring it to David in the hold
  well: { x: 0, z: -20.5, hold: { x: 0, z: 13 }, draw: 1.6,
    lines: [['phil', -5, -2], ['phil', 4, -3], ['shield', 0, -6], ['phil', 9, -10], ['captain', 0, -12], ['archer', -14, -15], ['archer', 14, -15], ['shield', -4, -16], ['shield', 5, -16], ['phil', -2, -19]],
    pursuers: [['phil', -20, -18], ['phil', 20, -18], ['captain', 0, -24], ['phil', -24, -4], ['phil', 24, -2]],
    longed: { who: 'DAVID IN THE HOLD', verse: '“And David longed, and said, Oh that one would give me drink of the water of the well of Bethlehem, which is by the gate!”', ref: '2 SAMUEL 23:15', tips: 'You are now <b>the three</b>: Adino leads, Eleazar and Shammah fight beside him. <b>Break through</b> the host to the well by the gate, draw water, and bring it back to David.', btn: 'BREAK THROUGH' },
    drawn: '“And the three mighty men brake through the host of the Philistines, and drew water out of the well of Bethlehem, that was by the gate…”', drawnRef: '2 SAMUEL 23:16',
    poured: { who: 'DAVID POURS IT OUT UNTO THE LORD', verse: '“…and took it, and brought it to David: nevertheless he would not drink thereof, but poured it out unto the LORD.”', ref: '2 SAMUEL 23:16 (KJV)', btn: 'CONTINUE' },
    blood: { who: 'DAVID', verse: '“And he said, Be it far from me, O LORD, that I should do this: is not this the blood of the men that went in jeopardy of their lives? therefore he would not drink it. These things did these three mighty men.”', ref: '2 SAMUEL 23:17 (KJV)', btn: 'AMEN' } },
};
const STORY = { 1: STORY_L1, 2: STORY_L2, 3: STORY_L3, 4: STORY_L4, 5: STORY_L5, 6: STORY_L6 };
const PLAYABLE = LEVEL_ORDER.filter(x => !x.soon);
const ORD = (run) => PLAYABLE.find(x => x.run === run);
const NUM = (run) => PLAYABLE.findIndex(x => x.run === run) + 1;   // the level number the player sees
const NEXT_RUN = (run) => { const i = PLAYABLE.findIndex(x => x.run === run); return PLAYABLE[i + 1] ? PLAYABLE[i + 1].run : 0; };
const PREV = (run) => { const i = PLAYABLE.findIndex(x => x.run === run); return i > 0 ? PLAYABLE[i - 1] : null; };
const isOpen = (run) => { const i = PLAYABLE.findIndex(x => x.run === run); return i <= 0 || !!SAVE.open[PLAYABLE[i].key] || !!SAVE.done[PLAYABLE[i - 1].run]; };
const LQ = Q.get('l'), LQO = LQ ? (/^\d+$/.test(LQ) ? PLAYABLE[+LQ - 1] : PLAYABLE.find(x => x.key === LQ)) : null;
let LEVEL = LQO ? LQO.run : (BOT ? 1 : (ORD(SAVE.level) && isOpen(SAVE.level) ? SAVE.level : 1));
const WORLD_OF = (l) => l === 6 ? 'beth' : l === 5 ? 'kishon' : l === 4 ? 'moab' : l === 3 ? 'dan' : l === 2 ? 'lehi' : 'elah';
const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
let DPR = Math.min(window.devicePixelRatio || 1, QP[QUALITY].dpr);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.info.autoReset = false;
renderer.shadowMap.enabled = QP[QUALITY].shadow > 0;
renderer.shadowMap.type = QUALITY === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

const scene = new THREE.Scene();
let W = new THREE.Group(); scene.add(W); let WORLD = '';
const COL = []; // circle colliders {x,z,r}
const FOG = new THREE.Color(0xd2a983);
scene.fog = new THREE.Fog(FOG, 55, 280);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 600);
camera.position.set(0, 6, 14);
// post: Medium = cinematic grade (ACES, split-tone, contrast, vignette, grain) in one pass; High adds bloom and 4x MSAA.
// Low renders straight to the screen (no extra passes) and keeps the CSS vignette.
let POST = QP[QUALITY].post && !Q.has('nopost'), BLOOM = QP[QUALITY].bloom && !Q.has('nobloom'), composer = null, bloomPass = null, gradePass = null;
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uExp: { value: 1 }, uTime: { value: 0 }, uVig: { value: 0.32 }, uGrain: { value: 0.035 }, uSat: { value: 1.08 }, uCon: { value: 1.08 },
    uShadow: { value: new THREE.Vector3(0.94, 0.99, 1.06) }, uHigh: { value: new THREE.Vector3(1.05, 1.0, 0.93) }, uFlash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uExp, uTime, uVig, uGrain, uSat, uCon, uFlash; uniform vec3 uShadow, uHigh; varying vec2 vUv;
  vec3 rrt(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
  vec3 aces(vec3 c){ const mat3 I = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777); const mat3 O = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
    c *= uExp/0.6; c = I*c; c = rrt(c); c = O*c; return clamp(c,0.0,1.0); }
  vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(0.41666))-0.055, step(0.0031308, c)); }
  void main(){
    vec3 c = toSRGB(aces(texture2D(tDiffuse, vUv).rgb));
    float l = dot(c, vec3(0.2126,0.7152,0.0722));
    c = mix(c*uShadow, c*uHigh, smoothstep(0.05, 0.85, l));
    c = (c - 0.5)*uCon + 0.5;
    l = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(l), c, uSat);
    vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(d*vec2(1.25,1.0))); c *= mix(1.0 - uVig, 1.0, v);
    float n = fract(sin(dot(vUv*vec2(1217.3,973.1) + uTime, vec2(12.9898,78.233)))*43758.5453); c += (n - 0.5)*uGrain;
    c += uFlash*vec3(1.0,0.92,0.8);
    gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
  }`,
};
function initComposer() {
  if (!POST || composer) return;
  try {
    const gl2 = renderer.capabilities.isWebGL2;
    const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: QUALITY === 'high' && gl2 ? 4 : 0 });
    composer = new EffectComposer(renderer, rt); composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    if (BLOOM) { bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.36, 0.55, 0.8); composer.addPass(bloomPass); }
    gradePass = new ShaderPass(GradeShader); composer.addPass(gradePass);
    document.body.classList.add('post');
  } catch (e) { console.warn('post off', e); POST = BLOOM = false; composer = null; }
}
initComposer();
document.body.dataset.q = QUALITY;

const SUN_DIR = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
const hemi = new THREE.HemisphereLight(0xffe2b8, 0x4a3420, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd29a, 3.1);
sun.castShadow = QP[QUALITY].shadow > 0;
sun.shadow.mapSize.set(QP[QUALITY].shadow || 512, QP[QUALITY].shadow || 512);
const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

function onResize() {
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight); }
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1.2 ? 68 : 55;
  camera.updateProjectionMatrix();
}
addEventListener('resize', onResize); onResize();

// ------------------------------------------------------------------ noise / terrain
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 5.3, y * 2.1 + 1.7) * 0.28 + vnoise(x * 4.3 + 9.1, y * 4.3 + 3.3) * 0.12; }
const brookZ = (x) => 5 + Math.sin(x * 0.07) * 3;
let HGT = null;
function hgt(x, z) { return HGT(x, z); }
function hgtElah(x, z) {
  const zz = z + fbm(x * 0.02, 3.1) * 6;
  const az = Math.abs(zz);
  let h = Math.max(0, az - 17);
  h = h * h * 0.028 + h * 0.3;
  h += fbm(x * 0.045, z * 0.045) * 1.5 + fbm(x * 0.16, z * 0.16) * 0.28;
  const bz = z - brookZ(x);
  h -= Math.exp(-bz * bz * 0.5) * 0.55;
  return h;
}
const ARENA = { x0: -30, x1: 30, z0: -16, z1: 17 };
const PITH = 10.5, PITD = 3.6;   // Benaiah's pit: half its width, and its depth
const ARENA_BY = { elah: { x0: -30, x1: 30, z0: -16, z1: 17 }, lehi: { x0: -26, x1: 26, z0: -20, z1: 18 }, temple: { x0: -8.4, x1: 8.4, z0: -9.5, z1: 10 }, dan: { x0: -24, x1: 24, z0: -21, z1: 18 }, wild: { x0: -70, x1: 70, z0: -156, z1: 24 }, moab: { x0: -26, x1: 26, z0: -19, z1: 18 }, kishon: { x0: -28, x1: 28, z0: -19, z1: 18 }, beth: { x0: -28, x1: 28, z0: -23, z1: 18 }, pit: { x0: -PITH + 1.1, x1: PITH - 1.1, z0: -PITH + 1.1, z1: PITH - 1.1 } };

// ------------------------------------------------------------------ sky (also used for env map)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uWarm: { value: 1 }, uStars: { value: 0 }, uSun: { value: SUN_DIR }, uZen: { value: new THREE.Vector3(0.26, 0.42, 0.68) }, uHor: { value: new THREE.Vector3(0.98, 0.74, 0.50) }, uLow: { value: new THREE.Vector3(0.85, 0.66, 0.48) }, uSunC: { value: new THREE.Vector3(1.0, 0.62, 0.28) }, uTime: { value: 0 }, uCloud: { value: 1 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `varying vec3 vDir; uniform vec3 uSun, uZen, uHor, uLow, uSunC; uniform float uWarm, uStars, uTime, uCloud;
  float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hsh(i),hsh(i+vec2(1.0,0.0)),f.x), mix(hsh(i+vec2(0.0,1.0)),hsh(i+vec2(1.0,1.0)),f.x), f.y); }
  float fb(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < ${QP[QUALITY].sky ? 5 : 3}; i++) { s += a*vn(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
  void main(){ vec3 d = normalize(vDir); float h = clamp(d.y,0.0,1.0);
    vec3 zen = uZen; vec3 hor = uHor; vec3 low = uLow;
    vec3 col = mix(hor, zen, pow(h,0.55)); if(d.y<0.0) col = mix(hor, low, clamp(-d.y*4.0,0.0,1.0));
    float s = max(dot(d, uSun),0.0);
    col += uSunC*pow(s,8.0)*0.55 + mix(vec3(0.5,0.6,0.8),vec3(1.0,0.85,0.6),uWarm)*pow(s,64.0)*1.2 + mix(vec3(0.86,0.9,1.0),vec3(1.0,0.95,0.85),uWarm)*smoothstep(0.9993,0.9997,s)*6.0;
    if (uStars > 0.0) { vec3 q = floor(d*420.0); float hh = fract(sin(dot(q, vec3(12.9898,78.233,45.164)))*43758.5453); vec3 fq = fract(d*420.0)-0.5;
      col += vec3(0.85,0.9,1.0)*step(0.9965,hh)*smoothstep(0.5,0.05,length(fq))*uStars*(0.55+0.45*fract(hh*977.0))*smoothstep(0.02,0.3,d.y)*(1.0-smoothstep(0.985,0.9995,s)); }
    // soft cloud bands
    float c = sin(d.x*9.0+d.z*4.0)*sin(d.z*7.0-d.x*2.0); col = mix(col, col*1.08+vec3(0.05,0.03,0.02), smoothstep(0.3,0.9,c)*smoothstep(0.05,0.3,h)*(1.0-h)*0.3);
    // drifting cumulus: lit edges toward the sun, darker bellies, thinning toward the zenith and the horizon
    if (d.y > 0.0 && uCloud > 0.0) { vec2 cuv = d.xz/(d.y+0.16)*1.25 + vec2(uTime*0.006, uTime*0.0022);
      float n = fb(cuv); float cl = smoothstep(0.5, 0.82, n)*smoothstep(0.0, 0.22, d.y)*(1.0-smoothstep(0.75,1.0,d.y))*uCloud;
      float body = fb(cuv*2.1 + 4.0);
      vec3 base = mix(hor*0.55 + vec3(0.04), vec3(1.0,0.96,0.9), 0.35 + 0.5*uWarm);
      vec3 cc = base*(0.62 + 0.45*body) + uSunC*pow(s,3.0)*0.9*(1.0-body*0.5);
      col = mix(col, cc, cl*0.82); }
    gl_FragColor = vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);
function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer);
  const m = skyMat.clone(); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), m));
  const old = scene.environment; scene.environment = pm.fromScene(es, 0.04).texture; if (old) old.dispose();
  pm.dispose(); m.dispose();
}

// ------------------------------------------------------------------ terrain
function buildTerrain() {
  const size = 340, seg = LOWQ ? 90 : 120;
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), dry = new THREE.Color(0.66, 0.55, 0.32), green = new THREE.Color(0.38, 0.45, 0.2), rock = new THREE.Color(0.52, 0.46, 0.4), dirt = new THREE.Color(0.6, 0.46, 0.3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // denser near center: squash outer
    const y = hgt(x, z); pos.setY(i, y);
    const sl = Math.abs(hgt(x + 1, z) - y) + Math.abs(hgt(x, z + 1) - y);
    const bz = z - brookZ(x);
    c.copy(dry).lerp(green, Math.exp(-bz * bz * 0.06) * 0.85);
    c.lerp(rock, THREE.MathUtils.smoothstep(sl, 0.55, 1.3));
    const n = fbm(x * 0.3, z * 0.3);
    c.lerp(dirt, THREE.MathUtils.clamp(n * 0.8, 0, 0.5));
    c.multiplyScalar(0.9 + hash(x, z) * 0.14);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const dc = document.createElement('canvas'); dc.width = dc.height = 128; const dx = dc.getContext('2d'); const id = dx.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const x = i % 128, y = (i / 128) | 0; const v = 232 + 26 * (0.55 * vnoise(x / 6, y / 6) + 0.45 * (hash(x, y) * 2 - 1)); id.data.set([v, v * 0.98, v * 0.94, 255], i * 4); }
  dx.putImageData(id, 0, 0); for (let i = 0; i < 26; i++) { const g0 = 120 + rng() * 60; dx.fillStyle = `rgba(${g0},${g0 * 0.92},${g0 * 0.8},0.35)`; dx.beginPath(); dx.ellipse(rng() * 128, rng() * 128, 0.8 + rng() * 1.4, 0.6 + rng() * 1.0, rng() * 3, 0, 7); dx.fill(); }
  const dtex = new THREE.CanvasTexture(dc); dtex.wrapS = dtex.wrapT = THREE.RepeatWrapping; dtex.repeat.set(110, 110); dtex.colorSpace = THREE.SRGBColorSpace; dtex.anisotropy = 4;
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: dtex }));
  m.receiveShadow = true;
  W.add(m);
  // brook ribbon
  const pts = [], idx = [], N = 220;
  for (let i = 0; i <= N; i++) {
    const x = -170 + (340 * i) / N, zc = brookZ(x), y = Math.min(hgt(x, zc - 0.5), hgt(x, zc), hgt(x, zc + 0.5)) + 0.22;
    pts.push(x, y, zc - 0.9, x, y, zc + 0.9);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); wg.setIndex(idx); wg.computeVertexNormals();
  const water = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: 0x3d6a72, emissive: 0x0e2a30, transparent: true, opacity: 0.92 }));
  W.add(water);
  // far mountains ring
  const mg = new THREE.CylinderGeometry(260, 260, 1, 96, 1, true);
  const mp = mg.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i), a = Math.atan2(z, x); if (mp.getY(i) > 0) mp.setY(i, 28 + Math.abs(fbm(a * 3, 1.3)) * 55 + vnoise(a * 18, 2) * 6); else mp.setY(i, -5); }
  mg.computeVertexNormals();
  const mtn = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: 0x9a7a5e, side: THREE.BackSide }));
  W.add(mtn);
}

// ------------------------------------------------------------------ props (instanced)
let RS = 1234567; const rng = () => ((RS = (RS * 16807) % 2147483647) / 2147483647);
function scatter(geo, mat, count, place, shadow = false) {
  const im = new THREE.InstancedMesh(geo, mat, count); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  let n = 0;
  for (let i = 0; i < count * 6 && n < count; i++) { const r = place(); if (!r) continue; p.set(r.x, r.y, r.z); e.set(r.rx || 0, r.ry || 0, r.rz || 0); q.setFromEuler(e); s.setScalar(r.s); if (r.sy) s.y *= r.sy; m4.compose(p, q, s); im.setMatrixAt(n++, m4); }
  im.count = n; im.castShadow = shadow; im.receiveShadow = false; im.instanceMatrix.needsUpdate = true; W.add(im); return im;
}
function vcol(geo, color) { const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
function buildProps() {
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // rocks
const rockG = vcol(new THREE.DodecahedronGeometry(1, 0), 0x9b8b78);
  scatter(rockG, lam, 170, () => { const x = (rng() - 0.5) * 220, z = (rng() - 0.5) * 160; const inA = x > ARENA.x0 - 12 && x < ARENA.x1 + 12 && z > ARENA.z0 - 10 && z < ARENA.z1 + 10; const s = inA ? 0.12 + rng() * 0.28 : 0.4 + rng() * 2.2; if (s > 0.22) COL.push({ x, z, r: s * 0.85 }); return { x, y: hgt(x, z) + s * 0.2, z, s, sy: 0.55 + rng() * 0.4, ry: rng() * 6, rx: rng() }; }, true);
  addBoulders([[-17, -7, 1.0], [18, -5, 0.9], [-22, 9, 1.2], [23, 11, 1.0], [-10, 13, 0.7], [12, -12, 0.8]], 0x9b8b78);
  // smooth stones by the brook
  const stoneG = vcol(new THREE.IcosahedronGeometry(1, 1), 0xd8d2c6);
  scatter(stoneG, new THREE.MeshLambertMaterial({ vertexColors: true }), 60, () => { const x = (rng() - 0.5) * 70, z = brookZ(x) + (rng() - 0.5) * 2.6; const s = 0.06 + rng() * 0.12; return { x, y: hgt(x, z) + s * 0.3, z, s, sy: 0.6 }; });
  // olive / terebinth trees ("the valley of the terebinth")
  const trunk = vcol(new THREE.CylinderGeometry(0.12, 0.22, 1.8, 5).translate(0, 0.9, 0), 0x5b4128);
  const can1 = vcol(new THREE.IcosahedronGeometry(1.25, 0).scale(1.2, 0.75, 1.2).translate(0, 2.25, 0), 0x6f7a3c);
  const can2 = vcol(new THREE.IcosahedronGeometry(0.9, 0).scale(1.1, 0.7, 1.1).translate(0.6, 2.6, 0.3), 0x7d8645);
  const treeG = mergeGeometries([trunk, can1, can2].map(g => g.index ? g.toNonIndexed() : g));
  scatter(treeG, lam, 70, () => { const x = (rng() - 0.5) * 240, z = (rng() - 0.5) * 150; if (x > ARENA.x0 - 3 && x < ARENA.x1 + 3 && z > ARENA.z0 - 3 && z < ARENA.z1 + 3) return null; return { x, y: hgt(x, z) - 0.1, z, s: 0.8 + rng() * 0.9, ry: rng() * 6 }; }, true);
  // dry grass tufts
  const bush = vcol(new THREE.DodecahedronGeometry(0.5, 0).scale(1, 0.55, 1), 0x7a7a3a);
  scatter(bush, lam, LOWQ ? 120 : 260, () => { const x = (rng() - 0.5) * 140, z = (rng() - 0.5) * 80; const inA = x > ARENA.x0 && x < ARENA.x1 && z > ARENA.z0 && z < ARENA.z1; const s = (inA ? 0.4 : 0.6) + rng() * 0.8; return { x, y: hgt(x, z) + 0.05, z, s, ry: rng() * 6 }; });
  const blade = vcol(mergeGeometries([0, 1, 2].map(i => new THREE.PlaneGeometry(0.05, 0.42).translate(0, 0.21, 0).rotateZ((i - 1) * 0.35).rotateY(i * 2.1))), 0xd6bd72);
  scatter(blade, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x5a4620 }), LOWQ ? 400 : 1000, () => { const x = (rng() - 0.5) * 90, z = (rng() - 0.5) * 60; return { x, y: hgt(x, z) - 0.02, z, s: 0.7 + rng() * 0.9, ry: rng() * 6 }; });
  // tents: Israel (south hill) and Philistia (north hill)
  const tentG = vcol(new THREE.ConeGeometry(2.2, 2.6, 4).translate(0, 1.3, 0), 0xcbb48c);
  const tentP = vcol(new THREE.ConeGeometry(2.2, 2.6, 4).translate(0, 1.3, 0), 0x8f3a2a);
  scatter(tentG, lam, 26, () => { const x = (rng() - 0.5) * 80, z = 42 + rng() * 22; return { x, y: hgt(x, z) - 0.2, z, s: 0.8 + rng() * 0.5, ry: rng() * 6 }; });
  scatter(tentP, lam, 30, () => { const x = (rng() - 0.5) * 80, z = -40 - rng() * 22; return { x, y: hgt(x, z) - 0.2, z, s: 0.8 + rng() * 0.6, ry: rng() * 6 }; });
  // banners
  const pole = vcol(new THREE.CylinderGeometry(0.05, 0.05, 5, 4).translate(0, 2.5, 0), 0x3b2a1a);
  const flagR = vcol(new THREE.PlaneGeometry(1.6, 1).translate(0.8, 4.3, 0), 0xa3271c);
  const flagB = vcol(new THREE.PlaneGeometry(1.6, 1).translate(0.8, 4.3, 0), 0x2b4f8a);
  const banP = mergeGeometries([pole.toNonIndexed(), flagR.toNonIndexed()]), banI = mergeGeometries([pole.toNonIndexed(), flagB.toNonIndexed()]);
  const lamD = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  scatter(banP, lamD, 9, () => { const x = -36 + rng() * 72, z = -36 - rng() * 10; return { x, y: hgt(x, z), z, s: 1, ry: 0.3 }; });
  scatter(banI, lamD, 7, () => { const x = -36 + rng() * 72, z = 38 + rng() * 10; return { x, y: hgt(x, z), z, s: 1, ry: 0.3 }; });
}

// dust motes
let dust;
function buildDust() {
  const n = LOWQ ? 180 : 360, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(rng() - 0.5) * 50, rng() * 8, (rng() - 0.5) * 50], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }));
  dust.frustumCulled = false; scene.add(dust);
}


// ------------------------------------------------------------------ worlds (Level 1: Elah · Level 2: Lehi + the temple of Dagon)
function addBoulders(list, color) {
  const g = vcol(new THREE.DodecahedronGeometry(1, 1), color); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + vnoise(p.getX(i) * 3 + 7, p.getZ(i) * 3 + p.getY(i) * 2) * 0.16; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  scatter(g, m, list.length, (() => { let i = 0; return () => { const [x, z, s] = list[i++]; COL.push({ x, z, r: s * 1.0 }); return { x, y: hgt(x, z) + s * 0.25, z, s, sy: 0.75, ry: i * 1.7, rx: 0.2 }; }; })(), true);
}
let DETAIL = null;
function detailTex() {
  if (DETAIL) return DETAIL;
  const dc = document.createElement('canvas'); dc.width = dc.height = 128; const dx = dc.getContext('2d'); const id = dx.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const x = i % 128, y = (i / 128) | 0; const v = 232 + 26 * (0.55 * vnoise(x / 6, y / 6) + 0.45 * (hash(x, y) * 2 - 1)); id.data.set([v, v * 0.98, v * 0.94, 255], i * 4); }
  dx.putImageData(id, 0, 0);
  DETAIL = new THREE.CanvasTexture(dc); DETAIL.wrapS = DETAIL.wrapT = THREE.RepeatWrapping; DETAIL.repeat.set(110, 110); DETAIL.colorSpace = THREE.SRGBColorSpace; DETAIL.anisotropy = 4;
  return DETAIL;
}
function buildGround(colorAt, mtnColor) {
  const size = 340, seg = LOWQ ? 90 : 120;
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = hgt(x, z); pos.setY(i, y);
    const sl = Math.abs(hgt(x + 1, z) - y) + Math.abs(hgt(x, z + 1) - y);
    colorAt(x, z, y, sl, c); c.multiplyScalar(0.9 + hash(x, z) * 0.14); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: detailTex() })); m.receiveShadow = true; W.add(m);
  const mg = new THREE.CylinderGeometry(260, 260, 1, 96, 1, true); const mp = mg.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i), a = Math.atan2(z, x); if (mp.getY(i) > 0) mp.setY(i, 24 + Math.abs(fbm(a * 3 + 4, 2.3)) * 60 + vnoise(a * 18, 5) * 6); else mp.setY(i, -5); }
  mg.computeVertexNormals(); W.add(new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mtnColor, side: THREE.BackSide })));
}
// fire sprites (campfires, braziers, torches): additive, flicker in updateWorld
const FIRES = []; let FIRETEX = null;
function fireTex() {
  if (FIRETEX) return FIRETEX;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,.95)'); g.addColorStop(0.55, 'rgba(255,110,30,.55)'); g.addColorStop(1, 'rgba(160,30,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(60, 50, 62, 120, 32, 126); x.bezierCurveTo(2, 120, 4, 50, 32, 2); x.fill();
  FIRETEX = new THREE.CanvasTexture(c); return FIRETEX;
}
function addFire(x, y, z, s = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd0a0 }));
  sp.center.set(0.5, 0.05); sp.position.set(x, y, z); sp.scale.set(0.8 * s, 1.5 * s, 1); W.add(sp);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff8a3a, opacity: 0.5 }));
  glow.position.set(x, y + 0.5 * s, z); glow.scale.setScalar(3.2 * s); W.add(glow);
  FIRES.push({ sp, glow, s, ph: Math.random() * 10 });
}
function hgtLehi(x, z) {
  const r = Math.hypot(x * 0.85, z);
  let h = Math.max(0, r - 24); h = h * h * 0.03 + h * 0.35;
  h += fbm(x * 0.04 + 11, z * 0.04 + 7) * 1.8 + fbm(x * 0.15, z * 0.15) * 0.3;
  const rx = x - 44, rz = z + 34; h += Math.exp(-(rx * rx + rz * rz) / 300) * 16; // the rock (Etam) to the north-east
  return h;
}
function buildLehi() {
  const ochre = new THREE.Color(0.6, 0.48, 0.34), dry = new THREE.Color(0.62, 0.56, 0.36), burnt = new THREE.Color(0.15, 0.11, 0.09), rockC = new THREE.Color(0.5, 0.38, 0.33), dirt = new THREE.Color(0.52, 0.34, 0.22);
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp;
  const burnAt = (x, z) => SS(fbm(x * 0.025 + 20, z * 0.025 + 4), 0.02, 0.28) * SS(Math.hypot(x * 0.85, z), 27, 36);
  buildGround((x, z, y, sl, c) => {
    c.copy(ochre).lerp(dry, CL(fbm(x * 0.05 + 3, z * 0.05) * 0.8 + 0.3, 0, 1) * 0.6);
    c.lerp(burnt, burnAt(x, z) * 0.85); c.lerp(rockC, SS(sl, 0.6, 1.4)); c.lerp(dirt, CL(fbm(x * 0.3, z * 0.3) * 0.8, 0, 0.45));
  }, 0x6e4a52);
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const inArena = (x, z, m = 0) => x > ARENA.x0 - m && x < ARENA.x1 + m && z > ARENA.z0 - m && z < ARENA.z1 + m;
  // rocks
  const rockG = vcol(new THREE.DodecahedronGeometry(1, 0), 0x8f6f5e);
  scatter(rockG, lam, 150, () => { const x = (rng() - 0.5) * 220, z = (rng() - 0.5) * 170; const inA = inArena(x, z, 10); const s = inA ? 0.1 + rng() * 0.22 : 0.5 + rng() * 2.6; return { x, y: hgt(x, z) + s * 0.2, z, s, sy: 0.55 + rng() * 0.4, ry: rng() * 6, rx: rng() }; }, true);
  addBoulders([[-15, -8, 1.1], [16, -10, 0.9], [-19, 9, 1.2], [18, 10, 1.0], [-6, 13, 0.7], [9, -15, 0.75]], 0x8f6f5e);
  // dead and olive trees
  const trunk = vcol(new THREE.CylinderGeometry(0.1, 0.2, 2.0, 5).translate(0, 1, 0), 0x3e2a1c);
  const br = vcol(new THREE.CylinderGeometry(0.04, 0.08, 1.3, 4).translate(0, 0.65, 0).rotateZ(0.7).translate(0, 1.5, 0), 0x3e2a1c);
  const br2 = vcol(new THREE.CylinderGeometry(0.04, 0.07, 1.1, 4).translate(0, 0.55, 0).rotateZ(-0.8).translate(0, 1.2, 0), 0x3e2a1c);
  const deadG = mergeGeometries([trunk, br, br2].map(g => g.index ? g.toNonIndexed() : g));
  scatter(deadG, lam, 40, () => { const x = (rng() - 0.5) * 200, z = (rng() - 0.5) * 150; if (inArena(x, z, 4)) return null; return { x, y: hgt(x, z) - 0.1, z, s: 0.8 + rng() * 0.8, ry: rng() * 6 }; }, true);
  const can = vcol(new THREE.IcosahedronGeometry(1.2, 0).scale(1.2, 0.7, 1.2).translate(0, 2.3, 0), 0x55603a);
  const oliveG = mergeGeometries([trunk.clone(), can].map(g => g.index ? g.toNonIndexed() : g));
  scatter(oliveG, lam, 30, () => { const x = (rng() - 0.5) * 220, z = 30 + rng() * 60; return { x, y: hgt(x, z) - 0.1, z, s: 0.8 + rng() * 0.7, ry: rng() * 6 }; }, true);
  // the shocks of corn: burnt ones in the black fields, standing ones elsewhere (Judges 15:5)
  const shock = new THREE.ConeGeometry(0.45, 1.3, 6).translate(0, 0.6, 0);
  scatter(vcol(shock.clone(), 0x2a1f17), lam, 90, () => { const x = (rng() - 0.5) * 180, z = (rng() - 0.5) * 150; if (burnAt(x, z) < 0.5 || inArena(x, z, 3)) return null; return { x, y: hgt(x, z) - 0.15, z, s: 0.7 + rng() * 0.6, sy: 0.6 + rng() * 0.5, ry: rng() * 6, rz: (rng() - 0.5) * 0.4 }; });
  scatter(vcol(shock.clone(), 0xc9a04a), lam, 70, () => { const x = (rng() - 0.5) * 180, z = (rng() - 0.5) * 150; if (burnAt(x, z) > 0.2 || inArena(x, z, 5)) return null; return { x, y: hgt(x, z) - 0.1, z, s: 0.7 + rng() * 0.5, ry: rng() * 6 }; });
  // dry grass
  const blade = vcol(mergeGeometries([0, 1, 2].map(i => new THREE.PlaneGeometry(0.05, 0.42).translate(0, 0.21, 0).rotateZ((i - 1) * 0.35).rotateY(i * 2.1))), 0xc8a060);
  scatter(blade, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x4a2a10 }), LOWQ ? 350 : 800, () => { const x = (rng() - 0.5) * 90, z = (rng() - 0.5) * 70; if (burnAt(x, z) > 0.4) return null; return { x, y: hgt(x, z) - 0.02, z, s: 0.7 + rng() * 0.9, ry: rng() * 6 }; });
  // the Philistine camp to the north: striped tents, pavilions, banners, campfires
  const tentA = vcol(new THREE.ConeGeometry(2.2, 2.8, 8).translate(0, 1.4, 0), 0x8f2a20), tentB = vcol(new THREE.ConeGeometry(2.0, 2.5, 8).translate(0, 1.25, 0), 0xd2bf96);
  scatter(tentA, lam, 22, () => { const x = (rng() - 0.5) * 90, z = -34 - rng() * 26; return { x, y: hgt(x, z) - 0.2, z, s: 0.8 + rng() * 0.5, ry: rng() * 6 }; }, true);
  scatter(tentB, lam, 18, () => { const x = (rng() - 0.5) * 90, z = -36 - rng() * 26; return { x, y: hgt(x, z) - 0.2, z, s: 0.8 + rng() * 0.5, ry: rng() * 6 }; }, true);
  const pav = vcol(new THREE.CylinderGeometry(1.6, 1.6, 6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).translate(0, 1.1, 0), 0x6a2a3a);
  scatter(pav, lam, 6, () => { const x = -30 + rng() * 60, z = -40 - rng() * 12; return { x, y: hgt(x, z), z, s: 1, ry: rng() * 0.6 - 0.3 }; }, true);
  const pole = vcol(new THREE.CylinderGeometry(0.05, 0.05, 5, 4).translate(0, 2.5, 0), 0x3b2a1a);
  const flagR = vcol(new THREE.PlaneGeometry(1.6, 1).translate(0.8, 4.3, 0), 0xa3271c);
  scatter(mergeGeometries([pole.toNonIndexed(), flagR.toNonIndexed()]), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 12, () => { const x = -40 + rng() * 80, z = -30 - rng() * 14; return { x, y: hgt(x, z), z, s: 1, ry: 0.3 }; });
  const ringG = vcol(new THREE.DodecahedronGeometry(0.18, 0), 0x5a4a40), logG = vcol(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5).rotateZ(Math.PI / 2), 0x2a1a10);
  const fires = [[-14, -32, 1.2], [10, -35, 1.3], [-30, -40, 1.0], [30, -42, 1.1], [0, -48, 1.4], [-22, -52, 1], [24, -27, 1.0], [-27, 22, 0.9]];
  for (const [fx, fz, s] of fires) {
    const y = hgt(fx, fz); addFire(fx, y + 0.1, fz, s);
    scatter(ringG, lam, 8, (() => { let k = 0; return () => { const a = (k++ / 8) * Math.PI * 2; return { x: fx + Math.cos(a) * 0.7 * s, y: y + 0.05, z: fz + Math.sin(a) * 0.7 * s, s, ry: a }; }; })());
    scatter(logG, lam, 3, (() => { let k = 0; return () => ({ x: fx, y: y + 0.1, z: fz, s, ry: (k++) * 2.1 }); })());
  }
}
// ---- the temple of Dagon (Gaza): a flat hall, colonnades, a roof full of people, two middle pillars
let TEMPLE = null;
function tileTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#cdb795'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 180 + Math.random() * 40; x.fillStyle = `rgb(${v},${v * 0.9},${v * 0.74})`; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(80,60,40,${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function crackTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d'); x.clearRect(0, 0, 256, 512);
  const seg = (x0, y0, a, len, w, depth) => { let px = x0, py = y0; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); for (let i = 0; i < len; i++) { a += (Math.random() - 0.5) * 0.9; px += Math.cos(a) * 9; py += Math.sin(a) * 9; x.lineTo(px, py); if (depth > 0 && Math.random() < 0.12) seg(px, py, a + (Math.random() - 0.5) * 2, len * 0.4 | 0, w * 0.6, depth - 1); } x.stroke(); };
  x.strokeStyle = 'rgba(20,12,6,0.95)'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let k = 0; k < 5; k++) seg(30 + Math.random() * 200, 200 + Math.random() * 120, Math.random() * 6, 28, 3.2, 2);
  x.strokeStyle = 'rgba(255,190,110,0.35)'; for (let k = 0; k < 3; k++) seg(60 + Math.random() * 140, 240 + Math.random() * 60, Math.random() * 6, 14, 1.2, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function debris(p, n, spread = 1, up = 3, sz = 1) {
  const T = TEMPLE; if (!T || !T.deb) return;
  for (let i = 0; i < n; i++) { const d = T.debs[T.debI = (T.debI + 1) % T.debs.length]; d.life = 7 + Math.random() * 3; d.p.set(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * 0.4, p.z + (Math.random() - 0.5) * spread * 0.5);
    d.v.set((Math.random() - 0.5) * 5, up * (0.3 + Math.random()), (Math.random() - 0.2) * 4); d.r.set(Math.random() * 6, Math.random() * 6, 0); d.w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0); d.s = (0.12 + Math.random() * Math.random() * 0.55) * sz; }
}
function dustRing(p, n = 10, speed = 4.5, size = 3.5) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.4; puff(new THREE.Vector3(p.x + Math.cos(a) * 0.8, 0.6 + Math.random() * 0.6, p.z + Math.sin(a) * 0.8), size * (0.8 + Math.random() * 0.5), 2.6 + Math.random() * 1.4, new THREE.Vector3(Math.cos(a) * speed, 0.35 + Math.random() * 0.5, Math.sin(a) * speed), DUSTC[(Math.random() * 3) | 0]); } }
const DUSTC = [0xa48c6c, 0xbfa682, 0x8e7658];
function buildTemple() {
  const T = TEMPLE = { falling: [], pillars: [], crowd: null, crowdN: 0, statue: null, light: null, spot: new THREE.Vector3(0, 0, -2.5), t: 0 };
  const stone = new THREE.MeshStandardMaterial({ color: 0xcdb48c, roughness: 0.85 }), stoneD = new THREE.MeshStandardMaterial({ color: 0x8a7258, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a2018, roughness: 0.9, side: THREE.DoubleSide });
  const box = (w, h, d, x, y, z, m, shadow = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; W.add(b); return b; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tileTex() })); floor.receiveShadow = true; W.add(floor);
  const H = 6.6;
  // back wall, dais, side walls with doors
  box(30, 11, 1, 0, 5.5, -17, stoneD); box(14, 0.7, 6, 0, 0.35, -13.6, stoneD); box(12, 0.35, 1.2, 0, 0.17, -10.2, stoneD);
  for (const sx of [-1, 1]) { box(1, 11, 13.5, sx * 13.2, 5.5, -10, stoneD); box(1, 11, 9, sx * 13.2, 5.5, 8.5, stoneD); box(1, 3.6, 4.5, sx * 13.2, 9.2, 1.75, stoneD); }
  // colonnades
  const colG = mergeGeometries([new THREE.CylinderGeometry(0.4, 0.46, H - 0.6, 12).translate(0, H / 2, 0).toNonIndexed(), new THREE.BoxGeometry(1.1, 0.35, 1.1).translate(0, 0.17, 0).toNonIndexed(), new THREE.BoxGeometry(1.1, 0.35, 1.1).translate(0, H - 0.17, 0).toNonIndexed()]);
  const colM = new THREE.InstancedMesh(colG, stone, 14); let k = 0; const m4 = new THREE.Matrix4();
  for (const sx of [-1, 1]) for (const z of [-14, -10, -6, -2, 2, 6, 10]) { m4.makeTranslation(sx * 9.4, 0, z); colM.setMatrixAt(k++, m4); }
  colM.castShadow = true; colM.receiveShadow = true; W.add(colM); T.cols = colM; T.colBase = [];
  for (const sx of [-1, 1]) for (const z of [-14, -10, -6, -2, 2, 6, 10]) T.colBase.push({ x: sx * 9.4, z, sx, delay: 0.6 + Math.abs(z + 2) * 0.05 + Math.random() * 0.25, dir: (Math.random() - 0.5) * 0.8 });
  // debris: chunks of stone that rain down and bounce
  const DN = LOWQ ? 90 : 200; T.deb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), stone, DN); T.deb.castShadow = false; T.deb.frustumCulled = false;
  T.debs = Array.from({ length: DN }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), s: 0.2 })); T.debI = 0;
  for (let i = 0; i < DN; i++) T.deb.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); W.add(T.deb);
  T.sideFall = [];
  for (const sx of [-1, 1]) for (let q = 0; q < 4; q++) { const z = -15.5 + q * 7; const dl = 0.7 + Math.abs(z + 2) * 0.05 + Math.random() * 0.15;
    T.falling.push({ m: box(1.0, 0.7, 6.9, sx * 9.4, H + 0.35, z + 0.5, stone), v: new THREE.Vector3(-sx * 0.8, 0, 0), w: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, -sx * 0.9), delay: dl + 0.05, done: false });
    T.falling.push({ m: box(3.6, 0.6, 6.9, sx * 11.2, H + 0.95, z, stoneD), v: new THREE.Vector3(-sx * 1.6, 0, 0), w: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, -sx * 1.1), delay: dl, done: false });
    T.sideFall.push({ sx, z0: z - 3.5, z1: z + 3.5, delay: dl }); }
  // hanging banners of Philistia between the columns
  for (const sx of [-1, 1]) for (const z of [-12, -8, 0, 4, 8]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), red); b.position.set(sx * 9.4, H - 1.9, z); b.rotation.y = Math.PI / 2; W.add(b); }
  // the two middle pillars (crack and fall) and the roof they bear (falls)
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 1.15, 0, -2.5); W.add(g); const drums = [];
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, (H - 0.6) / 4 - 0.02, 12), stone); d.position.y = 0.3 + (i + 0.5) * (H - 0.6) / 4; d.castShadow = true; d.receiveShadow = true; g.add(d); drums.push(d); }
    const b0 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), stoneD); b0.position.y = 0.15; g.add(b0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), stoneD); cap.position.y = H - 0.15; g.add(cap); drums.push(cap);
    const crack = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, H - 0.7, 14, 1, true).translate(0, H / 2, 0), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    crack.rotation.y = sx * 1.3; g.add(crack);
    T.pillars.push({ g, drums, sx, crack }); COL.push({ x: sx * 1.15, z: -2.5, r: 0.36 });
  }
  const fall = (mesh, delay, spin = 1) => T.falling.push({ m: mesh, v: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.3) * 2), w: new THREE.Vector3((Math.random() - 0.5) * spin, 0, (Math.random() - 0.5) * spin), delay, done: false });
  T.lintel = [];
  for (const sx of [-1, 1]) { const m = box(3.15, 0.7, 1.0, sx * 1.575, H + 0.35, -2.5, stone); T.falling.push({ m, v: new THREE.Vector3(sx * 0.6, 1.5, 0.8), w: new THREE.Vector3(0.3, 0, sx * 1.6), delay: 0.3, done: false, crowd: true }); T.lintel.push(m); }
  for (const sx of [-1, 1]) fall(box(6.3, 0.7, 1.0, sx * 6.3, H + 0.35, -2.5, stone), 0.55, 0.8);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) fall(box(5.6, 0.7, 4.4, -5.8 + i * 5.8, H + 1.05, -4.9 - j * 4.4, stoneD), 0.3 + j * 0.2 + Math.random() * 0.15, 1.2);
  // the people on the roof (Judges 16:27) — instanced, they cheer until the end
  const pg = mergeGeometries([new THREE.CylinderGeometry(0.15, 0.2, 0.75, 6).translate(0, 0.38, 0).toNonIndexed(), new THREE.SphereGeometry(0.12, 6, 4).translate(0, 0.86, 0).toNonIndexed()]);
  const pm = new THREE.MeshLambertMaterial(); const N = 150; const crowd = new THREE.InstancedMesh(pg, pm, N); const cc = new THREE.Color(); const cols = [0x8e2c22, 0xd8c39a, 0x3b2a5a, 0x6b5a2c, 0xc9a25a, 0x2a3a5a, 0x7a4a2a];
  T.crowdBase = [];
  for (let i = 0; i < N; i++) {
    let x, y, z; if (i < 60) { x = -8.2 + (i % 30) * 0.56 + Math.random() * 0.2; z = -2.15 - Math.floor(i / 30) * 0.6; y = H + 1.4; } else { const sx = i % 2 ? 1 : -1; const q = (i - 60) >> 1; x = sx * (9.9 + (q % 3) * 0.7); z = -14 + Math.floor(q / 3) * 1.6 + Math.random() * 0.3; y = H + 1.25; }
    T.crowdBase.push([x, y, z, Math.random() * 6, { f: false, p: new THREE.Vector3(x, y, z), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), land: false, lie: 0 }]); m4.makeTranslation(x, y, z); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, cc.set(cols[i % cols.length]).multiplyScalar(0.8 + Math.random() * 0.4));
  }
  W.add(crowd); T.crowd = crowd; T.crowdN = N;
  // Dagon (the idol on the dais): a crowned figure with a fish's tail
  const st = new THREE.Group(); st.position.set(0, 0.7, -13.8); W.add(st);
  const gm = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.45, metalness: 0.6 });
  const part = (geo, x, y, z, m = gm) => { const p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.castShadow = true; st.add(p); return p; };
  part(new THREE.BoxGeometry(2.4, 1.0, 2.0), 0, 0.5, 0, stoneD);
  part(new THREE.CylinderGeometry(0.7, 0.95, 2.6, 10), 0, 2.3, 0); part(new THREE.SphereGeometry(0.55, 12, 8), 0, 4.0, 0); part(new THREE.CylinderGeometry(0.42, 0.62, 1.1, 10), 0, 4.85, 0);
  for (const sx of [-1, 1]) { const a = part(new THREE.BoxGeometry(0.35, 1.7, 0.35), sx * 0.95, 2.6, 0.2); a.rotation.z = sx * 0.25; a.rotation.x = -0.5; }
  for (let i = 0; i < 6; i++) { const t = part(new THREE.ConeGeometry(0.62 - i * 0.08, 0.7, 8), 0, 1.0 + i * 0.05, -0.6 - i * 0.45); t.rotation.x = -1.3 - i * 0.12; }
  T.statue = st;
  // braziers and the hall light
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 0.4, 10), MAT.bronze), leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 6), MAT.bronze);
  for (const [x, z] of [[-3.4, -1.6], [3.4, -1.6], [-4.6, -10.6], [4.6, -10.6], [-7.5, 7], [7.5, 7]]) { const b = bowl.clone(); b.position.set(x, 1.2, z); const l = leg.clone(); l.position.set(x, 0.5, z); W.add(b, l); addFire(x, 1.35, z, 0.9); COL.push({ x, z, r: 0.42 }); }
  T.light = new THREE.PointLight(0xff9a50, 30, 26, 1.6); T.light.position.set(0, 3.2, -4); W.add(T.light);
  // the spot between the pillars
  T.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  T.ring.position.set(0, 0.03, -2.5); W.add(T.ring);
}

// ---- Level 3 world: the camp of the four kings at Dan, by night (Genesis 14:14–15)
let DAN = null;
function hgtDan(x, z) {
  const r = Math.hypot(x * 0.9, z + 2);
  let h = Math.max(0, r - 27); h = h * h * 0.026 + h * 0.3;
  h += fbm(x * 0.04 + 31, z * 0.04 + 17) * 1.3 + fbm(x * 0.17, z * 0.17) * 0.22;
  h += Math.exp(-((z + 75) * (z + 75)) / 500) * 9 * (0.7 + 0.3 * Math.sin(x * 0.05));
  return h;
}
function tentGeo(r, h, c1, c2, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg, 1, true).toNonIndexed().translate(0, h / 2, 0); const n = g.attributes.position.count, col = new Float32Array(n * 3);
  const a = new THREE.Color(c1), b = new THREE.Color(c2);
  for (let i = 0; i < n; i++) { const tri = Math.floor(i / 3), c = (tri % 2) ? a : b; col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (g.attributes.uv) g.deleteAttribute('uv');
  const pole = vcol(new THREE.CylinderGeometry(0.05, 0.06, h + 0.5, 5).translate(0, (h + 0.5) / 2, 0), 0x2a1c12); if (pole.attributes.uv) pole.deleteAttribute('uv');
  const skirt = vcol(new THREE.CylinderGeometry(r * 1.01, r * 1.03, 0.5, seg, 1, true).translate(0, 0.25, 0), c1); if (skirt.attributes.uv) skirt.deleteAttribute('uv');
  ['normal'].forEach(k => { pole.deleteAttribute(k); skirt.deleteAttribute(k); g.deleteAttribute(k); });
  const m = mergeGeometries([g, NI(pole), NI(skirt)]); m.computeVertexNormals(); return m;
}
// ---- Level 1, sequence 4: the wilderness wadi on the way to the cave of Adullam (1 Samuel 22:1)
const CAVE_Z = -150;
const WILD_PX = (z) => Math.sin(z * 0.032) * 9 + Math.sin(z * 0.013 + 1.3) * 5;   // the centre line of the wadi
const WILD_HALF = 11.5;                                                          // how far from the centre line you can run
let WILD = null;
function hgtWild(x, z) {
  const d = Math.abs(x - WILD_PX(z));
  let h = fbm(x * 0.05, z * 0.05) * 1.0 + fbm(x * 0.18, z * 0.18) * 0.22 - z * 0.025;
  const w = Math.max(0, d - 10); h += 16 * (1 - Math.exp(-w / 7)) + w * 0.32 + fbm(x * 0.07 + 5, z * 0.07) * Math.min(w, 14) * 0.35;
  const e = Math.max(0, CAVE_Z - 3 - z); h += e * e * 0.5 + e * 1.4;
  const b = Math.max(0, z - 21); h += b * b * 0.08 + b * 0.5;
  return h;
}
function buildWild() {
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp;
  const sand = new THREE.Color(0.7, 0.58, 0.42), scrub = new THREE.Color(0.47, 0.45, 0.27), lime = new THREE.Color(0.78, 0.72, 0.62), dark = new THREE.Color(0.5, 0.42, 0.34);
  buildGround((x, z, y, sl, c) => {
    c.copy(sand).lerp(scrub, CL(fbm(x * 0.07 + 3, z * 0.07) * 0.9 + 0.3, 0, 1) * 0.55);
    c.lerp(lime, SS(sl, 0.5, 1.6)); c.lerp(dark, SS(sl, 2.2, 4) * 0.5);
  }, 0x9a8466);
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // boulders along the wadi: the places to hide (each one also blocks)
  const rocks = [];
  for (let z = 6, k = 0; z > CAVE_Z + 10; z -= 4.6 + rng() * 2.4, k++) {
    const side = k % 2 ? 1 : -1, off = side * (3.2 + rng() * 5), s = 0.95 + rng() * 0.55;
    rocks.push([WILD_PX(z) + off, z, s]);
  }
  addBoulders(rocks, 0xb4a68e);
  // loose rocks, scrub and broom bushes, a few terebinths on the banks
  const rockG = vcol(new THREE.DodecahedronGeometry(1, 0), 0xa8997f);
  scatter(rockG, lam, 240, () => { const z = CAVE_Z - 6 + rng() * 180, x = WILD_PX(z) + (rng() - 0.5) * 56; const d = Math.abs(x - WILD_PX(z)); const s = d < WILD_HALF ? 0.1 + rng() * 0.22 : 0.5 + rng() * 1.3; return { x, y: hgt(x, z) - s * 0.25, z, s, sy: 0.55 + rng() * 0.4, ry: rng() * 6, rx: rng() }; }, true);
  const bush = vcol(new THREE.DodecahedronGeometry(0.5, 0).scale(1, 0.6, 1), 0x6e6a34);
  scatter(bush, lam, LOWQ ? 120 : 240, () => { const z = CAVE_Z + rng() * 175, x = WILD_PX(z) + (rng() - 0.5) * 50; return { x, y: hgt(x, z) + 0.05, z, s: 0.5 + rng() * 0.9, ry: rng() * 6 }; });
  const trunk = vcol(new THREE.CylinderGeometry(0.12, 0.22, 1.8, 5).translate(0, 0.9, 0), 0x5b4128);
  const can = vcol(new THREE.IcosahedronGeometry(1.2, 0).scale(1.2, 0.72, 1.2).translate(0, 2.2, 0), 0x6a7238);
  scatter(mergeGeometries([trunk, can].map(NI)), lam, 40, () => { const z = CAVE_Z + rng() * 175, side = rng() < 0.5 ? -1 : 1, x = WILD_PX(z) + side * (13 + rng() * 22); return { x, y: hgt(x, z) - 0.1, z, s: 0.8 + rng() * 0.7, ry: rng() * 6 }; }, true);
  // the cave of Adullam: a dark mouth in the cliff, a rock arch, two torches and a pale beam you can see from far off
  const cx = WILD_PX(CAVE_Z), cz = CAVE_Z - 1.6, cy = hgt(cx, CAVE_Z + 1);
  const cave = new THREE.Group(); cave.position.set(cx, cy, cz); W.add(cave);
  const black = new THREE.MeshBasicMaterial({ color: 0x050302 });
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(2.3, 20, 0, Math.PI).scale(1.15, 1.25, 1), black); mouth.position.set(0, -0.05, 0.25); cave.add(mouth);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 7, 16, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1.15, 1.25, 1), new THREE.MeshBasicMaterial({ color: 0x0a0604, side: THREE.BackSide })); tunnel.position.set(0, 0, -3.2); cave.add(tunnel);
  const archG = vcol(new THREE.DodecahedronGeometry(1, 1), 0x9c8e78);
  scatter(archG, lam, 15, (() => { let i = 0; return () => { const a = (i++ / 14) * Math.PI; return { x: cx + Math.cos(a) * 3.15, y: cy + Math.sin(a) * 3.0 - 0.3, z: cz + 0.4, s: 0.75 + rng() * 0.35, ry: rng() * 6, rx: rng() }; }; })(), true);
  for (const sx of [-1, 1]) { const tx = cx + sx * 3.9, tz = cz + 1.6, ty = hgt(tx, tz); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 2.2, 5).translate(0, 1.1, 0), MAT.wood); p.position.set(tx, ty, tz); W.add(p); addFire(tx, ty + 2.15, tz, 0.5); COL.push({ x: tx, z: tz, r: 0.2 }); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 46, 16, 1, true).translate(0, 23, 0), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.position.set(cx, cy, cz + 1.5); W.add(beam);
  WILD = { rocks: rocks.map(([x, z, s]) => ({ x, z, s })), cave: new THREE.Vector3(cx, cy, cz + 1.2), beam, t: 0 };
  WILD.light = new THREE.PointLight(0xffa860, 30, 18, 2); WILD.light.position.set(cx, cy + 2.4, cz + 2.4); W.add(WILD.light);
}
function buildDan() {
  const grass = new THREE.Color(0.19, 0.21, 0.14), dirt = new THREE.Color(0.25, 0.2, 0.15), worn = new THREE.Color(0.18, 0.14, 0.11), rockC = new THREE.Color(0.3, 0.28, 0.27);
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp;
  buildGround((x, z, y, sl, c) => {
    c.copy(grass).lerp(dirt, CL(fbm(x * 0.06 + 2, z * 0.06) * 0.9 + 0.35, 0, 1) * 0.7);
    c.lerp(worn, (1 - SS(Math.hypot(x, z + 6), 8, 24)) * 0.6); c.lerp(rockC, SS(sl, 0.6, 1.4));
  }, 0x1c2232);
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const inArena = (x, z, m = 0) => x > ARENA.x0 - m && x < ARENA.x1 + m && z > ARENA.z0 - m && z < ARENA.z1 + m;
  // rocks and terebinths
  const rockG = vcol(new THREE.DodecahedronGeometry(1, 0), 0x7d7670);
  scatter(rockG, lam, 120, () => { const x = (rng() - 0.5) * 220, z = (rng() - 0.5) * 180; const inA = inArena(x, z, 6); const s = inA ? 0.1 + rng() * 0.2 : 0.5 + rng() * 2.2; return { x, y: hgt(x, z) + s * 0.2, z, s, sy: 0.55 + rng() * 0.4, ry: rng() * 6, rx: rng() }; }, true);
  addBoulders([[-21, 12, 1.1], [21, 11, 0.9], [-22, -19, 1.0], [22, -18, 1.1]], 0x7d7670);
  const trunk = vcol(new THREE.CylinderGeometry(0.12, 0.22, 1.9, 5).translate(0, 0.95, 0), 0x3a2a1c);
  const can = vcol(new THREE.IcosahedronGeometry(1.3, 0).scale(1.25, 0.72, 1.25).translate(0, 2.4, 0), 0x3a4a2a);
  scatter(mergeGeometries([trunk, can].map(NI)), lam, 36, () => { const x = (rng() - 0.5) * 200, z = (rng() - 0.5) * 170; if (inArena(x, z, 5)) return null; return { x, y: hgt(x, z) - 0.1, z, s: 0.9 + rng() * 0.8, ry: rng() * 6 }; }, true);
  // the tents of the eastern host (woven wool: dark goat-hair, dyed madder red, ochre and indigo)
  const pal = [[0x2a2420, 0x6a2a22], [0x2c2622, 0x8a6a3a], [0x241f1c, 0x2e3a5a], [0x3a2e26, 0x7a3a2a]];
  const tents = [[-17, -12, 2.4, 2.8, 0], [16, -14, 2.6, 3.0, 1], [-20, 3, 2.1, 2.5, 2], [19.5, 2, 2.3, 2.7, 3], [-9, -19.5, 2.0, 2.4, 1], [10, -19, 2.2, 2.6, 0]];
  for (const [x, z, r, h, k] of tents) { const m = new THREE.Mesh(tentGeo(r, h, ...pal[k]), lam); m.position.set(x, hgt(x, z) - 0.05, z); m.rotation.y = x * 0.37; m.castShadow = true; m.receiveShadow = true; W.add(m); COL.push({ x, z, r: r * 0.92 }); }
  for (let k = 0; k < 4; k++) scatter(tentGeo(2.3, 2.7, ...pal[k], 7), lam, 9, () => { const a = rng() * Math.PI * 2, d = 32 + rng() * 34; const x = Math.cos(a) * d * 1.1, z = Math.sin(a) * d - 8; if (z > 10 && Math.abs(x) < 30) return null; return { x, y: hgt(x, z) - 0.1, z, s: 0.8 + rng() * 0.6, ry: rng() * 6 }; }, true);
  // the king's pavilion (Chedorlaomer, king of Elam), north of the fighting ground, with its braziers and banner
  { const x = 0, z = -31; const m = new THREE.Mesh(tentGeo(4.8, 5.6, 0x3a1a4a, 0xb08a3a, 10), lam); m.position.set(x, hgt(x, z) - 0.1, z); m.castShadow = true; W.add(m);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4, 5), MAT.wood); pole.position.set(x + 4, hgt(x + 4, z + 4) + 2, z + 4); W.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8).translate(0.7, 0, 0), new THREE.MeshLambertMaterial({ color: 0x5a1a3a, side: THREE.DoubleSide })); flag.position.set(x + 4.05, hgt(x + 4, z + 4) + 3.5, z + 4); W.add(flag);
    for (const sx of [-1, 1]) { const bx = x + sx * 3.6, bz = z + 5.2, by = hgt(bx, bz); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.12, 1.1, 8).translate(0, 0.55, 0), MAT.bronze); st.position.set(bx, by, bz); W.add(st); addFire(bx, by + 1.05, bz, 0.75); } }
  // campfires in stone rings, and torches on poles between the tents
  const ringG = vcol(new THREE.DodecahedronGeometry(0.2, 0), 0x6a6460);
  const fires = [[0, -4, 1.25], [-11, -7, 0.9], [11, -6, 0.95], [-4, -15, 0.8], [6, 5, 0.75]];
  for (const [x, z, s] of fires) { const y = hgt(x, z); scatter(ringG, lam, 9, (() => { let i = 0; return () => { const a = i++ / 9 * Math.PI * 2; return { x: x + Math.cos(a) * 0.62 * s, y: y + 0.05, z: z + Math.sin(a) * 0.62 * s, s: 0.9 + rng() * 0.5, ry: a, sy: 0.7 }; }; })()); addFire(x, y + 0.05, z, s); COL.push({ x, z, r: 0.7 * s });
    const logs = new THREE.Mesh(mergeGeometries([0, 1, 2].map(i => new THREE.CylinderGeometry(0.06, 0.07, 0.9 * s, 5).rotateZ(Math.PI / 2).rotateY(i * 1.05).translate(0, 0.08, 0).toNonIndexed())), new THREE.MeshLambertMaterial({ color: 0x2a1a10, emissive: 0x3a1004 })); logs.position.set(x, y, z); W.add(logs); }
  const torches = [[-6, -10], [6, -11], [-14, -1], [14, -2], [-3, -24], [3, -24], [-23, -9], [23, -8]];
  for (const [x, z] of torches) { const y = hgt(x, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.2, 5).translate(0, 1.1, 0), MAT.wood); p.position.set(x, y, z); W.add(p); addFire(x, y + 2.15, z, 0.42); COL.push({ x, z, r: 0.15 }); }
  // the spoil of Sodom and Gomorrah heaped by the pavilion: jars, sacks, chests
  const jarG = vcol(new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.24, 0.2], [0.22, 0.42], [0.1, 0.55], [0.11, 0.66], [0, 0.66]].map(([a, b]) => new THREE.Vector2(a, b)), 9), 0x9a5a34);
  const sackG = vcol(new THREE.SphereGeometry(0.32, 8, 6).scale(1, 0.8, 0.9).translate(0, 0.25, 0), 0x8a7650);
  const chestG = vcol(new THREE.BoxGeometry(0.7, 0.42, 0.45).translate(0, 0.21, 0), 0x5a3a20);
  for (const [g, n] of [[jarG, 14], [sackG, 12], [chestG, 5]]) scatter(g, lam, n, () => { const sx = rng() < 0.5 ? -1 : 1; const x = sx * (4 + rng() * 4.5), z = -18.8 - rng() * 2.5; return { x, y: hgt(x, z), z, s: 0.85 + rng() * 0.4, ry: rng() * 6 }; }, true);
  // light: moonlight from the sun light; firelight from the central fire, the pavilion, and the torch carried with Abram
  DAN = { t: 0 };
  DAN.fireL = new THREE.PointLight(0xff9448, 90, 34, 2); DAN.fireL.position.set(0, hgt(0, -4) + 1.4, -4); W.add(DAN.fireL);
  if (!LOWQ) { DAN.kingL = new THREE.PointLight(0xff8a3a, 45, 26, 2); DAN.kingL.position.set(0, hgt(0, -24) + 1.6, -24); W.add(DAN.kingL); }
  DAN.torch = new THREE.PointLight(0xffa860, 26, 15, 2); W.add(DAN.torch);
  // captives' stakes (Lot and the people of Sodom)
  DAN.stakes = [[6.5, -15.5], [-15.5, -6], [15.5, -2.5]];
  for (const [x, z] of DAN.stakes) { const y = hgt(x, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0), MAT.wood); p.position.set(x, y, z - 0.45); p.castShadow = true; W.add(p); }
}
function updateDan(dt) {
  const D = DAN; if (!D) return; D.t += dt; const t = D.t;
  D.fireL.intensity = 90 + Math.sin(t * 11) * 12 + Math.sin(t * 23.7) * 8;
  if (D.kingL) D.kingL.intensity = 45 + Math.sin(t * 9.3 + 1) * 7;
  if (P) { D.torch.position.set(P.pos.x + Math.sin(P.yaw + 1.2) * 0.9, P.pos.y + 2.5, P.pos.z + Math.cos(P.yaw + 1.2) * 0.9); D.torch.intensity = 26 + Math.sin(t * 13) * 3 + Math.sin(t * 29) * 2; }
}
const ENV = {
  elah: { fog: 0xd6a57a, near: 42, far: 240, hemi: [0xffdcae, 0x4a3018, 0.78], sun: [0xffc47e, 3.5], dir: [-0.58, 0.31, -0.75], zen: [0.26, 0.42, 0.68], hor: [0.98, 0.74, 0.5], low: [0.85, 0.66, 0.48], sunC: [1.0, 0.62, 0.28], exp: 1.05, dust: 0xffd9a0 },
  lehi: { fog: 0xa88078, near: 50, far: 250, hemi: [0xb4b0dc, 0x6a4a30, 1.25], sun: [0xffae74, 3.4], dir: [0.62, 0.24, -0.75], zen: [0.16, 0.2, 0.42], hor: [1.0, 0.56, 0.36], low: [0.52, 0.38, 0.4], sunC: [1.0, 0.45, 0.2], exp: 1.22, dust: 0xffb070 },
  dan: { fog: 0x111a2e, near: 16, far: 125, hemi: [0x6a80bc, 0x2a1e16, 0.55], sun: [0xb4c6f0, 1.25], dir: [0.3, 0.42, -0.86], zen: [0.012, 0.02, 0.055], hor: [0.07, 0.1, 0.19], low: [0.035, 0.035, 0.05], sunC: [0.22, 0.28, 0.45], exp: 1.08, dust: 0xffa060, warm: 0, stars: 1.4 },
  wild: { fog: 0xcf9c70, near: 34, far: 185, hemi: [0xffd8a8, 0x5a3a22, 0.82], sun: [0xffb070, 3.3], dir: [-0.6, 0.27, 0.75], zen: [0.3, 0.4, 0.64], hor: [1.0, 0.68, 0.44], low: [0.84, 0.6, 0.44], sunC: [1.0, 0.56, 0.25], exp: 1.07, dust: 0xffc890 },
  moab: { fog: 0xb8b4bc, near: 40, far: 210, hemi: [0xdfe6f6, 0x5a4a3a, 0.95], sun: [0xffe0bc, 2.7], dir: [-0.5, 0.34, -0.78], zen: [0.32, 0.42, 0.6], hor: [0.86, 0.8, 0.78], low: [0.68, 0.64, 0.62], sunC: [1.0, 0.78, 0.55], exp: 1.05, dust: 0xffffff },
  pit: { fog: 0xc6ccd8, near: 18, far: 110, hemi: [0xe2eaff, 0x5a5450, 1.15], sun: [0xe8eeff, 1.7], dir: [0.35, 0.72, -0.5], zen: [0.5, 0.55, 0.65], hor: [0.8, 0.83, 0.88], low: [0.68, 0.7, 0.74], sunC: [0.9, 0.9, 0.95], exp: 1.0, dust: 0xffffff },
  beth: { fog: 0xd8b88a, near: 44, far: 230, hemi: [0xffe8c0, 0x5a4428, 0.95], sun: [0xffcf8a, 3.3], dir: [0.5, 0.36, 0.78], zen: [0.24, 0.42, 0.7], hor: [0.96, 0.8, 0.58], low: [0.82, 0.7, 0.52], sunC: [1.0, 0.7, 0.36], exp: 1.05, dust: 0xffe2a8 },
  kishon: { fog: 0xd2d6d2, near: 42, far: 230, hemi: [0xeef2f8, 0x6a5a40, 1.05], sun: [0xffe6bc, 3.1], dir: [-0.45, 0.5, 0.74], zen: [0.22, 0.4, 0.72], hor: [0.8, 0.84, 0.86], low: [0.72, 0.72, 0.68], sunC: [1.0, 0.75, 0.45], exp: 1.05, dust: 0xffe6b0 },
  storm: { fog: 0x5e666e, near: 22, far: 140, hemi: [0xb4c0d4, 0x3a3a34, 1.0], sun: [0xc8d4e8, 1.2], dir: [-0.4, 0.6, 0.7], zen: [0.18, 0.21, 0.26], hor: [0.4, 0.43, 0.48], low: [0.3, 0.32, 0.35], sunC: [0.5, 0.55, 0.6], exp: 1.0, dust: 0xc8d8ff },
  temple: { fog: 0x4a3226, near: 22, far: 90, hemi: [0xffd2a0, 0x3a2618, 1.05], sun: [0xffb070, 2.6], dir: [0.3, 0.42, 0.86], zen: [0.15, 0.17, 0.36], hor: [1.0, 0.5, 0.3], low: [0.5, 0.3, 0.26], sunC: [1.0, 0.42, 0.18], exp: 1.12, dust: 0xffc890 },
};
// colour grade per world: shadow tint, highlight tint, saturation, contrast, vignette
const GRADE = {
  def: { sh: [0.95, 0.99, 1.06], hi: [1.06, 1.0, 0.92], sat: 1.1, con: 1.08, vig: 0.34 },
  dan: { sh: [0.9, 0.97, 1.12], hi: [1.08, 0.98, 0.88], sat: 1.05, con: 1.1, vig: 0.42 },
  pit: { sh: [0.94, 0.98, 1.08], hi: [1.02, 1.0, 0.97], sat: 1.0, con: 1.08, vig: 0.38 },
  moab: { sh: [0.94, 0.98, 1.08], hi: [1.03, 1.0, 0.96], sat: 1.02, con: 1.07, vig: 0.32 },
  storm: { sh: [0.92, 0.98, 1.08], hi: [1.0, 1.0, 1.0], sat: 0.92, con: 1.12, vig: 0.42 },
  temple: { sh: [0.92, 0.95, 1.06], hi: [1.1, 0.98, 0.86], sat: 1.08, con: 1.1, vig: 0.42 },
};
function setGrade(name) { if (!gradePass) return; const g = GRADE[name] || GRADE.def, u = gradePass.uniforms; u.uShadow.value.set(...g.sh); u.uHigh.value.set(...g.hi); u.uSat.value = g.sat; u.uCon.value = g.con; u.uVig.value = g.vig; }
function setEnv(name) {
  const E = ENV[name]; setGrade(name);
  scene.fog.color.set(E.fog); scene.fog.near = E.near; scene.fog.far = E.far; FOG.set(E.fog);
  hemi.color.set(E.hemi[0]); hemi.groundColor.set(E.hemi[1]); hemi.intensity = E.hemi[2]; sun.color.set(E.sun[0]); sun.intensity = E.sun[1];
  SUN_DIR.set(...E.dir).normalize(); const u = skyMat.uniforms; u.uZen.value.set(...E.zen); u.uHor.value.set(...E.hor); u.uLow.value.set(...E.low); u.uSunC.value.set(...E.sunC); u.uWarm.value = E.warm ?? 1; u.uStars.value = E.stars ?? 0; u.uCloud.value = E.cloud ?? (name === 'dan' || name === 'pit' ? 0.35 : name === 'storm' ? 1.6 : name === 'temple' ? 0.6 : 1);
  RIM.value.set(E.rim || (E.warm === 0 ? 0x3a4a78 : E.sun[0])).multiplyScalar(E.rim ? 1 : E.warm === 0 ? 1 : 0.3);
  renderer.toneMappingExposure = E.exp; if (dust) dust.material.color.set(E.dust);
  makeEnv();
}
function buildWorld(name) {
  if (WORLD === name) return;
  scene.remove(W); W.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
  W = new THREE.Group(); scene.add(W); COL.length = 0; FIRES.length = 0; SNOW = null; KISHON = null; TEMPLE = null; DAN = null; WILD = null; WORLD = name; musicMode(name);
  Object.assign(ARENA, ARENA_BY[name]); HGT = name === 'elah' ? hgtElah : name === 'lehi' ? hgtLehi : name === 'dan' ? hgtDan : name === 'wild' ? hgtWild : name === 'moab' ? hgtMoab : name === 'pit' ? hgtPit : name === 'kishon' ? hgtKishon : name === 'beth' ? hgtBeth : () => 0;
  RS = name === 'elah' ? 1234567 : name === 'lehi' ? 7654321 : name === 'dan' ? 3141592 : name === 'wild' ? 2718281 : 424242;
  setEnv(name);
  if (name === 'elah') { buildTerrain(); buildProps(); } else if (name === 'lehi') buildLehi(); else if (name === 'dan') buildDan(); else if (name === 'wild') buildWild(); else if (name === 'moab') buildMoab(); else if (name === 'pit') buildPit(); else if (name === 'kishon') buildKishon(); else if (name === 'beth') buildBeth(); else buildTemple();
  LOG('world', { name });
}
function collide(p, r) { let hit = false; for (const c of COL) { const dx = p.x - c.x, dz = p.z - c.z, R = r + c.r, d2 = dx * dx + dz * dz; if (d2 < R * R) { const d = Math.sqrt(d2) || 0.001; p.x = c.x + dx / d * R; p.z = c.z + dz / d * R; hit = true; } } return hit; }
function updateWorld(dt) {
  const t = now();
  for (const f of FIRES) { const k = 0.85 + Math.sin(t * 13 + f.ph) * 0.08 + Math.sin(t * 23 + f.ph * 2) * 0.06; f.sp.scale.set(0.8 * f.s * (2 - k), 1.5 * f.s * k, 1); f.glow.material.opacity = 0.35 + 0.15 * k; }
  if (DAN) updateDan(dt);
  if (SNOW) updateSnow(dt);
  if (KISHON && KISHON.rain && KISHON.rain.visible) updatePrecip(KISHON.rain, dt);
  if (WILD) { WILD.t += dt; WILD.light.intensity = 30 + Math.sin(t * 11) * 4 + Math.sin(t * 23) * 3; WILD.beam.material.opacity = 0.13 + 0.05 * Math.sin(t * 1.7); }
  const T = TEMPLE; if (!T) return; T.t += dt;
  if (T.light) T.light.intensity = 26 + Math.sin(t * 9) * 3 + Math.sin(t * 17) * 2;
  if (T.ring) { T.ring.visible = !!(G.fin && !G.fin.collapsing && P && P.state !== 'push'); T.ring.material.opacity = 0.35 + 0.3 * Math.sin(t * 5); }
  const prog = G.fin ? G.fin.prog : 0;
  if (!T.collapse) {
    // cheering crowd (bob); pillars strain and lean as the push grows
    const m4 = _m4; for (let i = 0; i < T.crowdN; i++) { const b = T.crowdBase[i]; const j = Math.max(0, Math.sin(t * (5 + prog * 6) + b[3])) * (0.12 + prog * 0.1); m4.makeTranslation(b[0], b[1] + j, b[2]); T.crowd.setMatrixAt(i, m4); }
    T.crowd.instanceMatrix.needsUpdate = true;
    const strain = P && P.state === 'push' ? prog : prog * 0.4;
    for (const p of T.pillars) { p.crack.material.opacity += ((G.fin ? G.fin.cracks / 3 : 0) * 0.95 - p.crack.material.opacity) * Math.min(1, dt * 3); p.g.rotation.z = p.sx * -prog * 0.07 + (Math.random() - 0.5) * strain * 0.012; p.drums.forEach((d, i) => { d.position.x = (i % 2 ? 1 : -1) * prog * 0.04 * p.sx; }); }
    return;
  }
  // collapse: the pillars snap, the lintel breaks, the roof and the people on it come down, the colonnades topple, dust fills the hall
  const C = T.collapse; C.t += dt; const H = 6.6;
  for (const p of T.pillars) {
    if (C.t < 0.28) { p.g.rotation.z = THREE.MathUtils.lerp(p.g.rotation.z, -p.sx * 0.22, Math.min(1, dt * 6)); p.crack.material.opacity = 1; }
    else if (!p.snapped) { p.snapped = true; p.crack.visible = false; const wp = new THREE.Vector3(p.sx * 1.4, 3.2, -2.5); debris(wp, 26, 0.8, 5, 0.8); for (let i = 0; i < 4; i++) puff(wp.clone().setY(1.5 + i * 1.3), 2.6, 2.2); flashAt(wp, 3.5, 0.25, 0xffe2b0); }
    p.drums.forEach((d, i) => {
      if (C.t < 0.28 || i === 0) { if (i === 0 && C.t > 0.28) d.rotation.z = THREE.MathUtils.lerp(d.rotation.z, p.sx * 0.15, dt * 3); return; }
      const u = d.userData; if (!u.v) { u.v = new THREE.Vector3(p.sx * (1.6 + Math.random() * 2.4 + i * 0.4), 1 + Math.random() * 2, (Math.random() - 0.35) * 3); u.w = new THREE.Vector3((Math.random() - 0.5) * 5, 0, p.sx * -(2 + Math.random() * 3)); u.hits = 0; }
      if (u.rest) return; u.v.y -= 18 * dt; d.position.addScaledVector(u.v, dt); d.rotation.x += u.w.x * dt; d.rotation.z += u.w.z * dt;
      const gy = 0.34; if (d.position.y < gy) { d.position.y = gy; u.hits++; if (u.hits === 1) { const wp = d.getWorldPosition(new THREE.Vector3()); dustRing(wp, 6, 3, 2.4); debris(wp, 8, 0.6, 3, 0.6); SFX.thud(); shake(1.0); } u.v.set(u.v.x * 0.4, Math.abs(u.v.y) * 0.25, u.v.z * 0.4); u.w.multiplyScalar(0.4); if (u.hits > 3) u.rest = true; }
    });
  }
  for (const f of T.falling) {
    if (f.done || C.t < f.delay) continue;
    if (!f.started) { f.started = true; debris(f.m.position.clone().setY(f.m.position.y - 0.3), 8, 3, 0.5, 0.8); }
    f.v.y -= 18 * dt; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += f.w.x * dt; f.m.rotation.z += f.w.z * dt;
    if (f.m.position.y < 0.5) { f.m.position.y = 0.5; if (!f.hit) { f.hit = true; f.v.set(f.v.x * 0.3, Math.abs(f.v.y) * 0.12, f.v.z * 0.3); f.w.multiplyScalar(0.25); shake(1.3); dustRing(f.m.position, LOWQ ? 5 : 8, 5, 4.6); debris(f.m.position, 14, 3, 6, 1); if (C.t - (C.lastSlam || -9) > 0.14) { C.lastSlam = C.t; SFX.slam(); } } else { f.done = true; f.m.rotation.x *= 0.5; f.m.rotation.z *= 0.5; } }
  }
  // the colonnades topple inward
  if (T.cols) { const m4 = _m4; let k = 0; for (const c of T.colBase) { const a = C.t > c.delay ? Math.min(1.42, (C.t - c.delay) ** 2 * 1.3) : 0; _e.set(c.dir * a * 0.3, 0, c.sx * a); _q.setFromEuler(_e); _s.setScalar(1); m4.compose(tmpV.set(c.x, 0, c.z), _q, _s); T.cols.setMatrixAt(k++, m4); if (a >= 1.42 && !c.down) { c.down = true; const tp = new THREE.Vector3(c.x - c.sx * 5, 0.5, c.z); dustRing(tp, 5, 3, 3); debris(tp, 6, 2, 3, 0.8); } } T.cols.instanceMatrix.needsUpdate = true; }
  if (T.statue) { T.statue.rotation.x = Math.min(Math.PI / 2.1, Math.max(0, C.t - 0.9) ** 2 * 0.8); if (T.statue.rotation.x > 1.4 && !C.idol) { C.idol = true; dustRing(new THREE.Vector3(0, 0.5, -10), 10, 4, 4); SFX.thud(); shake(1.2); } }
  // the people on the roof fall with it (Judges 16:30); they tumble and lie still under the dust
  { const m4 = _m4; for (let i = 0; i < T.crowdN; i++) { const b = T.crowdBase[i], c = b[4];
      if (!c.f) {
        if (c.delay === undefined) { if (i < 60) c.delay = (Math.abs(b[0]) < 3.15 ? 0.32 : 0.56) + Math.random() * 0.1; else { const sx = Math.sign(b[0]); const sf = T.sideFall.find(q => q.sx === sx && b[2] >= q.z0 && b[2] < q.z1); c.delay = (sf ? sf.delay : 1.4) + Math.random() * 0.1; } }
        if (C.t > c.delay) { c.f = true; const sx = Math.sign(b[0]); if (i < 60) c.v.set((Math.random() - 0.5) * 2 + sx * 0.6, 1 + Math.random() * 2, 1.2 + Math.random() * 2.5); else c.v.set(-sx * (1.2 + Math.random() * 2.2), 0.8 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5); c.w.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 9); }
        else { const j = Math.max(0, Math.sin(T.t * 14 + b[3])) * 0.08; m4.makeTranslation(b[0], b[1] + j, b[2]); T.crowd.setMatrixAt(i, m4); continue; }
      }
      if (!c.land) { c.v.y -= 16 * dt; c.p.addScaledVector(c.v, dt); c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt; if (c.p.y < 0.16) { c.p.y = 0.16; c.land = true; c.lx = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2; } }
      else { c.r.x += (c.lx - c.r.x) * Math.min(1, dt * 8); c.r.z *= 1 - Math.min(1, dt * 8); }
      _q.setFromEuler(c.r); _s.setScalar(1); m4.compose(c.p, _q, _s); T.crowd.setMatrixAt(i, m4);
    } T.crowd.instanceMatrix.needsUpdate = true; }
  // debris chunks
  if (T.deb) { const m4 = _m4; let any = false; for (let i = 0; i < T.debs.length; i++) { const d = T.debs[i]; if (d.life <= 0) continue; any = true; d.life -= dt;
      const r = d.s * 0.5; if (!d.rest) { d.v.y -= 18 * dt; d.p.addScaledVector(d.v, dt); d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; if (d.p.y < r) { d.p.y = r; d.v.set(d.v.x * 0.45, Math.abs(d.v.y) * 0.3, d.v.z * 0.45); d.w.multiplyScalar(0.5); if (Math.abs(d.v.y) < 0.4) d.rest = true; } }
      _e.set(d.r.x, d.r.y, 0); _q.setFromEuler(_e); _s.setScalar(d.life > 0 ? d.s : 0); m4.compose(d.p, _q, _s); T.deb.setMatrixAt(i, m4); }
    if (any) T.deb.instanceMatrix.needsUpdate = true; }
  // stones raining from the ceiling, dust rolling, light flooding in, fog thickening
  C.rainT = (C.rainT || 0) - dt; if (C.t > 0.3 && C.t < 3.6 && C.rainT <= 0) { C.rainT = LOWQ ? 0.08 : 0.04; const dp = T.debs[T.debI = (T.debI + 1) % T.debs.length]; dp.life = 6; dp.rest = false; dp.p.set((Math.random() - 0.5) * 18, H + 0.4, -1 - Math.random() * 14); dp.v.set((Math.random() - 0.5), -2, (Math.random() - 0.5)); dp.s = 0.1 + Math.random() * 0.35; dp.w.set(Math.random() * 8, Math.random() * 8, 0); }
  C.puffT -= dt; if (C.puffT <= 0 && C.t < 7) { C.puffT = LOWQ ? 0.14 : 0.075; const lowd = C.t > 1.2; puff(new THREE.Vector3((Math.random() - 0.5) * 20, lowd ? 0.5 + Math.random() * 2.5 : 1 + Math.random() * 6, -1 - Math.random() * 13 + (lowd ? Math.min(8, (C.t - 1.2) * 3) : 0)), (lowd ? 5 + C.t * 1.4 : 3.5) + Math.random() * 4, 3.2, new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.3, 0.6 + Math.random() * 1.6), DUSTC[(Math.random() * 3) | 0]); }
  if (T.light) T.light.intensity = C.t < 2 ? 18 + Math.random() * 30 : Math.max(4, 30 - C.t * 4);
  const k = THREE.MathUtils.smoothstep(C.t, 0.8, 3.2); hemi.intensity = THREE.MathUtils.lerp(ENV.temple.hemi[2], 1.9, k); sun.intensity = THREE.MathUtils.lerp(ENV.temple.sun[1], 4.2, k);
  const fk = THREE.MathUtils.smoothstep(C.t, 0.8, 3.6); scene.fog.near = THREE.MathUtils.lerp(ENV.temple.near, 1.5, fk); scene.fog.far = THREE.MathUtils.lerp(ENV.temple.far, 24, fk); scene.fog.color.lerpColors(_fogA.set(ENV.temple.fog), _fogB.set(0xb39c7c), fk);
}
const _fogA = new THREE.Color(), _fogB = new THREE.Color();
// big soft dust puffs (collapse, Spirit shockwave)
const PUFFS = [];
function buildPuffs() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 26; i++) { const r = 3 + Math.random() * 7, a = Math.random() * 6.28, d = 12 + Math.random() * 18; const gg = x.createRadialGradient(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 0, 32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r); gg.addColorStop(0, 'rgba(0,0,0,.5)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(0, 0, 64, 64); } x.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < (LOWQ ? 45 : 80); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xcdb898, opacity: 0 })); s.visible = false; scene.add(s); PUFFS.push({ s, life: 0, max: 1, size: 1, v: new THREE.Vector3() }); }
}
let puffI = 0;
function puff(p, size = 2, life = 1.2, v, col = 0xcdb898) { const q = PUFFS[puffI = (puffI + 1) % PUFFS.length]; q.s.material.color.set(col); q.s.position.copy(p); q.size = size; q.life = q.max = life; q.v.copy(v || new THREE.Vector3((Math.random() - 0.5), 0.6, (Math.random() - 0.5))); q.s.visible = true; q.s.material.rotation = Math.random() * 6; }
function updatePuffs(dt) { for (const q of PUFFS) { if (q.life <= 0) continue; q.life -= dt; const k = q.life / q.max; q.s.position.addScaledVector(q.v, dt); q.s.scale.setScalar(q.size * (1.6 - k * 0.8)); q.s.material.opacity = Math.min(1, k * 1.5) * 0.75; if (q.life <= 0) q.s.visible = false; } }

// ------------------------------------------------------------------ painted character material
// rim light shared by every character: picked from the world's sun (warm by day, moonlight at night)
const RIM = { value: new THREE.Color(0.32, 0.24, 0.16) };
const PAINT = `
vec3 p = vBind; float ax = abs(p.x); float isMetal = 0.0; float clothK = 0.0;
float nz = fract(sin(dot(floor(p*140.0), vec3(12.9898,78.233,37.719)))*43758.5453);
vec3 skinC = diffuseColor.rgb * uSkin; vec3 col = skinC;
bool arm = ax > 0.185 && p.y > 1.2 && p.y < 1.56;
if (arm) {
  if (ax < uSleeve) col = uTunic;
  if (uArmor > 0.5 && ax > 0.56 && ax < 0.72) { col = uMetal; isMetal = 1.0; }
} else {
  if (p.y > 0.86 && p.y < uNeck && !(p.y > 1.47 && ax < 0.075 && p.z > -0.02) && !(p.y > 1.5 && ax < 0.085)) col = uTunic;
  if (p.y > uSkirt && p.y <= 0.86) col = uTunic;
  if (p.y > 0.86 && p.y < 0.94) col = uTrim;
  if (uArmor > 0.5 && p.y > 0.95 && p.y < 1.47) { float row = floor(p.y*34.0); float sx = fract(p.x*26.0 + row*0.5); float sy = fract(p.y*34.0); float s = smoothstep(0.0,0.35,sy)*(1.0-0.6*abs(sx-0.5)); col = uMetal*(0.5+0.7*s); isMetal = 1.0; }
  if (uGreaves > 0.5 && p.y > 0.12 && p.y < 0.52) { col = uMetal*(0.9+0.2*nz); isMetal = 1.0; }
  if (p.y < 0.085) col = uShoe;
  if (uSash > 0.0 && p.y > 0.94 && p.y < 1.5 && abs(p.y - 1.62 + p.x*1.1) < uSash ) col = uTrim;
}
if (uAge > 0.0 && col == skinC && p.y > 1.6 && p.y < 1.78 && p.z > 0.055) {
  // age: forehead lines, bags and creases under the eyes, nose-to-mouth folds, crow's feet, hollow cheeks
  float k = 0.0;
  float fs = fract((p.y - 1.727) / 0.0155); if (p.y > 1.727 && p.y < 1.774) k = max(k, smoothstep(0.11, 0.0, abs(fs - 0.5)) * (1.0 - smoothstep(0.02, 0.05, ax)) * 0.34);
  float e = pow((ax - 0.033) / 0.019, 2.0) + pow((p.y - 1.683) / 0.0065, 2.0); if (e < 1.0) k = max(k, (1.0 - e) * 0.3);
  if (abs(p.y - 1.6755 + (ax - 0.033) * 0.12) < 0.0012 && abs(ax - 0.033) < 0.017) k = max(k, 0.45);
  vec2 a2 = vec2(0.021, 1.646), b2 = vec2(0.035, 1.604), q2 = vec2(ax, p.y); float h2 = clamp(dot(q2 - a2, b2 - a2) / dot(b2 - a2, b2 - a2), 0.0, 1.0); float dl = length(q2 - a2 - (b2 - a2) * h2); k = max(k, smoothstep(0.0028, 0.0, dl) * 0.6);
  if (ax > 0.056 && ax < 0.074 && p.y > 1.688 && p.y < 1.714) { float cf = fract((p.y - 1.688 + (ax - 0.056) * 0.6 * sign(p.y - 1.70)) / 0.0075); k = max(k, smoothstep(0.12, 0.0, abs(cf - 0.5)) * 0.22); }
  if (ax > 0.042 && ax < 0.062 && p.y > 1.628 && p.y < 1.648) k = max(k, 0.12 * (1.0 - abs(p.y - 1.638) / 0.01));
  col *= 1.0 - k * uAge;
}
bool skinHere = col == skinC;
if (skinHere && p.y > 1.55 && p.y < 1.75 && p.z > 0.0) {
  // face pass: eye sockets for depth, warmer lips, a shaved-beard shadow on the jaw and upper lip (heroes and soldiers)
  float sock = (1.0 - smoothstep(0.0, 1.0, pow((ax - 0.034) / 0.03, 2.0) + pow((p.y - 1.697) / 0.017, 2.0))) * smoothstep(0.05, 0.08, p.z);
  col *= 1.0 - 0.16 * sock;
  float lip = (1.0 - smoothstep(0.012, 0.026, ax)) * smoothstep(1.612, 1.618, p.y) * (1.0 - smoothstep(1.628, 1.636, p.y)) * smoothstep(0.07, 0.085, p.z);
  col = mix(col, col * vec3(1.02, 0.72, 0.68), 0.55 * lip);
  float stub = smoothstep(1.553, 1.578, p.y) * (1.0 - smoothstep(1.642, 1.658, p.y)) * smoothstep(-0.01, 0.035, p.z) * (1.0 - lip) * (1.0 - smoothstep(0.075, 0.095, ax));
  stub *= 1.0 - (1.0 - smoothstep(1.632, 1.64, p.y)) * smoothstep(1.6, 1.61, p.y) * (1.0 - smoothstep(0.03, 0.05, ax)) * smoothstep(0.06, 0.08, p.z) * 0.6;
  float sn = fract(sin(dot(floor(p*900.0), vec3(12.9898,78.233,37.719)))*43758.5453);
  col = mix(col, mix(col, uHair, 0.55) * 0.8, uStub * stub * (0.65 + 0.35 * sn));
}
if (!skinHere) {
  clothK = 1.0; col *= 0.94 + 0.1*nz;
  if (isMetal < 0.5) {
    // woven cloth: soft large-scale mottling, darker folds running down the skirt, dust at the hem
    float m1 = fract(sin(dot(floor(p*22.0), vec3(12.9898,78.233,37.719)))*43758.5453), m2 = fract(sin(dot(floor(p*9.0 + 3.1), vec3(12.9898,78.233,37.719)))*43758.5453);
    col *= 0.9 + 0.08*m1 + 0.06*m2;
    if (p.y < 0.86 && p.y > uSkirt) { float fold = 0.5 + 0.5*sin(atan(p.x, p.z + 0.02) * 9.0 + p.y * 3.0); col *= 0.86 + 0.16 * fold; col = mix(col, col * vec3(0.78, 0.7, 0.6), smoothstep(uSkirt + 0.12, uSkirt, p.y) * 0.5); }
  } else {
    // armour: worn bright edges and darker hollows
    col *= 0.85 + 0.3 * smoothstep(0.4, 1.0, nz);
  }
}
diffuseColor.rgb = col;
`;
function paintMat(L) {
  const B = BODY_MAT;
  const m = new THREE.MeshStandardMaterial({ map: B.map, normalMap: B.normalMap, normalScale: B.normalScale.clone(), roughnessMap: B.roughnessMap, roughness: 1.0, metalness: 0.0 });
  const u = {
    uSkin: { value: new THREE.Color(L.skin).multiply(SKIN_REF_INV) }, uTunic: { value: new THREE.Color(L.tunic) }, uTrim: { value: new THREE.Color(L.trim) },
    uHair: { value: new THREE.Color(L.hair) }, uMetal: { value: new THREE.Color(L.metal || 0xb07a3a) }, uShoe: { value: new THREE.Color(L.shoe || 0x4a321c) },
    uSkirt: { value: L.skirt ?? 0.55 }, uSleeve: { value: L.sleeve ?? 0.0 }, uArmor: { value: L.armor ? 1 : 0 }, uGreaves: { value: L.greaves ? 1 : 0 },
    uRimC: RIM, uBeard: { value: L.beard ? 1 : 0 }, uNeck: { value: L.neck ?? 1.545 }, uSash: { value: L.sash || 0 }, uFlash: { value: 0 }, uGlow: { value: L.glow || 0 }, uAge: { value: L.age || 0 }, uStub: { value: L.stub ?? 0.55 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec3 aBind;\nvarying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBind = aBind;');
    sh.fragmentShader = 'varying vec3 vBind;\nuniform vec3 uSkin,uTunic,uTrim,uHair,uMetal,uShoe,uRimC;\nuniform float uSkirt,uSleeve,uArmor,uGreaves,uBeard,uNeck,uSash,uFlash,uGlow,uAge,uStub;\n' +
      sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + PAINT)
        .replace('#include <normal_fragment_maps>', 'vec3 nBefore = normal;\n#include <normal_fragment_maps>\n normal = normalize(mix(normal, nBefore, clothK * 0.8));')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor * 0.95, 0.93, clothK); roughnessFactor = mix(roughnessFactor, 0.34, isMetal);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.9, isMetal);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uFlash*vec3(1.0,0.45,0.3) + uGlow*diffuseColor.rgb;\n float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0); totalEmissiveRadiance += uRimC * rimF * (1.0 - 0.5*isMetal) + uRimC * 0.12 * isMetal;');
  };
  m.customProgramCacheKey = () => 'paint-v5';
  return m;
}
const LOOKS = {
  david: { hairStyle: 'SimpleParted', skin: 0xd8996e, tunic: 0xd8c39a, trim: 0x8a4b2a, hair: 0x17100a, curls: 26, eye: 0x4a3018, shoe: 0x5a3a1e, skirt: 0.6, sleeve: 0.0 },
  phil: { hairStyle: 'Buzzed', beardS: 0.9, skin: 0xb27a52, tunic: 0x8e2c22, trim: 0xd9b56a, hair: 0x1c130c, beardLen: 0.6, metal: 0xb4823e, skirt: 0.52, sleeve: 0.32, greaves: true },
  captain: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0xa8704a, tunic: 0x3b2a5a, trim: 0xe0c070, hair: 0x15100a, beardLen: 1, cloak: 0x4a2a6a, metal: 0xc0904a, skirt: 0.52, sleeve: 0.3, armor: true, greaves: true },
  goliath: { hairStyle: 'Buzzed', beardS: 1.35, skin: 0x9a6644, tunic: 0x5a2418, trim: 0xd6a650, hair: 0x120c08, beardLen: 1.6, cloak: 0x6a1a10, metal: 0xc28a40, skirt: 0.5, sleeve: 0.34, armor: true, greaves: true },
  moses: { hairStyle: 'Long', beardS: 2.1, skin: 0xb98260, tunic: 0x6d5a8a, trim: 0x8a6a3a, hair: 0xe9e4da, beardLen: 2.4, curls: 10, shoe: 0x4a321c, skirt: 0.06, sleeve: 0.8 },
  samson: { hairStyle: 'Long', beardS: 1.25, skin: 0xb07448, tunic: 0x5e3f24, trim: 0xc9a25a, hair: 0x140c06, beardLen: 1.5, shoe: 0x4a321c, skirt: 0.62, sleeve: 0.0, beard: true, sash: 0.035 },
  archer: { hairStyle: 'Buzzed', beardS: 0.85, skin: 0xb07a50, tunic: 0x6b5a2c, trim: 0xd9b56a, hair: 0x1c130c, beardLen: 0.5, metal: 0xb4823e, skirt: 0.52, sleeve: 0.3 },
  shield: { hairStyle: 'Buzzed', beardS: 1.0, skin: 0xa06a46, tunic: 0x2a3a5a, trim: 0xe0c070, hair: 0x15100a, beardLen: 0.8, cloak: 0x1e2a48, metal: 0xc0904a, skirt: 0.52, sleeve: 0.3, armor: true, greaves: true },
  // Level 3 (Genesis 14): Abram is older, black hair and beard with grey through it; his trained servants; the captives; the host of the four kings; Chedorlaomer; Melchizedek
  abram: { hairStyle: 'Long', beardS: 1.8, age: 1, skin: 0x9c6646, tunic: 0x2b3a6a, trim: 0xc9a25a, hair: 0x1b1714, beardC: 0x86827c, grey: 0x77726c, cloak: 0x5a3a22, shoe: 0x4a321c, skirt: 0.36, sleeve: 0.46, neck: 1.66, gear: 'abram' },
  servant: { hairStyle: 'SimpleParted', beardS: 1.0, skin: 0xa87048, tunic: 0xb49a70, trim: 0x6a4226, hair: 0x15100b, shoe: 0x4a321c, skirt: 0.55, sleeve: 0.3, gear: 'servant' },
  lot: { hairStyle: 'SimpleParted', beardS: 1.15, skin: 0xb07a52, tunic: 0x8a3226, trim: 0xd9b56a, hair: 0x16110c, shoe: 0x4a321c, skirt: 0.24, sleeve: 0.6, neck: 1.66, gear: 'captive' },
  runner: { hairStyle: 'SimpleParted', beardS: 0.8, skin: 0xa87050, tunic: 0x7a6a4a, trim: 0x4a3a28, hair: 0x18120c, shoe: 0x4a321c, skirt: 0.3, sleeve: 0.3, gear: 'runner' },
  captive: { hairStyle: 'Buzzed', beardS: 0.9, skin: 0xa87050, tunic: 0x8a7a5a, trim: 0x5a4a32, hair: 0x18120c, shoe: 0x4a321c, skirt: 0.3, sleeve: 0.5, gear: 'captive' },
  e_phil: { hairStyle: 'Buzzed', beardS: 1.05, skin: 0x9e6a46, tunic: 0x6a2236, trim: 0xd0b060, hair: 0x120d09, metal: 0xa87838, skirt: 0.42, sleeve: 0.4, cap: 0x2e2622, gear: 'phil' },
  e_archer: { hairStyle: 'Buzzed', beardS: 0.95, skin: 0xa06c48, tunic: 0x22505a, trim: 0xe0c070, hair: 0x120d09, metal: 0xa87838, skirt: 0.36, sleeve: 0.45, cap: 0x4a2e3a, gear: 'archer' },
  e_shield: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0x966240, tunic: 0x3a2a1a, trim: 0xd0a050, hair: 0x100b08, cloak: 0x2a1a30, metal: 0xb08a4a, skirt: 0.5, sleeve: 0.3, armor: true, greaves: true, gear: 'shield' },
  e_captain: { hairStyle: 'Buzzed', beardS: 1.25, skin: 0x9a6644, tunic: 0x4a1a2a, trim: 0xe0c070, hair: 0x0f0a07, cloak: 0x2a0a18, metal: 0xc0904a, skirt: 0.45, sleeve: 0.3, armor: true, greaves: true, cap: 0x8a6a2a, gear: 'captain' },
  ched: { hairStyle: 'Buzzed', beardS: 1.6, skin: 0x8e5e3e, tunic: 0x3a1a4a, trim: 0xe0b850, hair: 0x0e0a07, cloak: 0x5a1430, metal: 0xc8a050, skirt: 0.36, sleeve: 0.4, armor: true, greaves: true, gear: 'ched' },
  melch: { hairStyle: 'Long', beardS: 1.5, skin: 0xa87050, tunic: 0xf0e6d0, trim: 0xd8b050, hair: 0x1a1612, beardC: 0x3a3632, shoe: 0x6a4a2a, skirt: 0.05, sleeve: 0.85, gear: 'melch' },
  // Level 1 story: King Saul, Saul's soldiers (Israelite armour: blue and undyed wool, leather caps, round leather shields), the women who sang (1 Sam 18:6–7)
  saul: { hairStyle: 'Long', beardS: 1.35, skin: 0xae7652, tunic: 0x22407a, trim: 0xe0b850, hair: 0x15100b, cloak: 0x6a1428, metal: 0xc49448, shoe: 0x4a321c, skirt: 0.36, sleeve: 0.4, armor: true, greaves: true, gear: 'saul' },
  isr: { hairStyle: 'Buzzed', beardS: 1.0, skin: 0xae7650, tunic: 0x2a4a80, trim: 0xe8dcc0, hair: 0x15100b, metal: 0x9a7a4a, skirt: 0.48, sleeve: 0.3, cap: 0x6a4a2a, gear: 'isr' },
  isr2: { hairStyle: 'Buzzed', beardS: 1.15, skin: 0xa26c48, tunic: 0xd8cbb0, trim: 0x2a4a80, hair: 0x120d09, metal: 0x9a7a4a, skirt: 0.48, sleeve: 0.3, cap: 0x2a3a5a, gear: 'isr' },
  // Benaiah (2 Sam 23:20–23): black hair and beard, bronze over a red tunic; the soldiers of Moab (ochre and black); the two lionlike men (tawny skins, wild hair); the Egyptian (linen, a striped headcloth)
  benaiah: { hairStyle: 'SimpleParted', beardS: 1.3, skin: 0xa26a44, tunic: 0x7a2418, trim: 0xd6a650, hair: 0x110b07, beardC: 0x140e09, cloak: 0x3a2a1c, metal: 0xb88a48, shoe: 0x4a321c, skirt: 0.46, sleeve: 0.3, gear: 'benaiah' },
  m_phil: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0xa06a44, tunic: 0x9a6a22, trim: 0x2a2018, hair: 0x120d09, metal: 0x9a7a4a, skirt: 0.46, sleeve: 0.36, cap: 0x3a2a1a, gear: 'phil' },
  m_archer: { hairStyle: 'Buzzed', beardS: 1.0, skin: 0xa26c46, tunic: 0x5a4a22, trim: 0xc0a060, hair: 0x120d09, metal: 0x9a7a4a, skirt: 0.4, sleeve: 0.4, cap: 0x6a3a1a, gear: 'archer' },
  m_captain: { hairStyle: 'Buzzed', beardS: 1.3, skin: 0x9a6442, tunic: 0x6a3a12, trim: 0xe0b860, hair: 0x0f0a07, cloak: 0x2a1a0e, metal: 0xb08a4a, skirt: 0.45, sleeve: 0.3, armor: true, greaves: true, cap: 0x5a3a1a, gear: 'captain' },
  m_shield: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0x966240, tunic: 0x4a3a1a, trim: 0xc8a050, hair: 0x100b08, cloak: 0x3a2a12, metal: 0xb08a4a, skirt: 0.5, sleeve: 0.3, armor: true, greaves: true, gear: 'shield' },
  lionman: { hairStyle: 'Long', beardS: 1.9, skin: 0x8e5a38, tunic: 0x5a3414, trim: 0xc89a48, hair: 0x2a1a0c, beardC: 0x2e1c0e, cloak: 0xb27a34, cap: 0x9a6a2e, metal: 0xa88040, skirt: 0.5, sleeve: 0.2, armor: true, greaves: true, gear: 'captain' },
  egypt: { hairStyle: 'Buzzed', skin: 0x6a3f26, tunic: 0xece4cf, trim: 0xd8b050, hair: 0x0c0806, shoe: 0x6a4a2a, skirt: 0.5, sleeve: 0.08, gear: 'egypt' },
  // Deborah and Barak (Judges 4–5): Barak in bronze over Israel's blue; Deborah; Jael; Sisera and the host of Canaan (dark blue and red, iron); Barak's men
  // David the mighty man (2 Sam 23): grown, black hair and a full black beard, crimson and a blue cloak; his three mighty men
  davidking: { hairStyle: 'SimpleParted', beardS: 1.4, skin: 0xb98058, tunic: 0x7a1e28, trim: 0xd8b050, hair: 0x0e0906, beardC: 0x100a07, cloak: 0x24366a, metal: 0xc09450, shoe: 0x4a321c, skirt: 0.46, sleeve: 0.3, gear: 'barak' },
  adino: { hairStyle: 'Buzzed', beardS: 1.5, skin: 0x9e6644, tunic: 0x5a4a2a, trim: 0xc8a050, hair: 0x120c08, beardC: 0x150f0a, metal: 0x9a7a4a, cap: 0x4a3a22, skirt: 0.46, sleeve: 0.3, gear: 'isr' },
  eleazar: { hairStyle: 'SimpleParted', beardS: 1.3, skin: 0xa86e48, tunic: 0x2a5a4a, trim: 0xd8c08a, hair: 0x140e09, beardC: 0x1a120c, cloak: 0x4a2a1a, metal: 0xb08a4a, shoe: 0x4a321c, skirt: 0.46, sleeve: 0.3, gear: 'barak' },
  shammah: { hairStyle: 'Long', beardS: 1.6, skin: 0x9a6442, tunic: 0x6a4a1a, trim: 0xd0b060, hair: 0x18110b, beardC: 0x1c140d, cloak: 0x2a4a2a, metal: 0xa88040, shoe: 0x4a321c, skirt: 0.46, sleeve: 0.3, gear: 'barak' },
  barak: { hairStyle: 'SimpleParted', beardS: 1.25, skin: 0xa66c46, tunic: 0x2a4a80, trim: 0xe0c070, hair: 0x120c08, beardC: 0x140e09, cloak: 0x6a1a1a, metal: 0xb48a48, shoe: 0x4a321c, skirt: 0.46, sleeve: 0.3, gear: 'barak' },
  deborah: { hairStyle: 'Long', skin: 0xa8704c, tunic: 0x5a2a5a, trim: 0xe0c070, hair: 0x110b07, veil: 0xe8dcc4, shoe: 0x5a3a1e, skirt: 0.04, sleeve: 0.85, gear: 'woman' },
  jael: { hairStyle: 'Long', skin: 0xa06a46, tunic: 0x6a4a2a, trim: 0xc8a060, hair: 0x100a06, veil: 0x3a2a1e, shoe: 0x5a3a1e, skirt: 0.04, sleeve: 0.85, gear: 'woman' },
  canaan: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0xa06a44, tunic: 0x1e2a4a, trim: 0xc03a2a, hair: 0x100b08, metal: 0x8a8e94, skirt: 0.44, sleeve: 0.36, cap: 0x2a2a30, gear: 'phil' },
  k_phil: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0xa06a44, tunic: 0x1e2a4a, trim: 0xc03a2a, hair: 0x100b08, metal: 0x8a8e94, skirt: 0.44, sleeve: 0.36, cap: 0x2a2a30, gear: 'phil' },
  k_archer: { hairStyle: 'Buzzed', beardS: 1.0, skin: 0xa26c46, tunic: 0x3a1a1a, trim: 0xc8a060, hair: 0x120d09, metal: 0x8a8e94, skirt: 0.4, sleeve: 0.4, cap: 0x1e2a4a, gear: 'archer' },
  k_captain: { hairStyle: 'Buzzed', beardS: 1.3, skin: 0x9a6442, tunic: 0x1a1a3a, trim: 0xd04030, hair: 0x0f0a07, cloak: 0x6a1414, metal: 0x9a9ea6, skirt: 0.45, sleeve: 0.3, armor: true, greaves: true, cap: 0x2a2a34, gear: 'captain' },
  k_shield: { hairStyle: 'Buzzed', beardS: 1.1, skin: 0x966240, tunic: 0x2a2a3a, trim: 0xc8a050, hair: 0x100b08, cloak: 0x3a1418, metal: 0x9a9ea6, skirt: 0.5, sleeve: 0.3, armor: true, greaves: true, gear: 'shield' },
  sisera: { hairStyle: 'Long', beardS: 1.5, skin: 0x9a6442, tunic: 0x1a1a3a, trim: 0xd8b050, hair: 0x0e0a07, cloak: 0x8a1a1a, metal: 0xa0a4aa, skirt: 0.4, sleeve: 0.3, armor: true, greaves: true, cap: 0x3a3a44, gear: 'captain' },
  isr_ally: { hairStyle: 'Buzzed', beardS: 1.0, skin: 0xae7650, tunic: 0x2a4a80, trim: 0xe8dcc0, hair: 0x15100b, metal: 0x9a7a4a, skirt: 0.48, sleeve: 0.3, cap: 0x6a4a2a, gear: 'isr' },
  woman: { hairStyle: 'Long', skin: 0xb27a54, tunic: 0xb0342a, trim: 0xe8c060, hair: 0x120c08, veil: 0xe8dcc4, shoe: 0x5a3a1e, skirt: 0.04, sleeve: 0.85, gear: 'woman' },
  woman2: { hairStyle: 'Long', skin: 0xa86e4a, tunic: 0x2a5a8a, trim: 0xf0e0b0, hair: 0x140d08, veil: 0xd8b860, shoe: 0x5a3a1e, skirt: 0.04, sleeve: 0.85, gear: 'woman' },
  woman3: { hairStyle: 'Long', skin: 0xba825a, tunic: 0xd8a040, trim: 0x7a2a20, hair: 0x100a06, veil: 0x8a2a40, shoe: 0x5a3a1e, skirt: 0.04, sleeve: 0.85, gear: 'woman' },
  angel: { hairStyle: 'SimpleParted', skin: 0xfff4e0, tunic: 0xfffaf0, trim: 0xffe39a, hair: 0xfff0c0, curls: 18, eye: 0x6a5a3a, shoe: 0xfff4e0, skirt: 0.04, sleeve: 0.9, glow: 0.9 },
};

// ------------------------------------------------------------------ weapon / gear meshes
const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0xc08a45, roughness: 0.35, metalness: 0.9 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x8a8a8f, roughness: 0.35, metalness: 0.9 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x6a4226, roughness: 0.95 }),
  reed: new THREE.MeshStandardMaterial({ color: 0xc79a6a, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xe0dace, roughness: 0.6 }),
  bow: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.7 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.55 }),
  rope: new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x140c06, roughness: 0.75 }),
  wing: new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
};
function G_staff(len = 1.75) { return new THREE.CylinderGeometry(0.022, 0.03, len, 6).rotateX(Math.PI / 2).translate(0, 0, len * 0.22); }
function G_spear(len = 2.3, r = 0.025, head = 0.28) {
  const sh = new THREE.CylinderGeometry(r, r * 1.2, len, 6).rotateX(Math.PI / 2).translate(0, 0, len * 0.3).toNonIndexed();
  const hd = new THREE.ConeGeometry(r * 3, head, 6).rotateX(Math.PI / 2).translate(0, 0, len * 0.8 + head / 2).toNonIndexed();
  return [sh, hd];
}
function G_crown() {
  const parts = [new THREE.CylinderGeometry(0.118, 0.112, 0.055, 12, 1, true).toNonIndexed()];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2; const f = new THREE.BoxGeometry(0.022, 0.17, 0.006).translate(0, 0.085, 0);
    f.rotateX(-0.22); f.rotateY(-a + Math.PI / 2); f.translate(Math.cos(a) * 0.112, 0.02, Math.sin(a) * 0.112); parts.push(f.toNonIndexed());
  }
  return mergeGeometries(parts);
}
let RN0 = 9; const rnd0 = () => ((RN0 = (RN0 * 16807) % 2147483647) / 2147483647);
function G_cap() {
  // a rounded felt cap with a band (eastern soldiers)
  return merged([new THREE.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.98, 1.18, 1.1).translate(0, 1.742, -0.014), new THREE.TorusGeometry(0.118, 0.012, 4, 18).rotateX(Math.PI / 2).scale(0.98, 1, 1.1).translate(0, 1.752, -0.014)]);
}
function G_helmet() {
  const dome = new THREE.SphereGeometry(0.135, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.55).toNonIndexed();
  const crest = new THREE.BoxGeometry(0.03, 0.09, 0.26).translate(0, 0.15, -0.01).toNonIndexed();
  const cheekL = new THREE.BoxGeometry(0.02, 0.1, 0.07).translate(0.12, -0.05, 0.04).toNonIndexed();
  const cheekR = cheekL.clone().translate(-0.24, 0, 0);
  return mergeGeometries([dome, crest, cheekL, cheekR]);
}
function G_shield(r = 0.34) { return mergeGeometries([new THREE.CylinderGeometry(r, r, 0.035, 16).toNonIndexed(), new THREE.SphereGeometry(r * 0.22, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.017, 0).toNonIndexed()]); }
function G_jaw() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.2, -0.07, 0.46, 0.0); s.lineTo(0.5, 0.06); s.lineTo(0.47, 0.1);
  for (let i = 0; i < 6; i++) { const x = 0.44 - i * 0.055; s.lineTo(x, 0.085 + (i % 2) * 0.02); s.lineTo(x - 0.03, 0.06); }
  s.quadraticCurveTo(0.1, 0.05, 0.06, 0.16); s.lineTo(0.0, 0.18); s.lineTo(-0.04, 0.08); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false, curveSegments: 4 }); g.translate(0.02, -0.06, -0.0175); g.rotateY(-Math.PI / 2); return g;
}
function G_bow() {
  const arc = new THREE.TorusGeometry(0.5, 0.026, 5, 16, Math.PI * 0.9).rotateZ(Math.PI * 1.05).rotateX(-Math.PI / 2).translate(0, 0, -0.5).toNonIndexed();
  const str = new THREE.CylinderGeometry(0.005, 0.005, 0.98, 3).rotateZ(Math.PI / 2).translate(0, 0, -0.42).toNonIndexed();
  return mergeGeometries([arc, str]);
}
function G_sword() { return mergeGeometries([new THREE.BoxGeometry(0.05, 0.012, 0.62).translate(0, 0, 0.38).toNonIndexed(), new THREE.BoxGeometry(0.2, 0.03, 0.03).translate(0, 0, 0.07).toNonIndexed()]); }
function G_wing(side) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.3, 0.35, 0.9, 0.75, 1.25, 0.95); s.bezierCurveTo(1.05, 0.55, 1.0, 0.3, 0.85, -0.05);
  s.lineTo(0.75, -0.25); s.lineTo(0.6, -0.12); s.lineTo(0.48, -0.4); s.lineTo(0.35, -0.2); s.lineTo(0.2, -0.45); s.lineTo(0.05, -0.12); s.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(s, 6); g.scale(side, 1, 1); g.rotateY(side * 0.5); return g;
}

// ------------------------------------------------------------------ character factory
let BASE = null, CLIPS = {};
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
// the Universal Base Characters rig uses UE-style bone names; the gear code was written against the old Rigify names
const BONE_ALIAS = { 'DEF-head': 'Head', 'DEF-handR': 'hand_r', 'DEF-handL': 'hand_l', 'DEF-hips': 'pelvis', 'DEF-spine003': 'spine_03', 'DEF-forearmL': 'lowerarm_l', 'DEF-forearmR': 'lowerarm_r', 'DEF-upper_armL': 'upperarm_l', 'DEF-upper_armR': 'upperarm_r' };
let BODY_MAT = null, HAIR_MAT = {}; const SKIN_REF_INV = (() => { const c = new THREE.Color(0xa97250); return new THREE.Color(1 / c.r, 1 / c.g, 1 / c.b); })();
function findBone(root, name) { const n = BONE_ALIAS[name] || name; let b = null; root.traverse(o => { if (o.name === n && (o.isBone || !b)) b = o; }); return b; }
const HMC = {};
function hairMat(src, hex, glow) { const k = src.uuid + hex + (glow ? 'g' : ''); if (!HMC[k]) { const m = src.clone(); const c = new THREE.Color(hex); m.color.setRGB(Math.min(1.15, c.r / 0.26), Math.min(1.15, c.g / 0.26), Math.min(1.15, c.b / 0.26)); m.roughness = 0.62; m.side = THREE.DoubleSide; if (glow) { m.emissive = new THREE.Color(0x6a5a30); }
    // a soft sheen on the rim, so black hair reads as hair and not as a hole
    m.onBeforeCompile = (sh) => { sh.uniforms.uRimC = RIM; sh.fragmentShader = 'uniform vec3 uRimC;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uRimC * 0.8 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.5);'); }; m.customProgramCacheKey = () => 'hair-rim';
    HMC[k] = m; } return HMC[k]; }
function attach(root, boneName, geo, mat, worldPos, opts = {}) {
  const bone = findBone(root, boneName); const m = new THREE.Mesh(geo, mat); m.castShadow = !!opts.shadow;
  m.position.copy(worldPos); if (opts.rot) m.rotation.copy(opts.rot); root.add(m); root.updateMatrixWorld(true); bone.attach(m); return m;
}

// ------------------------------------------------------------------ faces, hair and armour built as geometry on the head and body bones
const MCACHE = {};
function smat(color, rough = 0.7, metal = 0, extra = {}) { const k = color + '|' + rough + '|' + metal + '|' + (extra.key || ''); if (!MCACHE[k]) { const o = Object.assign({ color, roughness: rough, metalness: metal }, extra); delete o.key; MCACHE[k] = new THREE.MeshStandardMaterial(o); } return MCACHE[k]; }
const NI = (g) => (g.index ? g.toNonIndexed() : g);
function merged(list) { const g = mergeGeometries(list.map(NI)); g.computeVertexNormals(); return g; }
const ell = (r, sx, sy, sz, x, y, z, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz).translate(x, y, z);
function hairCap(c, curls, rnd) {
  // a skull cap that leaves the forehead clear, plus optional curls
  const cap = new THREE.SphereGeometry(0.1, 18, 12, 0, Math.PI * 2, 0, 1.75).scale(0.93, 0.95, 1.08).rotateX(-0.42).translate(0, 1.708, -0.012);
  const parts = [cap];
  if (curls) for (let i = 0; i < curls; i++) { const a = rnd() * Math.PI * 2, e = 0.1 + rnd() * 1.15; const d = new THREE.Vector3(Math.sin(a) * Math.sin(e), Math.cos(e), Math.cos(a) * Math.sin(e)); if (d.z > 0.55 && d.y < 0.75) continue; parts.push(new THREE.IcosahedronGeometry(0.024 + rnd() * 0.012, 0).translate(d.x * 0.094, 1.71 + d.y * 0.095, -0.012 + d.z * 0.1)); }
  return merged(parts);
}
function beardGeo(len = 1, full = true) {
  const parts = [new THREE.SphereGeometry(0.088, 14, 8, Math.PI / 2 - 1.35, 2.7, Math.PI * 0.52, Math.PI * 0.36).scale(1, 1.15 + len * 0.25, 1.08).translate(0, 1.668, 0.012)];
  parts.push(new THREE.CapsuleGeometry(0.0075, 0.032, 2, 6).rotateZ(Math.PI / 2).translate(0, 1.618, 0.112)); // moustache
  if (full && len > 1) parts.push(new THREE.ConeGeometry(0.05, 0.1 * len, 7).rotateX(Math.PI).translate(0, 1.54 - 0.03 * len, 0.07));
  return merged(parts);
}
function tint(g, hex) { g = NI(g); const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; }
function faceKit(root, kind, L, rnd) {
  // one vertex-coloured mesh per head (one draw call): eyes, lids, brow ridge, nose, cheekbones, chin, ears, lips, brows, hair, beard
  const big = kind === 'goliath', y = 1.688, ex = 0.034;
  const skinC = new THREE.Color(L.skin).multiplyScalar(0.97).getHex(), lipC = new THREE.Color(L.skin).lerp(new THREE.Color(0x7a2a20), 0.42).getHex();
  const P = [];
  for (const s of [-1, 1]) {
    P.push(tint(ell(0.0165, 1.15, 0.8, 0.7, s * ex, y, 0.093), 0xf0e8da));
    P.push(tint(ell(0.0088, 1, 1, 0.45, s * ex, y, 0.1048, 8, 6), L.eye || 0x2e1a0e));
    P.push(tint(ell(0.0042, 1, 1, 0.4, s * ex, y, 0.1085, 6, 4), 0x050302));
    P.push(tint(new THREE.SphereGeometry(0.0185, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1.15, 0.75, 0.75).rotateX(0.25).translate(s * ex, y + 0.002, 0.094), skinC));
    P.push(tint(ell(0.022, 1.2, 0.7, 0.6, s * 0.052, 1.652, 0.088), skinC));
    P.push(tint(ell(0.026, 0.35, 1, 0.72, s * 0.087, 1.672, 0.0), skinC));
    P.push(tint(new THREE.BoxGeometry(0.036, big ? 0.011 : 0.0075, 0.012).rotateZ(s * (big ? -0.22 : -0.1)).translate(s * 0.036, 1.716, 0.113), L.hair));
  }
  P.push(tint(ell(0.06, 1.05, big ? 0.32 : 0.22, big ? 0.5 : 0.38, 0, 1.712, 0.093), skinC));
  P.push(tint(new THREE.CylinderGeometry(0.006, 0.017, 0.058, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.9).rotateX(-0.42).translate(0, 1.66, 0.112), skinC));
  P.push(tint(ell(0.0125, 1.25, 0.85, 0.9, 0, 1.634, 0.122, 8, 6), skinC));
  P.push(tint(ell(0.03, 1.1, 0.75, 0.75, 0, 1.566, 0.085), skinC));
  P.push(tint(new THREE.CapsuleGeometry(0.0062, 0.026, 2, 6).rotateZ(Math.PI / 2).translate(0, 1.603, 0.109), lipC));
  P.push(tint(new THREE.CapsuleGeometry(0.0072, 0.022, 2, 6).rotateZ(Math.PI / 2).translate(0, 1.593, 0.106), lipC));
  if (L.age) {
    // an older face: forehead lines, heavier lids and bags under the eyes, folds from nose to mouth, crow's feet, grey at the temples
    const lineC = new THREE.Color(L.skin).multiplyScalar(0.62).getHex(), bagC = new THREE.Color(L.skin).multiplyScalar(0.8).getHex();
    for (const [yy, zz, w] of [[1.737, 0.1035, 0.056], [1.75, 0.1005, 0.06], [1.763, 0.0965, 0.05]]) P.push(tint(new THREE.BoxGeometry(w, 0.0024, 0.008).translate(0, yy, zz), lineC));
    for (const s of [-1, 1]) {
      P.push(tint(ell(0.0155, 1.35, 0.55, 0.55, s * ex, 1.6735, 0.0975), bagC));
      P.push(tint(new THREE.SphereGeometry(0.0195, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4).scale(1.18, 0.9, 0.78).rotateX(0.32).translate(s * ex, y + 0.004, 0.0935), bagC));
      P.push(tint(new THREE.CapsuleGeometry(0.0022, 0.034, 2, 4).rotateZ(s * 0.42).translate(s * 0.027, 1.618, 0.1065), lineC));
      for (const k of [-1, 0, 1]) P.push(tint(new THREE.BoxGeometry(0.016, 0.0018, 0.006).rotateZ(k * 0.35 * s).translate(s * 0.064, 1.69 + k * 0.006, 0.084), lineC));
      P.push(tint(ell(0.03, 0.4, 1.2, 0.9, s * 0.092, 1.705, 0.02), L.grey || 0x77726c));
    }
  }
  if (kind !== 'goliath' && kind !== 'shield') P.push(tint(hairCap(L.hair, L.curls || 0, rnd), L.hair));
  if (L.beardLen) P.push(tint(beardGeo(L.beardLen, true), L.hair));
  const g = mergeGeometries(P); g.computeVertexNormals();
  const m = smat(0xffffff, 0.62, 0, { vertexColors: true, key: 'vc' + (kind === 'angel' ? 'a' : ''), emissive: kind === 'angel' ? 0x6a5a40 : 0x000000 });
  attach(root, 'DEF-head', g, m, new THREE.Vector3(), { shadow: true });
}
function armourKit(root, kind, L, rnd) {
  const bronze = MAT.bronze, leather = MAT.leather;
  const metal = smat(L.metal || 0xb4823e, 0.32, 0.85, { key: 'arm' });
  const heavy = kind === 'goliath' || kind === 'captain' || kind === 'shield' || kind === 'ched' || kind === 'saul' || kind === 'benaiah' || kind === 'barak';
  if (kind === 'phil' || kind === 'archer' || kind === 'servant' || kind === 'isr' || heavy) {
    // banded corslet over the tunic (Philistine warriors of the Medinet Habu reliefs wear horizontal bands)
    const bands = []; for (let i = 0; i < 5; i++) bands.push(new THREE.CylinderGeometry(0.168 - i * 0.004, 0.172 - i * 0.004, 0.06, 16, 1, true).scale(1, 1, 0.88).translate(0, 1.04 + i * 0.075, -0.012));
    attach(root, 'DEF-spine003', merged(bands), heavy ? metal : leather, new THREE.Vector3(), { shadow: true });
    // shoulder guards
    attach(root, 'DEF-upper_armL', new THREE.SphereGeometry(0.085, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1.1, 0.7, 1.05).rotateZ(-0.35).translate(0.215, 1.47, -0.03), heavy ? metal : leather, new THREE.Vector3(), { shadow: true });
    attach(root, 'DEF-upper_armR', new THREE.SphereGeometry(0.085, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1.1, 0.7, 1.05).rotateZ(0.35).translate(-0.215, 1.47, -0.03), heavy ? metal : leather, new THREE.Vector3(), { shadow: true });
  }
  if (heavy) {
    // bronze breastplate with a raised boss, and a cloak hanging from the shoulders
    attach(root, 'DEF-spine003', merged([new THREE.CylinderGeometry(0.178, 0.17, 0.3, 16, 1, true, -1.15, 2.3).scale(1, 1, 0.92).translate(0, 1.29, -0.004), ell(0.04, 1, 1, 0.4, 0, 1.3, 0.155)]), metal, new THREE.Vector3(), { shadow: true });
    const cloakC = L.cloak || 0x5a1a14;
    const cl = new THREE.CylinderGeometry(0.2, 0.34, kind === 'goliath' || kind === 'ched' || kind === 'saul' ? 0.95 : 0.8, 12, 3, true, Math.PI - 1.35, 2.7);
    const p = cl.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setZ(i, p.getZ(i) - 0.03 - (0.4 - yy) * 0.06); p.setX(i, p.getX(i) * (1 + Math.sin(i * 1.7) * 0.03)); }
    cl.translate(0, 1.45 - (kind === 'goliath' || kind === 'ched' || kind === 'saul' ? 0.475 : 0.4), 0);
    attach(root, 'DEF-spine003', cl, smat(cloakC, 0.95, 0, { side: THREE.DoubleSide, key: 'cloak' }), new THREE.Vector3(), { shadow: true });
    // bracers
    attach(root, 'DEF-forearmL', new THREE.CylinderGeometry(0.042, 0.04, 0.12, 10, 1, true).rotateZ(Math.PI / 2).translate(0.62, 1.45, -0.02), metal, new THREE.Vector3());
    attach(root, 'DEF-forearmR', new THREE.CylinderGeometry(0.042, 0.04, 0.12, 10, 1, true).rotateZ(Math.PI / 2).translate(-0.62, 1.45, -0.02), metal, new THREE.Vector3());
  }
  if (kind === 'goliath') {
    // 1 Sam 17:6: "a target of brass between his shoulders" (a bronze javelin slung across the back)
    attach(root, 'DEF-spine003', merged([new THREE.CylinderGeometry(0.022, 0.022, 1.3, 8).rotateZ(0.85).translate(0, 1.25, -0.2), new THREE.ConeGeometry(0.045, 0.2, 8).rotateZ(0.85).translate(0.54, 1.72, -0.2)]), bronze, new THREE.Vector3(), { shadow: true });
    // horsehair crest on the helmet
    attach(root, 'DEF-head', new THREE.BoxGeometry(0.03, 0.09, 0.26).translate(0, 1.9, -0.03), smat(0x9a1e14, 1), new THREE.Vector3(), { shadow: true });
  }
  if (kind === 'samson') {
    attach(root, 'DEF-forearmL', new THREE.CylinderGeometry(0.044, 0.042, 0.1, 10, 1, true).rotateZ(Math.PI / 2).translate(0.6, 1.45, -0.02), bronze, new THREE.Vector3());
    attach(root, 'DEF-forearmR', new THREE.CylinderGeometry(0.044, 0.042, 0.1, 10, 1, true).rotateZ(Math.PI / 2).translate(-0.6, 1.45, -0.02), bronze, new THREE.Vector3());
  }
  if (kind === 'abram') {
    // a travelling cloak over the shoulders, a quiver on the back, bronze bracers
    const cl = new THREE.CylinderGeometry(0.2, 0.33, 0.9, 12, 3, true, Math.PI - 1.4, 2.8); const p = cl.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setZ(i, p.getZ(i) - 0.03 - (0.45 - yy) * 0.06); }
    cl.translate(0, 1.0, 0); attach(root, 'DEF-spine003', cl, smat(L.cloak, 0.95, 0, { side: THREE.DoubleSide, key: 'cloak' }), new THREE.Vector3(), { shadow: true });
    attach(root, 'DEF-spine003', merged([new THREE.CylinderGeometry(0.04, 0.034, 0.42, 8).rotateZ(-0.35).translate(0.07, 1.2, -0.19), new THREE.CylinderGeometry(0.005, 0.005, 0.14, 3).rotateZ(-0.35).translate(0.15, 1.43, -0.19)]), leather, new THREE.Vector3(), { shadow: true });
    for (const s of ['L', 'R']) attach(root, 'DEF-forearm' + s, new THREE.CylinderGeometry(0.044, 0.042, 0.1, 10, 1, true).rotateZ(Math.PI / 2).translate((s === 'L' ? 1 : -1) * 0.6, 1.45, -0.02), bronze, new THREE.Vector3());
  }
  if (kind === 'ched' || kind === 'saul') {
    // the king of Elam (and King Saul): a tall gold crown and a royal cloak over bronze
    const pts = [new THREE.CylinderGeometry(0.118, 0.112, 0.13, 16, 1, true).translate(0, 1.83, -0.012)];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push(new THREE.ConeGeometry(0.022, 0.09, 4).translate(Math.cos(a) * 0.112, 1.94, Math.sin(a) * 0.112 - 0.012)); }
    attach(root, 'DEF-head', merged(pts), smat(0xe8b848, 0.25, 1.0, { key: 'gold' }), new THREE.Vector3(), { shadow: true });
  }
  if (kind === 'egypt') {
    // the Egyptian: a broad collar of gold and blue, a striped linen headcloth with lappets, gold armlets
    attach(root, 'DEF-spine003', new THREE.CylinderGeometry(0.12, 0.24, 0.1, 18, 1, true).translate(0, 1.5, -0.005), smat(0x2a5aa8, 0.5, 0.3, { side: THREE.DoubleSide, key: 'collar' }), new THREE.Vector3(), { shadow: true });
    attach(root, 'DEF-spine003', new THREE.CylinderGeometry(0.205, 0.25, 0.035, 18, 1, true).translate(0, 1.45, -0.005), smat(0xe8b848, 0.25, 1.0, { side: THREE.DoubleSide, key: 'gold2' }), new THREE.Vector3());
    const cloth = smat(0xf0e8d4, 0.9, 0, { side: THREE.DoubleSide, key: 'nemes' }), band = smat(0x2a5aa8, 0.7, 0, { key: 'nemesb' });
    attach(root, 'DEF-head', merged([new THREE.SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.05, 1.08, 1.12).translate(0, 1.72, -0.02), new THREE.BoxGeometry(0.07, 0.24, 0.02).translate(0.105, 1.6, 0.04), new THREE.BoxGeometry(0.07, 0.24, 0.02).translate(-0.105, 1.6, 0.04), new THREE.CylinderGeometry(0.06, 0.1, 0.22, 8, 1, true).translate(0, 1.6, -0.1)]), cloth, new THREE.Vector3(), { shadow: true });
    attach(root, 'DEF-head', new THREE.TorusGeometry(0.128, 0.01, 4, 18).rotateX(Math.PI / 2).scale(1.05, 1, 1.12).translate(0, 1.745, -0.02), band, new THREE.Vector3());
    for (const s of ['L', 'R']) attach(root, 'DEF-upper_arm' + s, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10, 1, true).rotateZ(Math.PI / 2).translate((s === 'L' ? 1 : -1) * 0.36, 1.45, -0.02), smat(0xe8b848, 0.25, 1.0, { key: 'gold' }), new THREE.Vector3());
  }
  if (kind === 'woman') {
    // a head covering over the long hair
    attach(root, 'DEF-head', new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(1.02, 1.12, 1.12).translate(0, 1.71, -0.03), smat(L.veil || 0xe8dcc4, 0.95, 0, { side: THREE.DoubleSide, key: 'veil' }), new THREE.Vector3(), { shadow: true });
    attach(root, 'DEF-spine003', new THREE.CylinderGeometry(0.15, 0.26, 0.55, 12, 1, true, Math.PI - 1.2, 2.4).translate(0, 1.32, -0.03), smat(L.veil || 0xe8dcc4, 0.95, 0, { side: THREE.DoubleSide, key: 'veil' }), new THREE.Vector3(), { shadow: true });
  }
  if (kind === 'captive') {
    // bound: rope about the arms and body
    for (const y of [1.12, 1.26]) attach(root, 'DEF-spine003', new THREE.TorusGeometry(0.205, 0.018, 4, 18).rotateX(Math.PI / 2).scale(1, 1, 0.85).translate(0, y, -0.01), MAT.rope, new THREE.Vector3());
  }
  if (kind === 'david') {
    // a sheepskin over one shoulder, and the shepherd's bag strap
    attach(root, 'DEF-spine003', new THREE.CylinderGeometry(0.175, 0.18, 0.11, 14, 1, true).rotateZ(0.6).scale(1, 1, 0.9).translate(0, 1.3, -0.01), smat(0xe8dcc4, 1), new THREE.Vector3(), { shadow: true });
  }
}
class Actor {
  constructor(kind, scale = 1, look) {
    this.kind = kind; this.look = look || kind;
    const root = SkeletonUtils.clone(BASE);
    root.updateMatrixWorld(true);
    const L0 = LOOKS[this.look], hairs = {};
    this.mat = paintMat(L0);
    if (L0.stub === undefined && (/woman|deborah|jael|angel|captive/.test(this.look) || kind === 'angel')) this.mat.userData.u.uStub.value = 0; else if (L0.stub === undefined && this.look === 'david') this.mat.userData.u.uStub.value = 0.22;
    kind = L0.gear || kind; // gear and costume follow the look; this.kind drives the AI
    root.traverse(o => {
      if (!o.isMesh) return; o.frustumCulled = false;
      if (o.name === 'SuperHero_Male') { o.material = this.mat; o.castShadow = true; }
      else if (o.name === 'Eyebrows' && (HD & 4)) { o.visible = false; }
      else if (o.name === 'Eyebrows') { o.material = hairMat(o.material, L0.hair, kind === 'angel'); }
      else if (/^HAIR_/.test(o.name)) hairs[o.name.slice(5)] = o;
    });
    // gear, placed in world space at bind (T) pose then parented to bones
    const hR = findBone(root, 'DEF-handR'), hL = findBone(root, 'DEF-handL'), head = findBone(root, 'DEF-head');
    const hRp = hR.getWorldPosition(new THREE.Vector3()), hLp = hL.getWorldPosition(new THREE.Vector3()), hp = head.getWorldPosition(new THREE.Vector3());
    const grip = hRp.clone().add(new THREE.Vector3(Math.sign(hRp.x) * 0.06, -0.01, 0.02));
    this.handR = hR; this.head = head; this.hips = findBone(root, 'DEF-hips');
    // modelled hair and beard (Quaternius Universal Base Characters), tinted per character and carried on the head bone
    for (const [nm, h] of Object.entries(hairs)) {
      const keep = nm === L0.hairStyle || (nm === 'Buzzed' && L0.hairStyle === 'Long') || (nm === 'Beard' && L0.beardS);
      if (!keep || (HD & 2 && nm === 'Long') || (HD & 8 && nm === 'Buzzed')) { h.parent.remove(h); continue; }
      h.material = hairMat(h.material, nm === 'Beard' && L0.beardC ? L0.beardC : L0.hair, kind === 'angel'); h.castShadow = true;
      if (nm === 'Beard' && L0.beardS !== 1) { const s = L0.beardS; h.scale.y *= s; h.scale.z *= 1 + (s - 1) * 0.35; h.position.y -= 0.07 * (s - 1); h.position.z += 0.012 * (s - 1); }
      head.attach(h);
    }
    if (kind === 'david' || kind === 'benaiah') {
      this.weapon = attach(root, 'DEF-handR', G_staff(1.7), MAT.wood, grip, { shadow: true });
      attach(root, 'DEF-hips', new THREE.SphereGeometry(0.075, 8, 6).scale(1, 1.2, 0.7), MAT.leather, new THREE.Vector3(0.17, 0.9, 0.05));
      this.stoneInHand = attach(root, 'DEF-handL', new THREE.SphereGeometry(0.035, 6, 4), MAT.stone, hLp.clone().add(new THREE.Vector3(0.05, -0.03, 0.03)));
    } else if (kind === 'phil' || kind === 'captain') {
      this.weapon = attach(root, 'DEF-handR', mergeGeometries(G_spear(kind === 'captain' ? 1.3 : 2.2, 0.022, kind === 'captain' ? 0.6 : 0.26)), kind === 'captain' ? MAT.iron : MAT.wood, grip, { shadow: true });
      if (L0.cap) attach(root, 'DEF-head', G_cap(), smat(L0.cap, 0.9, 0, { key: 'cap' }), new THREE.Vector3(), { shadow: true }); else attach(root, 'DEF-head', G_crown(), MAT.reed, new THREE.Vector3(0, 1.765, -0.01));
      attach(root, 'DEF-handL', G_shield(0.3), MAT.bronze, hLp.clone().add(new THREE.Vector3(-0.12 * Math.sign(hLp.x), 0.07, 0)), { shadow: true });
    } else if (kind === 'egypt') {
      // "a spear like a weaver's beam" (1 Chr 11:23)
      this.weapon = attach(root, 'DEF-handR', mergeGeometries(G_spear(3.2, 0.055, 0.5)), MAT.wood, grip, { shadow: true });
    } else if (kind === 'goliath') {
      this.weapon = attach(root, 'DEF-handR', mergeGeometries(G_spear(2.6, 0.045, 0.42)), MAT.iron, grip, { shadow: true });
      attach(root, 'DEF-head', G_helmet(), MAT.bronze, new THREE.Vector3(0, 1.7, -0.005));
      attach(root, 'DEF-handL', G_shield(0.36), MAT.bronze, hLp.clone().add(new THREE.Vector3(-0.15 * Math.sign(hLp.x), 0.07, 0)), { shadow: true });
} else if (kind === 'samson') {
      this.weapon = attach(root, 'DEF-handR', G_jaw(), MAT.bone, grip, { shadow: true }); this.weapon.visible = false;
      // the seven locks of his head (Judges 16:13)
      this.locks = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 2.5, len = 0.4 + (i % 2) * 0.08 + (3 - Math.abs(i - 3)) * 0.03;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.012, len, 5).translate(0, -len / 2, 0), MAT.hair); m.castShadow = true;
        m.position.set(Math.sin(a) * 0.1, 1.72, -Math.cos(a) * 0.085); m.rotation.set(0.32 * Math.cos(a), 0, 0.4 * Math.sin(a));
        root.add(m); root.updateMatrixWorld(true); head.attach(m); this.locks.push({ m, rx: m.rotation.x, rz: m.rotation.z, ph: i * 1.3 }); if (HD & 1) m.visible = false;
      }
      // the two new cords (Judges 15:13)
      this.cords = [1.12, 1.27, 1.42].map(y => attach(root, 'DEF-spine003', new THREE.TorusGeometry(0.31, 0.024, 4, 18).rotateX(Math.PI / 2), MAT.rope, new THREE.Vector3(0, y, 0.0)));
      this.cords.forEach(c => c.visible = false);
      this.armBones = ['DEF-upper_armL', 'DEF-upper_armR', 'DEF-forearmL', 'DEF-forearmR'].map(n => { const b = findBone(root, n); return b ? [b, b.quaternion.clone()] : null; }).filter(Boolean);
      this.poseW = 0; this.poseT = 0;
    } else if (kind === 'archer') {
      this.weapon = attach(root, 'DEF-handL', G_bow(), MAT.bow, hLp.clone().add(new THREE.Vector3(-0.04 * Math.sign(hLp.x), 0, 0.02)), { shadow: true });
      if (L0.cap) attach(root, 'DEF-head', G_cap(), smat(L0.cap, 0.9, 0, { key: 'cap' }), new THREE.Vector3(), { shadow: true }); else attach(root, 'DEF-head', G_crown(), MAT.reed, new THREE.Vector3(0, 1.765, -0.01));
    } else if (kind === 'shield') {
      this.weapon = attach(root, 'DEF-handR', G_sword(), MAT.iron, grip, { shadow: true });
      attach(root, 'DEF-head', G_helmet(), MAT.bronze, new THREE.Vector3(0, 1.7, -0.005));
      this.shieldMesh = attach(root, 'DEF-spine003', mergeGeometries([new THREE.BoxGeometry(0.62, 0.98, 0.05).toNonIndexed(), new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0.05, 0.02).toNonIndexed()]).rotateY(0.3), MAT.bronze, new THREE.Vector3(Math.sign(hLp.x) * 0.2, 1.08, 0.3), { shadow: true }); // tower shield carried before the body
    } else if (kind === 'abram' || kind === 'barak') {
      this.weapon = attach(root, 'DEF-handR', G_sword().scale(1.15, 1.15, 1.25), MAT.iron, grip, { shadow: true });
      // the bow slung across the back
      attach(root, 'DEF-spine003', G_bow().rotateY(Math.PI / 2).rotateZ(0.5).translate(-0.02, 1.32, -0.18), MAT.bow, new THREE.Vector3(), { shadow: true });
    } else if (kind === 'servant') {
      this.weapon = attach(root, 'DEF-handR', rnd0() < 0.5 ? G_sword() : mergeGeometries(G_spear(1.9, 0.02, 0.24)), rnd0() < 0.5 ? MAT.iron : MAT.wood, grip, { shadow: true });
      // a torch in the other hand (the night attack)
      const tp = hLp.clone().add(new THREE.Vector3(-0.02 * Math.sign(hLp.x), 0, 0.02));
      attach(root, 'DEF-handL', new THREE.CylinderGeometry(0.022, 0.03, 0.62, 5).rotateX(Math.PI / 2 - 0.75).translate(0, 0.12, 0.18), MAT.wood, tp);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd0a0 }));
      fl.center.set(0.5, 0.1); fl.scale.set(0.24, 0.46, 1); fl.position.copy(tp).add(new THREE.Vector3(0, 0.34, 0.41)); root.add(fl); root.updateMatrixWorld(true); hL.attach(fl); this.flame = fl;
    } else if (kind === 'ched') {
      this.weapon = attach(root, 'DEF-handR', G_sword().scale(1.5, 1.5, 1.7), MAT.iron, grip, { shadow: true });
      attach(root, 'DEF-handL', G_shield(0.34), MAT.bronze, hLp.clone().add(new THREE.Vector3(-0.13 * Math.sign(hLp.x), 0.07, 0)), { shadow: true });
    } else if (kind === 'isr') {
      // Saul's men: spear, leather cap, round leather shield (Israel's colours, not the Philistines' red and bronze)
      this.weapon = attach(root, 'DEF-handR', mergeGeometries(G_spear(2.1, 0.022, 0.26)), MAT.wood, grip, { shadow: true });
      attach(root, 'DEF-head', G_cap(), smat(L0.cap, 0.9, 0, { key: 'cap' }), new THREE.Vector3(), { shadow: true });
      attach(root, 'DEF-handL', G_shield(0.27), MAT.leather, hLp.clone().add(new THREE.Vector3(-0.12 * Math.sign(hLp.x), 0.07, 0)), { shadow: true });
    } else if (kind === 'saul') {
      // the javelin in Saul's hand (1 Sam 18:10)
      this.weapon = attach(root, 'DEF-handR', mergeGeometries(G_spear(2.0, 0.02, 0.3)), MAT.iron, grip, { shadow: true });
    } else if (kind === 'woman') {
      // a tabret (1 Sam 18:6)
      attach(root, 'DEF-handL', merged([new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16, 1, true).rotateZ(Math.PI / 2), new THREE.CircleGeometry(0.128, 16).rotateY(Math.PI / 2).translate(0.02, 0, 0)]), smat(0xc8a070, 0.8, 0, { side: THREE.DoubleSide, key: 'tabret' }), hLp.clone().add(new THREE.Vector3(-0.05 * Math.sign(hLp.x), 0.02, 0.05)));
    } else if (kind === 'melch') {
      // bread and wine (Genesis 14:18)
      this.weapon = attach(root, 'DEF-handR', merged([new THREE.CylinderGeometry(0.045, 0.03, 0.08, 10).translate(0, 0.05, 0.05), new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5).translate(0, 0, 0.05)]), smat(0xd8b050, 0.3, 1, { key: 'gold' }), grip);
      attach(root, 'DEF-handL', new THREE.SphereGeometry(0.09, 10, 6).scale(1, 0.55, 1), smat(0xc8955a, 0.9), hLp.clone().add(new THREE.Vector3(0, 0.03, 0.05)));
    } else if (kind === 'moses') {
      const g = mergeGeometries([new THREE.CylinderGeometry(0.025, 0.03, 2.0, 6).rotateX(Math.PI / 2).translate(0, 0, 0.25).toNonIndexed(), new THREE.TorusGeometry(0.08, 0.02, 4, 8, Math.PI).rotateY(Math.PI / 2).translate(0, 0.08, 1.25).toNonIndexed()]);
      this.weapon = attach(root, 'DEF-handR', g, MAT.wood, grip);
    } else if (kind === 'angel') {
      const sp = findBone(root, 'DEF-spine003'); const sp0 = sp.getWorldPosition(new THREE.Vector3());
      attach(root, 'DEF-spine003', G_wing(1), MAT.wing, sp0.clone().add(new THREE.Vector3(0.05, 0.05, -0.12)));
      attach(root, 'DEF-spine003', G_wing(-1), MAT.wing, sp0.clone().add(new THREE.Vector3(-0.05, 0.05, -0.12)));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 4, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
      halo.rotation.x = Math.PI / 2; halo.position.set(0, 1.95, -0.02); root.add(halo); root.updateMatrixWorld(true); head.attach(halo);
    }
    // cloth skirt / robe (gives each character a costume silhouette) and beards
    const L = L0;
    const SK = { samson: [0.17, 0.28, 0.4, 0.98], archer: [0.17, 0.27, 0.44, 0.98], shield: [0.17, 0.28, 0.46, 0.98], david: [0.17, 0.27, 0.42, 0.98], phil: [0.17, 0.27, 0.44, 0.98], captain: [0.17, 0.28, 0.46, 0.98], goliath: [0.18, 0.3, 0.5, 0.98], moses: [0.17, 0.4, 0.9, 1.0], angel: [0.17, 0.42, 0.95, 1.0], abram: [0.17, 0.3, 0.56, 0.98], servant: [0.17, 0.27, 0.42, 0.98], captive: [0.17, 0.3, 0.6, 0.98], runner: [0.17, 0.28, 0.5, 0.98], ched: [0.18, 0.3, 0.56, 0.98], melch: [0.17, 0.42, 0.95, 1.0], saul: [0.18, 0.3, 0.56, 0.98], isr: [0.17, 0.27, 0.44, 0.98], woman: [0.17, 0.4, 0.92, 1.0], benaiah: [0.17, 0.28, 0.46, 0.98], barak: [0.17, 0.28, 0.46, 0.98], egypt: [0.18, 0.28, 0.5, 0.98] }[kind];
    if (SK) {
      const [rt, rb, h, top] = SK; const cm = new THREE.MeshStandardMaterial({ color: L.tunic, roughness: 0.92, side: THREE.DoubleSide, emissive: kind === 'angel' ? 0xfff2d0 : 0x000000, emissiveIntensity: kind === 'angel' ? 0.7 : 0 });
      const robe = kind === 'moses' || kind === 'angel' || kind === 'melch' || kind === 'woman'; const rbx = robe ? rb : rb * 1.24, hx = robe ? h : h * 0.92; // wider, shorter hem: less leg poke-through
      const sg = new THREE.CylinderGeometry(rt, rbx, hx, 14, 2, true).translate(0, top - hx / 2, 0.0);
      if (kind === 'phil' || kind === 'captain' || kind === 'goliath' || kind === 'archer' || kind === 'shield' || kind === 'ched') { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < top - hx + 0.01) p.setY(i, p.getY(i) + Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 7) * 0.035); }
      const sk = attach(root, 'DEF-hips', sg, cm, new THREE.Vector3(0, 0, 0.0), { shadow: true }); this.skirt = sk;
      const belt = attach(root, 'DEF-hips', new THREE.CylinderGeometry(rt + 0.012, rt + 0.014, 0.06, 14, 1, true).translate(0, top - 0.02, 0), new THREE.MeshStandardMaterial({ color: L.trim, roughness: 0.6, side: THREE.DoubleSide }), new THREE.Vector3());
    }
    { let seed = (kind.length * 9301 + (Actor.n = (Actor.n || 0) + 1) * 49297) % 233280; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; armourKit(root, kind, L, rnd); }
    this.obj = new THREE.Group(); this.obj.add(root); root.scale.setScalar(scale); if (kind === 'samson') root.scale.set(scale * 1.1, scale, scale * 1.08); if (kind === 'david') root.scale.set(scale * 0.87, scale, scale * 0.9); if (kind === 'woman') root.scale.set(scale * 0.85, scale, scale * 0.88); if (kind === 'benaiah' || kind === 'barak') root.scale.set(scale * 1.04, scale, scale * 1.03); this.scale = scale; this.root = root;
    scene.add(this.obj);
    { const b = new THREE.Mesh(blobGeo(), blobMat()); b.position.y = 0.035; b.scale.setScalar(scale); b.renderOrder = 2; this.obj.add(b); this.blob = b; }
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = {}; this.cur = null; this.curName = '';
    this.pos = this.obj.position; this.yaw = 0; this.vel = new THREE.Vector3();
    this.state = 'idle'; this.st = 0; this.flash = 0; this.alive = true;
  }
  act(name) {
    let a = this.actions[name];
    if (!a) { const clip = CLIPS[name]; if (!clip) { console.warn('missing clip', name); return null; } a = this.mixer.clipAction(clip); this.actions[name] = a; }
    return a;
  }
  play(name, { fade = 0.18, loop = true, ts = 1, restart = false } = {}) {
    if (this.curName === name && !restart) { if (this.cur) this.cur.timeScale = ts; return this.cur; }
    const a = this.act(name); if (!a) return null;
    a.reset(); a.timeScale = ts; a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.enabled = true;
    if (this.cur && this.cur !== a) { a.crossFadeFrom(this.cur, fade, false); }
    a.play(); this.cur = a; this.curName = name; return a;
  }
  dur(name) { return CLIPS[name] ? CLIPS[name].duration : 1; }
  update(dt) {
    this.mixer.update(dt);
    if (this.armBones) { this.poseW += (this.poseT - this.poseW) * Math.min(1, dt * 7); if (this.poseW > 0.01) for (const [b, q] of this.armBones) b.quaternion.slerp(q, this.poseW); }
    if (this.locks) { const t = now(); for (const L of this.locks) { L.m.rotation.x = L.rx + Math.sin(t * 3.1 + L.ph) * 0.07; L.m.rotation.z = L.rz + Math.sin(t * 2.3 + L.ph) * 0.05; } }
    this.obj.rotation.y = this.yaw;
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 5); }
    this.mat.userData.u.uFlash.value = this.flash;
  }
  headPos(out) { return this.head.getWorldPosition(out).add(tmpV2.set(0, 0.12 * this.scale, 0)); }
  handPos(out) { return this.handR.getWorldPosition(out); }
  remove() { scene.remove(this.obj); }
}

// ------------------------------------------------------------------ effects
const FX = {};
// soft contact shadow under every character: the only shadow on Low, a darker contact patch under the real shadow on Medium/High
let _BG = null, _BM = null;
function blobGeo() { return _BG || (_BG = new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2)); }
function blobMat() {
  if (_BM) return _BM;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.45, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (_BM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: QP[QUALITY].shadow ? 0.38 : 0.7, polygonOffset: true, polygonOffsetFactor: -3, fog: false }));
}
function buildFX() {
  // blood droplets (instanced)
  const N = 140;
  FX.drop = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.045), new THREE.MeshBasicMaterial({ color: 0x7a0c08 }), N);
  FX.drop.frustumCulled = false; FX.drop.count = N; scene.add(FX.drop);
  FX.drops = Array.from({ length: N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }));
  FX.dropI = 0;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < N; i++) FX.drop.setMatrixAt(i, zero);
  // ground splats
  const splatTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = 'rgba(70,4,3,1)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(32 + (Math.random() - 0.5) * 34, 32 + (Math.random() - 0.5) * 34, 2 + Math.random() * 7, 0, 7); x.fill(); } return new THREE.CanvasTexture(c); })();
  FX.splats = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: splatTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 })); m.visible = false; scene.add(m); return { m, life: 0 }; });
  FX.splatI = 0;
  // sparks / flashes
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,220,150,.8)'); g.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  FX.flashTex = flashTex;
  FX.flashes = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; scene.add(s); return { s, life: 0, max: 0.2, size: 1 }; });
  FX.flashI = 0;
  // shockwave ring (Goliath slam telegraph)
  FX.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  FX.ring.visible = false; scene.add(FX.ring);
  FX.ringFill = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0, depthWrite: false }));
  FX.ringFill.visible = false; scene.add(FX.ringFill);
  // light pillar for angel
  FX.pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 60, 16, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
FX.pillar.visible = false; scene.add(FX.pillar);
  // Spirit shockwave ring (Samson)
  FX.sring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  FX.sring.visible = false; scene.add(FX.sring); FX.sringT = 0;
}
function blood(p, dir, n = 14, power = 1) {
  for (let i = 0; i < n; i++) {
    const d = FX.drops[FX.dropI = (FX.dropI + 1) % FX.drops.length];
    d.life = 0.6 + Math.random() * 0.5; d.p.copy(p);
    d.v.set(dir.x * 2.5 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.8, dir.z * 2.5 + (Math.random() - 0.5) * 3).multiplyScalar(power);
    d.s = i % 4 === 0 ? 1.6 + Math.random() * 1.0 : 0.5 + Math.random() * 1.1;
  }
  if (n > 0) puff(p.clone().addScaledVector(dir, 0.2), 0.55 + power * 0.25, 0.35, new THREE.Vector3(dir.x * 1.5, 0.4, dir.z * 1.5), 0x8a0c08);
  const s = FX.splats[FX.splatI = (FX.splatI + 1) % FX.splats.length];
  const x = p.x + dir.x * 0.8, z = p.z + dir.z * 0.8; s.m.position.set(x, hgt(x, z) + 0.03, z); s.m.scale.setScalar(0.35 + Math.random() * 0.35 * power); s.m.rotation.y = Math.random() * 6; s.m.visible = true; s.life = 10;
}
function flashAt(p, size = 1, max = 0.18, color = 0xffffff) {
  const f = FX.flashes[FX.flashI = (FX.flashI + 1) % FX.flashes.length];
  f.s.position.copy(p); f.s.visible = true; f.life = max; f.max = max; f.size = size; f.s.material.color.set(color);
  if (size >= 0.6) sparks(p, Math.round(5 + size * 5), Math.min(1.6, 0.6 + size * 0.5));
  if (size >= 1.4) G.flashV = Math.max(G.flashV || 0, Math.min(0.12, size * 0.04));
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
// hit sparks: one Points draw for all of them, each spark fading on its own life
function buildSparks() {
  const N = 160, g = new THREE.BufferGeometry(); FX.spk = Array.from({ length: N }, () => ({ life: 0, max: 1, p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3() })); FX.spkI = 0;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(N), 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: renderer.getPixelRatio() * innerHeight * 0.5 }, uC: { value: new THREE.Color(1.0, 0.72, 0.32) } },
    vertexShader: `attribute float aLife; varying float vL; uniform float uPx; void main(){ vL = aLife; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = aLife > 0.0 ? (0.05 + 0.07*aLife)*uPx/-mv.z : 0.0; }`,
    fragmentShader: `varying float vL; uniform vec3 uC; void main(){ vec2 d = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(d)); gl_FragColor = vec4(uC*(1.6+vL)*a*vL, a*vL); }` });
  FX.spkPts = new THREE.Points(g, m); FX.spkPts.frustumCulled = false; scene.add(FX.spkPts);
}
function sparks(p, n = 8, power = 1) {
  if (!FX.spk) return; if (LOWQ) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) { const s = FX.spk[FX.spkI = (FX.spkI + 1) % FX.spk.length]; s.max = s.life = 0.25 + Math.random() * 0.35; s.p.copy(p); s.v.set((Math.random() - 0.5) * 7, 1 + Math.random() * 5, (Math.random() - 0.5) * 7).multiplyScalar(power); }
  FX.spkOn = 1;
}
function updateSparks(dt) {
  if (!FX.spkOn) return; const pa = FX.spkPts.geometry.attributes.position, la = FX.spkPts.geometry.attributes.aLife; let any = false;
  for (let i = 0; i < FX.spk.length; i++) { const s = FX.spk[i]; if (s.life > 0) { any = true; s.life -= dt; s.v.y -= 16 * dt; s.v.multiplyScalar(1 - dt * 2); s.p.addScaledVector(s.v, dt); } pa.setXYZ(i, s.p.x, s.p.y, s.p.z); la.setX(i, Math.max(0, s.life / s.max)); }
  pa.needsUpdate = la.needsUpdate = true; FX.spkPts.material.uniforms.uPx.value = renderer.getPixelRatio() * innerHeight * 0.5 / Math.tan(camera.fov * Math.PI / 360); if (!any) FX.spkOn = 0;
}
function updateFX(dt) {
  updateSparks(dt);
  let any = false;
  for (let i = 0; i < FX.drops.length; i++) {
    const d = FX.drops[i]; if (d.life <= 0) continue; any = true;
    d.life -= dt; d.v.y -= 14 * dt; d.p.addScaledVector(d.v, dt);
    const gy = hgt(d.p.x, d.p.z); if (d.p.y < gy) { d.p.y = gy; d.v.set(0, 0, 0); }
    const k = d.life > 0 ? d.s : 0; _s.setScalar(k); _e.set(d.life * 9, d.life * 7, 0); _q.setFromEuler(_e); _m4.compose(d.p, _q, _s); FX.drop.setMatrixAt(i, _m4);
  }
  if (any || FX._dirty) { FX.drop.instanceMatrix.needsUpdate = true; FX._dirty = any; }
  for (const s of FX.splats) { if (s.life > 0) { s.life -= dt; s.m.material.opacity = Math.min(0.7, s.life / 3); if (s.life <= 0) s.m.visible = false; } }
  if (FX.sring.visible) { FX.sringT += dt; const k = FX.sringT / 0.55; FX.sring.scale.setScalar(0.5 + k * 8.5); FX.sring.material.opacity = Math.max(0, 1 - k) * 0.9; if (k >= 1) FX.sring.visible = false; }
  for (const f of FX.flashes) { if (f.life > 0) { f.life -= dt; const k = f.life / f.max; f.s.material.opacity = k; f.s.scale.setScalar(f.size * (1.4 - k * 0.6)); if (f.life <= 0) f.s.visible = false; } }
}

// ------------------------------------------------------------------ projectiles (sling stones)
const stones = [];
let ARROW_G = null, STONE_G = null;
function stoneLook() { const bow = LEVEL === 3 || LEVEL >= 5; for (const s of stones) { s.m.geometry = bow ? ARROW_G : STONE_G; s.m.material = bow ? MAT.wood : MAT.stone; } }
function buildStones() { STONE_G = new THREE.IcosahedronGeometry(0.07, 0); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(STONE_G, MAT.stone); m.visible = false; scene.add(m); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.05, 1.2, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.6), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); m.add(t); stones.push({ m, v: new THREE.Vector3(), life: 0, dmg: 0 }); } }

// ------------------------------------------------------------------ arrows (Philistine archers, Level 2)
const arrows = [];
function buildArrows() {
  const g = mergeGeometries([new THREE.CylinderGeometry(0.012, 0.012, 0.75, 4).rotateX(Math.PI / 2).toNonIndexed(), new THREE.ConeGeometry(0.03, 0.1, 4).rotateX(Math.PI / 2).translate(0, 0, 0.42).toNonIndexed(), new THREE.BoxGeometry(0.07, 0.005, 0.12).translate(0, 0, -0.32).toNonIndexed()]); ARROW_G = g;
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(g, MAT.wood); m.visible = false; scene.add(m); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.04, 1.6, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.9), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })); m.add(t); arrows.push({ m, v: new THREE.Vector3(), life: 0, dmg: 0 }); }
}
function fireArrow(e, T = P) {
  const a = arrows.find(a => a.life <= 0); if (!a) return;
  const from = e.handPos(new THREE.Vector3()); from.y = Math.max(from.y, e.pos.y + 1.35);
  const aim = T.pos.clone().setY(T.pos.y + 1.1); const tt = from.distanceTo(aim) / 21; if (T === P) aim.addScaledVector(P.mv || tmpV.set(0, 0, 0), tt * 0.6);
  a.v.copy(aim).sub(from).normalize().multiplyScalar(21); a.v.y += tt * 0.9; a.m.position.copy(from); a.m.lookAt(from.clone().add(a.v)); a.m.visible = true; a.life = 1.8; a.dmg = e.dmg;
  SFX.bow(); LOG('arrow');
}
function updateArrows(dt) {
  for (const a of arrows) {
    if (a.life <= 0) continue; a.life -= dt; a.v.y -= 1.8 * dt; const p = a.m.position; p.addScaledVector(a.v, dt); a.m.lookAt(tmpV.copy(p).add(a.v));
    let done = a.life <= 0 || p.y < hgt(p.x, p.z) || collide(tmpV2.set(p.x, 0, p.z), 0.02);
    if (!done && P.state !== 'dead') { const dx = p.x - P.pos.x, dz = p.z - P.pos.z; if (dx * dx + dz * dz < 0.42 * 0.42 && p.y > P.pos.y + 0.2 && p.y < P.pos.y + 1.9) { damagePlayer(a.dmg, p.clone().sub(a.v.clone().setY(0).normalize())); done = true; } }
    if (!done) for (const al of ALLIES) { if (al.down) continue; const dx = p.x - al.pos.x, dz = p.z - al.pos.z; if (dx * dx + dz * dz < 0.42 * 0.42 && p.y > al.pos.y + 0.2 && p.y < al.pos.y + 1.9) { hurtAlly(al, a.dmg * 0.8, p.clone().sub(a.v.clone().setY(0).normalize())); done = true; break; } }
    if (done) { a.life = 0; a.m.visible = false; }
  }
}
// ------------------------------------------------------------------ spoils
const spoils = [];
function buildSpoils() {
  const coinG = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12).rotateX(Math.PI / 2);
  const coinM = new THREE.MeshStandardMaterial({ color: 0xf0c050, metalness: 1, roughness: 0.25, emissive: 0x5a3a00, emissiveIntensity: 0.6 });
  const armG = G_helmet().scale(1.6, 1.6, 1.6);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(coinG, coinM); m.visible = false; scene.add(m); spoils.push({ m, type: 'coin', live: false }); }
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(armG, MAT.bronze); m.visible = false; scene.add(m); spoils.push({ m, type: 'armour', live: false }); }
}
function dropSpoil(type, p) {
  const s = spoils.find(s => !s.live && s.type === type); if (!s) return;
  s.live = true; s.m.visible = true; s.t = 0; s.p = p.clone(); s.v = new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3); s.m.position.copy(p); s.grounded = false;
}

// ------------------------------------------------------------------ health bars (3D)
function makeBar(w = 0.9, color = 0xd8392a) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.06, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthTest: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.08).translate(w / 2, 0, 0), new THREE.MeshBasicMaterial({ color, depthTest: false }));
  fg.position.x = -w / 2; fg.position.z = 0.001; bg.renderOrder = 20; fg.renderOrder = 21; g.add(bg, fg); g.userData.fg = fg; g.visible = false; scene.add(g); return g;
}

// ------------------------------------------------------------------ damage numbers (DOM, pooled)
const dmgPool = []; const dmgLayer = $('dmg-layer');
for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'dmg'; d.style.opacity = 0; dmgLayer.appendChild(d); dmgPool.push({ el: d, life: 0, p: new THREE.Vector3() }); }
let dmgI = 0;
function dmgText(p, text, cls = '') { const d = dmgPool[dmgI = (dmgI + 1) % dmgPool.length]; d.el.textContent = text; d.el.className = 'dmg ' + cls; d.life = 0.9; d.p.copy(p); d.dx = (Math.random() - 0.5) * 30; }
const _pv = new THREE.Vector3();
function updateDmg(dt) {
  for (const d of dmgPool) {
    if (d.life <= 0) continue; d.life -= dt; d.p.y += dt * 1.2;
    _pv.copy(d.p).project(camera);
    if (_pv.z > 1) { d.el.style.opacity = 0; continue; }
    const x = (_pv.x * 0.5 + 0.5) * innerWidth + d.dx * (1 - d.life), y = (-_pv.y * 0.5 + 0.5) * innerHeight;
    d.el.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-50%) scale(${1 + Math.max(0, d.life - 0.7) * 2})`;
    d.el.style.opacity = Math.min(1, d.life * 2.5);
  }
}

// ------------------------------------------------------------------ audio (synthesised, no files)
const AU = { ctx: null, on: (() => { try { return localStorage.getItem('elah-mute') !== '1'; } catch (e) { return true; } })(), master: null };
function audioInit() {
  if (AU.ctx || (BOT && !Q.has('sound'))) return; try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = AU.ctx; AU.master = c.createGain(); AU.master.gain.value = 0.6 * SETTINGS.sfx; AU.master.connect(c.destination);
  AU.musicOut = c.createGain(); AU.musicOut.gain.value = SETTINGS.music; AU.musicOut.connect(c.destination); loadSamples();
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = buf;
  // ambient wind
  const w = c.createBufferSource(); w.buffer = buf; w.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6; const g = c.createGain(); g.gain.value = AU.on ? 0.05 : 0;
  w.connect(f); f.connect(g); g.connect(AU.master); w.start(); AU.wind = { f, g };
  if (!Q.has('nomusic')) musicStart();
}

// ------------------------------------------------------------------ battle music (generated live in the browser: war drums, low strings, a drone; no files, no voices)
const MUSIC = { bus: null, timer: null, step: 0, next: 0, mode: '', want: 'elah', inten: 0 };
const MUSIC_CFG = {
  elah: { bpm: 92, root: 73.42, roots: [0, 0, -4, -2, 0, 0, 1, -2] },   // D, Phrygian-dominant colour (the flat second)
  lehi: { bpm: 100, root: 82.41, roots: [0, 0, 1, 0, -4, -2, 1, -1] },  // E
  temple: { bpm: 112, root: 69.3, roots: [0, 1, 0, 1, -4, -2, 1, 0] },  // C#, darker and faster for the pillars
  wild: { bpm: 120, root: 73.42, roots: [0, 1, 0, 1, -2, -4, -2, 1] },  // D again, faster: the flight from Saul
  dan: { bpm: 86, root: 61.74, roots: [0, 0, 1, 0, -2, -4, -2, 1], night: true },
  moab: { bpm: 104, root: 65.41, roots: [0, 0, -2, 1, 0, -4, -2, 1] },  // C, Benaiah: the border of Moab and the Egyptian
  beth: { bpm: 112, root: 73.42, roots: [0, 0, -2, 1, 0, -4, -2, 1] },  // D, David's mighty men: the harvest battles
  kishon: { bpm: 108, root: 77.78, roots: [0, 0, -2, 1, 0, 1, -4, -2] },  // D#, Deborah and Barak: the charge down from Tabor
  pit: { bpm: 96, root: 58.27, roots: [0, 1, 0, 1, -2, -4, 1, 0], night: true },  // A#, the pit in time of snow: low and close  // B, the night attack: low frame drums, a sparse ostinato, a high shimmer
};
function musicMode(m) { MUSIC.want = m; if (MUSIC.bus) MUSIC.mode = m; }
function musicStart() {
  if (!AU.ctx || MUSIC.bus) return; const c = AU.ctx;
  MUSIC.bus = c.createGain(); MUSIC.bus.gain.value = 0; MUSIC.bus.connect(AU.musicOut && AU.musicOut.context === c ? AU.musicOut : AU.master);
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(MUSIC.bus); MUSIC.in = comp;
  // a long dark reverb tail made from decaying noise
  const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const rv = c.createConvolver(); rv.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.32; rv.connect(rg); rg.connect(comp); MUSIC.rv = rv;
  MUSIC.mode = MUSIC.want; MUSIC.step = 0; MUSIC.next = c.currentTime + 0.1;
  MUSIC.bus.gain.setTargetAtTime(AU.on ? 0.58 : 0, c.currentTime, 1.2);
  MUSIC.timer = setInterval(musicTick, 90);
}
async function musicRenderTest(sec = 12, mode = 'elah', inten = 0.8) {
  const keep = { ctx: AU.ctx, master: AU.master, noise: AU.noise, bus: MUSIC.bus, inn: MUSIC.in, rv: MUSIC.rv, timer: MUSIC.timer, next: MUSIC.next, step: MUSIC.step, mode: MUSIC.mode, inten: MUSIC.inten, on: AU.on };
  const off = new OfflineAudioContext(2, 44100 * sec, 44100); AU.ctx = off; AU.on = true; AU.master = off.createGain(); AU.master.gain.value = 0.6; AU.master.connect(off.destination);
  const nb = off.createBuffer(1, off.sampleRate * 2, off.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = nb;
  MUSIC.bus = null; MUSIC.want = mode; musicStart(); clearInterval(MUSIC.timer); MUSIC.bus.gain.cancelScheduledValues(0); MUSIC.bus.gain.value = 0.58; MUSIC.inten = inten;
  const cfg = MUSIC_CFG[mode]; musicSchedule(cfg, 60 / cfg.bpm / 4, sec - 0.7);
  const buf = await off.startRendering();
  Object.assign(AU, { ctx: keep.ctx, master: keep.master, noise: keep.noise, on: keep.on }); Object.assign(MUSIC, { bus: keep.bus, in: keep.inn, rv: keep.rv, timer: keep.timer, next: keep.next, step: keep.step, mode: keep.mode, inten: keep.inten });
  const L = buf.getChannelData(0), R = buf.getChannelData(1), pcm = new Int16Array(L.length * 2); for (let i = 0; i < L.length; i++) { pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  let bin = ''; const u8 = new Uint8Array(pcm.buffer); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(bin);
}
function musicMute(on) { if (MUSIC.bus) MUSIC.bus.gain.setTargetAtTime(on ? 0.58 : 0, AU.ctx.currentTime, 0.15); }
function mOut(node, wet = 0.3) { node.connect(MUSIC.in); if (wet > 0) { const g = AU.ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(MUSIC.rv); } }
function mDrum(t, f = 1, v = 1) { // taiko-like war drum
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120 * f, t); o.frequency.exponentialRampToValueAtTime(44 * f, t + 0.32);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.85 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.62); o.connect(g); mOut(g, 0.35); o.start(t); o.stop(t + 0.66);
  const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'triangle'; o2.frequency.setValueAtTime(230 * f, t); o2.frequency.exponentialRampToValueAtTime(110 * f, t + 0.18); // the skin's knock, so it carries on phone speakers
  g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.38 * v, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o2.connect(g2); mOut(g2, 0.3); o2.start(t); o2.stop(t + 0.27);
  const s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420 * f; const ng = c.createGain(); ng.gain.setValueAtTime(0.5 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  s.connect(fl); fl.connect(ng); mOut(ng, 0.25); s.start(t, Math.random()); s.stop(t + 0.14);
}
function mRim(t, v = 1) { // frame drum / hand clap
  const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1900; fl.Q.value = 1.4;
  const g = c.createGain(); g.gain.setValueAtTime(0.32 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); s.connect(fl); fl.connect(g); mOut(g, 0.4); s.start(t, Math.random()); s.stop(t + 0.1);
}
function mString(t, f, dur, v = 1, cut = 900) { // bowed low string: two detuned saws through a swelling low-pass
  const c = AU.ctx, g = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2; fl.frequency.setValueAtTime(cut * 0.4, t); fl.frequency.linearRampToValueAtTime(cut, t + Math.min(0.12, dur * 0.4));
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.03); g.gain.setValueAtTime(0.13 * v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  for (const d of [-7, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(fl); o.start(t); o.stop(t + dur + 0.02); }
  fl.connect(g); mOut(g, 0.3);
}
function mPad(t, f, dur, v = 1) { // slow swell under each bar (root, fifth, octave)
  const c = AU.ctx, g = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * v, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const r of [1, 1.5, 2]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * r; o.detune.value = (Math.random() - 0.5) * 14; o.connect(fl); o.start(t); o.stop(t + dur + 0.05); }
  fl.connect(g); mOut(g, 0.55);
}
function musicTick() {
  if (!AU.ctx || !MUSIC.bus || document.hidden) return; const c = AU.ctx;
  const cfg = MUSIC_CFG[MUSIC.mode] || MUSIC_CFG.elah; const st = 60 / cfg.bpm / 4;
  // intensity: calmer in menus and story cards, fuller in fights, fullest for Goliath and the pillars
  const fight = G.phase === 'play' && (G.stage === 'escape' || (G.enemies && G.enemies.some(e => e.alive && e.obj.visible)) || G.boss || G.fin);
  MUSIC.inten += ((fight ? (G.boss || G.fin ? 1 : 0.7) : 0.25) - MUSIC.inten) * 0.05;
  if (trackTick()) { MUSIC.next = c.currentTime + 0.05; return; }   // a recorded score is playing: the synth rests
  if (MUSIC.next < c.currentTime - 0.5) MUSIC.next = c.currentTime + 0.05;
  musicSchedule(cfg, st, c.currentTime + 0.3);
}
// ---- recorded score (CC0, see credits): one loop per level and one for the menu, streamed, cross-faded; the synth score is the fallback
const TRACK = { el: null, g: null, cur: '', failed: {} };
function trackTick() {
  if (Q.has('nosong')) return false;
  const c = AU.ctx, want = (G.phase === 'title' || G.phase === 'loading') ? 'menu' : 'l' + LEVEL;
  if (TRACK.failed[want]) { if (TRACK.g) TRACK.g.gain.setTargetAtTime(0, c.currentTime, 0.3); MUSIC.bus.gain.setTargetAtTime(AU.on ? 0.58 : 0, c.currentTime, 0.4); return false; }
  if (TRACK.cur !== want) {
    if (TRACK.el) { const oel = TRACK.el, og = TRACK.g; oel.dataset.dead = '1'; og.gain.setTargetAtTime(0, c.currentTime, 0.45); setTimeout(() => { try { oel.pause(); oel.removeAttribute('src'); oel.load(); } catch (e) { } }, 2500); }
    const el = new Audio(); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.src = 'audio/music_' + want + '.mp3';
    const g = c.createGain(); g.gain.value = 0; try { c.createMediaElementSource(el).connect(g); g.connect(AU.musicOut); } catch (e) { TRACK.failed[want] = true; return false; }
    el.addEventListener('error', () => { if (el.dataset.dead) return; TRACK.failed[want] = true; LOG('track_fail', { want }); });
    el.play().catch(() => { });
    Object.assign(TRACK, { el, g, cur: want }); LOG('track', { want });
  }
  if (TRACK.el.paused && AU.on && !G.paused) TRACK.el.play().catch(() => { });
  const target = !AU.on ? 0 : want === 'menu' ? 0.9 : G.paused ? 0.25 : 0.5 + 0.4 * MUSIC.inten;
  TRACK.g.gain.setTargetAtTime(target, c.currentTime, 0.5);
  MUSIC.bus.gain.setTargetAtTime(0, c.currentTime, 0.3);
  return true;
}
// ---- recorded hit sounds (Kenney Impact Sounds + RPG Audio, CC0), layered over the synth
const SMP = { buf: {}, list: { hit: ['hit1', 'hit2', 'hit3'], metal: ['metal1', 'metal2'], wood: ['wood1'], coin: ['coin'], draw: ['draw'] } };
function loadSamples() {
  const c = AU.ctx; for (const names of Object.values(SMP.list)) for (const n of names) fetch('audio/sfx_' + n + '.mp3').then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(d => { SMP.buf[n] = d; }).catch(() => { });
}
function smp(kind, vol = 1, rate = 1) {
  if (!AU.ctx || !AU.on) return false; const names = SMP.list[kind].filter(n => SMP.buf[n]); if (!names.length) return false;
  const s = AU.ctx.createBufferSource(); s.buffer = SMP.buf[names[(Math.random() * names.length) | 0]]; s.playbackRate.value = rate * (0.92 + Math.random() * 0.16);
  const g = AU.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(AU.master); s.start(); return true;
}
function musicSchedule(cfg, st, until) {
  while (MUSIC.next < until) {
    const t = MUSIC.next, s = MUSIC.step % 16, bar = Math.floor(MUSIC.step / 16) % 8, I = MUSIC.inten;
    const f0 = cfg.root * Math.pow(2, cfg.roots[bar] / 12);
    if (s === 0) mPad(t, f0, st * 16, 0.6 + I * 0.5);
    if (s === 0 || s === 6 || s === 8 || (s === 11 && I > 0.5) || (s === 14 && bar % 2 === 1)) mDrum(t, s === 0 ? 0.9 : 1, (s === 0 ? 1 : 0.75) * (0.45 + I * 0.55));
    if (I > 0.55 && (s === 3 || s === 13) && bar % 4 === 3) mDrum(t, 1.35, 0.5);
    if (s === 4 || s === 12) mRim(t, 0.4 + I * 0.6); else if (I > 0.75 && s % 2 === 1 && Math.random() < 0.35) mRim(t, 0.25);
    if (cfg.night && s === 0 && bar % 2 === 0) mString(t, f0 * 8 * Math.pow(2, (bar % 4 ? 7 : 3) / 12), st * 14, 0.22, 2600);
    if (cfg.night && I > 0.5 && (s === 2 || s === 10) && Math.random() < 0.5) mDrum(t, 1.6, 0.25);
    if (I > 0.35 && s % 2 === 0) { const pat = cfg.night ? [0, 3, 0, 1, 0, 7, 5, 1] : [0, 0, 12, 0, 1, 0, 7, 0]; const n = pat[(s / 2) % 8]; mString(t, f0 * Math.pow(2, n / 12), st * 1.8, (n === 0 ? 0.85 : 1) * (0.5 + I * 0.6), 650 + I * 900); }
    if (I > 0.8 && s === 8 && bar % 2 === 0) mString(t, f0 * 2 * Math.pow(2, 7 / 12), st * 7, 0.55, 1400);
    MUSIC.step++; MUSIC.next += st;
  }
}

function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  if (!AU.ctx || !AU.on) return; const c = AU.ctx, t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, f0, f1, vol = 0.3, type = 'bandpass', q = 1, delay = 0) {
  if (!AU.ctx || !AU.on) return; const c = AU.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
const SFX = {
  swing: () => noise(0.22, 1800, 500, 0.25, 'bandpass', 1.2),
  hit: () => { const s = smp('hit', 0.9); tone('sine', 140, 50, 0.18, s ? 0.3 : 0.55); noise(0.12, 900, 200, s ? 0.15 : 0.35, 'lowpass', 0.8); },
  clang: () => { if (smp('metal', 0.8)) return; tone('square', 820, 760, 0.25, 0.08); tone('triangle', 1240, 1180, 0.4, 0.12); noise(0.08, 4000, 2500, 0.15, 'highpass'); },
  sling: () => { noise(0.35, 300, 2400, 0.22, 'bandpass', 3); tone('sine', 300, 900, 0.25, 0.05); },
  coin: () => { if (smp('coin', 0.7)) return; tone('triangle', 1320, 1320, 0.12, 0.12); tone('triangle', 1980, 1980, 0.2, 0.1, 0.06); },
  hurt: () => { tone('sawtooth', 220, 110, 0.25, 0.12); noise(0.15, 600, 200, 0.3, 'lowpass'); },
  roar: () => { tone('sawtooth', 95, 55, 1.2, 0.22); tone('sawtooth', 71, 45, 1.3, 0.18); noise(1.0, 500, 150, 0.25, 'lowpass'); },
  slam: () => { tone('sine', 70, 28, 0.7, 0.8); noise(0.6, 400, 60, 0.6, 'lowpass'); },
  angel: () => { [523, 659, 784, 1046].forEach((f, i) => tone('sine', f, f, 1.6, 0.09, i * 0.12)); },
  win: () => { [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.9, 0.12, i * 0.16)); },
  dodge: () => noise(0.25, 600, 200, 0.18, 'bandpass', 0.7),
  buy: () => { tone('triangle', 660, 660, 0.1, 0.12); tone('triangle', 990, 990, 0.25, 0.12, 0.08); },
  spirit: () => { tone('sine', 55, 30, 1.4, 0.7); noise(1.2, 300, 60, 0.5, 'lowpass'); [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, f * 1.01, 1.3, 0.07, 0.05 + i * 0.05)); },
  bow: () => { tone('triangle', 180, 120, 0.12, 0.12); noise(0.25, 2500, 900, 0.12, 'bandpass', 4, 0.03); },
  rumble: () => { noise(2.0, 160, 40, 0.5, 'lowpass', 0.7); tone('sine', 45, 30, 1.8, 0.4); },
  collapse: () => {
    // the crack: a sharp split, then a sub-bass rumble that swells for seconds, with stone grinding on top
    noise(0.35, 6000, 1500, 0.7, 'highpass', 0.7); tone('square', 90, 30, 0.5, 0.25); noise(0.5, 2500, 300, 0.5, 'bandpass', 1.5, 0.05);
    if (!AU.ctx || !AU.on) return; const c = AU.ctx, t = c.currentTime;
    const sub = c.createOscillator(), sub2 = c.createOscillator(), g = c.createGain(); sub.type = 'sine'; sub2.type = 'triangle';
    sub.frequency.setValueAtTime(42, t); sub.frequency.exponentialRampToValueAtTime(24, t + 7); sub2.frequency.setValueAtTime(31, t); sub2.frequency.exponentialRampToValueAtTime(19, t + 7);
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.8); g.gain.setValueAtTime(0.9, t + 4.5); g.gain.exponentialRampToValueAtTime(0.001, t + 8);
    sub.connect(g); sub2.connect(g); g.connect(AU.master); sub.start(t); sub2.start(t); sub.stop(t + 8.1); sub2.stop(t + 8.1);
    noise(7.5, 260, 35, 1.0, 'lowpass', 0.6); noise(5, 1400, 200, 0.22, 'bandpass', 0.6, 0.3);
    [0.3, 0.75, 1.1, 1.6, 2.1, 2.7, 3.3, 4.0].forEach((d, i) => { noise(0.9, 700, 60, 0.75 - i * 0.05, 'lowpass', 0.9, d); tone('sine', 65, 25, 0.9, 0.6 - i * 0.04, d); });
    SFX.shout();
  },
  thud: () => { smp('wood', 0.6, 0.7); tone('sine', 80, 30, 0.5, 0.5); noise(0.4, 500, 60, 0.4, 'lowpass', 0.8); },
  shout: () => { for (let i = 0; i < 6; i++) noise(0.7 + Math.random() * 0.4, 500 + Math.random() * 400, 300, 0.07, 'bandpass', 3, i * 0.08); },
  burn: () => { noise(0.9, 3000, 600, 0.3, 'highpass', 0.5); tone('sawtooth', 120, 400, 0.5, 0.06); },
  horn: () => { tone('sawtooth', 220, 220, 1.0, 0.07); tone('sawtooth', 330, 330, 1.0, 0.05, 0.05); },
};

// ------------------------------------------------------------------ game state
const G = { captives: [], divided: false, phase: 'loading', wave: 0, coins: 0, armour: 0, kills: 0, t0: 0, angelUsed: false, up: UP0(), spirit: 0, fin: null, stage: null, jawItem: null, slow: 1, slowT: 0, hitstop: 0, shake: 0, paused: false, cine: null, boss: null, enemies: [], log: [], fpsLog: [] };
const LOG = (type, data = {}) => { G.log.push({ t: +(performance.now() / 1000).toFixed(2), type, ...data }); if (G.log.length > 400) G.log.shift(); };
let P, MOSES, ANGEL, MELCH;
const CAM = { yaw: 0, pitch: 0.33, dist: 6.9, tgt: new THREE.Vector3(), lastDrag: -10, pos: new THREE.Vector3(0, 6, 14) };
const STATS = () => LEVEL === 6
  ? ({ maxHp: 160 + 30 * G.up.bronze, staff: 32 * (1 + 0.3 * G.up.sword), sling: 28 * (1 + 0.4 * G.up.bow), slingCd: Math.max(0.4, 0.85 - 0.14 * G.up.bow), ally: 16 * (1 + 0.3 * G.up.men), allyHp: 170 * (1 + 0.3 * G.up.men) })
  : LEVEL === 5
  ? ({ maxHp: 140 + 30 * G.up.bronze, staff: 30 * (1 + 0.3 * G.up.sword), sling: 27 * (1 + 0.4 * G.up.bow), slingCd: Math.max(0.4, 0.85 - 0.14 * G.up.bow), ally: 14 * (1 + 0.3 * G.up.men), allyHp: 130 * (1 + 0.3 * G.up.men) })
  : LEVEL === 4
  ? ({ maxHp: 130 + 30 * G.up.bronze, staff: 30 * (1 + 0.3 * G.up.staff), sling: 24 * (1 + 0.4 * G.up.sling), slingCd: Math.max(0.45, 0.9 - 0.15 * G.up.sling) })
  : LEVEL === 3
  ? ({ maxHp: 110 + 30 * G.up.bronze, staff: 27 * (1 + 0.3 * G.up.sword), sling: 26 * (1 + 0.4 * G.up.bow), slingCd: Math.max(0.4, 0.85 - 0.14 * G.up.bow), ally: 13 * (1 + 0.3 * G.up.men), allyHp: 120 * (1 + 0.3 * G.up.men) })
  : LEVEL === 2
  ? ({ maxHp: 120 + 30 * G.up.bronze, staff: 30 * (1 + 0.3 * G.up.jaw) * (P && P.hasJaw === false ? 0.5 : 1), sling: 0, slingCd: 1, spiritGain: 1 + 0.3 * G.up.spirit, wave: 48 * (1 + 0.3 * G.up.spirit), push: (1 / 13) * (1 + 0.15 * G.up.spirit) })
  : ({ maxHp: 100 + 30 * G.up.bronze, staff: 24 * (1 + 0.3 * G.up.staff), sling: 30 * (1 + 0.4 * G.up.sling), slingCd: Math.max(0.45, 0.95 - 0.17 * G.up.sling) });

// ------------------------------------------------------------------ input
const IN = { x: 0, y: 0, kx: 0, ky: 0, q: { attack: -9, sling: -9, dodge: -9 }, keys: {}, push: false };
const pushHeld = () => IN.push || !!IN.keys.KeyR || (BOT && BOTI.push);
const now = () => performance.now() / 1000;
function press(k) { IN.q[k] = now(); if (!BOT) audioInit(); }
function take(k, win = 0.32) { if (now() - IN.q[k] < win) { IN.q[k] = -9; return true; } return false; }
function setupInput() {
  const stick = $('stick'), knob = $('knob'), zone = $('stick-zone'); let sid = null, cx = 0, cy = 0; const R = 52;
  const homeStick = () => { stick.style.left = '110px'; stick.style.top = 'calc(100% - 110px)'; knob.style.transform = ''; stick.classList.remove('active'); };
  zone.addEventListener('pointerdown', (e) => { if (sid !== null) return; sid = e.pointerId; zone.setPointerCapture(sid); cx = e.clientX; cy = e.clientY; stick.style.left = cx + 'px'; stick.style.top = cy + 'px'; stick.classList.add('active'); audioInit(); e.preventDefault(); });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; IN.x = dx / R; IN.y = dy / R; });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; IN.x = IN.y = 0; homeStick(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  for (const [id, k] of [['b-attack', 'attack'], ['b-sling', 'sling'], ['b-dodge', 'dodge']]) {
    const b = $(id); b.addEventListener('pointerdown', (e) => { press(k); b.classList.add('down'); e.preventDefault(); e.stopPropagation(); });
const up = () => b.classList.remove('down'); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }
  { const b = $('b-attack'); b.addEventListener('pointerdown', () => { IN.sprintBtn = true; }); const up = () => { IN.sprintBtn = false; }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); }
  $('story').addEventListener('pointerdown', (e) => { if (G.skipStory) G.skipStory(); e.preventDefault(); });
  { const b = $('b-push'); b.addEventListener('pointerdown', (e) => { IN.push = true; b.classList.add('down'); audioInit(); e.preventDefault(); e.stopPropagation(); }); const up = () => { IN.push = false; b.classList.remove('down'); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); }
  // camera drag (touch on right side / mouse anywhere on canvas)
  let did = null, lx = 0, moved = 0, downBtn = 0;
  canvas.addEventListener('pointerdown', (e) => { did = e.pointerId; lx = e.clientX; moved = 0; downBtn = e.button; canvas.setPointerCapture(did); audioInit(); });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== did) return; const dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx); if (moved > 6) { CAM.yaw -= dx * 0.006; CAM.lastDrag = now(); } });
  canvas.addEventListener('pointerup', (e) => { if (e.pointerId !== did) return; did = null; if (e.pointerType === 'mouse' && moved <= 6 && G.phase === 'play') press(downBtn === 2 ? 'sling' : 'attack'); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    IN.keys[e.code] = true; audioInit();
    if (e.repeat) return;
    if (e.code === 'KeyJ' || e.code === 'Enter') press('attack');
    if (G.skipStory && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) { G.skipStory(); e.preventDefault(); return; }
    if (e.code === 'KeyK' || e.code === 'KeyF' || e.code === 'KeyC') press('sling');
    if (e.code === 'Space' || (e.code === 'ShiftLeft' && G.stage !== 'escape') || e.code === 'KeyL') { press('dodge'); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  });
  addEventListener('keyup', (e) => { IN.keys[e.code] = false; });
}
function readKeys() {
  const k = IN.keys; IN.kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); IN.ky = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (k.KeyQ) CAM.yaw += 0.03; if (k.KeyE) CAM.yaw -= 0.03;
}

// ------------------------------------------------------------------ helpers
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const turnTo = (a, b, k) => a + angDiff(a, b) * Math.min(1, k);
function clampArena(p, m = 0) { p.x = THREE.MathUtils.clamp(p.x, ARENA.x0 + m, ARENA.x1 - m); p.z = THREE.MathUtils.clamp(p.z, ARENA.z0 + m, ARENA.z1 - m); }
function ground(a) { a.pos.y = hgt(a.pos.x, a.pos.z); }
function shake(v) { G.shake = Math.max(G.shake, v); }
// combo counter: hits landed within 1.8 s of each other; every 5th a beat of hit-stop and a gold flash
function comboHit() {
  const t = now(); G.combo = t - (G.comboT || 0) < 1.8 ? (G.combo || 0) + 1 : 1; G.comboT = t;
  if (G.combo < 2) return; const el = $('combo'); el.firstChild.textContent = '×' + G.combo; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop', 'on');
  if (G.combo % 5 === 0) { G.hitstop = Math.max(G.hitstop, 0.06); G.flashV = 0.08; el.classList.add('gold'); setTimeout(() => el.classList.remove('gold'), 500); }
}
function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); if (t >= 0.08) { G.kick = Math.max(G.kick || 0, Math.min(1, t * 7)); vibrate(Math.round(12 + t * 120)); } }
const flashEl = $('flash');
function hurtFlash() { flashEl.style.opacity = 1; setTimeout(() => flashEl.style.opacity = 0, 120); }
let toastT = 0;
function toast(html, ms = 2600) { const t = $('toast'); t.innerHTML = html; t.classList.add('on'); toastT = ms / 1000; }
// prompts wait while a "SEQUENCE n" title card is on screen (they shared the same spot); the latest text shows when the card fades
let promptWant = '', promptHeld = false;
function prompt(text) { promptWant = text || ''; const p = $('prompt'); if (text && G.seqOn) { promptHeld = true; p.classList.remove('on'); return; } promptHeld = false; if (text) { p.textContent = text; p.classList.add('on'); } else p.classList.remove('on'); }
function seqBannerDone() { if (!G.seqOn) return; G.seqOn = false; clearTimeout(G.seqT); if (promptHeld && promptWant) prompt(promptWant); promptHeld = false; }
function show(id, on = true) { $(id).classList.toggle('show', on); }

// ------------------------------------------------------------------ player
function damagePlayer(dmg, from) {
  if (P.state === 'dead' || G.phase !== 'play') return;
  if (P.state === 'dodge' && P.st < 0.5) { dmgText(P.headPos(tmpV), 'DODGED', 'heal'); return; }
  if (P.bound || P.state === 'spirit' || (G.fin && G.fin.collapsing)) return;
  if (P.state === 'push' && G.fin) { G.fin.prog = Math.max(0, G.fin.prog - 0.03); P.poseT = 0; LOG('torn'); if (!G.fin.tornTold) { G.fin.tornTold = true; toast('They tear you from the pillars! <b>Fight them off</b>, then take hold again.', 3000); } }
  if (G.angel && G.angel.t < 3.2) return;
  P.hp -= dmg; LOG('player_hit', { dmg, hp: Math.round(P.hp) }); SFX.hurt(); vibrate(dmg > 20 ? 90 : 45); hurtFlash(); shake(0.35); P.flash = 1;
  const dir = tmpV.copy(P.pos).sub(from).setY(0).normalize(); blood(P.headPos(new THREE.Vector3()).setY(P.pos.y + 1.2), dir, 10, 0.8);
  P.vel.addScaledVector(dir, 6);
  dmgText(P.headPos(new THREE.Vector3()), '-' + Math.round(dmg));
  const st = STATS();
  if (P.hp <= st.maxHp * 0.25 && !G.angelUsed && P.hp > -999) { if (P.hp < 1) P.hp = 1; startAngel(); return; }
  if (P.hp <= 0) { P.hp = 0; P.state = 'dead'; P.st = 0; P.play('Death01', { loop: false, fade: 0.1 }); LOG('player_dead'); setTimeout(() => { if (P.state === 'dead') { G.phase = 'lost'; $('lverse').innerHTML = LEVEL === 1 && G.stage === 'escape' ? '“…and David fled, and escaped that night.”<span>1 Samuel 19:10 (KJV) · Rise and run again</span>' : LEVEL === 6 ? '“For by thee I have run through a troop; and by my God have I leaped over a wall.”<span>Psalm 18:29 (KJV)</span>' : LEVEL === 5 ? '“…is not the LORD gone out before thee?”<span>Judges 4:14 (KJV)</span>' : LEVEL === 4 ? '“Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee…”<span>Deuteronomy 31:6 (KJV)</span>' : LEVEL === 3 ? '“But thou, O LORD, art a shield for me; my glory, and the lifter up of mine head.”<span>Psalm 3:3 (KJV)</span>' : LEVEL === 2 ? '“Not by might, nor by power, but by my spirit, saith the LORD of hosts.”<span>Zechariah 4:6 (KJV)</span>' : '“The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.”<span>1 Samuel 17:37 (KJV)</span>'; show('lose'); } }, 2200); return; }
  if (P.state !== 'attack' || dmg > 20) { P.state = 'hit'; P.st = 0; P.play('Hit_Chest', { loop: false, ts: 1.4, restart: true, fade: 0.08 }); }
}
function inputVec() {
  let ix = IN.x + IN.kx, iy = IN.y + IN.ky; if (BOT) { ix = BOTI.x; iy = BOTI.y; }
  const m = Math.min(1, Math.hypot(ix, iy)); if (m < 0.12) return { x: 0, z: 0, m: 0 };
  const n = Math.hypot(ix, iy); ix /= n; iy /= n;
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
  return { x: rx * ix - fx * iy, z: rz * ix - fz * iy, m };
}
function targets() { const t = G.enemies.filter(e => e.alive); if (G.boss && G.boss.alive && G.boss.state !== 'intro') t.push(G.boss); return t; }
function pickTarget(maxD = 30, cone = 1.4) {
  const fwd = P.yaw; let best = null, bs = 1e9;
  for (const e of targets()) { const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > maxD) continue; const a = Math.abs(angDiff(fwd, Math.atan2(dx, dz))); const s = d * (1 + a * 1.5) + (a > cone ? 40 : 0); if (s < bs) { bs = s; best = e; } }
  return best;
}
function startAttack() {
  const tg = pickTarget(4.5, 1.6); if (tg) P.yaw = Math.atan2(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z);
  P.combo = (P.state === 'attack' ? (P.combo + 1) % 3 : 0);
  P.state = 'attack'; P.st = 0; P.hitDone = false;
  const clip = P.combo === 1 ? 'Punch_Cross' : 'Sword_Attack'; const ts = P.combo === 1 ? 1.5 : 1.7;
  P.atkDur = P.dur(clip) / ts; P.hitT = P.atkDur * (P.combo === 1 ? 0.38 : 0.42);
  P.play(clip, { loop: false, ts, restart: true, fade: 0.08 }); SFX.swing();
}
function staffHit() {
  const st = STATS(); const fwd = P.yaw; let hits = 0; const strong = P.combo === 2;
  for (const e of targets()) {
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); const reach = 2.25 + (e.radius || 0.4);
    if (d > reach) continue; if (Math.abs(angDiff(fwd, Math.atan2(dx, dz))) > 1.35 && d > 0.9) continue;
    hits++; const dmg = st.staff * (strong ? 1.5 : 1) * (0.9 + Math.random() * 0.2);
    hurtEnemy(e, dmg, new THREE.Vector3(dx, 0, dz).normalize(), 'staff', strong);
  }
  if (hits) { hitstop(strong ? 0.09 : 0.055); shake(strong ? 0.25 : 0.14); gainSpirit(6 * hits); }
}
function startSling() {
  if (P.slingCd > 0) return false;
  const tg = (G.boss && G.boss.alive && bossWindow(G.boss)) ? G.boss : pickTarget(32, 1.9); if (tg) P.yaw = Math.atan2(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z);
  P.slingTarget = tg; P.state = 'sling'; P.st = 0; P.released = false;
  const ts = 1.9; P.atkDur = P.dur('Spell_Simple_Shoot') / ts; P.relT = P.atkDur * 0.3; P.play('Spell_Simple_Shoot', { loop: false, ts, restart: true, fade: 0.08 });
  P.slingCd = STATS().slingCd; return true;
}
function releaseStone() {
  const s = stones.find(s => s.life <= 0); if (!s) return;
  const from = P.handPos(new THREE.Vector3()); from.y = Math.max(from.y, P.pos.y + 1.3);
  let aim;
  const tg = P.slingTarget;
  if (tg && tg.alive) { aim = tg.isBoss ? tg.headPos(new THREE.Vector3()) : tg.pos.clone().setY(tg.pos.y + 1.25 * tg.scale); const tt = from.distanceTo(aim) / 36; aim.addScaledVector(tg.vel, tt * 0.8); }
  else aim = from.clone().add(new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(20));
  s.v.copy(aim).sub(from).normalize().multiplyScalar(36); s.m.position.copy(from); s.m.lookAt(aim); s.m.visible = true; s.life = 1.4; s.dmg = STATS().sling;
  if (LEVEL === 3 || LEVEL >= 5) SFX.bow(); else SFX.sling(); LOG('sling');
}
function updateStones(dt) {
  for (const s of stones) {
    if (s.life <= 0) continue; s.life -= dt;
    // sub-steps so a fast stone can't skip past a head on a slow (low-fps) phone
    const nSub = Math.max(1, Math.ceil(s.v.length() * dt / 0.3)), sdt = dt / nSub; let done = false;
    for (let k = 0; k < nSub && !done; k++) {
    s.m.position.addScaledVector(s.v, sdt); s.v.y -= 2 * sdt;
    const p = s.m.position; done = s.life <= 0 || p.y < hgt(p.x, p.z);
    if (!done) for (const e of targets()) {
      if (e.isBoss) {
        const hp = e.headPos(tmpV); if (p.distanceTo(hp) < 0.62) { bossHeadHit(e, s); done = true; break; }
        const bx = p.x - e.pos.x, bz = p.z - e.pos.z; if (bx * bx + bz * bz < 0.75 * 0.75 && p.y > e.pos.y && p.y < e.pos.y + 3.8) { hurtEnemy(e, LEVEL >= 3 ? s.dmg : 6, s.v.clone().setY(0).normalize(), 'sling'); if (LEVEL !== 3) SFX.clang(); flashAt(p.clone(), 0.8, 0.15); done = true; break; }
      } else {
        const bx = p.x - e.pos.x, bz = p.z - e.pos.z; if (bx * bx + bz * bz < 0.5 * 0.5 && p.y > e.pos.y + 0.2 && p.y < e.pos.y + 2.0) {
          const head = p.y > e.pos.y + 1.55 * e.scale; hurtEnemy(e, s.dmg * (head ? 1.6 : 1), s.v.clone().setY(0).normalize(), 'sling', head); done = true; break;
        }
      }
    }
    }
    if (done) { s.life = 0; s.m.visible = false; }
  }
}
function updatePlayer(dt) {
  const p = P, st = STATS(); p.st += dt; p.slingCd = Math.max(0, (p.slingCd || 0) - dt); const ox = p.pos.x, oz = p.pos.z;
  if (p.state !== 'push' && !p.keepPose) p.poseT = 0;
  if (LEVEL === 2 && G.phase === 'play' && !p.bound) gainSpirit(1.5 * dt);
  const iv = (G.phase === 'play' && p.state !== 'cine') ? inputVec() : { x: 0, z: 0, m: 0 };
  p.vel.multiplyScalar(Math.pow(0.002, dt));
  const canAct = G.phase === 'play' && !G.cine;
  switch (p.state) {
    case 'idle': case 'move': {
      if (G.stage === 'escape' && ESC) { escapeControl(p, iv, dt, canAct); break; }
      if (canAct && take('dodge')) { startDodge(iv); break; }
      if (canAct && take('attack')) { startAttack(); break; }
      if (LEVEL === 2) { if (canAct && take('sling') && trySpirit()) break; if (canAct && G.fin && !G.fin.collapsing && pushHeld() && nearSpot()) { startPush(); break; } }
      else if (canAct && (now() - IN.q.sling < 0.32) && p.slingCd <= 0) { IN.q.sling = -9; startSling(); break; }
      const sp = iv.m > 0.7 ? 6.0 : 2.4 + 3.6 * iv.m;
      if (iv.m > 0) { p.pos.x += iv.x * sp * dt; p.pos.z += iv.z * sp * dt; p.yaw = turnTo(p.yaw, Math.atan2(iv.x, iv.z), dt * 12); p.play(iv.m > 0.7 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { ts: iv.m > 0.7 ? 1.05 : 0.8 + iv.m * 0.6 }); p.state = 'move'; }
      else { p.play('Idle_Loop'); p.state = 'idle'; }
      break;
    }
    case 'attack': {
      if (iv.m > 0) { p.pos.x += iv.x * 1.2 * dt; p.pos.z += iv.z * 1.2 * dt; }
      if (p.st < p.hitT) { p.pos.x += Math.sin(p.yaw) * 2.0 * dt; p.pos.z += Math.cos(p.yaw) * 2.0 * dt; }
      if (!p.hitDone && p.st >= p.hitT) { p.hitDone = true; staffHit(); }
      if (p.st > p.atkDur * 0.55) { if (take('dodge')) { startDodge(iv); break; } if (take('attack', 0.45)) { startAttack(); break; } }
      if (p.st >= p.atkDur) { p.state = 'idle'; p.combo = 0; }
      break;
    }
    case 'sling': {
      if (!p.released && p.st >= p.relT) { p.released = true; releaseStone(); }
      if (p.st > p.relT + 0.05 && take('dodge')) { startDodge(iv); break; }
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'dodge': {
      const k = p.st < 0.55 ? 1 : Math.max(0, 1 - (p.st - 0.55) * 4);
      p.pos.x += p.dodgeDir.x * 9.5 * k * dt; p.pos.z += p.dodgeDir.z * 9.5 * k * dt;
      if (p.st >= p.atkDur) p.state = 'idle';
      break;
    }
    case 'hit': if (p.st > 0.38) p.state = 'idle'; break;
    case 'dead': break;
    case 'cine': p.play(p.cineAnim || 'Idle_Loop'); break;
    case 'bound': p.play('Idle_Loop', { ts: 0.6 }); if (canAct && take('sling')) trySpirit(); break;
    case 'spirit': {
      if (!p.blasted && p.st >= p.relT) { p.blasted = true; spiritBlast(); }
      if (p.st >= p.atkDur) { if (p.heave && pushHeld() && nearSpot()) startPush(); else p.state = 'idle'; }
      break;
    }
    case 'push': {
      const T = TEMPLE; if (!G.fin || G.fin.collapsing || !T) break;
      if (!pushHeld()) { p.state = 'idle'; break; }
      if (canAct && take('dodge')) { startDodge(iv); break; }
      if (canAct && take('sling') && trySpirit()) break;
      p.pos.x += (T.spot.x - p.pos.x) * Math.min(1, dt * 8); p.pos.z += (T.spot.z - p.pos.z) * Math.min(1, dt * 8); p.yaw = turnTo(p.yaw, Math.PI, dt * 10);
      p.play('Sword_Idle', { ts: 0.5 }); p.poseT = 1;
      G.fin.prog = Math.min(1, G.fin.prog + st.push * dt);
      if (Math.random() < dt * 3) shake(0.08 + G.fin.prog * 0.15);
      if (Math.random() < dt * 4) puff(new THREE.Vector3(p.pos.x + (Math.random() < 0.5 ? -1.15 : 1.15), 6.0, p.pos.z), 0.8, 1.4, new THREE.Vector3(0, -1.6, 0));
      break;
    }
  }
  p.pos.addScaledVector(p.vel, dt);
  clampArena(p.pos, 0.5); collide(p.pos, 0.35); ground(p);
  if (dt > 0) (p.mv || (p.mv = new THREE.Vector3())).set((p.pos.x - ox) / dt, 0, (p.pos.z - oz) / dt);
  // body collision with enemies
  for (const e of targets()) { const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz), r = 0.55 + (e.radius || 0.4); if (d < r && d > 0.001) { p.pos.x += dx / d * (r - d) * 0.6; p.pos.z += dz / d * (r - d) * 0.6; } }
  if (p.stoneInHand) p.stoneInHand.visible = p.slingCd <= 0 || p.state === 'sling' && !p.released;
  if (G.jawItem) { const J = G.jawItem; J.t += dt; J.gl.material.opacity = 0.55 + 0.4 * Math.sin(J.t * 6); if (Math.hypot(p.pos.x - J.m.position.x, p.pos.z - J.m.position.z) < 1.2 && G.phase === 'play' && !p.bound) pickJaw(); }
  p.update(dt);
}
function startDodge(iv) {
  const p = P; p.state = 'dodge'; p.st = 0; const ts = 1.55; p.atkDur = p.dur('Roll') / ts;
  if (iv.m > 0) { p.dodgeDir = new THREE.Vector3(iv.x, 0, iv.z).normalize(); p.yaw = Math.atan2(iv.x, iv.z); } else p.dodgeDir = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  if (iv.m === 0) p.yaw += Math.PI;
  p.play('Roll', { loop: false, ts, restart: true, fade: 0.06 }); SFX.dodge(); LOG('dodge');
}


// ------------------------------------------------------------------ Samson: Spirit, cords, jawbone, pillars
function gainSpirit(v) { if (LEVEL !== 2 || !P || P.bound) return; const was = G.spirit; G.spirit = Math.min(100, G.spirit + v * STATS().spiritGain); if (was < 100 && G.spirit >= 100) { SFX.buy(); dmgText(P.headPos(new THREE.Vector3()), 'SPIRIT READY', 'heal'); LOG('spirit_ready'); } }
function trySpirit() {
  if (G.spirit < 100) { if (now() - (G.spNag || 0) > 1.5) { G.spNag = now(); dmgText(P.headPos(new THREE.Vector3()), 'SPIRIT ' + Math.floor(G.spirit) + '%', ''); } return false; }
  const p = P; p.heave = p.state === 'push'; p.state = 'spirit'; p.st = 0; p.blasted = false; p.poseT = 0;
  const ts = 1.6; p.atkDur = p.dur('Jump_Start') / ts; p.relT = p.atkDur * 0.5; p.play('Jump_Start', { loop: false, ts, restart: true, fade: 0.06 });
  flashAt(p.pos.clone().setY(p.pos.y + 1.2), 3, 0.5, 0xffd36a); SFX.spirit(); return true;
}
function spiritBlast() {
  const st = STATS(); G.spirit = 0; LOG('spirit', { heave: !!P.heave, bound: !!P.bound });
  shake(0.9); hitstop(0.06); G.slow = 0.4; G.slowT = 0.45;
  FX.sring.visible = true; FX.sringT = 0; FX.sring.position.set(P.pos.x, P.pos.y + 0.08, P.pos.z);
  flashAt(P.pos.clone().setY(P.pos.y + 1.0), 7, 0.45, 0xffe08a);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; puff(P.pos.clone().add(new THREE.Vector3(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5)), 1.8, 1.0, new THREE.Vector3(Math.cos(a) * 7, 0.6, Math.sin(a) * 7)); }
  if (P.bound) breakBonds();
  const R = 8.5;
  for (const e of G.enemies) {
    if (!e.alive || !e.obj.visible) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > R) continue;
    const dir = new THREE.Vector3(dx, 0, dz).normalize(); if (e.shieldHp > 0) breakShield(e);
    hurtEnemy(e, st.wave * (1 - d / R * 0.45), dir, 'spirit', true); e.vel.addScaledVector(dir, 15 * (1 - d / R * 0.5));
    if (e.alive) { if (e.attacking) { attackers--; e.attacking = false; } e.state = 'hit'; e.st = 0; e.stun = 1.9; e.play('Hit_Chest', { loop: false, restart: true, ts: 0.8 }); }
  }
  for (const a of arrows) if (a.life > 0 && a.m.position.distanceTo(P.pos) < R) { a.life = 0; a.m.visible = false; }
  if (P.heave && G.fin && !G.fin.collapsing) { G.fin.prog = Math.min(1, G.fin.prog + 0.2); dmgText(P.pos.clone().setY(P.pos.y + 2.4), 'MIGHTY HEAVE', 'crit'); SFX.rumble(); }
}
function breakBonds() {
  const p = P; p.bound = false;
  for (const c of p.cords) { const w = c.getWorldPosition(new THREE.Vector3()); flashAt(w, 1.6, 0.6, 0xff9a40); for (let i = 0; i < 3; i++) puff(w.clone(), 0.6, 0.8, new THREE.Vector3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2)); c.visible = false; }
  SFX.burn(); prompt(''); spawnJaw(); LOG('bonds_broken');
  toast('“…and the Spirit of the LORD came mightily upon him, and the cords that were upon his arms became as flax that was burnt with fire…”<i>JUDGES 15:14 (KJV)</i>', 4600);
}
function spawnJaw() {
  const m = new THREE.Mesh(G_jaw(), MAT.bone); m.scale.setScalar(1.7); const x = P.pos.x + 2.2, z = P.pos.z - 1.6;
  m.position.set(x, hgt(x, z) + 0.1, z); m.rotation.set(0, 0.6, Math.PI / 2); m.castShadow = true; scene.add(m);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(1.8); gl.position.copy(m.position).setY(m.position.y + 0.25); scene.add(gl);
  G.jawItem = { m, gl, t: 0 }; setTimeout(() => { if (G.jawItem) prompt('TAKE UP THE JAWBONE'); }, 1600);
}
function pickJaw() {
  const J = G.jawItem; scene.remove(J.m); scene.remove(J.gl); J.m.geometry.dispose(); J.gl.material.dispose(); G.jawItem = null;
  P.hasJaw = true; P.weapon.visible = true; SFX.buy(); prompt(''); flashAt(P.handPos(new THREE.Vector3()), 2, 0.4, 0xfff0c0); LOG('jawbone');
  toast('“And he found a new jawbone of an ass, and put forth his hand, and took it…”<i>JUDGES 15:15 (KJV)</i>', 3800);
}
function nearSpot() { return !!TEMPLE && Math.hypot(P.pos.x - TEMPLE.spot.x, P.pos.z - TEMPLE.spot.z) < 0.95; }
function startPush() {
  P.state = 'push'; P.st = 0; P.poseT = 1; prompt(''); LOG('push');
  if (!G.fin.gripTold) { G.fin.gripTold = true; toast('“And Samson took hold of the two middle pillars upon which the house stood…”<i>JUDGES 16:29 (KJV)</i>', 3800); }
}
function breakShield(e) {
  e.shieldHp = 0; if (e.shieldMesh) { const w = e.shieldMesh.getWorldPosition(new THREE.Vector3()); e.shieldMesh.visible = false; flashAt(w, 1.8, 0.3, 0xffd890); puff(w, 1.0, 0.7); }
  SFX.clang(); dmgText(e.pos.clone().setY(e.pos.y + 2.4), 'SHIELD BROKEN', 'crit'); LOG('shield_break'); dropSpoil('armour', e.pos.clone().setY(e.pos.y + 1));
}

// ------------------------------------------------------------------ Philistines
let attackers = 0;
function spawnEnemy(kind, x, z, delay = 0) {
  const LM = kind === 'lionman', ak = LM ? 'captain' : kind;   // the two lionlike men of Moab fight like captains, bigger and tougher
  const e = new Actor(ak, LM ? STORY_L4.lionman.scale : kind === 'captain' || kind === 'shield' ? 1.07 : 0.98 + Math.random() * 0.06, LM ? 'lionman' : LEVEL === 3 ? 'e_' + kind : LEVEL === 4 ? 'm_' + kind : LEVEL === 5 ? 'k_' + kind : undefined);
  e.pos.set(x, hgt(x, z), z); e.yaw = Math.atan2(-x, 6 - z);
  const B = { phil: [66, 11, 2.7], captain: [130, 17, 3.1], archer: [50, 9, 2.9], shield: [150, 18, 2.5] }[kind] || [66, 11, 2.7];
  const L2 = LEVEL === 2, L3 = LEVEL === 3, L4 = LEVEL >= 4, w3 = G.wave >= 3 ? 1.15 : 1;
  const HD3 = LEVEL === 6 ? STORY_L6.hard : LEVEL === 5 ? STORY_L5.hard : L4 ? STORY_L4.hard : STORY_L3.hard; e.maxHp = e.hp = B[0] * (L2 ? STORY_L2.hard.hp : L3 || L4 ? HD3.hp : 1); e.dmg = B[1] * (L2 ? STORY_L2.hard.dmg : L3 || L4 ? HD3.dmg : 1) * w3; e.speed = B[2] + Math.random() * 0.4 + (L2 ? STORY_L2.hard.speed : L3 || L4 ? HD3.speed : 0);
  if (LM) { const S = STORY_L4.lionman; e.maxHp = e.hp = S.hp; e.dmg = S.dmg; e.speed = S.speed; e.lionman = true; e.radius = 0.5; }
  if (kind === 'shield') e.shieldHp = 3;
  if (LEVEL === 6 && G.horde) { e.maxHp = e.hp = e.maxHp * STORY_L6.horde.hp; }
  e.radius = 0.4; e.atkCd = 1 + Math.random() * 1.5; e.state = 'spawn'; e.st = -delay; e.obj.visible = delay <= 0; e.bar = makeBar(LM ? 1.1 : 0.8, { captain: 0xe0a030, shield: 0x6a9ae8, lionman: 0xff7a20 }[kind] || 0xd8392a);
  e.strafe = Math.random() < 0.5 ? 1 : -1; e.play('Walk_Loop', { ts: 0.9 });
  G.enemies.push(e); return e;
}
function hurtEnemy(e, dmg, dir, src, crit = false, from = P) {
  if (!e.alive) return;
  if (e.isBoss) return hurtBoss(e, dmg, dir, src);
  if (e.shieldHp > 0 && src !== 'spirit' && e.state !== 'hit') {
    const toP = Math.atan2(from.pos.x - e.pos.x, from.pos.z - e.pos.z);
    if (Math.abs(angDiff(e.yaw, toP)) < 1.2) {
      e.shieldHp--; e.hp = Math.max(1, e.hp - dmg * 0.12); SFX.clang(); const sp = e.pos.clone().setY(e.pos.y + 1.2).addScaledVector(dir, -0.5); flashAt(sp, 1.1, 0.15, 0xffe0a0); dmgText(sp.setY(sp.y + 0.8), 'BLOCK', ''); e.vel.addScaledVector(dir, 2.5); LOG('blocked');
      if (e.shieldHp <= 0) breakShield(e); else if (!G.blockTold && from === P) { G.blockTold = true; toast(LEVEL === 3 ? 'Shield bearers block from the front. <b>Strike their side</b> while your servants hold their eyes.' : 'Shield captains block from the front. <b>Strike their side</b>, or loose the <b>SPIRIT</b> to shatter shields.', 3600); }
      return;
    }
  }
  e.hp -= dmg; e.flash = 1; LOG('enemy_hit', { src, dmg: Math.round(dmg), hp: Math.round(e.hp), kind: e.kind }); if (from === P) comboHit();
  const hp = e.pos.clone().setY(e.pos.y + 1.3); blood(hp, dir, crit ? 24 : 14, crit ? 1.3 : 0.95); flashAt(hp, crit ? 1.9 : 1.3, crit ? 0.2 : 0.14, 0xfff0d0); flashAt(hp.clone().addScaledVector(dir, 0.15), crit ? 1.1 : 0.7, 0.09, 0xff7a40); SFX.hit();
  if (crit) { hitstop(0.11); shake(0.32); }
  dmgText(hp.setY(hp.y + 0.6), Math.round(dmg) + (crit ? '!' : ''), crit ? 'crit' : '');
  e.vel.addScaledVector(dir, src === 'sling' ? 4 : 5.5);
  if (e.hp <= 0) { killEnemy(e); return; }
  if (e.state === 'attack' && e.st > e.hitT * 0.45 && !crit) return; // committed swing: no flinch
  if (e.kind === 'captain' && src === 'staff' && !crit && Math.random() < 0.5) return;
  if (e.state === 'attack') { if (e.attacking) { attackers--; e.attacking = false; } }
  e.state = 'hit'; e.st = 0; e.play(Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head', { loop: false, ts: 1.3, restart: true, fade: 0.06 });
}
function killEnemy(e) {
  e.alive = false; e.state = 'dead'; e.st = 0; G.kills++; if (e.attacking) { attackers--; e.attacking = false; } gainSpirit(10);
  e.play('Death01', { loop: false, ts: 1.1, fade: 0.1, restart: true }); e.bar.visible = false; LOG('enemy_dead', { kind: e.kind });
}
const sepV = new THREE.Vector3();
function updateEnemy(e, dt) {
  e.st += dt; e.atkCd -= dt; e.vel.multiplyScalar(Math.pow(0.003, dt));
  let T = P;
  if ((LEVEL === 3 || LEVEL >= 5) && ALLIES.length && e.alive) {
    e.foeT = (e.foeT || 0) - dt;
    if (e.foeT <= 0 || !e.foe || e.foe.down) { e.foeT = 1.1 + Math.random() * 0.6; let best = P, bd = P.pos.distanceTo(e.pos) * (P.state === 'dead' ? 99 : 1); for (const a of ALLIES) { if (a.down || a.benched) continue; const d = a.pos.distanceTo(e.pos) * 1.7; if (d < bd) { bd = d; best = a; } } e.foe = best; }
    T = e.foe || P;
  }
  const dx = T.pos.x - e.pos.x, dz = T.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 0.001, face = Math.atan2(dx, dz);
  const playerDown = (T === P && P.state === 'dead') || G.phase !== 'play';
  const tok = T !== P || e.attacking;
  switch (e.state) {
    case 'spawn': {
      if (e.st < 0) { e.obj.visible = false; return; } e.obj.visible = true;
      e.pos.x += Math.sin(e.yaw) * 3.2 * dt; e.pos.z += Math.cos(e.yaw) * 3.2 * dt; e.play('Jog_Fwd_Loop', { ts: 0.95 });
      e.yaw = turnTo(e.yaw, face, dt * 1.5);
      if (e.st > 1.2 && e.pos.z > ARENA.z0 + 1 && e.pos.x > ARENA.x0 + 1 && e.pos.x < ARENA.x1 - 1) e.state = 'chase';
      break;
    }
    case 'chase': {
      if (e.raid && d > 5) { const R_ = e.raid, rx = R_.x - e.pos.x, rz = R_.z - e.pos.z, rd = Math.hypot(rx, rz) || 0.001; e.yaw = turnTo(e.yaw, Math.atan2(rx, rz), dt * 6); if (rd > 1.5) { e.pos.x += rx / rd * e.speed * dt; e.pos.z += rz / rd * e.speed * dt; e.play('Jog_Fwd_Loop', { ts: 0.95 }); } else e.play('Sword_Idle'); break; }
      if (e.kind === 'archer') { archerAI(e, dt, d, dx, dz, face, playerDown); break; }
      e.yaw = turnTo(e.yaw, face, dt * 6);
      const MAXA = (G.wave >= 3 ? 4 : G.wave >= 2 ? 3 : 2) + (LEVEL === 2 ? STORY_L2.hard.attackers : LEVEL === 3 ? STORY_L3.hard.attackers : LEVEL === 4 ? STORY_L4.hard.attackers : LEVEL === 5 ? STORY_L5.hard.attackers : LEVEL === 6 ? STORY_L6.hard.attackers : 0); const want = P.bound ? 4.2 : (tok || attackers < MAXA) ? 1.6 : 3.6;
      sepV.set(0, 0, 0);
      for (const o of G.enemies) { if (o === e || !o.alive) continue; const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz); if (od < 1.4 && od > 0.01) { sepV.x += ox / od * (1.4 - od); sepV.z += oz / od * (1.4 - od); } }
      let mv = 0;
      if (!playerDown && d > want + 0.3) { mv = d > 6 ? 1 : 0.7; e.pos.x += (dx / d) * e.speed * mv * dt; e.pos.z += (dz / d) * e.speed * mv * dt; }
      else if (!playerDown && d < want - 0.5) { e.pos.x -= (dx / d) * 1.5 * dt; e.pos.z -= (dz / d) * 1.5 * dt; mv = 0.3; }
      else if (!(tok || attackers < MAXA)) { e.pos.x += (dz / d) * e.strafe * 1.4 * dt; e.pos.z += (-dx / d) * e.strafe * 1.4 * dt; mv = 0.4; }
      e.pos.x += sepV.x * 3 * dt; e.pos.z += sepV.z * 3 * dt;
      e.play(mv > 0.8 ? 'Jog_Fwd_Loop' : mv > 0 ? 'Walk_Loop' : 'Sword_Idle', { ts: mv > 0.8 ? 0.95 : 1 });
      if (!playerDown && !P.bound && d < 2.1 && e.atkCd <= 0 && (tok || attackers < MAXA)) {
        if (!e.attacking && T === P) { attackers++; e.attacking = true; }
        e.state = 'attack'; e.st = 0; e.hitDone = false; const ts = e.kind === 'captain' ? 1.0 : 0.85; e.atkDur = e.dur('Sword_Attack') / ts; e.hitT = e.atkDur * 0.5;
        e.play('Sword_Attack', { loop: false, ts, restart: true, fade: 0.12 });
        flashAt(e.handPos(new THREE.Vector3()), 0.5, 0.35, 0xff6040);
      }
      break;
    }
    case 'attack': {
      if (e.st < e.hitT * 0.8) e.yaw = turnTo(e.yaw, face, dt * 4);
      if (!e.hitDone && e.st >= e.hitT) { e.hitDone = true; SFX.swing(); if (d < 2.4 && Math.abs(angDiff(e.yaw, face)) < 1.1) { if (T === P) damagePlayer(e.dmg, e.pos); else hurtAlly(T, e.dmg * 0.8, e.pos); } }
      if (e.st >= e.atkDur) { e.state = 'chase'; e.atkCd = 0.7 + Math.random() * 1.0; if (e.attacking) { attackers--; e.attacking = false; } }
      break;
    }
    case 'hit': if (e.st > (e.stun || 0.5)) { e.state = e.fleeing ? 'flee' : 'chase'; e.stun = 0; } break;
    case 'flee': {
      // the rout: they run north toward Hobah (Genesis 14:15)
      const fx = e.fleeX - e.pos.x, fz = (ARENA.z0 - 16) - e.pos.z, fd = Math.hypot(fx, fz) || 1;
      e.yaw = turnTo(e.yaw, Math.atan2(fx, fz), dt * 5); e.pos.x += fx / fd * e.speed * 1.55 * dt; e.pos.z += fz / fd * e.speed * 1.55 * dt; e.play('Sprint_Loop', { ts: 0.85 });
      if (e.pos.z < ARENA.z0 - 9) { e.alive = false; e.escaped = true; e.gone = true; e.remove(); scene.remove(e.bar); LOG('enemy_escaped'); return; }
      e.pos.addScaledVector(e.vel, dt); collide(e.pos, 0.35); ground(e); e.update(dt);
      e.bar.visible = e.obj.visible; if (e.bar.visible) { e.bar.position.set(e.pos.x, e.pos.y + 2.25 * e.scale, e.pos.z); e.bar.quaternion.copy(camera.quaternion); e.bar.userData.fg.scale.x = Math.max(0.001, e.hp / e.maxHp); }
      return;
    }
    case 'aim': { e.yaw = turnTo(e.yaw, face, dt * 5); if (!e.fired && e.st >= e.relT) { e.fired = true; if (!playerDown) fireArrow(e, T); } if (e.st >= e.aimDur) { e.state = 'chase'; e.atkCd = 2.0 + Math.random() * 1.6; } break; }
    case 'dead': {
      if (e.st > 0.7 && !e.dropped) { e.dropped = true; const big = e.kind === 'captain' || e.kind === 'shield'; const n = big ? 5 : 3; const p = e.pos.clone().setY(e.pos.y + 1); for (let i = 0; i < n; i++) dropSpoil('coin', p); if (big || Math.random() < 0.55 || G.wave === 1 && G.kills === 1) dropSpoil('armour', p); }
      if (e.st > 3.5) e.pos.y -= dt * 0.6; if (e.st > 5) { e.remove(); scene.remove(e.bar); e.gone = true; }
      e.update(dt); return;
    }
  }
  e.pos.addScaledVector(e.vel, dt);
  if (e.state !== 'spawn') { clampArena(e.pos, 0.3); collide(e.pos, 0.35); }
  ground(e); e.update(dt);
  // bar
  e.bar.visible = e.alive && e.obj.visible; if (e.bar.visible) { e.bar.position.set(e.pos.x, e.pos.y + 2.25 * e.scale, e.pos.z); e.bar.quaternion.copy(camera.quaternion); e.bar.userData.fg.scale.x = Math.max(0.001, e.hp / e.maxHp); }
}

function archerAI(e, dt, d, dx, dz, face, playerDown) {
  e.yaw = turnTo(e.yaw, face, dt * 6); let mv = 0;
  if (!playerDown && d < 6.5) { e.pos.x -= dx / d * 2.4 * dt; e.pos.z -= dz / d * 2.4 * dt; mv = 0.7; }
  else if (d > 13) { e.pos.x += dx / d * e.speed * dt; e.pos.z += dz / d * e.speed * dt; mv = 1; }
  else { e.pos.x += (dz / d) * e.strafe * 1.2 * dt; e.pos.z += (-dx / d) * e.strafe * 1.2 * dt; mv = 0.4; if (Math.random() < dt * 0.3) e.strafe *= -1; }
  e.play(mv > 0.8 ? 'Jog_Fwd_Loop' : mv > 0 ? 'Walk_Loop' : 'Idle_Loop', { ts: mv > 0.8 ? 0.95 : 1 });
  if (!playerDown && !P.bound && e.atkCd <= 0 && d < 22 && G.phase === 'play') {
    e.state = 'aim'; e.st = 0; e.fired = false; const ts = 0.55; e.aimDur = e.dur('Spell_Simple_Shoot') / ts + 0.25; e.relT = e.aimDur * 0.62;
    e.play('Spell_Simple_Shoot', { loop: false, ts, restart: true, fade: 0.12 }); flashAt(e.handPos(new THREE.Vector3()), 0.6, 0.6, 0xff7040);
  }
}


// ------------------------------------------------------------------ Level 3: Abram's trained servants (Genesis 14:14) and the captives
const ALLIES = [];
const SERVANT_TUNICS = [0xb49a70, 0x8a6a48, 0x9a8a6a, 0x6a5a40, 0xa0805a];
function spawnAllies(n) {
  clearAllies(); const st = STATS();
  for (let i = 0; i < n; i++) {
    const M6 = LEVEL === 6 ? STORY_L6.men[i % 3] : null; const a = new Actor('servant', M6 ? 1.0 : 0.95 + (i % 3) * 0.03, M6 ? M6.look : LEVEL === 5 ? 'isr_ally' : undefined); a.isAlly = true; if (M6) { a.name = M6.name; a.mult = M6.dmg; } a.slot = i; a.maxHp = a.hp = st.allyHp; a.atkCd = Math.random(); a.down = false;
    if (!M6) a.mat.userData.u.uTunic.value.set(SERVANT_TUNICS[i % SERVANT_TUNICS.length]);
    a.pos.set(P.pos.x + (i - (n - 1) / 2) * 1.5, 0, P.pos.z + 2.2 + (i % 2) * 0.8); ground(a); a.yaw = Math.PI; a.state = 'follow'; a.st = 0; a.play('Idle_Loop');
    a.bar = makeBar(0.6, 0x6ad07a); ALLIES.push(a);
  }
}
function clearAllies() { for (const a of ALLIES) { a.remove(); scene.remove(a.bar); } ALLIES.length = 0; }
function allySlot(a) {
  // beside Abram on both flanks (never between him and the camera); after Genesis 14:15 ("he divided himself against them") they spread wider
  const i = a.slot, f = P.yaw, fx = Math.sin(f), fz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  const side = i % 2 ? 1 : -1, rank = Math.floor(i / 2), w = (G.divided ? 4.4 : 1.9) + rank * 1.5, b = (G.divided ? -0.4 : 0.2) + rank * 0.9;
  return new THREE.Vector3(P.pos.x + rx * side * w - fx * b, 0, P.pos.z + rz * side * w - fz * b);
}
function hurtAlly(a, dmg, from) {
  if (a.down || G.phase !== 'play') return;
  a.hp -= dmg; a.flash = 1; const dir = tmpV.copy(a.pos).sub(from).setY(0).normalize();
  blood(a.pos.clone().setY(a.pos.y + 1.2), dir, 8, 0.7); a.vel.addScaledVector(dir, 4); LOG('ally_hit', { i: a.slot, hp: Math.round(a.hp) });
  if (a.hp <= 0) { a.hp = 0; a.down = true; a.state = 'down'; a.st = 0; a.play('Death01', { loop: false, fade: 0.1, restart: true }); a.bar.visible = false; if (a.flame) a.flame.visible = false; dmgText(a.pos.clone().setY(a.pos.y + 2), (a.name || 'SERVANT') + ' DOWN', ''); LOG('ally_down', { i: a.slot }); return; }
  if (a.state !== 'attack') { a.state = 'hit'; a.st = 0; a.play('Hit_Chest', { loop: false, ts: 1.4, restart: true, fade: 0.06 }); }
}
function updateAlly(a, dt) {
  a.st += dt; a.atkCd -= dt; a.vel.multiplyScalar(Math.pow(0.003, dt));
  if (a.benched) { // the people fled (2 Sam 23:9): this man falls back to the hold until the next battle
    const bx = a.benchX - a.pos.x, bz = 14 - a.pos.z, bd = Math.hypot(bx, bz); if (bd > 0.8) { a.pos.x += bx / bd * 5 * dt; a.pos.z += bz / bd * 5 * dt; a.yaw = turnTo(a.yaw, Math.atan2(bx, bz), dt * 8); a.play('Jog_Fwd_Loop'); } else { a.yaw = turnTo(a.yaw, Math.PI, dt * 3); a.play('Idle_Loop'); }
    a.bar.visible = false; clampArena(a.pos, 0.4); collide(a.pos, 0.35); ground(a); a.update(dt); return;
  }
  if (a.flame) { const k = 0.85 + Math.sin(now() * 14 + a.slot) * 0.1; a.flame.scale.set(0.24 * (2 - k), 0.46 * k, 1); }
  if (a.state === 'down') { if (a.st > 9 && G.phase === 'play') { a.down = false; a.state = 'follow'; a.hp = a.maxHp * 0.5; a.play('Idle_Loop', { fade: 0.5 }); if (a.flame) a.flame.visible = true; dmgText(a.pos.clone().setY(a.pos.y + 2), 'BACK ON HIS FEET', 'heal'); LOG('ally_up', { i: a.slot }); } ground(a); a.update(dt); return; }
  const live = G.phase === 'play' && !G.cine;
  let tg = null, td = 1e9;
  if (live) for (const e of G.enemies) { if (!e.alive || !e.obj.visible || (e.state === 'spawn' && e.st < 0.6)) continue; const d = e.pos.distanceTo(a.pos) + e.pos.distanceTo(P.pos) * 0.35 - (e.foe === a ? 2 : 0); if (d < td && e.pos.distanceTo(P.pos) < 16) { td = d; tg = e; } }
  switch (a.state) {
    case 'hit': if (a.st > 0.4) a.state = 'follow'; break;
    case 'attack': {
      if (a.tg && a.tg.alive && a.st < a.hitT) a.yaw = turnTo(a.yaw, Math.atan2(a.tg.pos.x - a.pos.x, a.tg.pos.z - a.pos.z), dt * 6);
      if (!a.hitDone && a.st >= a.hitT) { a.hitDone = true; SFX.swing(); const e = a.tg; if (e && e.alive && e.pos.distanceTo(a.pos) < 2.4) hurtEnemy(e, STATS().ally * (a.mult || 1) * (0.85 + Math.random() * 0.3), e.pos.clone().sub(a.pos).setY(0).normalize(), 'ally', false, a); }
      if (a.st >= a.atkDur) { a.state = 'follow'; a.atkCd = 0.6 + Math.random() * 0.7; }
      break;
    }
    default: {
      let goal, mv = 0;
      if (tg) { const dx = tg.pos.x - a.pos.x, dz = tg.pos.z - a.pos.z, d = Math.hypot(dx, dz);
        if (d > 1.6) { goal = tg.pos; } else { a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), dt * 8); if (a.atkCd <= 0) { a.state = 'attack'; a.st = 0; a.hitDone = false; a.tg = tg; const ts = 0.95; a.atkDur = a.dur('Sword_Attack') / ts; a.hitT = a.atkDur * 0.48; a.play('Sword_Attack', { loop: false, ts, restart: true, fade: 0.1 }); break; } a.play('Sword_Idle'); }
      } else goal = allySlot(a);
      if (goal) { const dx = goal.x - a.pos.x, dz = goal.z - a.pos.z, d = Math.hypot(dx, dz); if (d > (tg ? 1.4 : 0.9)) { mv = d > 4 ? 1 : 0.55; const sp = (tg ? 4.6 : 5.6) * mv; a.pos.x += dx / d * sp * dt; a.pos.z += dz / d * sp * dt; a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), dt * 8); }
        else if (!tg) a.yaw = turnTo(a.yaw, P.yaw, dt * 3); }
      if (!tg || mv) a.play(mv > 0.8 ? 'Jog_Fwd_Loop' : mv > 0 ? 'Walk_Loop' : (live ? 'Sword_Idle' : 'Idle_Loop'), { ts: mv > 0.8 ? 1.0 : 1 });
    }
  }
  // keep apart from each other, from Abram and from the enemy
  for (const o of ALLIES) { if (o === a) continue; const ox = a.pos.x - o.pos.x, oz = a.pos.z - o.pos.z, od = Math.hypot(ox, oz); if (od < 1.1 && od > 0.01) { a.pos.x += ox / od * (1.1 - od) * 0.5; a.pos.z += oz / od * (1.1 - od) * 0.5; } }
  { const ox = a.pos.x - P.pos.x, oz = a.pos.z - P.pos.z, od = Math.hypot(ox, oz); if (od < 1.0 && od > 0.01) { a.pos.x += ox / od * (1.0 - od) * 0.6; a.pos.z += oz / od * (1.0 - od) * 0.6; } }
  for (const e of targets()) { const ox = a.pos.x - e.pos.x, oz = a.pos.z - e.pos.z, od = Math.hypot(ox, oz), r = 0.75 + (e.radius || 0.4) * 0.5; if (od < r && od > 0.01) { a.pos.x += ox / od * (r - od) * 0.6; a.pos.z += oz / od * (r - od) * 0.6; } }
  a.pos.addScaledVector(a.vel, dt); clampArena(a.pos, 0.4); collide(a.pos, 0.35); ground(a); a.update(dt);
  a.bar.visible = a.hp < a.maxHp && G.phase === 'play'; if (a.bar.visible) { a.bar.position.set(a.pos.x, a.pos.y + 2.15, a.pos.z); a.bar.quaternion.copy(camera.quaternion); a.bar.userData.fg.scale.x = Math.max(0.001, a.hp / a.maxHp); }
}
// captives: stand by one to cut the cords (Lot is among them, Genesis 14:12)
function spawnCaptives() {
  clearCaptives(); const names = ['LOT', 'A MAN OF SODOM', 'A MAN OF SODOM'];
  DAN.stakes.forEach(([x, z], i) => {
    const a = new Actor('captive', 0.97, i === 0 ? 'lot' : 'captive'); a.pos.set(x, 0, z); ground(a); a.yaw = Math.atan2(-x, 8 - z); a.play('Crouch_Idle_Loop');
    const ropes = []; a.root.traverse(o => { if (o.material === MAT.rope) ropes.push(o); });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    const y = hgt(x, z) + 0.06; ring.position.set(x, y, z); fill.position.set(x, y + 0.01, z); fill.scale.setScalar(0.001); scene.add(ring, fill);
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending })); mk.scale.setScalar(0.9); mk.renderOrder = 30; mk.position.set(x, y + 2.2, z); scene.add(mk);
    G.captives.push({ a, ropes, ring, fill, mk, name: names[i], prog: 0, freed: false, t: 0 });
  });
  LOG('captives', { n: G.captives.length });
}
function clearCaptives() { for (const c of G.captives || []) { c.a.remove(); scene.remove(c.ring, c.fill, c.mk); c.ring.geometry.dispose(); c.fill.geometry.dispose(); } G.captives = []; }
function captivesLeft() { return (G.captives || []).filter(c => !c.freed).length; }
function updateCaptives(dt) {
  const C = G.captives; if (!C || !C.length) return; let near = null;
  for (const c of C) {
    c.t += dt;
    if (!c.freed) {
      const d = Math.hypot(P.pos.x - c.a.pos.x, P.pos.z - c.a.pos.z);
      const inR = d < 1.45 && G.phase === 'play' && P.state !== 'dead' && !G.cine;
      c.prog = inR ? Math.min(1, c.prog + dt / 1.3) : Math.max(0, c.prog - dt * 0.4); if (inR) near = c;
      c.fill.scale.setScalar(Math.max(0.001, c.prog)); c.ring.material.opacity = 0.45 + 0.3 * Math.sin(c.t * 5); c.mk.material.opacity = 0.55 + 0.4 * Math.sin(c.t * 6);
      if (c.prog >= 1) freeCaptive(c);
    } else if (c.leave) {
      // walk back toward Abram's people, behind the line, and wait there
      const gx = c.home.x, gz = c.home.z, dx = gx - c.a.pos.x, dz = gz - c.a.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.4) { c.a.pos.x += dx / d * 3.2 * dt; c.a.pos.z += dz / d * 3.2 * dt; c.a.yaw = turnTo(c.a.yaw, Math.atan2(dx, dz), dt * 6); c.a.play('Jog_Fwd_Loop', { ts: 0.9 }); }
      else { c.leave = false; c.a.yaw = Math.PI; c.a.play('Idle_Loop'); }
    }
    ground(c.a); c.a.update(dt);
  }
  if (near && !G.freeTold) { G.freeTold = true; }
  if (near) prompt('CUTTING ' + near.name + '’S CORDS…'); else if (G.capPrompt) prompt('');
  G.capPrompt = !!near;
}
function freeCaptive(c) {
  c.freed = true; c.ropes.forEach(r => r.visible = false); scene.remove(c.ring, c.fill, c.mk);
  const w = c.a.pos.clone().setY(c.a.pos.y + 1.1); flashAt(w, 2.4, 0.5, 0xffe0a0); for (let i = 0; i < 3; i++) puff(w.clone(), 0.6, 0.8, new THREE.Vector3((Math.random() - 0.5) * 2, 1.4, (Math.random() - 0.5) * 2));
  SFX.buy(); SFX.burn(); prompt(''); G.capPrompt = false; dmgText(c.a.pos.clone().setY(c.a.pos.y + 2.3), c.name === 'LOT' ? 'LOT IS FREE!' : 'SET FREE', 'heal');
  c.a.play('Idle_Talking_Loop', { fade: 0.3 }); c.home = new THREE.Vector3(-7 + G.captives.indexOf(c) * 2.2, 0, 15.5);
  setTimeout(() => { if (c.freed) c.leave = true; }, 1200);
  const left = captivesLeft(); LOG('captive_freed', { name: c.name, left });
  $('wave').textContent = seqTag() + (left ? `FREE THE CAPTIVES · ${3 - left} / 3` : 'THE CAPTIVES ARE FREE');
  if (c.name === 'LOT') toast('<b>Lot is free.</b> Your brother’s son, taken from Sodom, stands up from the cords.', 3000);
  else if (!left) toast('<b>All the captives are free.</b> Finish the guard.', 2600);
}

// ------------------------------------------------------------------ spoils update
function updateSpoils(dt) {
  for (const s of spoils) {
    if (!s.live) continue; s.t += dt; const m = s.m;
    if (!s.grounded) { s.v.y -= 16 * dt; m.position.addScaledVector(s.v, dt); const gy = hgt(m.position.x, m.position.z) + 0.25; if (m.position.y < gy && s.v.y < 0) { m.position.y = gy; s.grounded = true; } }
    m.rotation.y += dt * 3; if (s.grounded) m.position.y = hgt(m.position.x, m.position.z) + 0.3 + Math.sin(s.t * 4) * 0.06;
    const dx = P.pos.x - m.position.x, dz = P.pos.z - m.position.z, d = Math.hypot(dx, dz);
    if (s.t > 0.6 && P.alive !== false && (d < 3.2 || s.t > 7)) { const k = Math.min(1, dt * (s.t > 7 ? 6 : 10)); m.position.x += dx * k; m.position.z += dz * k; m.position.y += (P.pos.y + 1 - m.position.y) * k; }
    if (s.t > 0.6 && d < 0.6) {
      s.live = false; m.visible = false;
      if (s.type === 'coin') { G.coins++; SFX.coin(); } else { G.armour++; SFX.buy(); dmgText(P.pos.clone().setY(P.pos.y + 2.2), '+ bronze', 'coin'); }
      LOG('spoil', { type: s.type });
    }
  }
}

// ------------------------------------------------------------------ Goliath
function spawnGoliath() {
  const b = new Actor('goliath', 2.25); b.isBoss = true; b.radius = 1.0;
  b.pos.set(0, 0, -27); ground(b); b.yaw = 0; b.maxHp = b.hp = 360; b.state = 'intro'; b.st = 0; b.chargeCd = 3; b.atkCd = 1.5;
  b.play('Walk_Loop', { ts: 0.7 }); G.boss = b;
  // head marker (shows when the head is open)
  b.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  b.marker.scale.setScalar(1.3); b.marker.renderOrder = 30; b.marker.visible = false; scene.add(b.marker);
  return b;
}
function spawnKing() {
  // Chedorlaomer king of Elam (Genesis 14:1, 9, 17)
  const b = new Actor('goliath', 1.3, 'ched'); b.isBoss = true; b.radius = 0.75;
  b.pos.set(0, 0, -27); ground(b); b.yaw = 0; b.maxHp = b.hp = Math.round(860 * STORY_L3.hard.kingHp); b.state = 'intro'; b.st = 0; b.chargeCd = 3.5; b.atkCd = 1.5;
  b.play('Walk_Loop', { ts: 0.8 }); G.boss = b;
  b.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  b.marker.scale.setScalar(1.0); b.marker.renderOrder = 30; b.marker.visible = false; scene.add(b.marker);
  return b;
}
function bossWindow(b) { return b.state === 'stunned' || b.state === 'dazed'; }
function hurtBoss(b, dmg, dir, src) {
  if (!b.alive) return;
  if (LEVEL === 4) {
    // the lion and the Egyptian: open after a pounce, a slam or a charge into the wall; the Egyptian's own spear hits much harder
    const open = bossWindow(b) || b.state === 'reel', sp = P.hasSpear ? 1.8 : 1, k = (open ? (b.openK || 1.3) : 0.3) * sp, v = dmg * k; b.hp -= v; b.flash = open ? 1 : 0.6;
    const hp = b.headPos(new THREE.Vector3());
    if (open) { blood(hp, dir, 18, 1.2); flashAt(hp, 2.0, 0.22, 0xfff0d0); SFX.hit(); hitstop(0.08); shake(0.3); } else { SFX.clang(); flashAt(hp.clone().addScaledVector(dir, -0.4), 1.2, 0.15, 0xffe0a0); }
    dmgText(hp.setY(hp.y + 0.9), Math.round(v) + (open ? '!' : ''), open ? 'crit' : '');
    if (!open && !b.clangTold) { b.clangTold = true; toast(b.isLion ? 'The lion is too quick. <b>Dodge its pounce</b>, then strike while it is open.' : 'His spear keeps you off. <b>Dodge his sweep and his charge</b>, then strike when he stumbles.', 3500); }
    LOG('boss_hit', { src, dmg: Math.round(v), hp: Math.round(b.hp), open });
    if (b.isEgypt && !b.disarmed && b.hp <= b.maxHp * STORY_L4.egypt.disarmAt) { b.hp = Math.max(b.hp, 1); disarmEgyptian(b); return; }
    if (b.hp <= 0) { b.hp = 0; killBoss(b); }
    return;
  }
  if (LEVEL === 3) {
    const open = bossWindow(b) || b.state === 'reel', k = open ? 1.5 : 0.35, v = dmg * k; b.hp -= v; b.flash = open ? 1 : 0.6;
    const hp = b.pos.clone().setY(b.pos.y + 1.7);
    if (open) { blood(hp, dir, 18, 1.2); flashAt(hp, 2.0, 0.22, 0xfff0d0); SFX.hit(); hitstop(0.08); shake(0.3); } else { SFX.clang(); flashAt(hp.clone().addScaledVector(dir, -0.4), 1.2, 0.15, 0xffe0a0); }
    dmgText(hp.setY(hp.y + 1.3), Math.round(v) + (open ? '!' : ''), open ? 'crit' : '');
    if (!open && !b.clangTold) { b.clangTold = true; toast('His bronze turns the blow. <b>Dodge his cleave and his charge</b>, then strike when he stumbles.', 3500); }
    LOG('boss_hit', { src, dmg: Math.round(v), hp: Math.round(b.hp), open });
    if (b.hp <= 0) { b.hp = 0; killBoss(b); }
    return;
  }
  const chip = src === 'staff' ? 4 : dmg; b.hp = Math.max(b.hp > 30 ? 30 : b.hp, b.hp - chip); b.flash = 0.6;
  SFX.clang(); flashAt(b.pos.clone().setY(b.pos.y + 2.4), 1.2, 0.15, 0xffe0a0); dmgText(b.pos.clone().setY(b.pos.y + 4.2), Math.round(chip));
  if (!G.boss.clangTold) { G.boss.clangTold = true; toast('His coat of mail turns the blow. <b>Strike his forehead with the sling</b> when he stumbles.', 3500); }
  LOG('boss_chip', { src, hp: Math.round(b.hp) });
}
function bossHeadHit(b, s) {
  if (LEVEL === 3 || LEVEL === 4) return hurtBoss(b, s.dmg * (LEVEL === 4 ? 0.45 : 1.4), s.v.clone().setY(0).normalize(), 'sling');
  const p = b.headPos(new THREE.Vector3()); const open = bossWindow(b);
  if (!open) { SFX.clang(); flashAt(p, 1.4, 0.2, 0xffe6a0); b.hp = Math.max(30, b.hp - 6); dmgText(p, 'CLANG', ''); toast('“…an helmet of brass upon his head…” Wait until he stumbles!<i>1 SAMUEL 17:5</i>', 2600); LOG('boss_head_blocked'); return; }
  const dmg = 60 + 15 * G.up.sling; b.hp -= dmg; b.flash = 1; LOG('boss_head', { dmg, hp: Math.round(b.hp) });
  SFX.hit(); SFX.clang(); blood(p, s.v.clone().setY(0).normalize(), 22, 1.3); flashAt(p, 2.2, 0.25); dmgText(p, Math.round(dmg) + '!', 'crit'); hitstop(0.12); shake(0.5);
  if (b.hp <= 0) { b.hp = 0; killBoss(b); return; }
  b.state = 'reel'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.8, restart: true, fade: 0.08 }); prompt('');
}
function killBoss(b) {
  b.alive = false; b.state = 'dead'; b.st = 0; LOG('boss_dead'); prompt(''); b.marker.visible = false;
  if (LEVEL === 4) {
    b.play('Death01', { loop: false, ts: 0.8, fade: 0.1, restart: true }); G.slow = 0.3; G.slowT = 1.6; shake(0.8);
    blood(b.headPos(new THREE.Vector3()), new THREE.Vector3(0, 0, -1), 26, 1.4); flashAt(b.headPos(new THREE.Vector3()), 3, 0.3, 0xffe0b0);
    if (b.isLion) {
      SFX.roar(); setTimeout(() => { toast('“…also he went down and slew a lion in a pit in a snowy day.”<i>1 CHRONICLES 11:22 (KJV)</i>', 3800); }, 1200);
      setTimeout(async () => { if (G.phase === 'lost') return; await upgradePanel('FACE THE EGYPTIAN'); egyptFight(); }, 4400);
    } else {
      setTimeout(() => { toast('“…and plucked the spear out of the Egyptian’s hand, and slew him with his own spear.”<i>2 SAMUEL 23:21 (KJV)</i>', 4000); }, 1200);
      setTimeout(() => { if (G.phase !== 'lost') endingL4(); }, 4600);
    }
    return;
  }
  if (LEVEL === 3) {
    b.play('Death01', { loop: false, ts: 0.8, fade: 0.1, restart: true }); SFX.roar(); G.slow = 0.3; G.slowT = 1.6; shake(0.8);
    blood(b.pos.clone().setY(b.pos.y + 1.6), new THREE.Vector3(0, 0, -1), 26, 1.4); flashAt(b.pos.clone().setY(b.pos.y + 1.6), 3, 0.3, 0xffe0b0);
    setTimeout(() => { toast('“…the slaughter of Chedorlaomer, and of the kings that were with him…”<i>GENESIS 14:17 (KJV)</i>', 3800); }, 1200);
    setTimeout(() => { if (G.phase !== 'lost') chaseToHobah(); }, 4200);
    return;
  }
  b.play('Hit_Head', { loop: false, ts: 0.6, restart: true, fade: 0.1 }); b.faceDown = true; b.landed = false; SFX.roar(); // he falls forward, upon his face (1 Sam 17:49)
  G.slow = 0.3; G.slowT = 1.6;
  setTimeout(() => { toast('“…and smote the Philistine in his forehead, that the stone sunk into his forehead; and he fell upon his face to the earth.”<i>1 SAMUEL 17:49 (KJV)</i>', 4200); }, 1300);
  setTimeout(() => { if (G.phase !== 'lost') afterGoliath(); }, 5200);
}
function updateBoss(b, dt) {
  b.st += dt; b.vel.multiplyScalar(Math.pow(0.01, dt));
  const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z, d = Math.hypot(dx, dz), face = Math.atan2(dx, dz);
  const pd = P.state === 'dead'; const MEL = LEVEL === 3 || LEVEL === 4;
  switch (b.state) {
    case 'intro': b.pos.z += 2.7 * dt; b.play('Walk_Loop', { ts: 0.85 }); if (b.pos.z > -14) { b.pos.z = -14; b.play('Idle_Loop'); } break;
    case 'stalk': {
      b.yaw = turnTo(b.yaw, face, dt * 2.2); b.chargeCd -= dt; b.atkCd -= dt; b.stalkT = (b.stalkT || 0) + dt;
      if (!pd && d > (MEL ? 2.6 : 3.6)) { const sp = b.isLion ? 3.0 : MEL ? 2.3 : 1.9; b.pos.x += dx / d * sp * dt; b.pos.z += dz / d * (b.isLion ? sp : 1.9) * dt; b.play('Walk_Loop', { ts: 0.75 }); } else b.play('Sword_Idle');
      if (pd) break;
      if (d < (b.slamOff ? b.slamOff + 1.7 : MEL ? 3.8 : 5.2) && b.atkCd <= 0) { b.stalkT = 0; b.state = 'slamWind'; b.st = 0; const sts = b.isLion ? 1.05 : MEL ? 0.62 : 0.5; b.play('Sword_Attack', { loop: false, ts: sts, restart: true, fade: 0.2 }); b.slamDur = b.dur('Sword_Attack') / sts; b.slamT = b.slamDur * 0.5; SFX.roar(); LOG('boss_slam_wind'); }
      else if ((d > 7.5 || (b.stalkT > 4 && d > 4.5)) && b.chargeCd <= 0) { b.stalkT = 0; b.state = 'chargeWind'; b.st = 0; b.play('Idle_Talking_Loop', { fade: 0.2 }); SFX.roar(); prompt('HE CHARGES — DODGE!'); LOG('boss_charge_wind'); }
      break;
    }
    case 'slamWind': {
      if (b.st < b.slamT * 0.7) b.yaw = turnTo(b.yaw, face, dt * 2.5);
      const L3 = MEL, RR = b.slamR || (L3 ? 2.6 : 3.3); const c = b.pos.clone().add(new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)).multiplyScalar(b.slamOff || (L3 ? 1.8 : 2.6))); c.y = hgt(c.x, c.z) + 0.06; b.slamC = c;
      const k = Math.min(1, b.st / b.slamT); FX.ring.visible = FX.ringFill.visible = true; FX.ring.position.copy(c); FX.ringFill.position.copy(c).setY(c.y + 0.01); FX.ring.scale.setScalar(RR); FX.ringFill.scale.setScalar(RR * k); FX.ring.material.opacity = 0.85; FX.ringFill.material.opacity = 0.25 + 0.2 * k;
      if (b.st >= b.slamT) {
        FX.ring.visible = FX.ringFill.visible = false; SFX.slam(); shake(0.7); flashAt(c.clone().setY(c.y + 0.4), 5, 0.35, 0xffc890);
        for (let i = 0; i < 3; i++) blood(c.clone(), new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5), 0, 0);
        const pdx = P.pos.x - c.x, pdz = P.pos.z - c.z; if (Math.hypot(pdx, pdz) < RR) damagePlayer(b.isLion ? 28 : L3 ? 30 : 34, c); if (b.isLion) { b.pos.x = c.x; b.pos.z = c.z; } if (L3) for (const a of ALLIES) if (!a.down && Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < RR) hurtAlly(a, 30, c);
        b.state = 'stunned'; b.st = 0; b.play('Idle_Loop', { ts: 0.35, fade: 0.4 }); prompt(b.isLion ? 'NOW — STRIKE!' : MEL ? 'NOW — STRIKE HIM!' : 'NOW — SLING HIS FOREHEAD!'); LOG('boss_window', { why: 'slam' }); b.atkCd = 2.2;
      }
      break;
    }
    case 'stunned': if (b.st > 2.6 * (b.winK || 1)) { b.state = 'stalk'; prompt(''); } break;
    case 'chargeWind': {
      b.yaw = turnTo(b.yaw, face, dt * 5);
      if (b.st > 0.95) { b.state = 'charge'; b.st = 0; b.cdir = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw)); b.play('Sprint_Loop', { ts: 0.8, fade: 0.1 }); b.hitP = false; prompt(''); }
      break;
    }
    case 'charge': {
      b.pos.addScaledVector(b.cdir, (MEL ? 10.5 : 12) * dt); shake(0.12);
      if (!b.hitP && Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z) < 1.7) { b.hitP = true; damagePlayer(25, b.pos); P.vel.addScaledVector(b.cdir, 10); }
      const out = b.pos.x < ARENA.x0 + 1.5 || b.pos.x > ARENA.x1 - 1.5 || b.pos.z < ARENA.z0 + 1.5 || b.pos.z > ARENA.z1 - 1.5 || collide(b.pos, 0.9);
      if (b.st > 1.5 || out) { b.state = 'dazed'; b.st = 0; b.chargeCd = 4.6 + Math.random() * 2; SFX.slam(); shake(0.5); flashAt(b.pos.clone().setY(b.pos.y + 1), 3, 0.3, 0xffd6a0); b.play('Hit_Head', { loop: false, ts: 0.5, restart: true, fade: 0.1 }); prompt(b.isLion ? 'IT IS DAZED — STRIKE!' : MEL ? 'HE STUMBLES — STRIKE HIM!' : 'HE STUMBLES — SLING HIS FOREHEAD!'); LOG('boss_window', { why: 'charge' }); }
      break;
    }
    case 'dazed': if (b.st > 1.1 && b.curName !== 'Idle_Loop') b.play('Idle_Loop', { ts: 0.35, fade: 0.4 }); if (b.st > 2.9 * (b.winK || 1)) { b.state = 'stalk'; prompt(''); } break;
    case 'reel': if (b.st > 1.0) { b.state = 'stalk'; b.atkCd = 0.6; b.chargeCd = Math.min(b.chargeCd, 1.5); } break;
    case 'dead': break;
  }
  if (b.state !== 'charge' && b.state !== 'intro') { clampArena(b.pos, 1); if (b.alive) collide(b.pos, 0.9); }
  if (b.alive && !b.summoned && b.hp < b.maxHp * 0.5 && b.state !== 'intro') { b.summoned = true; if (LEVEL === 3) { spawnEnemy('phil', -26, -14, 0); spawnEnemy('phil', 26, -12, 0.8); spawnEnemy('archer', 0, -27, 1.4); SFX.horn(); toast('<b>The king’s guard rushes to his side!</b> Your servants meet them.', 2600); } else { spawnEnemy('phil', -34, -6, 0); spawnEnemy('phil', 34, -4, 0.8); SFX.horn(); toast('<b>The Philistines rush to aid their champion!</b>', 2600); } LOG('boss_summon'); }
  if (b.state === 'dead' && b.faceDown && LEVEL !== 3) { const k = Math.min(1, b.st / 1.05); b.root.rotation.x = (k * k) * (Math.PI / 2 - 0.08); if (k >= 1 && !b.landed) { b.landed = true; SFX.slam(); shake(0.9); for (let i = 0; i < 6; i++) puff(b.pos.clone().add(new THREE.Vector3(Math.sin(b.yaw) * (1.5 + i * 0.6), 0.3, Math.cos(b.yaw) * (1.5 + i * 0.6))), 2.5, 1.6); } }
  ground(b); b.update(dt);
  const open = b.alive && bossWindow(b); b.marker.visible = open; if (open) { b.headPos(b.marker.position); b.marker.material.opacity = 0.55 + 0.45 * Math.sin(now() * 10); }
}

// ------------------------------------------------------------------ angel rescue
function startAngel() {
  G.angelUsed = true; $('angel-ico').classList.add('used'); LOG('angel');
  const a = ANGEL; a.obj.visible = true; G.angelOff = new THREE.Vector3(Math.cos(CAM.yaw) * 1.3 + Math.sin(CAM.yaw) * 1.2, 0, -Math.sin(CAM.yaw) * 1.3 + Math.cos(CAM.yaw) * 1.2); a.pos.set(P.pos.x + G.angelOff.x, P.pos.y + 5, P.pos.z + G.angelOff.z); a.yaw = P.yaw + Math.PI; a.play('Spell_Simple_Shoot', { loop: true, ts: 0.4 });
  G.angel = { t: 0, healed: false }; SFX.angel(); FX.pillar.visible = true; FX.pillar.position.set(P.pos.x, P.pos.y - 1, P.pos.z);
  toast(LEVEL === 3 ? '“…Fear not, Abram: I am thy shield, and thy exceeding great reward.”<i>GENESIS 15:1 (KJV) · ANGEL RESCUE</i>' : LEVEL === 2 ? '“But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles…”<i>ISAIAH 40:31 (KJV) · ANGEL RESCUE</i>' : '“For he shall give his angels charge over thee, to keep thee in all thy ways.”<i>PSALM 91:11 (KJV) · ANGEL RESCUE</i>', 4200);
  G.slow = 0.45; G.slowT = 1.2;
}
function updateAngel(dt) {
  const A = G.angel; if (!A) return; A.t += dt; const a = ANGEL;
  const ty = P.pos.y + 0.9; a.pos.x += (P.pos.x + G.angelOff.x - a.pos.x) * dt * 3; a.pos.z += (P.pos.z + G.angelOff.z - a.pos.z) * dt * 3;
  if (A.t < 3) a.pos.y += (ty - a.pos.y) * Math.min(1, dt * 5); else a.pos.y += dt * 6;
  a.yaw = turnTo(a.yaw, Math.atan2(P.pos.x - a.pos.x, P.pos.z - a.pos.z), dt * 4);
  FX.pillar.material.opacity = Math.max(0, Math.min(0.35, A.t * 0.4, (4.2 - A.t) * 0.3)); FX.pillar.position.set(P.pos.x, P.pos.y - 1, P.pos.z);
  a.mat.userData.u.uGlow.value = 0.8 + Math.sin(A.t * 6) * 0.15;
  if (!A.healed && A.t > 1.1) {
    A.healed = true; const st = STATS(); const gain = st.maxHp - P.hp; P.hp = st.maxHp; dmgText(P.pos.clone().setY(P.pos.y + 2.3), '+' + Math.round(gain), 'heal'); flashAt(P.pos.clone().setY(P.pos.y + 1.2), 6, 0.6, 0xfff0c0); SFX.win();
    for (const e of G.enemies) if (e.alive) { const dir = e.pos.clone().sub(P.pos).setY(0).normalize(); e.vel.addScaledVector(dir, 12); e.state = 'hit'; e.st = 0; e.stun = 2.2; e.play('Hit_Chest', { loop: false, restart: true }); if (e.attacking) { attackers--; e.attacking = false; } }
    if (G.boss && G.boss.alive && G.boss.state !== 'intro') { const b = G.boss; b.vel.addScaledVector(b.pos.clone().sub(P.pos).setY(0).normalize(), 6); b.state = 'dazed'; b.st = 0; b.play('Hit_Head', { loop: false, ts: 0.5, restart: true }); prompt(LEVEL === 3 ? 'HE STUMBLES — STRIKE HIM!' : 'HE STUMBLES — SLING HIS FOREHEAD!'); }
    if (P.state === 'hit' || P.state === 'dead') P.state = 'idle';
    for (const a of ALLIES) if (a.down) a.st = 99;
    if (ESC && G.stage === 'escape') for (const h of ESC.hunters) if (h.pos.distanceTo(P.pos) < 16) { h.state = 'stun'; h.st = 0; h.stun = 3.2; h.vel.addScaledVector(h.pos.clone().sub(P.pos).setY(0).normalize(), 9); h.play('Hit_Head', { loop: false, restart: true }); }
  }
  a.update(dt);
  if (A.t > 4.4) { a.obj.visible = false; FX.pillar.visible = false; G.angel = null; }
}

// ------------------------------------------------------------------ UI: cards, upgrades, flow
function card({ who, text = '', verse = '', ref = '', tips = '', btn = 'CONTINUE', btn2 = '' }) {
  return new Promise((res) => {
    $('card-who').textContent = who; $('card-text').innerHTML = text; $('card-verse').innerHTML = verse; $('card-ref').textContent = ref; $('card-tips').innerHTML = tips;
    $('card-verse').style.display = verse ? '' : 'none'; $('card-ref').style.display = ref ? '' : 'none';
    $('card-btn').textContent = btn; show('card'); const b2 = $('card-btn2'); b2.style.display = btn2 ? '' : 'none'; b2.textContent = btn2 || '';
    const done = (v = true) => { show('card', false); $('card-btn').onclick = null; b2.onclick = null; res(v); };
    $('card-btn').onclick = () => { audioInit(); done(true); }; b2.onclick = () => done(false);
    if (BOT) setTimeout(done, 900);
  });
}
const UPG1 = [
  { k: 'staff', ic: '🪵', nm: 'SHEPHERD’S STAFF', ds: '+30% staff damage', cost: { coin: 5 }, max: 3 },
  { k: 'sling', ic: '🪨', nm: 'SMOOTH STONES', ds: '+40% sling damage, faster reload', cost: { coin: 5 }, max: 3 },
  { k: 'bronze', ic: '🛡️', nm: 'PHILISTINE BRONZE', ds: '+30 max health, full heal', cost: { armour: 2 }, max: 3 },
];
const UPG2 = [
  { k: 'jaw', ic: '🦴', nm: 'THE JAWBONE', ds: '+30% jawbone damage', cost: { coin: 7 }, max: 3 },
  { k: 'spirit', ic: '🔥', nm: 'THE NAZARITE VOW', ds: 'Spirit fills faster, stronger shockwave and heave', cost: { coin: 8 }, max: 3 },
  { k: 'bronze', ic: '🛡️', nm: 'PHILISTINE BRONZE', ds: '+30 max health, full heal (carries over)', cost: { armour: 3 }, max: 5 },
];
const UPG3 = [
  { k: 'sword', ic: '⚔️', nm: 'ABRAM’S SWORD', ds: '+30% sword damage', cost: { coin: 6 }, max: 3 },
  { k: 'bow', ic: '🏹', nm: 'THE BOW', ds: '+40% arrow damage, faster draw', cost: { coin: 6 }, max: 3 },
  { k: 'men', ic: '🔥', nm: 'TRAINED SERVANTS', ds: 'Your servants hit harder and stand longer', cost: { coin: 7 }, max: 3 },
  { k: 'bronze', ic: '🛡️', nm: 'BRONZE OF ELAM', ds: '+30 max health, full heal (carries over)', cost: { armour: 3 }, max: 5 },
];
const UPG5 = [
  { k: 'sword', ic: '⚔️', nm: 'BARAK’S SWORD', ds: '+30% sword damage', cost: { coin: 6 }, max: 3 },
  { k: 'bow', ic: '🏹', nm: 'THE BOW', ds: '+40% arrow damage, faster draw', cost: { coin: 6 }, max: 3 },
  { k: 'men', ic: '🛡️', nm: 'TEN THOUSAND MEN', ds: 'Your men hit harder and stand longer', cost: { coin: 7 }, max: 3 },
  { k: 'bronze', ic: '🛡️', nm: 'BRONZE OF ISRAEL', ds: '+30 max health, full heal (carries over)', cost: { armour: 3 }, max: 5 },
];
let UPG = UPG1;
function saveProgress() { SAVE.coins = G.coins; SAVE.armour = G.armour; SAVE.up = Object.assign(UP0(), G.up); writeSave(); }
function canBuy(u) { return (u.cost.coin || 0) <= G.coins && (u.cost.armour || 0) <= G.armour && G.up[u.k] < (u.max || 3); }
function buy(u) { if (!canBuy(u)) return false; G.coins -= u.cost.coin || 0; G.armour -= u.cost.armour || 0; G.up[u.k]++; if (u.k === 'bronze') P.hp = STATS().maxHp; if (u.k === 'men') for (const a of ALLIES) { const r = a.hp / a.maxHp; a.maxHp = STATS().allyHp; a.hp = a.maxHp * Math.max(r, 0.6); } SFX.buy(); LOG('upgrade', { k: u.k, lvl: G.up[u.k] }); return true; }
function upgradePanel(nextLabel) {
  return new Promise((res) => {
    const box = $('upcards');
    const render = () => {
      $('u-coins').textContent = G.coins; $('u-armour').textContent = G.armour; box.innerHTML = '';
      for (const u of UPG) {
        const c = document.createElement('button'); c.className = 'upc' + (canBuy(u) ? '' : ' cant');
        const cost = u.cost.coin ? `<span class="coin"></span>${u.cost.coin}` : `<span class="armour"></span>${u.cost.armour}`;
        c.innerHTML = `<div class="ic">${u.ic}</div><div class="nm">${u.nm}</div><div class="ds">${u.ds}</div><div class="lv">Level ${G.up[u.k]} / ${u.max || 3}</div><div class="cost">${G.up[u.k] >= (u.max || 3) ? 'MAX' : cost}</div>`;
        c.onclick = () => { if (buy(u)) { render(); box.children[UPG.indexOf(u)].classList.add('bought'); } };
        box.appendChild(c);
      }
    };
    render(); $('up-go').textContent = nextLabel; show('upgrade'); G.phase = 'upgrade';
    const go = () => { show('upgrade', false); $('up-go').onclick = null; saveProgress(); res(); };
    $('up-go').onclick = go;
    if (BOT) { let n = 0; const tick = () => { const u = UPG.find(canBuy); if (u && n++ < 6) { buy(u); render(); setTimeout(tick, 250); } else setTimeout(go, 500); }; setTimeout(tick, 400); }
  });
}
const WAVES = [
  { name: 'WAVE 1 · THE PHILISTINES COME DOWN', list: [['phil', -6, -32], ['phil', 0, -34], ['phil', 6, -32]] },
  { name: 'WAVE 2 · THEIR CAPTAIN JOINS', list: [['phil', -12, -30], ['phil', 12, -30], ['captain', 0, -35], ['phil', -36, -4], ['phil', 36, -2]] },
  { name: 'WAVE 3 · THE HOST OF GATH', list: [['phil', -8, -32], ['phil', 8, -32], ['captain', -16, -34], ['captain', 16, -34], ['phil', -36, 4], ['phil', 36, 6], ['phil', 0, -40], ['phil', -36, -10]] },
];
const WAVES2 = [
  { name: 'LEHI · THE PHILISTINES SHOUT', list: [['phil', -5, -27], ['phil', 4, -28], ['phil', 11, -25], ['phil', -12, -24], ['phil', 0, -32]] },
  { name: 'WAVE 2 · ARCHERS ON THE RIDGE', list: [['phil', -8, -28], ['phil', 8, -28], ['archer', -20, -25], ['archer', 20, -25], ['phil', 0, -31], ['archer', 0, -35], ['captain', -26, -6]] },
  { name: 'WAVE 3 · THE SHIELD WALL', list: [['shield', -6, -27], ['shield', 6, -27], ['captain', 0, -31], ['archer', -22, -22], ['archer', 22, -22], ['phil', -31, 4], ['phil', 31, 6], ['phil', 0, -36], ['shield', 12, -30]] },
];
const WAVES3 = [
  { name: 'DAN · BY NIGHT, THE CAMP SLEEPS', list: [['phil', -14, -16], ['phil', 13, -17], ['phil', -4, -23], ['phil', 6, -24], ['archer', 0, -27]] },
  { name: 'FREE THE CAPTIVES · 0 / 3', captives: true, list: [['phil', -18, -8], ['phil', 18, -6], ['archer', -8, -24], ['archer', 9, -24], ['phil', 5, -21], ['phil', -2, -25], ['captain', 0, -28]] },
  { name: 'HE DIVIDED HIMSELF AGAINST THEM', divided: true, list: [['shield', -6, -24], ['shield', 7, -24], ['captain', 0, -27], ['archer', -20, -18], ['archer', 20, -17], ['phil', -26, 2], ['phil', 26, 4], ['phil', -26, -8], ['phil', 26, -6], ['shield', -12, -27]] },
];
const WAVES4 = [
  { name: 'MOAB · RAIDERS ON THE BORDER', list: [['phil', -10, -15], ['phil', 9, -16], ['phil', -2, -20], ['archer', 4, -22], ['phil', -24, 2], ['phil', 24, 0], ['captain', 0, -18], ['archer', -6, -22]] },
  { name: 'THE TWO LIONLIKE MEN OF MOAB', list: [['lionman', -4, -17], ['lionman', 5, -18], ['phil', -14, -12], ['phil', 14, -12], ['archer', -8, -21], ['archer', 9, -21], ['shield', -2, -20], ['phil', -24, 4], ['phil', 24, 2]] },
];
// Level 6, sequence 1: the eight hundred (each soldier is weaker: STORY_L6.horde.hp)
const WAVES6 = [
  { name: 'THE HOST COMES AGAINST ADINO', horde: true, list: [['phil', -10, -18], ['phil', -6, -20], ['phil', -2, -21], ['phil', 2, -21], ['phil', 6, -20], ['phil', 10, -18], ['phil', -24, -6], ['phil', 24, -6], ['captain', 0, -22], ['phil', -24, 4], ['phil', 24, 4], ['archer', -14, -21]] },
  { name: 'THEY COME ON IN THEIR HUNDREDS', horde: true, list: [['phil', -12, -19], ['phil', -8, -21], ['phil', -4, -22], ['phil', 0, -22], ['phil', 4, -22], ['phil', 8, -21], ['phil', 12, -19], ['captain', -6, -22], ['captain', 6, -22], ['shield', 0, -20], ['phil', -25, -2], ['phil', 25, -2], ['phil', -25, 8], ['phil', 25, 8], ['archer', 14, -21], ['archer', -16, -20]] },
];
const UPG6 = [
  { k: 'sword', ic: '⚔️', nm: 'DAVID’S SWORD', ds: '+30% sword damage', cost: { coin: 6 }, max: 3 },
  { k: 'bow', ic: '🏹', nm: 'A BOW OF STEEL', ds: '+40% arrow damage, faster draw', cost: { coin: 6 }, max: 3 },
  { k: 'men', ic: '🛡️', nm: 'THE MIGHTY MEN', ds: 'Adino, Eleazar and Shammah hit harder and stand longer', cost: { coin: 7 }, max: 3 },
  { k: 'bronze', ic: '🛡️', nm: 'BRONZE OF ISRAEL', ds: '+30 max health, full heal (carries over)', cost: { armour: 3 }, max: 5 },
];
const WAVES5 = [
  { name: 'THE HOST OF SISERA', list: [['phil', -10, -15], ['phil', 9, -16], ['phil', -2, -18], ['archer', 5, -20], ['phil', -24, 0], ['phil', 24, 2], ['captain', 0, -17]] },
  { name: 'THEY GATHER AT KISHON', list: [['shield', -6, -16], ['shield', 7, -16], ['captain', 0, -18], ['archer', -14, -17], ['archer', 14, -17], ['phil', -24, 4], ['phil', 24, 6], ['phil', -22, -10], ['phil', 22, -10]] },
];
const curWaves = () => LEVEL === 6 ? WAVES6 : LEVEL === 5 ? WAVES5 : LEVEL === 4 ? WAVES4 : LEVEL === 3 ? WAVES3 : LEVEL === 2 ? WAVES2 : WAVES;
function startWave(i) {
  G.wave = i + 1; G.phase = 'play'; const w = curWaves()[i]; const SQW = STORY[LEVEL] && STORY[LEVEL].waveSeq; if (SQW && SQW[i] !== G.seq) seqBanner(SQW[i]); $('wave').textContent = seqTag() + w.name; toast(`<b>${w.name}</b>`, 2200); SFX.horn();
  if (w.captives && DAN) { spawnCaptives(); setTimeout(() => toast('Lot and the people are bound at the stakes. <b>Stand by a captive</b> to cut his cords.', 3600), 2300); }
  if (w.divided) { G.divided = true; setTimeout(() => toast('“And he divided himself against them, he and his servants, by night, and smote them…”<i>GENESIS 14:15 (KJV)</i>', 4200), 2200); }
  G.horde = !!w.horde; if (w.horde && LEVEL === 6) { if (i === 0 || L6.k0 == null) { L6.k0 = G.kills; L6.total = WAVES6.reduce((s, v) => s + v.list.length, 0); } if (i === 0) setTimeout(() => toast(STORY_L6.horde.verse + `<i>${STORY_L6.horde.ref} (KJV)</i>`, 4600), 2300); }
  w.list.forEach(([k, x, z], j) => spawnEnemy(k, x, z, j * (w.horde ? 0.45 : 0.7)));
  LOG('wave_start', { wave: G.wave, count: w.list.length });
}
function waveCleared() { return G.enemies.length > 0 && G.enemies.every(e => !e.alive) && spoils.every(s => !s.live || s.t > 6) && captivesLeft() === 0; }
async function flow() {
  G.t0 = now(); G.phase = 'cine'; G.seq = 0;
  document.body.classList.add('cine');
  await introL1();   // the opening cinematic (STORY_L1.intro)
  MOSES.yaw = 1.25; G.cine = { pos: new THREE.Vector3(MOSES.pos.x + 2.9, MOSES.pos.y + 1.55, MOSES.pos.z + 0.7), look: MOSES.pos.clone().setY(MOSES.pos.y + 1.45).add(new THREE.Vector3(0, 0, -1.35)), snap: true };
  MOSES.play('Idle_Talking_Loop');
  await card(STORY_L1.counsel);
  MOSES.play('Idle_Loop'); MOSES.yaw = Math.PI * 0.92; G.cine = null; document.body.classList.remove('cine');
  seqBanner(1);
  await runWaves(0);
}
async function runWaves(from, pre = false) {
  const WV = curWaves();
  for (let i = from; i < WV.length; i++) {
    G.resumeWave = i; if (!(pre && i === from)) startWave(i);
    await until(() => waveCleared() || G.phase === 'lost');
    if (G.phase === 'lost') return;
    await sleep(900); clearDead();
    LOG('wave_clear', { wave: i + 1 });
    if (LEVEL === 2 && i === WV.length - 1) { toast('“…With the jawbone of an ass, heaps upon heaps, with the jaw of an ass have I slain a thousand men.”<i>JUDGES 15:16 (KJV)</i>', 4200); await sleep(3800); }
    if (LEVEL === 4 && i === WV.length - 1) { toast('“…he slew two lionlike men of Moab…”<i>2 SAMUEL 23:20 (KJV)</i>', 3600); await sleep(3200); }
    await upgradePanel(i < WV.length - 1 ? 'NEXT WAVE' : LEVEL === 6 ? 'ON TO PASDAMMIM' : LEVEL === 5 ? 'THE CHARIOTS OF IRON' : LEVEL === 4 ? 'GO DOWN INTO THE PIT' : LEVEL === 3 ? 'FACE THE KING OF ELAM' : LEVEL === 2 ? 'ON TO GAZA' : 'FACE GOLIATH');
  }
  if (LEVEL === 2) await finale(); else if (LEVEL === 3) await kingFight(); else if (LEVEL === 4) await pitFight(); else if (LEVEL === 5) await chariotSeq(); else if (LEVEL === 6) { G.horde = false; await barleySeq(); } else await bossFight();
}
async function bossFight() {
  G.resumeWave = 3; G.phase = 'cine'; G.seq = 2; $('wave').textContent = 'THE CHAMPION OF GATH'; document.body.classList.add('cine');
  P.state = 'cine'; P.pos.set(0, 0, 8); ground(P); P.yaw = Math.PI;
  const b = spawnGoliath(); LOG('boss_start');
  G.cine = { follow: b, off: new THREE.Vector3(3.8, 2.2, 6.5), lookUp: 3.6 };
  SFX.roar();
  await until(() => b.pos.z >= -14);
  b.play('Idle_Talking_Loop');
  await card({ who: 'GOLIATH OF GATH', verse: '“I defy the armies of Israel this day; give me a man, that we may fight together.”', ref: '1 SAMUEL 17:10 (KJV)', btn: 'ANSWER HIM' });
  G.cine = { pos: new THREE.Vector3(P.pos.x + 1.8, P.pos.y + 1.7, P.pos.z - 2.6), look: P.pos.clone().setY(P.pos.y + 1.5), snap: true };
  P.yaw = 0; P.play('Idle_Talking_Loop');
  await card({ who: 'DAVID', verse: '“Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts…”', ref: '1 SAMUEL 17:45 (KJV)', tips: '<b>Moses:</b> His armour turns the staff. <b>Dodge</b> his slam and his charge. When he stumbles, a glow marks his forehead: <b>sling it</b>.', btn: 'FIGHT' });
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; b.state = 'stalk'; b.st = 0;
  $('boss-wrap').classList.remove('hidden'); $('wave').textContent = 'SEQUENCE 2 OF 4 · GOLIATH'; G.phase = 'play'; seqBanner(2);
}
function clearDead() { for (const e of G.enemies) if (!e.gone) { e.remove(); scene.remove(e.bar); } G.enemies = []; attackers = 0; }
const WIN_TXT = {
  // the level number, the "next" line and the button come from LEVEL_ORDER
  1: { h2: 'Safe in the cave of Adullam', verse: '“I cried unto thee, O LORD: I said, Thou art my refuge and my portion in the land of the living.”<span>Psalm 142:5 (KJV) · A prayer of David when he was in the cave</span>' },
  2: { h2: 'Strengthened only this once', verse: '“And Samson called unto the LORD, and said, O Lord GOD, remember me, I pray thee, and strengthen me, I pray thee, only this once, O God…”<span>Judges 16:28 (KJV)</span>' },
  5: { h2: 'The land had rest forty years', verse: '“So let all thine enemies perish, O LORD: but let them that love him be as the sun when he goeth forth in his might. And the land had rest forty years.”<span>Judges 5:31 (KJV)</span>' },
  4: { h2: 'Over David’s guard', verse: '“…and had the name among three mighty men.”<span>2 Samuel 23:22 (KJV)</span>' },
  6: { h2: 'The LORD wrought a great victory', verse: '“But he stood in the midst of the ground, and defended it, and slew the Philistines: and the LORD wrought a great victory.”<span>2 Samuel 23:12 (KJV)</span>' },
  3: { h2: 'Thine enemies into thy hand', verse: '“And blessed be the most high God, which hath delivered thine enemies into thy hand.”<span>Genesis 14:20 (KJV)</span>' },
};
function winGame() {
  G.phase = 'won'; $('boss-wrap').classList.add('hidden'); SFX.win(); LOG('win', { level: LEVEL });
  SAVE.done[LEVEL] = true; const NX = NEXT_RUN(LEVEL); if (NX) SAVE.open[ORD(NX).key] = true; SAVE.unlocked = Math.max(SAVE.unlocked, LEVEL + 1); saveProgress();
  const t = Math.round(now() - G.t0), ups = UPG.reduce((s, u) => s + G.up[u.k], 0);
  $('wstats').innerHTML = `<span>Time <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></span><span>${LEVEL >= 3 ? 'Enemies' : 'Philistines'} <b>${G.kills}</b></span>${LEVEL === 3 ? `<span>Captives freed <b>${(G.captives || []).filter(c => c.freed).length}</b></span>` : ''}${LEVEL === 1 && ESC ? `<span>Caught <b>${ESC.caught}×</b></span>` : ''}<span>Upgrades <b>${ups}</b></span>`;
  const W_ = WIN_TXT[LEVEL]; W_.tag = `LEVEL ${NUM(LEVEL)} COMPLETE`; W_.next = NX ? `NEXT: <b>${ORD(NX).name.toUpperCase()}</b> · Level ${NUM(NX)} is unlocked` : 'MORE OF THE STORY IS COMING'; W_.btn = NX ? `PLAY LEVEL ${NUM(NX)}` : 'LEVEL SELECT'; $('wtag').textContent = W_.tag; $('wh2').textContent = W_.h2; $('wverse').innerHTML = W_.verse; $('wnext').innerHTML = W_.next; $('btn-next').textContent = W_.btn;
  if (LEVEL === 1 && WILD) { const cv = WILD.cave; P.state = 'cine'; G.cine = { pos: new THREE.Vector3(cv.x + 2.5, cv.y + 2.2, cv.z + 9), look: new THREE.Vector3(cv.x, cv.y + 1.6, cv.z) }; }
  setTimeout(() => { show('win'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('toast').classList.remove('on'); toastT = 0; }, 600);
  if (BOT && Q.has('chain') && NX) setTimeout(() => $('btn-next').click(), 3500);
}
function resetRun(full) {
  clearDead(); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; } $('boss-wrap').classList.add('hidden'); FX.ring.visible = FX.ringFill.visible = false;
  for (const s of spoils) { s.live = false; s.m.visible = false; } for (const a of arrows) { a.life = 0; a.m.visible = false; } prompt('');
  if (G.jawItem) { scene.remove(G.jawItem.m); scene.remove(G.jawItem.gl); G.jawItem = null; }
  if (full) { G.coins = SAVE.coins; G.armour = SAVE.armour; G.up = Object.assign(UP0(), SAVE.up); G.kills = 0; }
  G.angelUsed = false; $('angel-ico').classList.remove('used'); if (G.angel) { G.angel = null; if (ANGEL) ANGEL.obj.visible = false; FX.pillar.visible = false; } G.fin = null; G.stage = null; G.spirit = LEVEL === 2 ? 0 : 0;
  if (LEVEL === 2 && WORLD !== 'lehi' && full) buildWorld('lehi');
  if (LEVEL === 3 && WORLD !== 'dan') buildWorld('dan');
  if (LEVEL === 4 && WORLD !== 'moab') buildWorld('moab'); if (LEVEL === 4) benaiahWeapon(false);
  if (LEVEL === 5 && WORLD !== 'kishon') buildWorld('kishon'); if (LEVEL === 5) { clearChariots(); setStorm(false); if (KISHON) { KISHON.water.position.set(0, -0.55, 0); KISHON.water.scale.z = 1; KISHON.beam.material.opacity = 0; } MOSES.obj.visible = false; }
  if (LEVEL === 6 && WORLD !== 'beth') buildWorld('beth'); if (LEVEL === 6) { if (P.look !== 'davidking') swapHero('davidking'); G.horde = false; L6.hold = 0; L6.spawning = false; L6.run = null; L6.drawn = 0; L6.field = 100; L6.lastLbl = ''; L6.david = null; goalUI(false); if (BETH) { BETH.barleyRing.visible = BETH.lentilRing.visible = false; BETH.beam.material.opacity = 0; BETH.lentil.scale.y = 1; } }
  clearCaptives(); G.divided = false; if (MELCH) MELCH.obj.visible = false;
  escClear(); cineClear(); G.seq = 0; if (document.body.classList.contains('escape')) setEscapeUI(false); if (LEVEL === 1 && P.weapon) P.weapon.visible = true;
  P.obj.visible = true; P.cineAnim = null; P.keepPose = false; P.poseT = 0; P.bound = false;
  if (LEVEL === 2 && P.cords) { P.hasJaw = true; P.weapon.visible = true; P.cords.forEach(c => c.visible = false); }
  P.hp = STATS().maxHp; P.state = 'idle'; P.pos.set(0, 0, LEVEL === 3 ? 11 : LEVEL === 2 ? 6 : 10); if (WORLD === 'temple') P.pos.set(0, 0, 5); ground(P); P.yaw = Math.PI; P.play('Idle_Loop', { restart: true }); CAM.yaw = 0;
  if (LEVEL === 3) spawnAllies(LOWQ ? 3 : 4); else if (LEVEL === 5) spawnAllies(LOWQ ? 2 : 3); else if (LEVEL === 6) spawnAllies(3); else clearAllies();
}
function fade(on, color = '#000', ms = 650) { const f = $('fade'); f.style.background = color; f.style.transitionDuration = ms + 'ms'; f.style.opacity = on ? 1 : 0; return sleep(ms + 30); }
// ====================================================================================================
// Level 1 story: cinematic shots, sequence banners, the jubilation, and the escape to Adullam
// ====================================================================================================
const CINE = { actors: [], objs: [], fires: [] };
const SHOT_X = Math.max(0.2, +(Q.get('shotx') || 1));   // QA only: ?shotx=4 holds each shot 4× longer for screenshots
function cineActor(kind, look, x, z, yaw, anim, scale = 1, ts = 1) { const a = new Actor(kind, scale, look); a.pos.set(x, 0, z); ground(a); a.yaw = yaw; a.play(anim, { ts }); a.update(Math.random()); CINE.actors.push(a); return a; }
function cineFire(x, y, z, s) { const n0 = W.children.length, f0 = FIRES.length; addFire(x, y, z, s); CINE.objs.push(...W.children.slice(n0)); CINE.fires.push(...FIRES.slice(f0)); }
function cineClear() {
  for (const a of CINE.actors) a.remove(); CINE.actors.length = 0;
  for (const o of CINE.objs) { if (o.parent) o.parent.remove(o); if (o.geometry && !o.isSprite) o.geometry.dispose(); }
  CINE.objs.length = 0; for (const f of CINE.fires) { const i = FIRES.indexOf(f); if (i >= 0) FIRES.splice(i, 1); } CINE.fires.length = 0;
  G.storyTick = null; document.body.classList.remove('vision', 'dark');
}
function seqBanner(n) {
  const SQ = (STORY[LEVEL] || STORY_L1).sequences; const el = $('seq'); $('seq-n').textContent = `SEQUENCE ${n} OF ${SQ.length}`; $('seq-t').textContent = SQ[n - 1];
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); G.seq = n; LOG('sequence', { n });
  G.seqOn = true; if ($('prompt').classList.contains('on')) prompt(promptWant); el.onanimationend = seqBannerDone; clearTimeout(G.seqT); G.seqT = setTimeout(seqBannerDone, 4000);
}
const seqTag = () => G.seq && STORY[LEVEL] ? `SEQ ${G.seq}/${STORY[LEVEL].sequences.length} · ` : '';
// plays a list of shots (from STORY_L1) using the camera set-ups below; a tap or the SKIP button skips the rest
async function playShots(list, setups) {
  const el = $('story'); let skip = false; G.skipStory = () => { skip = true; };
  el.classList.add('on');
  for (const s of list) {
    if (skip) break;
    document.body.classList.remove('vision', 'dark'); if (s.look) document.body.classList.add(s.look);
    G.storyTick = null; (setups[s.shot] || (() => { }))(s);
    $('s-head').textContent = s.head || ''; $('s-text').textContent = s.text || ''; $('s-ref').textContent = s.ref ? s.ref.toUpperCase() + ' (KJV)' : '';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // let a new set-up compile and draw before its clock starts (no shot is eaten by a first-frame hitch)
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); LOG('shot', { id: s.shot });
    const t0 = performance.now(); await until(() => skip || performance.now() - t0 >= s.sec * 1000 * SHOT_X);
  }
  el.classList.remove('on', 'pop'); document.body.classList.remove('vision', 'dark'); G.skipStory = null; G.storyTick = null;
  if (skip) LOG('story_skip');
  return skip;
}
const camAt = (px, py, pz, lx, ly, lz) => { G.cine = { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz), snap: true }; };
const INTRO_SHOTS = {
  defy(s) {
    const gx = 0, gz = -12; const g = cineActor('goliath', 'goliath', gx, gz, 0, 'Idle_Talking_Loop', 2.25, 0.8);
    for (let i = 0; i < 5; i++) cineActor('phil', 'phil', gx - 6 + i * 3, gz - 5 - (i % 2) * 1.5, 0, 'Sword_Idle', 1, 0.9 + i * 0.05);
    camAt(gx + 2.6, hgt(gx + 2.6, gz + 8) + 1.1, gz + 8, gx, g.pos.y + 3.9, gz); SFX.roar(); shake(0.25);
    G.storyTick = (dt) => { G.cine.pos.z -= dt * 1.4; };
  },
  prize(s) {
    const sx = 7, sz = 14.5; const sa = cineActor('saul', 'saul', sx, sz, Math.PI * 0.94, 'Idle_Talking_Loop', 1.1, 0.9);
    for (let i = 0; i < 6; i++) cineActor('isr', i % 3 ? 'isr' : 'isr2', sx - 3.5 + i * 1.5, sz + 2.2 + (i % 2) * 1.3, Math.PI, 'Idle_Loop', 1, 0.8 + i * 0.07);
    camAt(sx - 1.4, sa.pos.y + 1.95, sz - 2.4, sx, sa.pos.y + 1.9, sz); SFX.horn();
    G.storyTick = (dt) => { G.cine.pos.x += dt * 0.6; };
  },
  vision(s) {
    // David's imagination: Israel's tents burning, the people bound, Philistines standing over them (dim, drained of colour)
    P.obj.visible = false; for (const a of CINE.actors) a.obj.visible = false;
    const vx = -20, vz = -6; const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const [x, z, r] of [[vx - 3.5, vz - 2.5, 2.1], [vx + 2.8, vz - 3.4, 2.3], [vx - 0.4, vz - 6.4, 2.0], [vx + 6, vz - 7, 1.9]]) {
      const m = new THREE.Mesh(tentGeo(r, r * 1.2, 0xcbb48c, 0x2b4f8a, 8), lam); m.position.set(x, hgt(x, z) - 0.05, z); m.rotation.y = x; m.rotation.z = 0.18; W.add(m); CINE.objs.push(m);
      cineFire(x, hgt(x, z) + 0.6, z, 1.6);
    }
    for (let i = 0; i < 5; i++) cineActor('captive', 'captive', vx - 3.2 + i * 1.6, vz + 1.2 + (i % 2) * 0.6, 0, 'Crouch_Idle_Loop', 0.97, 0.6);
    cineActor('phil', 'phil', vx - 4.6, vz + 3.2, Math.PI * 0.85, 'Sword_Idle', 1.02); cineActor('phil', 'phil', vx + 4.4, vz + 2.6, -Math.PI * 0.8, 'Sword_Idle', 1.0); cineActor('captain', 'captain', vx + 0.6, vz - 0.8, 0, 'Idle_Talking_Loop', 1.07);
    camAt(vx + 0.8, hgt(vx, vz + 8) + 2.1, vz + 8.5, vx, 1.0 + hgt(vx, vz), vz - 1); SFX.burn();
    let pt = 0; G.storyTick = (dt) => { G.cine.pos.z -= dt * 0.9; pt -= dt; if (pt <= 0) { pt = 0.12; puff(new THREE.Vector3(vx + (Math.random() - 0.5) * 10, 2.2 + Math.random(), vz - 3 - Math.random() * 4), 2.4, 1.6, new THREE.Vector3(0, 1.4, 0), 0x2a2420); } };
  },
  resolve(s) {
    for (const a of CINE.actors) a.obj.visible = false; P.obj.visible = true;
    P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI; P.state = 'cine'; P.cineAnim = 'Idle_Loop';
    camAt(-0.9, P.pos.y + 1.6, 7.5, 0.1, P.pos.y + 1.05, 10); SFX.horn();
    let t = 0; G.storyTick = (dt) => { t += dt; if (t > 0.45) { P.cineAnim = 'Walk_Loop'; P.pos.z -= dt * 1.5; ground(P); G.cine.pos.z -= dt * 1.35; G.cine.look.z -= dt * 1.5; } };
  },
};
async function introL1() {
  G.stage = 'intro'; P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L1.intro, INTRO_SHOTS);
  cineClear(); P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI; MOSES.obj.visible = true; G.stage = null;
}
// ---- sequence 3: jubilation, then Saul's jealousy
const JUB_SHOTS = {
  praise(s) {
    const c = new THREE.Vector3(0, 0, 3); P.pos.copy(c); ground(P); P.yaw = 0; P.state = 'cine'; P.cineAnim = 'Idle_Talking_Loop'; P.obj.visible = true;
    const W3 = ['woman', 'woman2', 'woman3'];
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4, r = 3.0 + (i % 2) * 0.6; const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; cineActor('woman', W3[i % 3], x, z, Math.atan2(c.x - x, c.z - z), 'Dance_Loop', 0.9, 0.85 + (i % 3) * 0.12); }
    for (let i = 0; i < 8; i++) { const a = -1.9 + i * 0.54, r = 5.6 + (i % 2) * 0.8; const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; cineActor('isr', i % 2 ? 'isr' : 'isr2', x, z, Math.atan2(c.x - x, c.z - z), i % 3 === 0 ? 'Dance_Loop' : 'Idle_Talking_Loop', 1, 0.9 + (i % 4) * 0.08); }
    G.saul = cineActor('saul', 'saul', c.x + 6.5, c.z + 5, Math.atan2(-6.5, -5), 'Idle_Loop', 1.1);
    let ang = -0.55, tam = 0; camAt(c.x + Math.sin(ang) * 6.2, P.pos.y + 2.3, c.z + Math.cos(ang) * 6.2, c.x, P.pos.y + 1.35, c.z);
    SFX.win(); SFX.shout();
    G.storyTick = (dt) => { ang += dt * 0.16; G.cine.pos.set(c.x + Math.sin(ang) * 6.2, P.pos.y + 2.3, c.z + Math.cos(ang) * 6.2); tam -= dt; if (tam <= 0) { tam = 0.27; noise(0.05, 7000, 5000, 0.05, 'highpass'); if (Math.random() < 0.18) SFX.shout(); } };
  },
  jealous(s) {
    const sa = G.saul; if (!sa) return; sa.play('Idle_Loop', { ts: 0.5 });
    const f = sa.yaw, hy = sa.pos.y + 1.68 * 1.1;
    camAt(sa.pos.x + Math.sin(f) * 1.25 + Math.cos(f) * 0.35, hy + 0.02, sa.pos.z + Math.cos(f) * 1.25 - Math.sin(f) * 0.35, sa.pos.x, hy - 0.04, sa.pos.z);
    tone('sawtooth', 73, 69, 2.6, 0.08); tone('sine', 55, 52, 2.6, 0.2);
    G.storyTick = (dt) => { const c = G.cine; c.pos.lerp(tmpV.set(sa.pos.x + Math.sin(f) * 0.85, hy, sa.pos.z + Math.cos(f) * 0.85), dt * 0.5); };
  },
};
async function afterGoliath() {
  G.resumeWave = 5; G.phase = 'cine'; G.stage = 'jubilation'; $('boss-wrap').classList.add('hidden'); document.body.classList.add('cine'); prompt('');
  clearDead(); for (const s of spoils) { s.live = false; s.m.visible = false; } $('toast').classList.remove('on'); toastT = 0;
  await fade(true, '#000', 450); seqBanner(3); $('wave').textContent = '';
  if (G.boss) { G.boss.pos.set(-7, 0, -5); ground(G.boss); }
  const done = playShots(STORY_L1.jubilation, JUB_SHOTS); await sleep(60); fade(false, '#000', 450);
  await done; cineClear(); G.saul = null; LOG('jubilation_done');
  await runEscape(false);
}
// ---- sequence 4: the escape. Saul's soldiers hunt David; he runs, rolls and hides, but never fights back.
let ESC = null;
const ICON_RUN = '<svg viewBox="0 0 64 64"><circle cx="38" cy="12" r="6" fill="#f3e2c0"/><path d="M34 22 L24 36 L34 40 L28 56 M34 22 L46 30 L54 28 M24 36 L14 34 M32 40 L44 50" stroke="#f3e2c0" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>SPRINT</span>';
const ICON_HIDE = '<svg viewBox="0 0 64 64"><path d="M8 52 Q10 26 30 22 Q52 18 56 52Z" fill="#c9b894"/><circle cx="44" cy="40" r="5" fill="#3a2a1a"/></svg><span>HIDE</span>';
function escClear() { if (ESC) for (const h of ESC.hunters) h.remove(); ESC = null; $('goal').classList.add('hidden'); $('vignette').classList.remove('danger'); }
function setEscapeUI(on) {
  if (on) { $('b-attack').innerHTML = ICON_RUN; $('b-sling').innerHTML = ICON_HIDE; $('b-dodge').querySelector('span').textContent = 'ROLL'; $('sp-wrap').classList.remove('hidden'); $('sp-wrap').querySelector('.splabel').textContent = 'STAMINA'; $('goal').classList.remove('hidden'); document.body.classList.add('escape'); }
  else { $('b-dodge').querySelector('span').textContent = 'DODGE'; $('sp-wrap').querySelector('.splabel').textContent = 'SPIRIT'; document.body.classList.remove('escape'); setLevelUI(); }
}
const sprintHeld = () => !!(IN.sprintBtn || IN.keys.ShiftLeft || IN.keys.ShiftRight || IN.keys.KeyJ || (BOT && BOTI.sprint));
async function runEscape(retry) {
  G.resumeWave = 6; G.phase = 'cine'; G.stage = 'escape'; G.seq = 4; document.body.classList.add('cine');
  await fade(true, '#000', retry ? 200 : 500);
  escClear(); cineClear(); clearDead(); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; }
  for (const s of spoils) { s.live = false; s.m.visible = false; } prompt('');
  buildWorld('wild'); MOSES.obj.visible = false;
  P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.hp = STATS().maxHp; if (P.weapon) P.weapon.visible = false; if (P.stoneInHand) P.stoneInHand.visible = false;
  P.pos.set(WILD_PX(12), 0, 12); ground(P); P.yaw = Math.PI; P.play('Idle_Loop', { restart: true }); CAM.yaw = 0; G.cine = null; G.angelUsed = false; $('angel-ico').classList.remove('used');
  const C = STORY_L1.escape;
  ESC = { hunters: [], gi: 0, stamina: C.stamina, hiding: false, hidden: false, tired: false, sprinting: false, t: 0, won: false, caught: 0, near: 99, pr: '' };
  escGroups();
  setEscapeUI(true); $('wave').textContent = 'SEQUENCE 4 OF 4 · ESCAPE TO ADULLAM';
  for (let i = 0; i < 20; i++) updateCamera(0.1);
  await fade(false, '#000', 400);
  if (!retry) { const E = STORY_L1.escapeCard; await card({ who: E.who, text: E.text, verse: E.verse, ref: E.ref, tips: isTouch ? STORY_L1.escapeTips.touch : STORY_L1.escapeTips.keys, btn: E.btn }); seqBanner(4); }
  document.body.classList.remove('cine'); G.phase = 'play'; SFX.horn(); SFX.shout();
  toast('<b>RUN!</b> Saul’s soldiers are behind you. Reach the cave of Adullam.', 3200); LOG('escape_start', { retry });
  await until(() => (ESC && ESC.won) || G.phase === 'lost');
  if (G.phase === 'lost') return;
  await escapeEnd();
}
function escGroups() {
  const C = STORY_L1.escape, E = ESC;
  while (E.gi < C.groups.length) {
    const g = C.groups[E.gi]; const trig = g.from === 'ahead' ? g.at + 38 : g.at;
    if (P.pos.z > trig) break; E.gi++;
    for (let i = 0; i < g.n; i++) {
      if (g.from === 'behind') { const z = Math.min(P.pos.z + 15 + Math.random() * 7, 21), x = WILD_PX(z) + (i - (g.n - 1) / 2) * 2.2; spawnHunter(x, z, 'chase'); }
      else { const z = g.at - i * 3 - Math.random() * 3, side = i % 2 ? 1 : -1, x = WILD_PX(z) + side * (6 + Math.random() * 4); spawnHunter(x, z, 'wait'); }
    }
  }
}
function spawnHunter(x, z, state) {
  const C = STORY_L1.escape;
  if (ESC.hunters.length >= C.maxActive) { let far = null; for (const h of ESC.hunters) if (h.pos.z > P.pos.z + 6 && (!far || h.pos.z > far.pos.z)) far = h; if (!far) return null; far.remove(); ESC.hunters.splice(ESC.hunters.indexOf(far), 1); } const h = new Actor('isr', 0.96 + Math.random() * 0.07, Math.random() < 0.3 ? 'isr2' : 'isr');
  h.pos.set(x, hgt(x, z), z); h.yaw = Math.atan2(P.pos.x - x, P.pos.z - z); h.state = state; h.st = 0; h.cd = 0.5; h.lost = 0; h.last = P.pos.clone(); h.radius = 0.4;
  h.speed = C.hunterSpeed[0] + Math.random() * (C.hunterSpeed[1] - C.hunterSpeed[0]); h.play(state === 'wait' ? 'Idle_Loop' : 'Jog_Fwd_Loop', { ts: 0.95 }); h.update(Math.random());
  ESC.hunters.push(h); return h;
}
function wadiClamp(p) { const c = WILD_PX(p.z), dx = p.x - c; if (Math.abs(dx) > WILD_HALF) p.x = c + Math.sign(dx) * WILD_HALF; if (p.z > 22) p.z = 22; }
function escapeControl(p, iv, dt, canAct) {
  const C = STORY_L1.escape, E = ESC;
  if (canAct && take('dodge')) { E.hiding = false; startDodge(iv); return; }
  if (canAct && take('sling')) { E.hiding = !E.hiding; LOG(E.hiding ? 'hide' : 'unhide'); }
  take('attack');
  if (iv.m > 0.2 && E.hiding) E.hiding = false;
  E.sprinting = false;
  if (E.hiding) { p.play('Crouch_Idle_Loop'); p.state = 'idle'; return; }
  let sp = iv.m > 0.7 ? C.runSpeed : 2.4 + (C.runSpeed - 2.4) * Math.min(1, iv.m / 0.7);
  if (sprintHeld() && iv.m > 0.3 && !E.tired) { sp = C.sprintSpeed; E.sprinting = true; E.stamina -= C.sprintDrain * dt; if (E.stamina <= 0) { E.stamina = 0; E.tired = true; } }
  if (iv.m > 0) { p.pos.x += iv.x * sp * dt; p.pos.z += iv.z * sp * dt; p.yaw = turnTo(p.yaw, Math.atan2(iv.x, iv.z), dt * 12); p.play(E.sprinting ? 'Sprint_Loop' : iv.m > 0.7 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { ts: E.sprinting ? 1.0 : iv.m > 0.7 ? 1.05 : 0.8 + iv.m * 0.6 }); p.state = 'move'; }
  else { p.play('Idle_Loop'); p.state = 'idle'; }
}
function updateHunter(h, dt) {
  const C = STORY_L1.escape, E = ESC;
  h.st += dt; h.cd -= dt; h.vel.multiplyScalar(Math.pow(0.003, dt));
  const dx = P.pos.x - h.pos.x, dz = P.pos.z - h.pos.z, d = Math.hypot(dx, dz) || 0.001;
  const live = G.phase === 'play' && P.state !== 'dead' && !E.won;
  const canSee = live && d < (E.hidden ? C.hiddenSee : C.sight);
  let mv = 0, anim = 'Idle_Loop', ats = 1;
  switch (h.state) {
    case 'wait': h.yaw = turnTo(h.yaw, Math.atan2(dx, dz), dt * 2); if (canSee && d < C.sight * 0.85) { h.state = 'chase'; h.st = 0; if (Math.random() < 0.5) SFX.shout(); } break;
    case 'chase': {
      if (canSee) { h.last.copy(P.pos); h.lost = 0; } else { h.lost += dt; if (h.lost > 0.5) { h.state = 'search'; h.st = 0; h.wander = null; LOG('lost_sight'); } }
      const lx = h.last.x - h.pos.x, lz = h.last.z - h.pos.z, ld = Math.hypot(lx, lz) || 0.001;
      h.yaw = turnTo(h.yaw, Math.atan2(lx, lz), dt * 6);
      if (ld > 1.05) { const sp = h.speed * (d > 12 ? 1.1 : 1); h.pos.x += lx / ld * sp * dt; h.pos.z += lz / ld * sp * dt; mv = sp; }
      anim = mv > 5.1 ? 'Sprint_Loop' : mv > 0 ? 'Jog_Fwd_Loop' : 'Sword_Idle'; ats = mv > 5.1 ? 0.8 : 0.95;
      if (canSee && d < C.grabRange && h.cd <= 0) { h.state = 'grab'; h.st = 0; h.hitDone = false; const ts = 1.15; h.atkDur = h.dur('Punch_Cross') / ts; h.hitT = h.atkDur * 0.42; h.play('Punch_Cross', { loop: false, ts, restart: true, fade: 0.08 }); }
      break;
    }
    case 'grab': {
      h.yaw = turnTo(h.yaw, Math.atan2(dx, dz), dt * 5);
      if (!h.hitDone && d > 0.8) { h.pos.x += dx / d * C.lungeSpeed * dt; h.pos.z += dz / d * C.lungeSpeed * dt; }   // the lunge
      if (!h.hitDone && h.st >= h.hitT) { h.hitDone = true; SFX.swing(); if (live && d < 1.5 && !E.hidden) { const was = P.hp; damagePlayer(C.catchDmg, h.pos); if (P.hp < was) { E.caught++; LOG('caught', { hp: Math.round(P.hp) }); if (E.caught === 1) toast('They have you! <b>Roll</b> out of their hands, or <b>hide</b> beside a rock.', 2600); } } }
      if (h.st >= h.atkDur) { h.state = 'chase'; h.cd = 1.3 + Math.random() * 0.8; }
      h.update(dt); h.pos.addScaledVector(h.vel, dt); wadiClamp(h.pos); collide(h.pos, 0.35); ground(h); return;
    }
    case 'search': {
      if (!h.wander || h.pos.distanceTo(h.wander) < 1) h.wander = h.last.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9, 0, (Math.random() - 0.5) * 9));
      const wx = h.wander.x - h.pos.x, wz = h.wander.z - h.pos.z, wd = Math.hypot(wx, wz) || 0.001;
      h.yaw = turnTo(h.yaw, Math.atan2(wx, wz), dt * 3); h.pos.x += wx / wd * 1.9 * dt; h.pos.z += wz / wd * 1.9 * dt; mv = 1.9; anim = 'Walk_Loop';
      if (canSee && d < (E.hidden ? C.hiddenSee : C.sight * 0.7)) { h.state = 'chase'; h.st = 0; h.lost = 0; }
      break;
    }
    case 'stun': anim = 'Hit_Head'; if (h.st > (h.stun || 2.5)) { h.state = 'search'; h.st = 0; h.wander = null; } h.update(dt); h.pos.addScaledVector(h.vel, dt); wadiClamp(h.pos); collide(h.pos, 0.35); ground(h); return;
    case 'halt': h.yaw = turnTo(h.yaw, h.yaw + 1, dt * 0.6); anim = 'Idle_Loop'; break;
  }
  // keep apart from one another
  for (const o of E.hunters) { if (o === h) continue; const ox = h.pos.x - o.pos.x, oz = h.pos.z - o.pos.z, od = Math.hypot(ox, oz); if (od < 1.2 && od > 0.01) { h.pos.x += ox / od * (1.2 - od) * 2 * dt; h.pos.z += oz / od * (1.2 - od) * 2 * dt; } }
  h.play(anim, { ts: ats });
  h.pos.addScaledVector(h.vel, dt); wadiClamp(h.pos); collide(h.pos, 0.35); ground(h); h.update(dt);
}
function updateEscape(dt) {
  const E = ESC, C = STORY_L1.escape; if (!E || !WILD) return;
  if (G.phase !== 'play') { for (const h of E.hunters) { if (h.state === 'halt') updateHunter(h, dt); else h.update(dt); } return; }
  E.t += dt; wadiClamp(P.pos); ground(P);
  escGroups();
  // stamina
  if (!E.sprinting) { E.stamina = Math.min(C.stamina, E.stamina + C.staminaRegen * dt * (E.hiding ? 1.6 : 1)); if (E.tired && E.stamina > C.stamina * 0.35) E.tired = false; }
  // hiding: crouched beside a boulder
  let rockNear = false; for (const r of WILD.rocks) if (Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < r.s + C.hideNear) { rockNear = true; break; }
  const was = E.hidden; E.hidden = E.hiding && rockNear && P.state !== 'dodge'; if (E.hidden && !was) LOG('hidden');
  const pr = E.hidden ? 'HIDDEN · THEY CANNOT SEE YOU' : E.hiding ? 'GET BESIDE A ROCK TO HIDE' : ''; if (pr !== E.pr) { E.pr = pr; prompt(pr); }
  // soldiers: update, body-block, and drop the ones left far behind
  let near = 99;
  for (const h of E.hunters) { updateHunter(h, dt); const hx = P.pos.x - h.pos.x, hz = P.pos.z - h.pos.z, hd = Math.hypot(hx, hz); if (h.state === 'chase' || h.state === 'grab') near = Math.min(near, hd); if (hd < 0.85 && hd > 0.01 && P.state !== 'dodge') { P.pos.x += hx / hd * (0.85 - hd) * 0.6; P.pos.z += hz / hd * (0.85 - hd) * 0.6; } }
  E.near = near;
  if (E.hunters.length > C.maxActive) { let far = null; for (const h of E.hunters) if (h.pos.z > P.pos.z + 22 && (!far || h.pos.z > far.pos.z)) far = h; if (far) { far.remove(); E.hunters.splice(E.hunters.indexOf(far), 1); } }
  $('vignette').classList.toggle('danger', near < 6);
  // HUD: stamina bar and the way to the cave
  $('sp-fill').style.width = (E.stamina / C.stamina * 100).toFixed(0) + '%'; $('sp-wrap').classList.toggle('tired', E.tired);
  const cv = WILD.cave, gx = cv.x - P.pos.x, gz = cv.z - P.pos.z, gd = Math.hypot(gx, gz);
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
  $('goal-arrow').style.transform = `rotate(${Math.atan2(gx * rx + gz * rz, gx * fx + gz * fz).toFixed(2)}rad)`; $('goal-d').textContent = Math.max(0, Math.round(gd - 2)) + ' m';
  if (gd < 3.4) { E.won = true; LOG('reached_adullam', { t: Math.round(E.t), caught: E.caught }); }
}
async function escapeEnd() {
  G.phase = 'cine'; document.body.classList.add('cine'); prompt(''); $('vignette').classList.remove('danger');
  for (const h of ESC.hunters) { h.state = 'halt'; h.st = 0; }
  const cv = WILD.cave; P.state = 'cine'; P.cineAnim = 'Walk_Loop';
  camAt(cv.x + 3.2, cv.y + 2.4, cv.z + 7.5, cv.x, cv.y + 1.2, cv.z - 1);
  G.storyTick = (dt) => { const tx = cv.x - P.pos.x, tz = cv.z - 3 - P.pos.z, td = Math.hypot(tx, tz); if (td > 0.3) { P.yaw = turnTo(P.yaw, Math.atan2(tx, tz), dt * 6); P.pos.x += tx / td * 2.0 * dt; P.pos.z += tz / td * 2.0 * dt; } };
  await sleep(1700); await fade(true, '#000', 800); G.storyTick = null; P.obj.visible = false;
  const K = STORY_L1.cave; await card({ who: K.who, verse: K.verse, ref: K.ref, btn: K.btn });
  setEscapeUI(false); G.stage = 'adullam';
  winGame(); fade(false, '#000', 700);
}
// ---- Level 2 flow: Moses' counsel, the cords, the jawbone, three waves, then Gaza
async function flow2() {
  G.t0 = now(); G.phase = 'cine'; G.stage = 'lehi'; G.seq = 0; document.body.classList.add('cine');
  P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L2.intro, INTRO2_SHOTS);   // the opening (STORY_L2.intro)
  cineClear(); FX.pillar.visible = false; FX.pillar.material.opacity = 0; FX.pillar.scale.set(1, 1, 1); P.obj.visible = true; P.cineAnim = null; P.pos.set(0, 0, 6); ground(P); P.yaw = Math.PI;
  MOSES.obj.visible = true; MOSES.yaw = 1.25; G.cine = { pos: new THREE.Vector3(MOSES.pos.x + 2.9, MOSES.pos.y + 1.55, MOSES.pos.z + 0.7), look: MOSES.pos.clone().setY(MOSES.pos.y + 1.45).add(new THREE.Vector3(0, 0, -1.35)), snap: true };
  MOSES.play('Idle_Talking_Loop');
  await card({ who: 'MOSES · YOUR ADVISOR', text: 'Samson, the men of Judah have bound you with two new cords and brought you to Lehi, to the Philistines. Do not fear them:', verse: '“Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee…”', ref: 'DEUTERONOMY 31:6 (KJV)', tips: '<b>SPIRIT</b> fills as you fight: loose it to scatter the host and shatter shields. <b>Jawbone</b> up close. <b>Dodge</b> the arrows. Shield captains block from the front: hit their side.', btn: 'I AM READY' });
  MOSES.play('Idle_Loop'); MOSES.yaw = Math.PI * 0.92;
  // bound, the Philistines shout against him (Judges 15:14)
  P.bound = true; P.hasJaw = false; P.weapon.visible = false; P.cords.forEach(c => c.visible = true); P.state = 'bound'; G.spirit = 100;
  G.cine = { pos: new THREE.Vector3(P.pos.x + 2.2, P.pos.y + 1.7, P.pos.z + 3.4), look: P.pos.clone().setY(P.pos.y + 1.3).add(new THREE.Vector3(0, 0, -4)), snap: true };
  startWave(0); SFX.shout();
  await sleep(1400); toast('“And when he came unto Lehi, the Philistines shouted against him…”<i>JUDGES 15:14 (KJV)</i>', 3200);
  await sleep(1600); SFX.shout(); G.cine = null; document.body.classList.remove('cine');
  prompt(isTouch || BOT ? 'TAP SPIRIT — BREAK THE CORDS' : 'PRESS K — BREAK THE CORDS');
  await until(() => !P.bound || G.phase === 'lost');
  await runWaves(0, true);
}

const INTRO2_SHOTS = {
  oppress(s) {
    // forty years: Israel's tents burning, the people bound, the Philistines standing over them
    P.obj.visible = false; MOSES.obj.visible = false;
    const vx = 0, vz = -10; const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const [x, z, r] of [[vx - 4, vz - 3, 2.1], [vx + 3.4, vz - 4, 2.3], [vx - 0.4, vz - 7, 2.0], [vx + 7, vz - 7.5, 1.9]]) {
      const m = new THREE.Mesh(tentGeo(r, r * 1.2, 0xcbb48c, 0x6a4a2a, 8), lam); m.position.set(x, hgt(x, z) - 0.05, z); m.rotation.y = x; m.rotation.z = 0.18; W.add(m); CINE.objs.push(m);
      cineFire(x, hgt(x, z) + 0.6, z, 1.6);
    }
    for (let i = 0; i < 6; i++) cineActor('captive', 'captive', vx - 4 + i * 1.6, vz + 1.2 + (i % 2) * 0.6, 0, 'Crouch_Idle_Loop', 0.97, 0.6);
    cineActor('phil', 'phil', vx - 5.2, vz + 3.2, Math.PI * 0.85, 'Sword_Idle', 1.02); cineActor('phil', 'phil', vx + 5, vz + 2.6, -Math.PI * 0.8, 'Sword_Idle', 1.0); cineActor('captain', 'captain', vx + 0.6, vz - 0.8, 0, 'Idle_Talking_Loop', 1.07);
    camAt(vx + 1, hgt(vx, vz + 8) + 2.1, vz + 8.5, vx, 1.0 + hgt(vx, vz), vz - 1); SFX.burn(); SFX.shout();
    let pt = 0; G.storyTick = (dt) => { G.cine.pos.z -= dt * 0.9; pt -= dt; if (pt <= 0) { pt = 0.12; puff(new THREE.Vector3(vx + (Math.random() - 0.5) * 10, 2.2 + Math.random(), vz - 3 - Math.random() * 4), 2.4, 1.6, new THREE.Vector3(0, 1.4, 0), 0x2a2420); } };
  },
  resolve(s) {
    // close on Samson: he will not let it go on
    for (const a of CINE.actors) a.obj.visible = false;
    P.obj.visible = true; P.pos.set(0, 0, 6); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
    camAt(-0.55, P.pos.y + 1.72, 4.4, 0, P.pos.y + 1.62, 6); SFX.horn();
    G.storyTick = (dt) => { G.cine.pos.z += dt * 0.35; G.cine.pos.x += dt * 0.12; };
  },
  spirit(s) {
    // bound at Lehi, the Philistines shout against him, and the Spirit of the LORD comes mightily upon him
    for (const a of CINE.actors) a.obj.visible = false;
    P.obj.visible = true; P.pos.set(0, 0, 6); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop'; if (P.cords) P.cords.forEach(c => c.visible = true); if (P.weapon) P.weapon.visible = false;
    for (let i = 0; i < 5; i++) { const ang = -0.9 + i * 0.45; cineActor('phil', 'phil', Math.sin(ang) * 5.5, 6 - Math.cos(ang) * 5.5, ang + Math.PI, 'Sword_Idle', 1, 0.9 + i * 0.06); }
    camAt(3.4, P.pos.y + 1.6, 11.2, 0, P.pos.y + 1.7, 5.6); SFX.shout(); setTimeout(() => SFX.spirit(), 500);
    let t = 0, pt = 0, ft = 0; G.storyTick = (dt) => { t += dt; pt -= dt; G.cine.pos.z -= dt * 0.6; ft -= dt; if (t > 0.4 && ft <= 0) { ft = 0.22; flashAt(P.pos.clone().setY(P.pos.y + 1.2 + Math.random() * 0.4), 1.6 + Math.min(1.4, t), 0.45, 0xffd27a); }
      if (t > 0.6) shake(0.12); if (pt <= 0) { pt = 0.08; puff(new THREE.Vector3(P.pos.x + (Math.random() - 0.5) * 1.2, P.pos.y + 0.4 + Math.random() * 1.6, P.pos.z + (Math.random() - 0.5) * 1.2), 0.9, 0.9, new THREE.Vector3(0, 1.6, 0), 0xffd27a); } };
  },
};

// ---- Level 3 flow: Abram rescues Lot (Genesis 14:12–20)
async function flow3() {
  G.t0 = now(); G.phase = 'cine'; G.stage = 'dan'; G.divided = false; G.seq = 0; document.body.classList.add('cine');
  // opening cinematic (STORY_L3.intro): Lot taken, the one that escaped, Abram arms his servants
  const home = ALLIES.map(a => a.pos.clone()); P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L3.intro, INTRO3_SHOTS);
  cineClear(); P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.pos.set(0, 0, 11); ground(P); P.yaw = Math.PI;
  ALLIES.forEach((a, i) => { a.obj.visible = true; if (home[i]) { a.pos.copy(home[i]); ground(a); } a.yaw = Math.PI; a.play('Idle_Loop'); });
  MOSES.obj.visible = true; MOSES.yaw = 1.25; G.cine = { pos: new THREE.Vector3(MOSES.pos.x + 2.9, MOSES.pos.y + 1.55, MOSES.pos.z + 0.7), look: MOSES.pos.clone().setY(MOSES.pos.y + 1.45).add(new THREE.Vector3(0, 0, -1.35)), snap: true };
  MOSES.play('Idle_Talking_Loop');
  await card(STORY_L3.counsel);
  MOSES.play('Idle_Loop'); MOSES.yaw = Math.PI * 0.92; G.cine = null; document.body.classList.remove('cine');
  await runWaves(0);
}
const INTRO3_SHOTS = {
  taken(s) {
    // the host of the east leads Lot away, bound, past their fires
    P.obj.visible = false; for (const a of ALLIES) a.obj.visible = false; MOSES.obj.visible = false;
    const x0 = -9.5, z0 = 1.5; const lot = cineActor('captive', 'lot', x0, z0, Math.PI, 'Walk_Loop', 1, 0.75);
    const g1 = cineActor('phil', 'e_phil', x0 - 1.1, z0 + 1.4, Math.PI, 'Walk_Loop', 1.02, 0.75), g2 = cineActor('phil', 'e_captain', x0 + 1.0, z0 - 1.2, Math.PI, 'Walk_Loop', 1.05, 0.75);
    const c1 = cineActor('captive', 'captive', x0 + 0.4, z0 + 2.6, Math.PI, 'Walk_Loop', 0.97, 0.7);
    const walkers = [lot, g1, g2, c1];
    camAt(x0 + 4.2, lot.pos.y + 1.55, z0 - 2.2, x0, lot.pos.y + 1.25, z0 - 1.5); SFX.horn();
    G.storyTick = (dt) => { for (const w of walkers) { w.pos.z -= dt * 1.05; ground(w); } G.cine.look.z -= dt * 1.05; G.cine.pos.z -= dt * 0.8; };
  },
  escaped(s) {
    // one that escaped runs through the dark to Abram
    for (const a of CINE.actors) a.obj.visible = false; P.obj.visible = true;
    P.pos.set(0, 0, 11); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
    const r = cineActor('captive', 'runner', 1.6, 3, Math.atan2(-1.0, 7), 'Sprint_Loop', 0.97, 0.9);
    camAt(1.1, P.pos.y + 1.85, 13.4, 0.6, P.pos.y + 1.35, 6);
    G.storyTick = (dt) => { const tx = 0.5 - r.pos.x, tz = 9.6 - r.pos.z, td = Math.hypot(tx, tz); if (td > 0.4) { r.pos.x += tx / td * 5 * dt; r.pos.z += tz / td * 5 * dt; ground(r); } else { r.play('Idle_Talking_Loop'); P.cineAnim = 'Idle_Talking_Loop'; } };
  },
  armed(s) {
    // Abram turns to his trained servants; torches are lit
    for (const a of CINE.actors) a.obj.visible = false;
    P.pos.set(0, 0, 11); ground(P); P.yaw = 0; P.cineAnim = 'Idle_Talking_Loop';
    ALLIES.forEach((a, i) => { const k = i - (ALLIES.length - 1) / 2; a.obj.visible = true; a.pos.set(k * 1.7, 0, 8.8 - Math.abs(k) * 0.6); ground(a); a.yaw = 0; a.play('Sword_Idle', { ts: 0.8 + i * 0.1 }); });
    camAt(0.9, P.pos.y + 1.95, 14.6, 0, P.pos.y + 1.35, 10.2); SFX.horn(); SFX.shout();
    G.storyTick = (dt) => { G.cine.pos.z -= dt * 0.7; };
  },
};
async function kingFight() {
  G.resumeWave = 3; G.phase = 'cine'; G.seq = 4; $('wave').textContent = 'CHEDORLAOMER KING OF ELAM'; document.body.classList.add('cine');
  P.state = 'cine'; P.pos.set(0, 0, 7); ground(P); P.yaw = Math.PI; G.divided = false;
  ALLIES.forEach((a, i) => { if (a.down) { a.down = false; a.hp = a.maxHp * 0.6; if (a.flame) a.flame.visible = true; } a.state = 'follow'; a.pos.set((i - (ALLIES.length - 1) / 2) * 1.6, 0, 9.5 + (i % 2) * 0.8); ground(a); a.yaw = Math.PI; a.play('Idle_Loop'); });
  const b = spawnKing(); LOG('boss_start'); $('bname').textContent = 'CHEDORLAOMER';
  G.cine = { follow: b, off: new THREE.Vector3(2.8, 1.9, 5.2), lookUp: 2.1, lookX: 1.7 };
  SFX.horn(); SFX.roar();
  await until(() => b.pos.z >= -14);
  b.play('Idle_Talking_Loop');
  await card({ who: 'CHEDORLAOMER · KING OF ELAM', text: 'The king who led the east against the cities of the plain comes out from his pavilion.', verse: '“With Chedorlaomer the king of Elam, and with Tidal king of nations, and Amraphel king of Shinar, and Arioch king of Ellasar; four kings with five.”', ref: 'GENESIS 14:9 (KJV)', tips: '<b>Moses:</b> His bronze turns light blows. <b>Dodge</b> his cleave and his charge. When he stumbles, a glow marks him: <b>strike hard</b> with sword or bow.', btn: 'FIGHT' });
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; b.state = 'stalk'; b.st = 0;
  $('boss-wrap').classList.remove('hidden'); $('wave').textContent = seqTag() + 'CHEDORLAOMER'; G.phase = 'play'; seqBanner(4);
}
async function chaseToHobah() {
  // the rout (Genesis 14:15): what is left of the host runs north; catch them before they reach the dark
  G.resumeWave = 4; G.stage = 'chase'; $('boss-wrap').classList.add('hidden'); seqBanner(5); $('wave').textContent = seqTag() + 'THE CHASE TO HOBAH';
  toast('“…and smote them, and pursued them unto Hobah, which is on the left hand of Damascus.”<i>GENESIS 14:15 (KJV)</i>', 4200); SFX.shout();
  const spots = [[-8, -6], [8, -8], [-3, -12], [12, -2], [-14, -10]];
  spots.forEach(([x, z], j) => { const e = spawnEnemy(j === 2 ? 'archer' : 'phil', x, z, 0); e.state = 'flee'; e.fleeing = true; e.fleeX = x * 0.6 + (Math.random() - 0.5) * 8; e.st = 0; e.obj.visible = true; e.hp = e.maxHp = e.maxHp * 0.6; e.speed = 2.6 + Math.random() * 0.4; });
  const t0 = now(); await until(() => G.enemies.every(e => !e.alive) || G.phase === 'lost' || now() - t0 > 30);
  if (G.phase === 'lost') return;
  const caught = G.enemies.filter(e => !e.escaped && !e.alive).length; LOG('chase_done', { caught, escaped: G.enemies.filter(e => e.escaped).length });
  toast(caught ? `<b>${caught} of the fleeing host struck down.</b> The rest scatter into the night.` : '<b>The rest scatter into the night.</b>', 2600);
  await sleep(2200); await until(() => spoils.every(s => !s.live || s.t > 5));
  await endingL3();
}
async function endingL3() {
  G.resumeWave = 4; G.phase = 'cine'; G.stage = 'end'; document.body.classList.add('cine'); prompt('');
  await fade(1); clearDead(); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; }
  // Lot, the people and the goods brought back; Melchizedek meets Abram with bread and wine
  P.state = 'cine'; P.pos.set(0, 0, 4); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
  ALLIES.forEach((a, i) => { a.state = 'follow'; a.down = false; a.pos.set(2.2 + i * 1.3, 0, 5.2 + (i % 2) * 0.8); ground(a); a.yaw = Math.PI; a.play('Idle_Loop'); if (a.flame) a.flame.visible = true; });
  (G.captives || []).forEach((c, i) => { c.leave = false; c.a.pos.set(-4.2 - i * 1.3, 0, 3.6 + i * 0.5); ground(c.a); c.a.yaw = 0; c.a.play('Idle_Loop'); });
  if (!MELCH) MELCH = new Actor('moses', 1.0, 'melch'); MELCH.obj.visible = true; MELCH.pos.set(0.4, 0, 1.1); ground(MELCH); MELCH.yaw = 0; MELCH.play('Idle_Talking_Loop');
  G.cine = { pos: new THREE.Vector3(3.6, hgt(3.6, 4) + 1.9, 6.6), look: new THREE.Vector3(0, hgt(0, 2) + 1.3, 1.8), snap: true };
  await sleep(250); await fade(0);
  await card({ who: 'THE GOODS BROUGHT BACK', text: 'Lot is free, and all that was taken is brought back.', verse: '“And he brought back all the goods, and also brought again his brother Lot, and his goods, and the women also, and the people.”', ref: 'GENESIS 14:16 (KJV)', btn: 'CONTINUE' });
  P.yaw = Math.PI; G.cine = { pos: new THREE.Vector3(-1.0, hgt(-1.0, 4.4) + 1.65, 4.4), look: MELCH.pos.clone().add(new THREE.Vector3(1.25, 1.45, 0)), snap: true };
  const ok = await card({ who: 'MELCHIZEDEK · KING OF SALEM', verse: '“And Melchizedek king of Salem brought forth bread and wine: and he was the priest of the most high God. And he blessed him, and said, Blessed be Abram of the most high God, possessor of heaven and earth: And blessed be the most high God, which hath delivered thine enemies into thy hand. And he gave him tithes of all.”', ref: 'GENESIS 14:18–20 (KJV)', btn: 'RECEIVE THE BLESSING', btn2: 'SKIP' });
  if (ok) { flashAt(P.pos.clone().setY(P.pos.y + 1.4), 5, 0.7, 0xfff0c0); SFX.angel(); await sleep(900); }
  MELCH.play('Idle_Loop'); winGame();
}

// ------------------------------------------------------------------ the lion in the pit (Level: Benaiah). Built from primitives, animated in code (no rig needed).
const LIONMAT = {};
function lionMats() {
  if (LIONMAT.fur) return LIONMAT;
  LIONMAT.fur = new THREE.MeshStandardMaterial({ color: 0xc08a4c, roughness: 0.92, metalness: 0, flatShading: true });
  LIONMAT.mane = new THREE.MeshStandardMaterial({ color: 0x5e3416, roughness: 1, metalness: 0, flatShading: true });
  LIONMAT.light = new THREE.MeshStandardMaterial({ color: 0xe0bc88, roughness: 0.95, metalness: 0, flatShading: true });
  LIONMAT.dark = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.6, metalness: 0 });
  LIONMAT.eye = new THREE.MeshBasicMaterial({ color: 0xffb83a });
  return LIONMAT;
}
function shaggy(geo, amt, seed) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (hash(p.getX(i) * 9 + seed, p.getY(i) * 7 + p.getZ(i) * 5) - 0.5) * amt; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } geo.computeVertexNormals(); return geo; }
class Lion {
  constructor(scale = 1) {
    const M = lionMats(); this.isLion = true; this.scale = scale;
    const mk = (g, m, x, y, z, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    this.obj = new THREE.Group(); this.root = new THREE.Group(); this.obj.add(this.root); this.root.scale.setScalar(scale);
    const body = this.body = new THREE.Group(); this.root.add(body);
    mk(new THREE.SphereGeometry(0.5, 14, 10).scale(0.74, 0.7, 1.5), M.fur, 0, 0.92, -0.05, body);
    mk(new THREE.SphereGeometry(0.42, 12, 10).scale(0.88, 1, 1), M.fur, 0, 0.98, 0.5, body);
    mk(new THREE.SphereGeometry(0.38, 12, 10), M.fur, 0, 0.95, -0.62, body);
    mk(new THREE.SphereGeometry(0.3, 10, 8).scale(0.9, 0.6, 1.5), M.light, 0, 0.66, 0.05, body);
    mk(shaggy(new THREE.IcosahedronGeometry(0.56, 2).scale(1.0, 1.08, 0.9), 0.42, 3), M.mane, 0, 1.24, 0.82, body);
    mk(shaggy(new THREE.IcosahedronGeometry(0.4, 1).scale(0.9, 1.1, 1.0), 0.5, 7), M.mane, 0, 0.98, 0.72, body);
    const head = this.head = new THREE.Group(); head.position.set(0, 1.28, 1.05); body.add(head);
    mk(new THREE.SphereGeometry(0.27, 12, 10).scale(0.95, 0.95, 1.08), M.fur, 0, 0.02, 0.1, head);
    mk(new THREE.SphereGeometry(0.16, 10, 8).scale(1.05, 0.78, 1.15), M.light, 0, -0.08, 0.3, head);
    mk(new THREE.SphereGeometry(0.055, 8, 6).scale(1.2, 0.8, 1), M.dark, 0, -0.02, 0.45, head);
    for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.03, 6, 4), M.eye, s * 0.1, 0.09, 0.3, head); mk(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 1, 0.5), M.fur, s * 0.17, 0.24, 0.0, head); }
    this.jaw = new THREE.Group(); this.jaw.position.set(0, -0.13, 0.18); head.add(this.jaw);
    mk(new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.55, 1.4), M.light, 0, -0.02, 0.1, this.jaw);
    this.legs = [];
    for (const [x, z, front] of [[-0.22, 0.56, 1], [0.22, 0.56, 1], [-0.24, -0.6, 0], [0.24, -0.6, 0]]) {
      const hip = new THREE.Group(); hip.position.set(x, 0.92, z); body.add(hip);
      mk(new THREE.CylinderGeometry(0.12, 0.09, 0.5, 8).translate(0, -0.25, 0), M.fur, 0, 0, 0, hip);
      const knee = new THREE.Group(); knee.position.set(0, -0.48, 0); hip.add(knee);
      mk(new THREE.CylinderGeometry(0.08, 0.07, 0.36, 7).translate(0, -0.18, 0), M.fur, 0, 0, 0, knee);
      mk(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.55, 1.35), M.light, 0, -0.38, 0.04, knee);
      this.legs.push({ hip, knee, front, side: x < 0 ? -1 : 1 });
    }
    const tail = this.tail = new THREE.Group(); tail.position.set(0, 1.02, -0.95); body.add(tail);
    mk(new THREE.CylinderGeometry(0.035, 0.025, 0.85, 6).rotateX(-1.1).translate(0, -0.2, -0.38), M.fur, 0, 0, 0, tail);
    mk(new THREE.SphereGeometry(0.08, 6, 5), M.mane, 0, -0.38, -0.76, tail);
    scene.add(this.obj);
    this.pos = this.obj.position; this.yaw = 0; this.vel = new THREE.Vector3(); this.state = 'wait'; this.st = 0; this.flash = 0; this.alive = true;
    this.curName = ''; this.mode = 'idle'; this.at = 0; this.t = Math.random() * 10; this.last = new THREE.Vector3(); this.spd = 0; this.leap = 0;
  }
  play(name, o = {}) {
    if (this.curName === name && !o.restart) return;
    this.curName = name; this.at = 0;
    this.mode = { Walk_Loop: 'walk', Sprint_Loop: 'run', Sword_Attack: 'pounce', Idle_Talking_Loop: 'roar', Hit_Head: 'hit', Death01: 'dead' }[name] || 'idle';
    if (this.mode === 'roar') SFX.roar();
  }
  dur() { return 2.1; }
  headPos(out) { return this.head.getWorldPosition(out); }
  handPos(out) { return this.head.getWorldPosition(out); }
  update(dt) {
    this.t += dt; this.at += dt; const t = this.t, m = this.mode, L = this.legs;
    const mv = Math.hypot(this.pos.x - this.last.x, this.pos.z - this.last.z) / Math.max(dt, 1e-4); this.last.copy(this.pos); this.spd += (mv - this.spd) * Math.min(1, dt * 8);
    let bodyY = 0, bodyP = 0, headP = 0, jaw = 0.05, fwd = 0, up = 0, tailS = 0.3;
    for (const g of L) { g.hip.rotation.x *= 0.8; g.knee.rotation.x *= 0.8; }
    if (m === 'walk' || m === 'run' || (m === 'idle' && this.spd > 0.6)) {
      const run = m === 'run' || this.spd > 4.5, w = run ? 13 : 3.2 + this.spd * 1.6, a = run ? 0.9 : 0.5;
      for (const g of L) { const ph = run ? (g.front ? 0 : Math.PI) + (g.side > 0 ? 0.35 : 0) : (g.front ? 0 : Math.PI) + (g.side > 0 ? Math.PI : 0); const s = Math.sin(t * w + ph); g.hip.rotation.x = s * a; g.knee.rotation.x = Math.max(0, -Math.cos(t * w + ph)) * (g.front ? -0.7 : 0.9); }
      bodyY = Math.abs(Math.sin(t * w)) * (run ? 0.12 : 0.04); bodyP = run ? Math.sin(t * w) * 0.12 : 0; tailS = run ? 0.1 : 0.4;
    } else if (m === 'idle') { bodyY = Math.sin(t * 2) * 0.012; headP = Math.sin(t * 0.7) * 0.08; }
    else if (m === 'roar') { const k = Math.min(1, this.at / 0.35); jaw = 0.05 + 0.55 * k * (0.8 + 0.2 * Math.sin(t * 30)); headP = -0.35 * k; bodyP = -0.08 * k; bodyY = 0.04 * k; }
    else if (m === 'pounce') {
      const T = this.slamT || 1.1, k = Math.min(1, this.st / T);
      if (k < 0.72) { const c = Math.min(1, k / 0.5); bodyY = -0.28 * c; bodyP = 0.12 * c; headP = 0.25 * c; jaw = 0.3; for (const g of L) { g.hip.rotation.x = g.front ? -0.45 * c : 0.7 * c; g.knee.rotation.x = g.front ? 0.9 * c : -1.1 * c; } tailS = 1.5; this.root.position.x = Math.sin(t * 40) * 0.02 * c; }
      else { const s = (k - 0.72) / 0.28; fwd = (this.leap || 3) * s; up = Math.sin(Math.PI * s) * 1.0; bodyP = -0.35 * Math.sin(Math.PI * s); jaw = 0.6; for (const g of L) { g.hip.rotation.x = g.front ? -1.25 : 1.0; g.knee.rotation.x = g.front ? -0.2 : 0.4; } }
    } else if (m === 'hit') { const k = Math.max(0, 1 - this.at / 0.5); bodyP = -0.2 * k; headP = -0.3 * k; jaw = 0.4 * k; if (this.at > 0.9) this.mode = 'idle'; }
    if (m === 'dead') { const k = Math.min(1, this.at / 0.8); this.root.rotation.z = k * k * 1.45; this.root.position.y = k * 0.28; jaw = 0.35; for (const g of L) { g.hip.rotation.x = (g.front ? -0.3 : 0.3) * k; } }
    else { this.root.rotation.z = 0; this.root.position.y = up; }
    this.root.position.z = fwd; if (m !== 'pounce') this.root.position.x = 0;
    this.body.position.y = bodyY; this.body.rotation.x = bodyP; this.head.rotation.x = headP; this.jaw.rotation.x = jaw;
    this.tail.rotation.x = Math.sin(t * 2.2) * 0.15; this.tail.rotation.y = Math.sin(t * 1.7) * tailS;
    this.obj.rotation.y = this.yaw;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);
    const fl = this.flash; LIONMAT.fur.emissive.setRGB(fl * 0.6, fl * 0.15, fl * 0.1); LIONMAT.mane.emissive.setRGB(fl * 0.4, fl * 0.1, fl * 0.05);
  }
  remove() { scene.remove(this.obj); }
}

// ------------------------------------------------------------------ Benaiah's worlds: the winter highlands of Moab, and the pit in time of snow (2 Sam 23:20)
function hgtMoab(x, z) {
  const r = Math.hypot(x * 0.82, z * 1.05); let h = Math.max(0, r - 27); h = h * h * 0.022 + h * 0.3;
  h += fbm(x * 0.045 + 21, z * 0.045 + 5) * 1.6 + fbm(x * 0.16, z * 0.16) * 0.25;
  const rx = x + 40, rz = z + 30; h += Math.exp(-(rx * rx + rz * rz) / 260) * 12;
  return h;
}
function buildMoab() {
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp;
  const grass = new THREE.Color(0.52, 0.47, 0.34), rock = new THREE.Color(0.48, 0.45, 0.43), snow = new THREE.Color(0.9, 0.92, 0.95), mud = new THREE.Color(0.4, 0.33, 0.25);
  buildGround((x, z, y, sl, c) => {
    c.copy(grass).lerp(mud, CL(fbm(x * 0.1 + 4, z * 0.1) * 0.8 + 0.2, 0, 1) * 0.4); c.lerp(rock, SS(sl, 0.6, 1.6));
    const s = fbm(x * 0.06 + 9, z * 0.06 + 2) + y * 0.05 - (sl > 1.4 ? 0.5 : 0); c.lerp(snow, SS(s, 0.05, 0.35) * 0.92);
  }, 0xb4b8c4);
  const B = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2, r = 31 + (i % 3) * 3; B.push([Math.cos(a) * r, Math.sin(a) * r * 0.75, 1.3 + (i % 4) * 0.5]); }
  B.push([-17, -12, 1.1], [19, 9, 0.9], [-21, 10, 1.0], [15, -15, 0.8]);
  addBoulders(B, 0x8a8480);
  // the camp of Moab to the north: tents, standards and fires
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const [x, z, r] of [[-12, -26, 2.2], [-3, -29, 2.5], [7, -27, 2.1], [15, -24, 1.9]]) { const m = new THREE.Mesh(tentGeo(r, r * 1.2, 0x7a5a36, 0x3a2a1a, 8), lam); m.position.set(x, hgt(x, z) - 0.05, z); m.rotation.y = x * 0.7; m.castShadow = true; W.add(m); COL.push({ x, z, r: r * 0.9 }); }
  const pole = new THREE.MeshLambertMaterial({ color: 0x3a2a1a }), cloth = new THREE.MeshLambertMaterial({ color: 0x8a3a12, side: THREE.DoubleSide });
  for (const [x, z] of [[-8, -21], [10, -21]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 6), pole); p.position.set(x, hgt(x, z) + 2.1, z); W.add(p); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), cloth); f.position.set(x + 0.58, hgt(x, z) + 3.6, z); W.add(f); }
  addFire(-6, hgt(-6, -23) + 0.1, -23, 1.1); addFire(4, hgt(4, -24) + 0.1, -24, 1.2);
}

// ---- Level 6 world: harvest fields before Bethlehem — the barley (1 Chr 11:13), the lentiles (2 Sam 23:11), the well by the gate (23:15), the hold to the south
function hgtBeth(x, z) {
  let h = fbm(x * 0.04 + 3, z * 0.04 + 8) * 1.2 + fbm(x * 0.15, z * 0.15) * 0.15;
  const r = Math.hypot(x * 0.85, z * 0.9); h += Math.max(0, r - 33) * Math.max(0, r - 33) * 0.014;
  h += Math.max(0, z - 15) * 0.22;   // the rise toward the hold
  return h;
}
let BETH = null;
function buildBeth() {
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp, B = STORY_L6.barley, Lf = STORY_L6.lentiles, Wl = STORY_L6.well;
  const grass = new THREE.Color(0.56, 0.52, 0.32), dry = new THREE.Color(0.7, 0.6, 0.4), rock = new THREE.Color(0.52, 0.47, 0.4), gold = new THREE.Color(0.86, 0.7, 0.36), green = new THREE.Color(0.38, 0.5, 0.22), road = new THREE.Color(0.66, 0.56, 0.42);
  buildGround((x, z, y, sl, c) => {
    c.copy(grass).lerp(dry, CL(fbm(x * 0.08 + 2, z * 0.08) * 0.9 + 0.2, 0, 1) * 0.55); c.lerp(rock, SS(sl, 0.8, 2));
    c.lerp(gold, 1 - SS(Math.hypot(x - B.x, z - B.z), B.r - 0.6, B.r + 0.6)); c.lerp(green, 1 - SS(Math.hypot(x - Lf.x, z - Lf.z), Lf.r - 0.6, Lf.r + 0.6));
    c.lerp(road, (1 - SS(Math.abs(x), 1.2, 2.6)) * SS(z, -30, -14) * 0.6);
  }, 0xa89a7a);
  BETH = { t: 0 };
  // barley: one merged mesh of stalks with ears
  const rng = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const st = []; for (let i = 0; i < 260; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (B.r - 0.3), x = B.x + Math.cos(a) * r, z = B.z + Math.sin(a) * r, h = 0.75 + rng() * 0.35;
    st.push(new THREE.ConeGeometry(0.06, h, 3).translate(0, h / 2, 0).rotateZ((rng() - 0.5) * 0.3).translate(x, hgt(x, z), z)); }
  const bar = new THREE.Mesh(mergeGeometries(st), new THREE.MeshLambertMaterial({ color: 0xd8b35a, emissive: 0x3a2a10, flatShading: true })); W.add(bar);
  // lentiles: low green bushes
  const ls = []; for (let i = 0; i < 150; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (Lf.r - 0.3), x = Lf.x + Math.cos(a) * r, z = Lf.z + Math.sin(a) * r, s = 0.22 + rng() * 0.14;
    ls.push(new THREE.IcosahedronGeometry(s, 0).scale(1, 0.6, 1).translate(x, hgt(x, z) + s * 0.4, z)); }
  BETH.lentil = new THREE.Mesh(mergeGeometries(ls), new THREE.MeshLambertMaterial({ color: 0x5e8a34, emissive: 0x14200a, flatShading: true })); W.add(BETH.lentil);
  // field rings (shown during their sequence)
  const ringAt = (x, z, r, col) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.18, r, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(x, hgt(x, z) + 0.08, z); m.visible = false; W.add(m); return m; };
  BETH.barleyRing = ringAt(B.x, B.z, B.r, 0xffd36a); BETH.lentilRing = ringAt(Lf.x, Lf.z, Lf.r, 0x9aff6a);
  // Bethlehem: the wall and the gate to the north, houses behind it
  const stone = new THREE.MeshLambertMaterial({ color: 0xbfa88a, flatShading: true }), dark = new THREE.MeshLambertMaterial({ color: 0x8a7458, flatShading: true });
  const gz = -27.5;
  for (const [x0, x1] of [[-40, -3.2], [3.2, 40]]) { const w = x1 - x0, m = new THREE.Mesh(new THREE.BoxGeometry(w, 4.2, 1.4), stone); m.position.set((x0 + x1) / 2, hgt((x0 + x1) / 2, gz) + 1.6, gz); m.castShadow = true; W.add(m); }
  for (const x of [-3.9, 3.9]) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6, 2.2), stone); t.position.set(x, hgt(x, gz) + 2.6, gz); t.castShadow = true; W.add(t); }
  const lint = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 1.6), dark); lint.position.set(0, hgt(0, gz) + 4.6, gz); W.add(lint);
  for (let i = 0; i < 9; i++) { const x = -22 + i * 5.5 + (i % 2) * 1.5, z = gz - 4 - (i % 3) * 2.5, s = 2.4 + (i % 3) * 0.6; const h = new THREE.Mesh(new THREE.BoxGeometry(s * 1.3, s, s), i % 2 ? stone : dark); h.position.set(x, hgt(x, z) + s / 2 + 1.2, z); W.add(h); }
  // the well of Bethlehem, which is by the gate
  const wx = Wl.x, wz = Wl.z, wy = hgt(wx, wz);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.85, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0xa89478, side: THREE.DoubleSide, flatShading: true })); ring.position.set(wx, wy + 0.42, wz); ring.castShadow = true; W.add(ring);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 5, 16).rotateX(Math.PI / 2), stone); lip.position.set(wx, wy + 0.86, wz); W.add(lip);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.1, metalness: 0.3 })); water.position.set(wx, wy + 0.3, wz); W.add(water);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.0, 6), dark); p.position.set(wx + s * 1.05, wy + 1.0, wz); W.add(p); }
  const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6).rotateZ(Math.PI / 2), dark); bar2.position.set(wx, wy + 1.95, wz); W.add(bar2);
  COL.push({ x: wx, z: wz, r: 1.15 });
  BETH.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 14, 14, 1, true).translate(0, 7, 0), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); BETH.beam.position.set(wx, wy, wz); W.add(BETH.beam);
  // the hold (1 Chr 11:15 "to the rock"): boulders on the rise to the south
  addBoulders([[-6.5, 19, 1.7], [6.5, 19.5, 1.6], [-10, 16.5, 1.2], [10, 16, 1.1], [-2.5, 22, 2.0], [3.5, 22.5, 1.8], [-27, -8, 1.3], [27, 4, 1.1], [-25, 10, 1.0], [-19, -19, 0.9]], 0x9a8a74);
  // olive trees
  const trunk = new THREE.MeshLambertMaterial({ color: 0x5a4632 }), leaf = new THREE.MeshLambertMaterial({ color: 0x7a8a4a, emissive: 0x1a2010, flatShading: true });
  for (const [x, z] of [[-31, 0], [32, -8], [-33, 14], [34, 12], [22, 14], [-21, 14]]) { const y = hgt(x, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6).translate(0, 1.1, 0), trunk); t.position.set(x, y, z); t.castShadow = true; W.add(t); const c = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 5).scale(1.3, 0.8, 1.3), leaf); c.position.set(x, y + 2.7, z); c.castShadow = true; W.add(c); COL.push({ x, z, r: 0.45 }); }
}
function hgtPit(x, z) { return Math.abs(x) < PITH && Math.abs(z) < PITH ? 0 : PITD; }
function hgtPitShape(x, z) { const m = Math.max(Math.abs(x), Math.abs(z)); if (m < PITH + 0.4) return -0.6; const r = Math.hypot(x, z); return PITD + Math.max(0, r - 40) * Math.max(0, r - 40) * 0.01 + fbm(x * 0.05 + 3, z * 0.05) * 1.4 * Math.min(1, (m - PITH) / 8); }
// a rough rock face (faces +Z): layered strata, cracks and overhangs, snow caught on the ledges and the rim
function rockWallGeo(w, h, seed, rockC, snowC) {
  const SS = THREE.MathUtils.smoothstep, g = new THREE.PlaneGeometry(w, h, Math.ceil(w * 2.4), Math.ceil(h * 4)), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const strata = Math.sin(y * 5.2 + vnoise(x * 0.4 + seed, y * 0.3) * 3.0) * 0.08;
    const n = fbm(x * 0.45 + seed, y * 0.7) * 0.75 + vnoise(x * 2.2 + seed, y * 2.6) * 0.16 + strata;
    const ledge = SS(Math.sin(y * 2.6 + seed) , 0.75, 0.95) * 0.12;
    p.setZ(i, n + ledge - 0.35);
    const top = SS(y, h / 2 - 0.55, h / 2), up = ledge > 0.05 ? 0.6 : 0;
    c.copy(rockC).multiplyScalar(0.62 + n * 0.55 + strata).lerp(snowC, Math.max(top, up * 0.8, n > 0.62 ? 0.4 : 0)); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
function buildPit() {
  const snow = new THREE.Color(0.9, 0.92, 0.96), rockC = new THREE.Color(0.45, 0.42, 0.4), SS = THREE.MathUtils.smoothstep;
  HGT = hgtPitShape;
  buildGround((x, z, y, sl, c) => { c.copy(snow).lerp(rockC, SS(sl, 1.2, 3) * 0.6); c.multiplyScalar(0.92 + fbm(x * 0.2, z * 0.2) * 0.1); }, 0xc4cad6);
  HGT = hgtPit;
  // the floor of the pit: trodden snow over earth
  const fg = new THREE.PlaneGeometry(PITH * 2, PITH * 2, 28, 28).rotateX(-Math.PI / 2); const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), c = new THREE.Color();
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), e = Math.max(Math.abs(x), Math.abs(z)) / PITH; const n = fbm(x * 0.35 + 2, z * 0.35); c.copy(snow).lerp(new THREE.Color(0.52, 0.46, 0.4), THREE.MathUtils.clamp(0.55 - e * 0.5 + n * 0.5, 0, 0.8)); fp.setY(i, SS(e, 0.82, 1) * 0.35); fc.set([c.r, c.g, c.b], i * 3); }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
  const fm = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true, map: detailTex() })); fm.receiveShadow = true; W.add(fm);
  // four walls of rough rock, faces inward only (the camera can sit outside the rim and look down through the back of a wall)
  const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, map: detailTex() });
  for (let k = 0; k < 4; k++) {
    const g = rockWallGeo(PITH * 2 + 0.6, PITD + 0.9, k * 13, rockC, snow);
    const m = new THREE.Mesh(g, wm); m.rotation.y = k * Math.PI / 2; const a = k * Math.PI / 2; m.position.set(-Math.sin(a) * PITH, (PITD + 0.9) / 2 - 0.45, -Math.cos(a) * PITH); m.receiveShadow = true; W.add(m);
  }
  // rocks, drifts, old bones, and the rope he went down by
  addBoulders([[-7.5, -7.8, 0.8], [8.2, 6.9, 0.7], [7.6, -8.4, 0.55], [-8.6, 7.4, 0.6]], 0x7a7470);
  const drift = new THREE.MeshLambertMaterial({ color: 0xeef2f8 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = Math.cos(a) * (PITH - 0.7), z = Math.sin(a) * (PITH - 0.7); const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.4, 1.1), drift); d.position.set(THREE.MathUtils.clamp(x, -PITH + 0.6, PITH - 0.6), 0, THREE.MathUtils.clamp(z, -PITH + 0.6, PITH - 0.6)); d.rotation.y = a; d.receiveShadow = true; W.add(d); }
  const bone = new THREE.MeshLambertMaterial({ color: 0xdcd2bc });
  for (const [x, z, r] of [[-5, 8.6, 0.4], [-4.3, 8.9, 1.9], [6.3, -6.2, 1.1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 5).rotateZ(Math.PI / 2), bone); b.position.set(x, 0.1, z); b.rotation.y = r; W.add(b); }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, PITD + 0.6, 5), new THREE.MeshLambertMaterial({ color: 0x8a6a40 })); rope.position.set(2.5, (PITD + 0.6) / 2, PITH - 0.25); W.add(rope);
  buildSnow();
}
let SNOW = null;
function buildSnow() {
  const n = LOWQ ? 260 : 620, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 34, Math.random() * 14, (Math.random() - 0.5) * 34], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  SNOW = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.13, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.9, depthWrite: false, color: 0xffffff }));
  SNOW.frustumCulled = false; W.add(SNOW);
}
function updateSnow(dt) {
  if (!SNOW || !SNOW.parent) return; const p = SNOW.geometry.attributes.position, t = now();
  for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (1.1 + (i % 5) * 0.12); if (y < 0) y += 14; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.25); }
  p.needsUpdate = true;
}

// ---- Level: Benaiah (2 Sam 23:20–23; 1 Chr 11:22–25). Story and tuning are in STORY_L4 at the top of this file.
async function flow4() {
  G.t0 = now(); G.phase = 'cine'; G.stage = 'moab'; G.seq = 0; document.body.classList.add('cine');
  P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L4.intro, INTRO4_SHOTS);
  cineClear(); if (SNOW && WORLD === 'moab') { W.remove(SNOW); SNOW = null; }
  P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI;
  MOSES.obj.visible = true; MOSES.yaw = 1.25; G.cine = { pos: new THREE.Vector3(MOSES.pos.x + 2.9, MOSES.pos.y + 1.55, MOSES.pos.z + 0.7), look: MOSES.pos.clone().setY(MOSES.pos.y + 1.45).add(new THREE.Vector3(0, 0, -1.35)), snap: true };
  MOSES.play('Idle_Talking_Loop');
  await card(STORY_L4.counsel);
  MOSES.play('Idle_Loop'); MOSES.yaw = Math.PI * 0.92; G.cine = null; document.body.classList.remove('cine');
  await runWaves(0);
}
const INTRO4_SHOTS = {
  moab(s) {
    // the two lionlike men of Moab stand out before their host
    P.obj.visible = false; MOSES.obj.visible = false;
    const a = cineActor('captain', 'lionman', -1.3, -9, 0.15, 'Idle_Talking_Loop', 1.22, 0.8), b = cineActor('captain', 'lionman', 1.4, -9.6, -0.2, 'Sword_Idle', 1.24, 0.9);
    for (let i = 0; i < 4; i++) cineActor('phil', 'm_phil', -4.5 + i * 3, -13.5 - (i % 2), 0, 'Sword_Idle', 1, 0.8 + i * 0.1);
    camAt(0.4, a.pos.y + 1.0, -3.4, 0, a.pos.y + 2.2, -9.2); SFX.horn(); SFX.roar();
    G.storyTick = (dt) => { G.cine.pos.z += dt * 0.7; };
  },
  pit(s) {
    // he went down into a pit in time of snow; the lion turns on him
    for (const a of CINE.actors) a.obj.visible = false;
    const px = 18, pz = 12, lam = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, emissive: 0x1a1816, map: detailTex() });
    for (const [x, z, ry] of [[px, pz - 4.2, 0], [px - 4.2, pz, Math.PI / 2], [px + 4.2, pz, -Math.PI / 2]]) { const m = new THREE.Mesh(rockWallGeo(9, 4.5, x + z, new THREE.Color(0.5, 0.47, 0.44), new THREE.Color(0.9, 0.92, 0.96)), lam); m.position.set(x, hgt(px, pz) + 1.6, z); m.rotation.y = ry; W.add(m); CINE.objs.push(m); }
    const fl = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8ecf2 })); fl.position.set(px, hgt(px, pz) + 0.06, pz); W.add(fl); CINE.objs.push(fl);
    const L = new Lion(1); L.pos.set(px, hgt(px, pz) + 0.06, pz - 1.4); L.yaw = 0.2; L.play('Idle_Talking_Loop'); CINE.actors.push(L);
    P.obj.visible = true; P.pos.set(px + 0.3, hgt(px, pz) + 0.06, pz + 1.9); P.yaw = Math.PI + 0.1; P.cineAnim = 'Sword_Idle';
    if (!SNOW) { buildSnow(); } SNOW.position.set(px, hgt(px, pz), pz);
    camAt(px + 2.4, hgt(px, pz) + 5.6, pz + 6.4, px, hgt(px, pz) + 0.9, pz - 0.4);
    G.storyTick = (dt) => { G.cine.pos.y -= dt * 0.6; };
  },
  egypt(s) {
    // an Egyptian, five cubits high, with a spear like a weaver's beam; Benaiah goes down to him with a staff
    for (const a of CINE.actors) a.obj.visible = false; if (SNOW) SNOW.visible = false;
    const e = cineActor('goliath', 'egypt', -0.4, -4.2, 0, 'Walk_Loop', STORY_L4.egypt.scale, 0.7);
    P.obj.visible = true; P.pos.set(1.1, 0, 1.2); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
    // low and to Benaiah's left: the Egyptian fills the frame, his full height and spear clear of Benaiah's head
    camAt(-2.9, P.pos.y + 0.55, 4.6, -0.9, e.pos.y + 3.0, -4.2); SFX.roar();
    G.storyTick = (dt) => { e.pos.z += dt * 0.9; ground(e); G.cine.look.z += dt * 0.9; };
  },
};
function bossMarker(b, s) { b.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.flashTex, color: 0xffd060, transparent: true, depthTest: false, blending: THREE.AdditiveBlending })); b.marker.scale.setScalar(s); b.marker.renderOrder = 30; b.marker.visible = false; scene.add(b.marker); }
function spawnLion() {
  const S = STORY_L4.lion, b = new Lion(S.scale); b.isBoss = true; b.radius = 0.9; b.summoned = true; b.slamOff = S.leap; b.leap = S.leap; b.slamR = S.ring;
  b.winK = S.win; b.openK = S.open; b.pos.set(0, 0, -5); b.yaw = 0; b.maxHp = b.hp = S.hp; b.state = 'wait'; b.st = 0; b.chargeCd = 2.5; b.atkCd = 1.2; b.play('Idle_Loop'); G.boss = b; bossMarker(b, 0.9);
  return b;
}
function spawnEgyptian() {
  const S = STORY_L4.egypt, b = new Actor('goliath', S.scale, 'egypt'); b.isBoss = true; b.isEgypt = true; b.radius = 0.85; b.summoned = true; b.slamOff = 2.3; b.slamR = 2.9;
  b.winK = S.win; b.openK = S.open; b.pos.set(0, 0, -27); ground(b); b.yaw = 0; b.maxHp = b.hp = S.hp; b.state = 'intro'; b.st = 0; b.chargeCd = 3.5; b.atkCd = 1.5;
  b.play('Walk_Loop', { ts: 0.75 }); G.boss = b; bossMarker(b, 1.1);
  return b;
}
function benaiahWeapon(spear) {
  if (!P || !P.weapon) return;
  if (!P.staffGeo) { P.staffGeo = P.weapon.geometry; P.staffMat = P.weapon.material; }
  if (spear) { P.weapon.geometry = mergeGeometries(G_spear(2.5, 0.04, 0.42)); P.weapon.material = MAT.iron; P.hasSpear = true; }
  else { if (P.hasSpear) P.weapon.geometry.dispose(); P.weapon.geometry = P.staffGeo; P.weapon.material = P.staffMat; P.hasSpear = false; }
}
function disarmEgyptian(b) {
  b.disarmed = true; if (b.weapon) b.weapon.visible = false; benaiahWeapon(true); LOG('disarm');
  G.slow = 0.3; G.slowT = 1.2; SFX.clang(); SFX.shout(); shake(0.5); flashAt(P.pos.clone().setY(P.pos.y + 1.4), 3.5, 0.35, 0xfff0c0);
  toast('“…and plucked the spear out of the Egyptian’s hand…”<i>2 SAMUEL 23:21 (KJV)</i> <b>Now strike with his own spear!</b>', 4200);
}
async function pitFight() {
  const S = STORY_L4; G.resumeWave = 3; G.phase = 'cine'; G.seq = 2; G.stage = 'pit'; document.body.classList.add('cine'); prompt('');
  await fade(1); clearDead(); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; } for (const s of spoils) { s.live = false; s.m.visible = false; }
  buildWorld('pit'); MOSES.obj.visible = false; benaiahWeapon(false);
  P.state = 'cine'; P.pos.set(0, 0, 6.5); ground(P); P.yaw = Math.PI; P.cineAnim = 'Sword_Idle';
  const b = spawnLion(); LOG('boss_start'); $('bname').textContent = 'THE LION';
  G.cine = { pos: new THREE.Vector3(3.4, 5.8, 10.5), look: new THREE.Vector3(0, 0.9, -1.5), snap: true };
  await sleep(200); await fade(0); b.play('Idle_Talking_Loop'); shake(0.3);
  await card(S.lion.card);
  b.play('Idle_Loop'); G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; P.cineAnim = null; b.state = 'stalk'; b.st = 0; CAM.yaw = 0;
  $('boss-wrap').classList.remove('hidden'); G.phase = 'play'; seqBanner(2); $('wave').textContent = seqTag() + 'THE LION IN THE PIT';
}
async function egyptFight() {
  const S = STORY_L4; G.resumeWave = 4; G.phase = 'cine'; G.seq = 3; G.stage = 'egypt'; document.body.classList.add('cine'); prompt('');
  await fade(1); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; } clearDead();
  buildWorld('moab'); MOSES.obj.visible = false; benaiahWeapon(false); $('boss-wrap').classList.add('hidden');
  P.state = 'cine'; P.pos.set(0, 0, 8); ground(P); P.yaw = Math.PI; P.cineAnim = null; P.play('Idle_Loop');
  const b = spawnEgyptian(); LOG('boss_start'); $('bname').textContent = 'THE EGYPTIAN';
  G.cine = { follow: b, off: new THREE.Vector3(3.4, 2.0, 6.2), lookUp: 3.0 };
  await sleep(200); await fade(0); SFX.horn();
  await until(() => b.pos.z >= -14);
  b.play('Idle_Talking_Loop');
  await card(S.egypt.card);
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; b.state = 'stalk'; b.st = 0; CAM.yaw = 0;
  $('boss-wrap').classList.remove('hidden'); G.phase = 'play'; seqBanner(3); $('wave').textContent = seqTag() + 'THE EGYPTIAN';
}
async function endingL4() {
  G.resumeWave = 4; G.phase = 'cine'; G.stage = 'end'; document.body.classList.add('cine'); prompt('');
  await sleep(600); await fade(1); clearDead(); if (G.boss) { G.boss.remove(); scene.remove(G.boss.marker); G.boss = null; } $('boss-wrap').classList.add('hidden');
  P.state = 'cine'; P.pos.set(0, 0, 4); ground(P); P.yaw = 0; P.cineAnim = 'Idle_Loop';
  G.cine = { pos: new THREE.Vector3(1.3, P.pos.y + 1.75, 6.6), look: P.pos.clone().setY(P.pos.y + 1.5), snap: true };
  await sleep(250); await fade(0);
  await card(STORY_L4.end);
  winGame();
}

// ------------------------------------------------------------------ Level: Deborah and Barak (Judges 4–5). Story and tuning: STORY_L5 at the top of this file.
function hgtKishon(x, z) {
  let h = fbm(x * 0.035 + 7, z * 0.035 + 2) * 1.3 + fbm(x * 0.14, z * 0.14) * 0.2;
  const r = Math.hypot(x * 0.85, z); h += Math.max(0, r - 34) * Math.max(0, r - 34) * 0.012;
  const tx = x + 62, tz = z + 74; h += Math.max(0, 1 - Math.hypot(tx, tz) / 52) ** 1.6 * 46;   // mount Tabor, the rounded mountain to the north-west
  const rz = z - KISHON_Z(x); h -= Math.exp(-rz * rz / 18) * 1.6;                                 // the river Kishon
  return h;
}
const KISHON_Z = (x) => -27 + Math.sin(x * 0.04) * 3;
let KISHON = null;
function buildKishon() {
  const SS = THREE.MathUtils.smoothstep, CL = THREE.MathUtils.clamp;
  const grass = new THREE.Color(0.46, 0.5, 0.28), dry = new THREE.Color(0.62, 0.56, 0.38), rock = new THREE.Color(0.5, 0.46, 0.4), mud = new THREE.Color(0.36, 0.3, 0.22);
  buildGround((x, z, y, sl, c) => {
    c.copy(grass).lerp(dry, CL(fbm(x * 0.08 + 1, z * 0.08) * 0.9 + 0.2, 0, 1) * 0.6); c.lerp(rock, SS(sl, 0.8, 2));
    const rz = z - KISHON_Z(x); c.lerp(mud, Math.exp(-rz * rz / 30) * 0.8);
  }, 0x8a9a9a);
  addBoulders([[-27, -6, 1.3], [28, 4, 1.1], [-24, 12, 1.0], [25, -14, 1.2], [-12, 15, 0.8], [17, 15, 0.9]], 0x8a8276);
  // the river: a long ribbon of water that the flood raises
  const wg = new THREE.PlaneGeometry(420, 9, 140, 1).rotateX(-Math.PI / 2); const wp = wg.attributes.position;
  for (let i = 0; i < wp.count; i++) wp.setZ(i, wp.getZ(i) + KISHON_Z(wp.getX(i)));
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x46606a, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.86 })); water.position.y = -0.55; W.add(water);
  // acacias on the plain
  const trunk = new THREE.MeshLambertMaterial({ color: 0x4a3626 }), leaf = new THREE.MeshLambertMaterial({ color: 0x6e8a3c, emissive: 0x1a2210, flatShading: true });
  for (const [x, z] of [[-32, 2], [33, -6], [-20, -20], [21, -21], [-36, 16], [38, 14]]) { const y = hgt(x, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 6).translate(0, 1.5, 0), trunk); t.position.set(x, y, z); t.castShadow = true; W.add(t); const c = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 5).scale(1.4, 0.45, 1.4), leaf); c.position.set(x, y + 3.2, z); c.castShadow = true; W.add(c); COL.push({ x, z, r: 0.4 }); }
  // the tent of Jael, the wife of Heber the Kenite (Judges 4:17)
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); const tp = STORY_L5.tent;
  const tent = new THREE.Mesh(tentGeo(2.0, 2.4, 0x8a6a46, 0xc8aa78, 8), lam); tent.position.set(tp.x, hgt(tp.x, tp.z) - 0.05, tp.z); tent.rotation.y = 0.6; tent.castShadow = true; W.add(tent); COL.push({ x: tp.x, z: tp.z, r: 1.6 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.set(tp.x, hgt(tp.x, tp.z) + 7, tp.z + 2.2); W.add(beam);
  KISHON = { water, tent, beam, flood: 0 };
}
function buildPrecip(kind) {
  const rain = kind === 'rain', n = rain ? (LOWQ ? 420 : 900) : (LOWQ ? 260 : 620), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 34, Math.random() * 14, (Math.random() - 0.5) * 34], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
  if (rain) { const gr = x.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(220,235,255,0)'); gr.addColorStop(1, 'rgba(220,235,255,1)'); x.fillStyle = gr; x.fillRect(15, 0, 2, 32); }
  else { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); }
  const m = new THREE.Points(g, new THREE.PointsMaterial({ size: rain ? 0.5 : 0.13, map: new THREE.CanvasTexture(cv), transparent: true, opacity: rain ? 0.8 : 0.9, depthWrite: false, color: 0xffffff }));
  m.frustumCulled = false; m.userData.fall = rain ? 16 : 1.1; return m;
}
// ---- the chariots of iron (Judges 4:3, 13): two horses, an iron car, a driver; built in code
const HORSEMAT = {};
class Chariot {
  constructor() {
    if (!HORSEMAT.coat) { HORSEMAT.coat = new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.8, flatShading: true }); HORSEMAT.dark = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9 }); HORSEMAT.iron = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.42, metalness: 0.75, flatShading: true }); HORSEMAT.wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.85 }); }
    const M = HORSEMAT, g = this.obj = new THREE.Group(); this.root = g; scene.add(g);
    const mk = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    this.legs = [];
    for (const hx of [-0.42, 0.42]) {
      mk(new THREE.SphereGeometry(0.5, 10, 8).scale(0.62, 0.66, 1.25), M.coat, hx, 1.32, 1.95);
      mk(new THREE.CylinderGeometry(0.13, 0.2, 0.75, 8).rotateX(-0.75), M.coat, hx, 1.72, 2.55);
      mk(new THREE.BoxGeometry(0.17, 0.2, 0.52).rotateX(0.55), M.coat, hx, 1.98, 2.85);
      mk(new THREE.BoxGeometry(0.05, 0.3, 0.5).rotateX(-0.75), M.dark, hx, 1.9, 2.5);
      mk(new THREE.CylinderGeometry(0.05, 0.02, 0.6, 5).rotateX(0.5), M.dark, hx, 1.2, 1.25);
      for (const [lz, f] of [[2.45, 1], [1.5, 0]]) for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(hx + s * 0.15, 1.15, lz); g.add(hip); mk(new THREE.CylinderGeometry(0.07, 0.05, 1.05, 6).translate(0, -0.52, 0), M.coat, 0, 0, 0, hip); mk(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6), M.dark, 0, -1.08, 0, hip); this.legs.push({ hip, ph: (f ? 0 : Math.PI) + (s > 0 ? 0.5 : 0) + (hx > 0 ? 0.25 : 0) }); }
    }
    mk(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6).rotateX(Math.PI / 2), M.wood, 0, 0.95, 1.2);
    mk(new THREE.BoxGeometry(1.3, 0.72, 0.95), M.iron, 0, 0.98, 0);
    mk(new THREE.BoxGeometry(1.36, 0.06, 1.0), M.wood, 0, 0.62, 0);
    this.wheels = [];
    for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.78, 0.58, -0.05); g.add(w); mk(new THREE.TorusGeometry(0.54, 0.055, 6, 18).rotateY(Math.PI / 2), M.iron, 0, 0, 0, w); for (let k = 0; k < 6; k++) { const sp = mk(new THREE.BoxGeometry(0.04, 1.02, 0.04), M.wood, 0, 0, 0, w); sp.rotation.x = k * Math.PI / 6; } this.wheels.push(w); }
    this.driver = new Actor('phil', 1, 'canaan'); g.add(this.driver.obj); this.driver.pos.set(0, 0.62, -0.05); this.driver.yaw = 0; this.driver.play('Sword_Idle');
    this.pos = g.position; this.yaw = 0; this.t = Math.random() * 10; this.spd = 0; this.state = 'wait';
  }
  update(dt) {
    this.t += dt; const run = this.spd > 0.5, w = 4 + this.spd * 0.9;
    for (const L of this.legs) L.hip.rotation.x = run ? Math.sin(this.t * w + L.ph) * 0.75 : L.hip.rotation.x * 0.85;
    for (const wh of this.wheels) wh.rotation.x += this.spd * dt / 0.54;
    this.obj.rotation.y = this.yaw; if (this.driver.obj.visible) this.driver.update(dt);
  }
  remove() { scene.remove(this.obj); }
}
const CH = { list: [], lanes: [] };
function clearChariots() { for (const c of CH.list) { c.remove(); if (c.lane) scene.remove(c.lane); } CH.list.length = 0; CH.active = false; CH.mud = false; }
function laneMesh() { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.renderOrder = 5; scene.add(m); return m; }
function launchChariot(c, mud) {
  // a straight run across the field, warned by a red lane on the ground first
  const S = STORY_L5.chariots, side = Math.random() < 0.5 ? -1 : 1, z0 = THREE.MathUtils.clamp(P.pos.z - 1.5 - Math.random() * 5, ARENA.z0 + 3, ARENA.z1 - 3), z1 = THREE.MathUtils.clamp(P.pos.z - 1 - Math.random() * 4, ARENA.z0 + 3, ARENA.z1 - 3);
  c.a = new THREE.Vector3(side * 38, 0, z0); c.b = new THREE.Vector3(-side * 38, 0, z1); c.dir = c.b.clone().sub(c.a).normalize(); c.len = c.a.distanceTo(c.b);
  c.pos.copy(c.a); c.pos.y = hgt(c.a.x, c.a.z); c.yaw = Math.atan2(c.dir.x, c.dir.z); c.d = 0; c.state = 'warn'; c.st = 0; c.hitP = false; c.mud = !!mud; c.obj.visible = true; c.driver.obj.visible = true; c.stuckAt = mud ? c.len * (0.42 + Math.random() * 0.16) : 1e9;
  if (!c.lane) c.lane = laneMesh(); const mid = c.a.clone().lerp(c.b, 0.5); c.lane.position.set(mid.x, hgt(mid.x, mid.z) + 0.08, mid.z); c.lane.rotation.y = c.yaw; c.lane.scale.set(2.4, 1, c.len); c.lane.visible = true;
  SFX.horn(); LOG('chariot', { mud: !!mud });
}
function updateChariots(dt) {
  if (!CH.list.length) return; const S = STORY_L5.chariots;
  for (const c of CH.list) {
    c.st += dt;
    if (c.state === 'warn') { c.spd = 0; c.lane.material.opacity = 0.22 + 0.18 * Math.sin(c.st * 14); if (c.st > S.warn) { c.state = 'run'; c.st = 0; } }
    else if (c.state === 'run') {
      const v = c.mud ? S.mudSpeed : S.speed; c.spd = v; c.d += v * dt; c.pos.copy(c.a).addScaledVector(c.dir, c.d); c.pos.y = hgt(c.pos.x, c.pos.z); c.lane.material.opacity = Math.max(0, c.lane.material.opacity - dt * 0.6);
      if (G.phase === 'play' && !c.hitP && P.state !== 'dead') { const rel = P.pos.clone().sub(c.pos); const along = rel.dot(c.dir), lat = Math.abs(rel.x * c.dir.z - rel.z * c.dir.x); if (along > -0.8 && along < 3.2 && lat < 1.25) { c.hitP = true; damagePlayer(S.dmg, c.pos); P.vel.addScaledVector(new THREE.Vector3(-c.dir.z, 0, c.dir.x).multiplyScalar(Math.sign(rel.x * -c.dir.z + rel.z * c.dir.x) || 1), 9); shake(0.5); } }
      for (const a of ALLIES) if (!a.down) { const rel = a.pos.clone().sub(c.pos); const along = rel.dot(c.dir), lat = Math.abs(rel.x * c.dir.z - rel.z * c.dir.x); if (along > -0.8 && along < 3.2 && lat < 1.2 && !a.chHit) { a.chHit = c; hurtAlly(a, S.dmg * 0.7, c.pos); } }
      if (c.d >= c.stuckAt) { c.state = 'stuck'; c.st = 0; c.spd = 0; c.lane.visible = false; c.driver.obj.visible = false; const e = spawnEnemy('captain', c.pos.x + c.dir.z * 1.6, c.pos.z - c.dir.x * 1.6, 0); e.fromChariot = c; c.foe = e; SFX.slam(); puff(c.pos.clone().setY(c.pos.y + 0.4), 3, 1.4, new THREE.Vector3(0, 0.8, 0), 0x4a3a2a); toast('<b>The chariot sinks in the mud!</b> Its driver leaps down.', 2000); LOG('chariot_stuck'); }
      if (c.d >= c.len) { c.state = 'wait'; c.st = 0; c.obj.visible = false; c.lane.visible = false; for (const a of ALLIES) if (a.chHit === c) a.chHit = null; }
    } else if (c.state === 'stuck') { c.root.rotation.z = Math.min(0.18, c.st * 0.2); c.pos.y = hgt(c.pos.x, c.pos.z) - Math.min(0.35, c.st * 0.1); }
    else if (c.state === 'swept') { c.pos.x += dt * 7; c.pos.y -= dt * 0.25; c.root.rotation.z += dt * 0.6; }
    c.update(dt);
  }
}
// ---- Level 6 flow: David the mighty man and his three mighty men (2 Samuel 23:8–17; 1 Chronicles 11:10–19)
const L6 = { k0: null, total: 1, hold: 0, spawnT: 0, spawning: false, out: false, field: 100, run: null, drawn: 0, david: null, lastLbl: '' };
function swapHero(look) {
  if (P.look === look) return; const pos = P.pos.clone(), yaw = P.yaw, hp = P.hp; P.remove();
  P = new Actor('barak', look === 'davidking' ? 1.04 : 1.0, look); P.pos.copy(pos); ground(P); P.yaw = yaw; P.hp = hp; P.play('Idle_Loop');
  $('who-name').textContent = look === 'adino' ? 'ADINO · THE THREE' : 'DAVID'; LOG('swap_hero', { look });
}
async function flow6() {
  G.t0 = now(); G.phase = 'cine'; G.stage = 'beth'; G.seq = 0; document.body.classList.add('cine');
  const home = ALLIES.map(a => a.pos.clone()); P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L6.intro, INTRO6_SHOTS);
  cineClear(); P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI;
  ALLIES.forEach((a, i) => { a.obj.visible = true; if (home[i]) { a.pos.copy(home[i]); ground(a); } a.yaw = Math.PI; a.play('Idle_Loop'); });
  // the counsel is spoken over David and his three, not by Moses (who has no place at Bethlehem)
  MOSES.obj.visible = false; G.cine = { pos: new THREE.Vector3(P.pos.x + 1.6, P.pos.y + 1.7, P.pos.z - 3.6), look: P.pos.clone().setY(P.pos.y + 1.35).add(new THREE.Vector3(0.4, 0, 0)), snap: true };
  await card(STORY_L6.counsel);
  G.cine = null; document.body.classList.remove('cine');
  await runWaves(0);
}
const INTRO6_SHOTS = {
  mighty(s) {
    // David, grown, black-bearded, with his three mighty men behind him
    for (const a of ALLIES) a.obj.visible = false; MOSES.obj.visible = false;
    P.obj.visible = true; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
    STORY_L6.men.forEach((m, i) => cineActor('servant', m.look, (i - 1) * 1.7, 12.2 + (i === 1 ? 0.6 : 0), Math.PI, i === 0 ? 'Idle_Loop' : 'Sword_Idle', 1.0, 0.8 + i * 0.1));
    camAt(-0.9, P.pos.y + 1.65, 7.0, 0, P.pos.y + 1.5, 10.5); SFX.horn();
    G.storyTick = (dt) => { G.cine.pos.z += dt * 0.45; G.cine.pos.x += dt * 0.2; };
  },
  host(s) {
    // the troop of the Philistines pitched in the valley of Rephaim
    for (const a of CINE.actors) a.obj.visible = false; P.obj.visible = false;
    const lam = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const [x, z, r] of [[-9, -16, 2.0], [-2, -18, 2.3], [6, -17, 2.1], [13, -15, 1.9], [-15, -13, 1.8]]) { const m = new THREE.Mesh(tentGeo(r, r * 1.2, 0xa0744a, 0x5a2418, 8), lam); m.position.set(x, hgt(x, z) - 0.05, z); m.rotation.y = x; W.add(m); CINE.objs.push(m); }
    for (let i = 0; i < 10; i++) cineActor(i % 4 === 3 ? 'captain' : 'phil', i % 4 === 3 ? 'captain' : 'phil', -11 + i * 2.4, -11 - (i % 3) * 1.2, 0.2 * (i % 2 ? 1 : -1), i % 2 ? 'Sword_Idle' : 'Idle_Loop', 1, 0.8 + (i % 3) * 0.1);
    cineFire(-5, hgt(-5, -13) + 0.1, -13, 1.1); cineFire(9, hgt(9, -12.5) + 0.1, -12.5, 1.0);
    camAt(4, hgt(4, -1) + 2.6, -1, 0, hgt(0, -13) + 1.2, -14); SFX.shout();
    G.storyTick = (dt) => { G.cine.pos.x -= dt * 1.0; };
  },
  garrison(s) {
    // the garrison of the Philistines in Bethlehem: guards at the gate, the well beside it
    for (const a of CINE.actors) a.obj.visible = false; for (const o of CINE.objs) o.visible = false;
    for (const [k, x, z, y] of [['captain', -1.5, -24.6, 0.1], ['phil', 1.6, -24.4, -0.1], ['phil', -5.5, -25.6, 0], ['phil', 5.5, -25.4, 0], ['archer', 0.2, -26.4, 0]]) cineActor(k, k, x, z, y, k === 'captain' ? 'Idle_Talking_Loop' : 'Sword_Idle', k === 'captain' ? 1.07 : 1);
    camAt(3.4, hgt(3, -13) + 1.5, -13, 0, hgt(0, -24) + 2.4, -25); SFX.horn();
    G.storyTick = (dt) => { G.cine.pos.z -= dt * 1.1; };
  },
};
async function barleySeq() {
  // Sequence 2: Pasdammim. The people flee; David and Eleazar stand in the barley (1 Chr 11:13–14; 2 Sam 23:9–10)
  const S = STORY_L6.barley; G.resumeWave = 2; G.stage = 'barley'; G.phase = 'play'; G.horde = false; clearDead();
  seqBanner(2); $('wave').textContent = seqTag() + 'HOLD THE BARLEY'; toast(S.start + `<i>${S.startRef} (KJV)</i>`, 5000);
  ALLIES.forEach(a => { a.benched = a.name !== 'ELEAZAR'; a.benchX = a.name === 'ADINO' ? -3 : 3; });
  if (BETH) BETH.barleyRing.visible = true; L6.hold = S.secs; L6.spawnT = 1.2; L6.spawning = true; L6.out = null;
  spawnEnemy('phil', S.x - 14, S.z - 12, 0.4); spawnEnemy('phil', S.x + 6, S.z - 16, 0.8);
  await until(() => L6.hold <= 0 || G.phase === 'lost'); if (G.phase === 'lost') return;
  L6.spawning = false; if (BETH) BETH.barleyRing.visible = false; prompt('');
  toast(S.end + `<i>${S.endRef} (KJV)</i>`, 5600); LOG('barley_held');
  await until(() => G.enemies.every(e => !e.alive) || G.phase === 'lost'); if (G.phase === 'lost') return;
  ALLIES.forEach(a => { a.benched = false; }); await sleep(900); clearDead();
  await upgradePanel('THE FIELD OF LENTILES');
  await lentilSeq();
}
async function lentilSeq() {
  // Sequence 3: Shammah stands in the midst of the field of lentiles and defends it (2 Sam 23:11–12)
  const S = STORY_L6.lentiles; G.resumeWave = 3; G.stage = 'lentiles'; G.phase = 'play'; G.horde = false; clearDead();
  ALLIES.forEach(a => { a.benched = false; });
  seqBanner(3); toast(S.start + `<i>${S.startRef} (KJV)</i>`, 5200);
  L6.field = 100; if (BETH) { BETH.lentilRing.visible = true; BETH.lentil.scale.y = 1; }
  await sleep(1800);
  for (let gi = 0; gi < S.groups.length; gi++) {
    if (gi) await Promise.race([sleep(S.gap * 1000), until(() => G.enemies.every(e => !e.alive))]);
    if (G.phase === 'lost' || L6.field <= 0) break;
    for (const [k, x, z] of S.groups[gi]) { const e = spawnEnemy(k, x, z, Math.random() * 0.8); if (k !== 'archer') e.raid = { x: S.x + (Math.random() - 0.5) * 4, z: S.z + (Math.random() - 0.5) * 4 }; }
    toast(gi ? '<b>More of the troop</b> run for the lentiles!' : '<b>They run for the lentiles!</b> Cut them down before they trample the field.', 2800); SFX.horn();
  }
  await until(() => G.enemies.every(e => !e.alive) || G.phase === 'lost' || L6.field <= 0);
  if (G.phase === 'lost') return;
  if (L6.field <= 0) { fieldLost(); return; }
  if (BETH) BETH.lentilRing.visible = false; toast(S.end + `<i>${S.endRef} (KJV)</i>`, 5200); LOG('field_saved', { field: Math.round(L6.field) });
  await sleep(2600); clearDead();
  await upgradePanel('THE WELL OF BETHLEHEM');
  await wellSeq();
}
function fieldLost() {
  // the troop trampled the lentiles: the battle is lost, retry restarts Sequence 3
  G.phase = 'cine'; LOG('field_lost'); prompt(''); toast('<b>The lentiles are trampled.</b> Stand in the midst of the ground and defend it.', 3000);
  for (const e of G.enemies) if (e.alive) { e.state = 'chase'; }
  setTimeout(() => { G.phase = 'lost'; $('lverse').innerHTML = '“But he stood in the midst of the ground, and defended it, and slew the Philistines…”<span>2 Samuel 23:12 (KJV)</span>'; show('lose'); }, 2200);
}
function goalUI(on, label) { const g = $('goal'); g.querySelector('span').textContent = on ? label : 'CAVE OF ADULLAM'; g.classList.toggle('hidden', !on); }
async function wellSeq() {
  // Sequence 4: David longs for the water of the well of Bethlehem; the three break through the host and bring it (2 Sam 23:15–17)
  const S = STORY_L6.well; G.resumeWave = 4; G.stage = 'well'; G.phase = 'cine'; G.horde = false; clearDead(); document.body.classList.add('cine'); prompt('');
  if (BETH) { BETH.lentilRing.visible = BETH.barleyRing.visible = false; }
  swapHero('davidking'); P.pos.set(S.hold.x, 0, S.hold.z + 1.6); ground(P); P.yaw = 0; P.state = 'cine'; P.cineAnim = 'Idle_Talking_Loop';
  ALLIES.forEach(a => { a.benched = false; a.obj.visible = false; });
  G.cine = { pos: new THREE.Vector3(P.pos.x + 1.4, P.pos.y + 1.7, P.pos.z + 2.6), look: P.pos.clone().setY(P.pos.y + 1.55), snap: true };
  await card(S.longed);
  // David stays in the hold; you are Adino, and Eleazar and Shammah fight beside you
  L6.david = cineActor('barak', 'davidking', S.hold.x - 1.4, S.hold.z + 2.2, Math.PI, 'Idle_Loop', 1.04);
  swapHero('adino'); P.pos.set(S.hold.x, 0, S.hold.z - 1); ground(P); P.yaw = Math.PI; P.cineAnim = null; P.state = 'idle'; P.hp = STATS().maxHp;
  const ad = ALLIES.find(a => a.name === 'ADINO'); if (ad) { ad.remove(); scene.remove(ad.bar); ALLIES.splice(ALLIES.indexOf(ad), 1); }
  ALLIES.forEach((a, i) => { a.slot = i; a.obj.visible = true; a.down = false; a.hp = a.maxHp; a.state = 'follow'; a.play('Idle_Loop'); a.pos.set(P.pos.x + (i ? 1.6 : -1.6), 0, P.pos.z + 0.8); ground(a); a.yaw = Math.PI; });
  G.cine = null; document.body.classList.remove('cine');
  seqBanner(4); $('wave').textContent = seqTag() + 'BREAK THROUGH TO THE WELL'; goalUI(true, 'THE WELL OF BETHLEHEM');
  L6.run = 'to'; L6.drawn = 0; if (BETH) BETH.beam.material.opacity = 0.32;
  for (const [k, x, z] of S.lines) spawnEnemy(k, x, z, Math.random() * 0.6);
  G.phase = 'play'; SFX.horn(); SFX.shout();
  await until(() => L6.run !== 'to' || G.phase === 'lost'); if (G.phase === 'lost') return;
  if (BETH) BETH.beam.material.opacity = 0; prompt(''); goalUI(true, 'DAVID IN THE HOLD'); $('wave').textContent = seqTag() + 'BRING IT TO DAVID';
  toast(S.drawn + `<i>${S.drawnRef} (KJV)</i>`, 5000); SFX.angel(); LOG('water_drawn');
  setTimeout(() => { if (G.stage === 'well' && G.phase === 'play') { for (const [k, x, z] of S.pursuers) spawnEnemy(k, x, z, Math.random()); SFX.horn(); } }, 1500);
  await until(() => L6.run === 'home' || G.phase === 'lost'); if (G.phase === 'lost') return;
  goalUI(false); LOG('water_home');
  await pourOut();
}
async function pourOut() {
  const S = STORY_L6.well, D = L6.david; G.phase = 'cine'; document.body.classList.add('cine'); prompt(''); $('wave').textContent = '';
  for (const e of G.enemies) if (e.alive) { e.fleeing = true; e.state = 'flee'; e.fleeX = e.pos.x; }
  P.state = 'cine'; P.cineAnim = 'Idle_Loop'; P.pos.set(D.pos.x + 1.5, 0, D.pos.z - 0.9); ground(P); P.yaw = Math.atan2(D.pos.x - P.pos.x, D.pos.z - P.pos.z);
  ALLIES.forEach((a, i) => { a.pos.set(D.pos.x + 2.6 + i * 1.1, 0, D.pos.z + 0.2 - i * 0.9); ground(a); a.yaw = Math.atan2(D.pos.x - a.pos.x, D.pos.z - a.pos.z); a.play('Idle_Loop'); });
  D.yaw = Math.atan2(P.pos.x - D.pos.x, P.pos.z - D.pos.z) - 0.5; D.play('Idle_Talking_Loop');
  camAt(D.pos.x + 0.6, D.pos.y + 1.6, D.pos.z - 3.4, D.pos.x + 0.4, D.pos.y + 1.25, D.pos.z);
  let pt = 0; G.storyTick = (dt) => { pt -= dt; if (pt <= 0) { pt = 0.04; const h = D.handPos ? D.handPos(new THREE.Vector3()) : D.pos.clone().setY(D.pos.y + 1.1); puff(h.clone().add(new THREE.Vector3(0, -0.1, 0)), 0.22, 0.7, new THREE.Vector3((Math.random() - 0.5) * 0.3, -2.6, (Math.random() - 0.5) * 0.3), 0xa8d8ff); } };
  SFX.angel(); LOG('poured_out');
  await card(S.poured); G.storyTick = null;
  await card(S.blood);
  winGame();
}
function updateL6(dt) {
  if (G.phase !== 'play') return;
  G.enemies = G.enemies.filter(e => !e.gone);
  let lbl = '';
  if (G.horde && L6.k0 != null) lbl = `THE EIGHT HUNDRED · ${Math.min(800, Math.round((G.kills - L6.k0) / Math.max(1, L6.total) * 800))}`;
  if (G.stage === 'barley' && L6.hold > 0) {
    const S = STORY_L6.barley, inside = Math.hypot(P.pos.x - S.x, P.pos.z - S.z) < S.r;
    if (inside) L6.hold -= dt; if (inside !== L6.out) { L6.out = inside; prompt(inside ? '' : 'STAND IN THE BARLEY'); }
    if (L6.spawning) { L6.spawnT -= dt; const alive = G.enemies.filter(e => e.alive).length; if (L6.spawnT <= 0 && alive < S.max) { L6.spawnT = S.every; const a = -Math.PI * (0.15 + Math.random() * 0.7), r = 17; const k = ['phil', 'phil', 'captain', 'phil', 'shield', 'archer'][Math.floor(Math.random() * 6)]; spawnEnemy(k, S.x + Math.cos(a) * r * 1.2, S.z + Math.sin(a) * r, 0); } }
    lbl = `HOLD THE BARLEY · ${Math.max(0, Math.ceil(L6.hold))}s`;
  }
  if (G.stage === 'lentiles') {
    const S = STORY_L6.lentiles; let n = 0; for (const e of G.enemies) if (e.alive && e.raid && Math.hypot(e.pos.x - S.x, e.pos.z - S.z) < S.r) n++;
    if (n) { L6.field = Math.max(0, L6.field - S.trample * n * dt); if (BETH) BETH.lentil.scale.y = 0.25 + 0.75 * L6.field / 100; }
    lbl = `THE FIELD OF LENTILES · ${Math.ceil(L6.field)}%` + (n ? ` · ${n} TRAMPLING` : '');
  }
  if (G.stage === 'well' && L6.run) {
    const S = STORY_L6.well, gp = L6.run === 'to' ? S : S.hold, gx = gp.x - P.pos.x, gz = gp.z - P.pos.z, gd = Math.hypot(gx, gz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
    $('goal-arrow').style.transform = `rotate(${Math.atan2(gx * rx + gz * rz, gx * fx + gz * fz).toFixed(2)}rad)`; $('goal-d').textContent = Math.max(0, Math.round(gd - 1.5)) + ' m';
    if (L6.run === 'to' && gd < 2.5) { if (!L6.drawn) prompt('DRAWING WATER…'); L6.drawn += dt; if (L6.drawn >= S.draw) L6.run = 'back'; }
    else if (L6.run === 'to' && L6.drawn) { L6.drawn = 0; prompt(''); }
    else if (L6.run === 'back' && gd < 3) L6.run = 'home';
  }
  if (lbl) { lbl = seqTag() + lbl; if (lbl !== L6.lastLbl) { L6.lastLbl = lbl; $('wave').textContent = lbl; } }
}
function bot6(toInput, best, bd) {
  // QA bot for Level 6's special sequences; returns true when it has chosen the move
  const fight = (e, d) => { const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; if (d > 1.9) toInput(dx, dz); else { P.yaw = Math.atan2(dx, dz); press('attack'); } if (e.state === 'attack' && d < 2.3 && e.st > e.hitT * 0.5 && e.st < e.hitT && Math.random() < 0.15) press('dodge'); };
  if (G.stage === 'barley') {
    const S = STORY_L6.barley, fd = Math.hypot(P.pos.x - S.x, P.pos.z - S.z);
    if (best && bd < 2.4) { fight(best, bd); return true; }
    if (fd > S.r - 1.8) { toInput(S.x - P.pos.x, S.z - P.pos.z); return true; }
    if (best && Math.hypot(best.pos.x - S.x, best.pos.z - S.z) < S.r + 3) { fight(best, bd); return true; }
    if (best && bd > 6 && P.slingCd <= 0 && Math.random() < 0.08) { P.yaw = Math.atan2(best.pos.x - P.pos.x, best.pos.z - P.pos.z); press('sling'); }
    return true;
  }
  if (G.stage === 'lentiles') {
    const S = STORY_L6.lentiles; let tg = null, td = 1e9;
    for (const e of G.enemies) { if (!e.alive || (e.state === 'spawn' && e.st < 0)) continue; const d = Math.hypot(e.pos.x - S.x, e.pos.z - S.z) * (e.raid ? 1 : 2.5); if (d < td) { td = d; tg = e; } }
    if (best && bd < 2.0 && best !== tg) { fight(best, bd); return true; }
    if (tg) { fight(tg, tg.pos.distanceTo(P.pos)); return true; }
    return false;
  }
  if (G.stage === 'well' && L6.run) {
    const S = STORY_L6.well, gp = L6.run === 'to' ? S : S.hold;
    if (best && bd < 2.3) { fight(best, bd); return true; }
    toInput(gp.x - P.pos.x, gp.z - P.pos.z); if (best && bd < 4 && Math.random() < 0.04) press('dodge'); return true;
  }
  return false;
}
async function flow5() {
  G.t0 = now(); G.phase = 'cine'; G.stage = 'kishon'; G.seq = 0; document.body.classList.add('cine');
  const home = ALLIES.map(a => a.pos.clone()); P.state = 'cine'; P.cineAnim = 'Idle_Loop'; MOSES.obj.visible = false;
  await playShots(STORY_L5.intro, INTRO5_SHOTS);
  cineClear(); P.obj.visible = true; P.state = 'idle'; P.cineAnim = null; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI;
  ALLIES.forEach((a, i) => { a.obj.visible = true; if (home[i]) { a.pos.copy(home[i]); ground(a); } a.yaw = Math.PI; a.play('Idle_Loop'); });
  const D = deborah(); D.obj.visible = true; D.pos.set(-4.5, 0, 15.5); ground(D); D.yaw = 1.25; D.play('Idle_Talking_Loop');
  G.cine = { pos: new THREE.Vector3(D.pos.x + 2.9, D.pos.y + 1.55, D.pos.z + 0.7), look: D.pos.clone().setY(D.pos.y + 1.45).add(new THREE.Vector3(0, 0, -1.35)), snap: true };
  await card(STORY_L5.counsel);
  D.play('Idle_Loop'); D.yaw = Math.PI * 0.92; G.cine = null; document.body.classList.remove('cine');
  await runWaves(0);
}
let DEB = null;
function deborah() { if (!DEB) { DEB = new Actor('moses', 1.0, 'deborah'); } return DEB; }
const INTRO5_SHOTS = {
  chariots(s) {
    // nine hundred chariots of iron; twenty years of oppression
    P.obj.visible = false; for (const a of ALLIES) a.obj.visible = false; MOSES.obj.visible = false; if (DEB) DEB.obj.visible = false;
    for (let i = 0; i < 3; i++) { const c = new Chariot(); c.pos.set(-4.5 + i * 4.2, 0, -10 - (i % 2) * 2.5); ground(c); c.yaw = 0; c.spd = 4; CINE.actors.push(c); }
    for (let i = 0; i < 4; i++) cineActor('captive', 'captive', -3 + i * 2, -1.5 - (i % 2) * 0.7, Math.PI, 'Crouch_Idle_Loop', 0.97, 0.6);
    camAt(2.2, hgt(2, 3) + 1.0, 3.2, 0, hgt(0, -10) + 1.7, -10); SFX.horn();
    G.storyTick = (dt) => { for (const c of CINE.actors) if (c instanceof Chariot) { c.pos.z += dt * 2.2; ground(c); } G.cine.pos.x -= dt * 0.5; };
  },
  palm(s) {
    // Deborah under the palm tree sends Barak: "Up; for this is the day…"
    for (const a of CINE.actors) a.obj.visible = false;
    const px = 8, pz = 14; const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3.7, 7).translate(0, 1.85, 0), new THREE.MeshLambertMaterial({ color: 0x6a5032 })); tr.position.set(px - 1.6, hgt(px, pz), pz - 1); tr.rotation.z = 0.08; W.add(tr); CINE.objs.push(tr);
    const fm = new THREE.MeshLambertMaterial({ color: 0x5a7a30, flatShading: true });
    for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4).scale(0.28, 0.06, 1.4).translate(0, 0, 1.3), fm); f.position.set(px - 1.6 + 0.3, hgt(px, pz) + 3.65, pz - 1); f.rotation.set(0.35, k * Math.PI * 2 / 9, 0, 'YXZ'); W.add(f); CINE.objs.push(f); }
    const D = deborah(); D.obj.visible = true; D.pos.set(px - 0.6, 0, pz - 0.4); ground(D); D.yaw = Math.PI * 0.8; D.play('Idle_Talking_Loop');
    P.obj.visible = true; P.pos.set(px - 1.4, 0, pz - 2.4); ground(P); P.yaw = 0.3; P.cineAnim = 'Idle_Loop';
    camAt(px + 2.2, P.pos.y + 1.7, pz - 3.6, px - 1, P.pos.y + 1.45, pz - 1.2); SFX.angel();
    G.storyTick = (dt) => { G.cine.pos.x -= dt * 0.35; };
  },
  tabor(s) {
    // Barak goes down from mount Tabor, and ten thousand men after him
    for (const a of CINE.actors) a.obj.visible = false; if (DEB) DEB.obj.visible = false;
    P.obj.visible = true; P.pos.set(0, 0, 10); ground(P); P.yaw = Math.PI; P.cineAnim = 'Walk_Loop';
    for (let i = 0; i < 8; i++) { const a = cineActor('servant', 'isr_ally', -3.5 + (i % 4) * 2.3, 12.5 + Math.floor(i / 4) * 1.8, Math.PI, 'Walk_Loop', 0.97, 0.9); a.walk = true; }
    camAt(-2.2, P.pos.y + 1.6, 4.6, 0, P.pos.y + 1.4, 11); SFX.horn(); SFX.shout();
    G.storyTick = (dt) => { P.pos.z -= dt * 1.5; ground(P); for (const a of CINE.actors) if (a.walk) { a.pos.z -= dt * 1.5; ground(a); } G.cine.look.z -= dt * 1.5; G.cine.pos.z -= dt * 1.2; };
  },
};
async function chariotSeq() {
  // Sequence 2: the chariots of iron charge across the plain. Iron cannot be cut: dodge them.
  const S = STORY_L5.chariots; G.resumeWave = 2; G.stage = 'chariots'; G.phase = 'play'; clearChariots(); if (KISHON) setStorm(false);
  seqBanner(2); $('wave').textContent = seqTag() + 'THE CHARIOTS OF IRON'; await sleep(400);
  toast(S.tip, 3800); for (let i = 0; i < S.count; i++) CH.list.push(new Chariot()); CH.list.forEach(c => c.obj.visible = false);
  let passes = 0; const t0 = now();
  while (passes < S.passes && G.phase !== 'lost') {
    const free = CH.list.filter(c => c.state === 'wait'); const busy = CH.list.length - free.length;
    if (free.length && busy < (passes >= 2 ? 2 : 1)) { launchChariot(free[0], false); passes++; await sleep(S.gap * 1000); }
    else await sleep(250);
    $('wave').textContent = seqTag() + `THE CHARIOTS OF IRON · ${Math.min(passes, S.passes)} / ${S.passes}`;
  }
  await until(() => CH.list.every(c => c.state === 'wait') || G.phase === 'lost'); if (G.phase === 'lost') return;
  LOG('chariots_done', { secs: Math.round(now() - t0) });
  await upgradePanel('THE RIVER KISHON');
  await riverSeq();
}
function setStorm(on) {
  if (!KISHON) return; setEnv(on ? 'storm' : 'kishon');
  if (on && !KISHON.rain) { KISHON.rain = buildPrecip('rain'); W.add(KISHON.rain); } if (KISHON.rain) KISHON.rain.visible = on;
}
async function riverSeq() {
  // Sequence 3: "They fought from heaven" (5:20): the storm comes, the chariots sink in the mud, their drivers leap down
  const S = STORY_L5.chariots; G.resumeWave = 3; G.stage = 'river'; G.phase = 'play'; clearDead();
  while (CH.list.length < Math.max(S.count, S.stuck)) CH.list.push(new Chariot());
  CH.list.forEach(c => { c.state = 'wait'; c.obj.visible = false; c.root.rotation.z = 0; });
  setStorm(true); seqBanner(3); SFX.slam(); shake(0.4); flashAt(P.pos.clone().setY(P.pos.y + 8), 8, 0.4, 0xdde8ff);
  toast('“They fought from heaven; the stars in their courses fought against Sisera.”<i>JUDGES 5:20 (KJV)</i>', 4200); await sleep(1800);
  let stuck = 0; spawnEnemy('phil', -20, -14, 0); spawnEnemy('phil', 20, -12, 0.5);
  while (stuck < S.stuck && G.phase !== 'lost') {
    const free = CH.list.find(c => c.state === 'wait'), busy = CH.list.filter(c => c.state === 'warn' || c.state === 'run').length;
    stuck = CH.list.filter(c => c.state === 'stuck').length;
    if (free && busy < 2 && stuck + busy < S.stuck) { launchChariot(free, true); await sleep(S.gap * 1000); }
    else await sleep(300);
    $('wave').textContent = seqTag() + `CHARIOTS IN THE MUD · ${stuck} / ${S.stuck}`;
  }
  await until(() => G.enemies.every(e => !e.alive) || G.phase === 'lost'); if (G.phase === 'lost') return;
  await sleep(700); await kishonFlood();
}
async function kishonFlood() {
  // "The river of Kishon swept them away" (5:21)
  G.phase = 'cine'; document.body.classList.add('cine'); prompt(''); LOG('flood');
  const K = KISHON; P.state = 'cine'; P.cineAnim = 'Idle_Loop'; P.yaw = Math.PI;
  camAt(P.pos.x + 3, P.pos.y + 4.2, P.pos.z + 7, P.pos.x, P.pos.y + 0.5, P.pos.z - 14); SFX.burn(); shake(0.6);
  for (const c of CH.list) if (c.state === 'stuck') { c.state = 'swept'; c.st = 0; }
  const w0 = K.water.position.y, t0 = now(); K.water.scale.z = 1;
  G.storyTick = (dt) => { const k = Math.min(1, (now() - t0) / 3.2); K.water.position.y = w0 + k * 1.1; K.water.scale.z = 1 + k * 4.2; K.water.position.z = k * 8; };
  toast('“The river of Kishon swept them away, that ancient river, the river Kishon. O my soul, thou hast trodden down strength.”<i>JUDGES 5:21 (KJV)</i>', 5200);
  await sleep(3800); G.storyTick = null; clearDead();
  for (const c of CH.list) if (c.state === 'swept') { c.obj.visible = false; c.state = 'gone'; }
  K.water.position.y = w0 + 0.4; K.water.scale.z = 2.0; K.water.position.z = -2;
  G.cine = null; document.body.classList.remove('cine'); P.state = 'idle'; P.cineAnim = null;
  await pursueSisera();
}
async function pursueSisera() {
  // Sequence 4: Sisera lights down off his chariot and flees on foot (4:15); his rear-guard turns to fight; on to the tent of Jael
  const T = STORY_L5.tent; G.resumeWave = 4; G.stage = 'pursue'; G.phase = 'play'; seqBanner(4); $('wave').textContent = seqTag() + 'PURSUE SISERA';
  toast('“…so that Sisera lighted down off his chariot, and fled away on his feet.”<i>JUDGES 4:15 (KJV)</i>', 3800);
  const sis = cineActor('phil', 'sisera', P.pos.x + 4, P.pos.z - 12, 0, 'Sprint_Loop', 1.06, 0.95);
  G.storyTick = (dt) => { if (!sis.obj.visible) return; const tx = T.x - sis.pos.x, tz = T.z + 2.2 - sis.pos.z, td = Math.hypot(tx, tz); if (td > 0.6) { sis.yaw = Math.atan2(tx, tz); sis.pos.x += tx / td * 5.2 * dt; sis.pos.z += tz / td * 5.2 * dt; ground(sis); } else sis.obj.visible = false; };
  for (const [k, x, z] of STORY_L5.rearguard) spawnEnemy(k, x, z, 0.3);
  await until(() => G.enemies.every(e => !e.alive) || G.phase === 'lost'); if (G.phase === 'lost') return;
  await sleep(900); await until(() => spoils.every(s => !s.live || s.t > 4));
  KISHON.beam.material.opacity = 0.28; prompt('THE TENT OF JAEL'); toast('<b>Sisera has fled into a tent.</b> Follow the light.', 3000);
  await until(() => Math.hypot(P.pos.x - T.x, P.pos.z - (T.z + 2.4)) < 2.6 || G.phase === 'lost'); if (G.phase === 'lost') return;
  prompt(''); await endingL5();
}
async function endingL5() {
  const T = STORY_L5.tent; G.phase = 'cine'; G.stage = 'end'; document.body.classList.add('cine'); prompt(''); G.storyTick = null;
  await fade(1); clearDead(); cineClear(); KISHON.beam.material.opacity = 0;
  P.state = 'cine'; P.pos.set(T.x + 0.6, 0, T.z + 4.4); ground(P); P.yaw = Math.PI; P.cineAnim = 'Idle_Loop';
  for (const a of ALLIES) a.obj.visible = false;
  const J = cineActor('woman', 'jael', T.x - 0.3, T.z + 2.5, 0.15, 'Idle_Talking_Loop', 0.98, 0.9);
  G.cine = { pos: new THREE.Vector3(T.x + 3.0, hgt(T.x, T.z) + 1.8, T.z + 6.6), look: new THREE.Vector3(T.x, hgt(T.x, T.z) + 1.3, T.z + 2.4), snap: true };
  await sleep(250); await fade(0);
  await card(STORY_L5.jael);
  await card(STORY_L5.end);
  winGame();
}
function updatePrecip(m, dt) {
  const p = m.geometry.attributes.position, f = m.userData.fall || 1, t = now(); m.position.set(Math.round(P.pos.x / 8) * 8, P.pos.y, Math.round(P.pos.z / 8) * 8);
  for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * f * (0.9 + (i % 5) * 0.06); if (y < 0) y += 14; p.setY(i, y); }
  p.needsUpdate = true;
}
// ---- the finale: the temple of Dagon (Judges 16:22–30)
async function finale(retry = false) {
  G.resumeWave = 3; G.stage = 'finale'; G.phase = 'cine'; document.body.classList.add('cine'); prompt(''); G.seq = 0;
  await fade(1);
  clearDead(); for (const s of spoils) { s.live = false; s.m.visible = false; }
  buildWorld('temple'); MOSES.obj.visible = false;
  P.state = 'cine'; P.pos.set(0, 0, 5.5); ground(P); P.yaw = Math.PI; P.hp = Math.max(P.hp, STATS().maxHp * 0.6); CAM.yaw = 0;
  G.cine = { pos: new THREE.Vector3(-2.6, 2.0, 10.5), look: new THREE.Vector3(0, 4.4, -4), snap: true };
  await sleep(250); await fade(0);
  if (!retry) {
    await card({ who: 'GAZA · THE HOUSE OF DAGON', text: 'Betrayed by Delilah and taken by the Philistines, Samson was brought out of the prison house to make sport for the lords of the Philistines. They set him between the pillars. But…', verse: '“Howbeit the hair of his head began to grow again after he was shaven.”', ref: 'JUDGES 16:22 (KJV)', btn: 'CONTINUE' });
    G.cine = { pos: new THREE.Vector3(P.pos.x + 1.6, P.pos.y + 1.7, P.pos.z - 2.4), look: P.pos.clone().setY(P.pos.y + 1.55), snap: true }; P.yaw = 0; P.cineAnim = 'Idle_Talking_Loop';
    await card({ who: 'SAMSON', verse: '“O Lord GOD, remember me, I pray thee, and strengthen me, I pray thee, only this once, O God…”', ref: 'JUDGES 16:28 (KJV)', tips: `<b>Moses:</b> Stand between the two middle pillars and <b>hold ${isTouch || BOT ? 'PUSH' : 'R'}</b>. Guards will tear you away: let go, fight, then push again. <b>SPIRIT</b> while pushing gives a mighty heave.`, btn: 'TAKE HOLD' });
  }
  P.cineAnim = null; P.yaw = Math.PI; G.cine = null; document.body.classList.remove('cine'); P.state = 'idle';
  G.fin = { prog: 0, spawnT: 7, pulse: 0, collapsing: false, cracks: 0 }; G.wave = 3; seqBanner(3);
  spawnEnemy('phil', -6, -6, 0.6); spawnEnemy('shield', 6, -6, 1.2); spawnEnemy('phil', 5, 8, 2.0);
  $('bname').textContent = 'THE HOUSE OF DAGON'; $('boss-wrap').classList.remove('hidden'); $('boss-wrap').classList.add('house'); $('wave').textContent = '';
  G.phase = 'play'; LOG('finale_start'); SFX.shout();
  setTimeout(() => { if (G.fin && !G.fin.collapsing && G.phase === 'play') prompt(isTouch || BOT ? 'GO BETWEEN THE PILLARS · HOLD PUSH' : 'GO BETWEEN THE PILLARS · HOLD R'); }, 2700); setTimeout(() => { if (G.fin && G.fin.prog < 0.05) prompt(''); }, 7200);   // after the sequence banner
  await until(() => (G.fin && G.fin.prog >= 1) || G.phase === 'lost');
  if (G.phase === 'lost') return;
  await collapse();
}
const PULSES = [['phil', 'archer'], ['shield', 'phil'], ['phil', 'captain'], ['archer', 'shield'], ['phil', 'phil'], ['captain', 'archer']];
function updateFinale(dt) {
  const F = G.fin; if (!F || F.collapsing || G.phase !== 'play') return;
  F.spawnT -= dt; const alive = G.enemies.filter(e => e.alive).length;
  if (F.spawnT <= 0 && alive < 5) {
    F.spawnT = STORY_L2.hard.finaleSpawn - Math.min(2.5, F.prog * 3); const pk = PULSES[F.pulse++ % PULSES.length];
    spawnEnemy(pk[0], -14, 1, 0); spawnEnemy(pk[1], 14, 1.5, 0.5); SFX.horn(); LOG('guards', { kinds: pk });
  }
  G.enemies = G.enemies.filter(e => !e.gone);
  const c = Math.floor(F.prog * 3); if (c > F.cracks) { F.cracks = c; SFX.rumble(); shake(0.6); for (const sx of [-1.15, 1.15]) for (let i = 0; i < 3; i++) puff(new THREE.Vector3(sx, 2 + i * 1.6, -2.5), 1.4, 1.5); if (c === 2) toast('The pillars crack! The house trembles…', 2400); LOG('crack', { c }); }
}
async function collapse() {
  const F = G.fin; F.collapsing = true; G.phase = 'cine'; LOG('collapse'); prompt(''); $('boss-wrap').classList.add('hidden'); $('touch').classList.add('hidden');
  P.state = 'cine'; P.keepPose = true; P.poseT = 1; P.cineAnim = 'Sword_Idle'; P.pos.set(TEMPLE.spot.x, 0, TEMPLE.spot.z); P.yaw = Math.PI;
  for (const e of G.enemies) if (e.alive) { e.state = 'hit'; e.st = 0; e.stun = 99; e.play('Hit_Head', { loop: false, ts: 0.4, restart: true }); }
  document.body.classList.add('cine');
  // shot 1: low, beside Samson, looking up at the pillars as they split
  G.cine = { pos: new THREE.Vector3(2.3, 0.9, 1.6), look: new THREE.Vector3(0, 5.6, -3.2), snap: true };
  const C = TEMPLE.collapse = { t: 0, puffT: 0 }; SFX.collapse(); shake(1.4); hurtFlash(); toastT = 0.01;
  const iv = setInterval(() => shake(0.9), 200);
  const at = (t, cap) => Promise.race([until(() => C.t >= t), sleep(cap)]);
  await at(0.42, 1500);
  // the slow-motion beat as the roof gives way, while the camera sweeps out to the doorway
  G.slow = 0.4; G.slowT = 1.3; G.cine = { pos: new THREE.Vector3(0, 2.1, 12.5), look: new THREE.Vector3(0, 5.0, -4.5) }; LOG('collapse_wide');
  await at(2.3, 5000);
  G.cine = { pos: new THREE.Vector3(0.8, 4.2, 17), look: new THREE.Vector3(0, 2.2, -4) };
  await at(3.2, 2500); P.obj.visible = false; for (const e of G.enemies) e.obj.visible = false;
  await at(4.3, 2500); clearInterval(iv);
  await fade(1, '#d9c6a4', 1100); clearDead();
  const v = $('vcard'); v.innerHTML = '<div class="vtext">“And he bowed himself with all his might; and the house fell upon the lords, and upon all the people that were therein. So the dead which he slew at his death were more than they which he slew in his life.”</div><div class="vref">JUDGES 16:30 (KJV)</div>';
  v.classList.add('on'); LOG('verse_1630');
  await sleep(BOT ? 2200 : 5200);
  v.classList.remove('on'); document.body.classList.remove('cine');
  fade(0, '#d9c6a4', 1400);
  winGame();
}
function goTitle() {
  show('win', false); show('lose', false); show('paused', false); G.paused = false; $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  G.cine = null; document.body.classList.remove('cine'); G.phase = 'title'; resetRun(true); buildWorld(WORLD_OF(LEVEL)); MOSES.obj.visible = true; P.obj.visible = true; renderTitle(); show('title');
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const until = (fn) => new Promise(r => { const t = setInterval(() => { if (fn()) { clearInterval(t); r(); } }, 100); });
function togglePause(force) {
  if (G.phase !== 'play' && !G.paused) return;
  G.paused = force ?? !G.paused; show('paused', G.paused);
}

// ------------------------------------------------------------------ camera
function updateCamera(dt) {
  if (G.cine) {
    const c = G.cine; let pos = c.pos, look = c.look;
    if (c.follow) { pos = c.follow.pos.clone().add(c.off); look = c.follow.pos.clone().setY(c.follow.pos.y + c.lookUp); if (c.lookX) look.x += c.lookX; }
    if (c.snap && !c.snapped) { c.snapped = true; CAM.pos.copy(pos); CAM.tgt.copy(look); }
    pos = pos.clone(); const cgy = hgt(pos.x, pos.z) + 1.0; if (pos.y < cgy) pos.y = cgy;
    CAM.pos.lerp(pos, Math.min(1, dt * 2.2)); camera.position.copy(CAM.pos);
    if (G.shake > 0) { camera.position.x += (Math.random() - 0.5) * G.shake * 0.4; camera.position.y += (Math.random() - 0.5) * G.shake * 0.4; G.shake = Math.max(0, G.shake - dt * 2.2); }
    CAM.tgt.lerp(look, Math.min(1, dt * 3)); camera.lookAt(CAM.tgt); return;
  }
  if (G.phase === 'title' && document.getElementById('menu').classList.contains('show')) {
    // main menu: the hero stands right of frame, the logo on the left; a slow drifting orbit
    const t = now() * 0.09, a = 0.25 + Math.sin(t) * 0.16, r = 4.2, cx = P.pos.x + Math.sin(a) * r, cz = P.pos.z + Math.cos(a) * r;
    CAM.pos.set(cx, Math.max(hgt(cx, cz) + 1.0, P.pos.y + 1.45 + Math.sin(t * 1.7) * 0.1), cz); camera.position.copy(CAM.pos);
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), fwd = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
    CAM.tgt.set(P.pos.x, P.pos.y + 2.0, P.pos.z).addScaledVector(fwd, 7).addScaledVector(side, -2.9); camera.lookAt(CAM.tgt); return;
  }
  if (G.phase === 'title') {
    const t = Math.sin(now() * 0.12); const cx = P.pos.x + 2.6 + t * 1.5, cz = P.pos.z + 4.2; CAM.pos.set(cx, Math.max(hgt(cx, cz) + 1.2, P.pos.y + 1.5), cz); camera.position.copy(CAM.pos); CAM.tgt.set(P.pos.x - 1 + t, P.pos.y + 3.2, P.pos.z - 20); camera.lookAt(CAM.tgt); return;
  }
  const b = G.boss;
  let dist = CAM.dist;
  if (G.stage === 'escape' && ESC && G.phase === 'play') { dist = 7.8; if (now() - CAM.lastDrag > 1.2) { const az = Math.max(CAVE_Z, P.pos.z - 14), ax = WILD_PX(az); CAM.yaw = turnTo(CAM.yaw, Math.atan2(P.pos.x - ax, P.pos.z - az), dt * 1.8); } }
  if (b && b.alive && b.state !== 'intro') {
    dist = WORLD === 'pit' ? 7.4 : 9.5;
    if (now() - CAM.lastDrag > 1.5) { const want = Math.atan2(P.pos.x - b.pos.x, P.pos.z - b.pos.z); CAM.yaw = turnTo(CAM.yaw, want, dt * 0.9); }
  }
  const pushing = P.state === 'push' || (P.state === 'spirit' && P.heave);
  CAM.pitch += ((pushing ? 0.1 : WORLD === 'pit' ? 0.62 : 0.33) - CAM.pitch) * Math.min(1, dt * 2.5); if (pushing) { dist = 8.4; if (now() - CAM.lastDrag > 1.5) CAM.yaw = turnTo(CAM.yaw, 0, dt * 2); }
  const tgt = tmpV.set(P.pos.x, P.pos.y + (pushing ? 2.6 : 1.5), P.pos.z);
  if (b && b.alive && b.state !== 'intro') tgt.lerp(tmpV2.set(b.pos.x, b.pos.y + 2.5, b.pos.z), 0.18);
  CAM.tgt.lerp(tgt, Math.min(1, dt * 8));
  const cp = Math.cos(CAM.pitch);
  const want = new THREE.Vector3(CAM.tgt.x + Math.sin(CAM.yaw) * cp * dist, CAM.tgt.y + Math.sin(CAM.pitch) * dist, CAM.tgt.z + Math.cos(CAM.yaw) * cp * dist);
  const gy = hgt(want.x, want.z) + 1.2; if (want.y < gy) want.y = gy;
  if (WORLD === 'temple') { want.x = THREE.MathUtils.clamp(want.x, -12.2, 12.2); want.z = Math.max(want.z, -15.5); if (want.z < -2 || Math.abs(want.x) > 8.8) want.y = Math.min(want.y, 5.9); }
  CAM.pos.lerp(want, Math.min(1, dt * 7)); camera.position.copy(CAM.pos);
  if (G.shake > 0) { camera.position.x += (Math.random() - 0.5) * G.shake * 0.5; camera.position.y += (Math.random() - 0.5) * G.shake * 0.5; G.shake = Math.max(0, G.shake - dt * 2.2); }
  if (G.kick > 0) { camera.position.lerp(CAM.tgt, G.kick * 0.09); G.kick = Math.max(0, G.kick - dt * 4); }
  camera.lookAt(CAM.tgt);
}

// ------------------------------------------------------------------ bot (scripted play for QA: ?bot)
const BOTI = { x: 0, y: 0, push: false };
function bot(dt) {
  BOTI.x = BOTI.y = 0; if (G.phase !== 'play' || P.state === 'cine') { BOTI.push = false; return; }
  const toInput = (wx, wz) => { // world dir -> stick
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw); const n = Math.hypot(wx, wz) || 1; wx /= n; wz /= n;
    BOTI.x = wx * rx + wz * rz; BOTI.y = -(wx * fx + wz * fz);
  };
  if (G.stage === 'escape' && ESC) return botEscape(toInput);
  if (LEVEL === 2) return bot2(toInput);
  if (LEVEL === 5 && CH.list.length) for (const c of CH.list) {
    if (c.state !== 'warn' && c.state !== 'run') continue; const rel = P.pos.clone().sub(c.pos), along = rel.dot(c.dir), lat = rel.x * c.dir.z - rel.z * c.dir.x;
    if (along > -1 && Math.abs(lat) < 2.8) { const s = Math.sign(lat) || 1; toInput(c.dir.z * s, -c.dir.x * s); if (c.state === 'run' && along < 8 && Math.abs(lat) < 1.6) press('dodge'); return; }
  }
  const b = G.boss;
  if (b && b.alive && b.state !== 'intro') {
    const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    const ne = G.enemies.find(e => e.alive && e.obj.visible && e.pos.distanceTo(P.pos) < 2.6);
    if (ne && !bossWindow(b) && b.state !== 'charge' && b.state !== 'slamWind') { P.yaw = Math.atan2(ne.pos.x - P.pos.x, ne.pos.z - P.pos.z); press('attack'); return; }
    if (bossWindow(b) && (LEVEL === 3 || LEVEL === 4)) { if (d > 2.2) { toInput(dx, dz); if (d > 7 && P.slingCd <= 0 && P.state !== 'sling') press('sling'); } else { P.yaw = Math.atan2(dx, dz); press('attack'); } return; }
    if (bossWindow(b)) { toInput(dx, dz); BOTI.x *= 0.01; BOTI.y *= 0.01; if (P.slingCd <= 0 && P.state !== 'sling') press('sling'); return; }
    if (b.state === 'slamWind') { toInput(-dx, -dz); if (d < 5.5 && b.st > b.slamT * 0.55) press('dodge'); return; }
    if (b.state === 'charge') { const side = new THREE.Vector3(-b.cdir.z, 0, b.cdir.x); const rel = P.pos.clone().sub(b.pos); const s = Math.sign(side.dot(rel)) || 1; toInput(side.x * s, side.z * s); if (d < 6) press('dodge'); return; }
    if (b.state === 'chargeWind') { toInput(-dz, dx); return; }
    if (d < 7) toInput(-dx, -dz); else if (d > 11) toInput(dx, dz); else toInput(-dz, dx);
    return;
  }
  // nearest enemy / spoil
  let best = null, bd = 1e9; for (const e of G.enemies) { if (!e.alive || e.state === 'spawn' && e.st < 0) continue; const d = e.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = e; } }
  if (LEVEL === 6 && bot6(toInput, best, bd)) return;
  const cap = LEVEL === 3 && (G.captives || []).find(c => !c.freed);
  if (cap && !(best && bd < 2.6)) { const cx = cap.a.pos.x - P.pos.x, cz = cap.a.pos.z - P.pos.z; if (Math.hypot(cx, cz) > 0.8) toInput(cx, cz); return; }
  if (best) {
    const dx = best.pos.x - P.pos.x, dz = best.pos.z - P.pos.z;
    if (bd > 9 && P.slingCd <= 0 && Math.random() < (best.state === 'flee' ? 0.3 : 0.05)) { P.yaw = Math.atan2(dx, dz); press('sling'); }
    if (bd > 1.9) toInput(dx, dz); else { P.yaw = Math.atan2(dx, dz); press('attack'); }
    if (best.state === 'attack' && bd < 2.3 && best.st > best.hitT * 0.5 && best.st < best.hitT && Math.random() < 0.15) press('dodge');
  } else {
    const s = spoils.find(s => s.live); if (s) toInput(s.m.position.x - P.pos.x, s.m.position.z - P.pos.z);
    else if (LEVEL === 5 && G.stage === 'pursue') { const T = STORY_L5.tent; toInput(T.x - P.pos.x, T.z + 2.4 - P.pos.z); }
  }
}

function botEscape(toInput) {
  // QA bot for the escape: follow the wadi to the cave, sprint when they close in, roll out of a grab, and try one hide
  const E = ESC; BOTI.sprint = false;
  if (E.botHide > 0) { E.botHide -= 1 / 60; if (E.botHide <= 0 || E.near < 2.5) { E.botHide = 0; } else return; }
  const az = Math.max(CAVE_Z + 1, P.pos.z - 9); let tx = WILD_PX(az), tz = az; if (P.pos.z < CAVE_Z + 14) { tx = WILD.cave.x; tz = WILD.cave.z; }
  let near = null, nd = 1e9; for (const h of E.hunters) { if (h.state === 'wait' || h.state === 'halt' || h.state === 'stun') continue; const d = h.pos.distanceTo(P.pos); if (d < nd) { nd = d; near = h; } }
  let vx = tx - P.pos.x, vz = tz - P.pos.z; const vn = Math.hypot(vx, vz) || 1; vx /= vn; vz /= vn;
  if (near && nd < 6) { const rx = P.pos.x - near.pos.x, rz = P.pos.z - near.pos.z, rn = Math.hypot(rx, rz) || 1, w = (6 - nd) / 6 * 0.9; vx += rx / rn * w; vz += rz / rn * w; }
  toInput(vx, vz);
  if (Q.has('botlazy')) return;   // QA: let them catch David
  if (near && nd < 8 && E.stamina > 15) BOTI.sprint = true;
  if (near && near.state === 'grab' && nd < 2.4 && near.st > near.hitT * 0.3 && P.state !== 'dodge') press('dodge');
  if (!E.botHid && P.pos.z < -20 && (!near || nd > 13)) { for (const r of WILD.rocks) if (Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < r.s + 1.3) { E.botHid = true; E.botHide = 2.0; BOTI.x = BOTI.y = 0; press('sling'); return; } }
}
function bot2(toInput) {
  BOTI.push = false;
  if (P.bound) { if (Math.random() < 0.04) press('sling'); return; }
  if (G.jawItem) { toInput(G.jawItem.m.position.x - P.pos.x, G.jawItem.m.position.z - P.pos.z); return; }
  let best = null, bd = 1e9, near = 0;
  for (const e of G.enemies) { if (!e.alive || e.state === 'spawn' && e.st < 0) continue; const d = e.pos.distanceTo(P.pos); if (d < 4.5) near++; if (d < bd) { bd = d; best = e; } }
  if (G.spirit >= 100 && (near >= 2 || (best && best.shieldHp > 0 && bd < 3) || P.state === 'push')) { press('sling'); return; }
  for (const a of arrows) { if (a.life <= 0) continue; const rel = tmpV.copy(P.pos).sub(a.m.position); if (rel.length() < 5 && rel.dot(a.v) > 0 && Math.random() < 0.25) { press('dodge'); break; } }
  const fight = (e) => { const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z; if (bd > 1.9) toInput(dx, dz); else { P.yaw = Math.atan2(dx, dz); press('attack'); } if (e.state === 'attack' && bd < 2.3 && e.st > e.hitT * 0.5 && e.st < e.hitT && Math.random() < 0.15) press('dodge'); };
  if (G.fin && !G.fin.collapsing && TEMPLE) {
    if (best && bd < 3.0) return fight(best);
    const sx = TEMPLE.spot.x - P.pos.x, sz = TEMPLE.spot.z - P.pos.z;
    if (Math.hypot(sx, sz) > 0.6 && P.state !== 'push') toInput(sx, sz); else BOTI.push = true;
    return;
  }
  if (best) return fight(best);
  const s = spoils.find(s => s.live); if (s) toInput(s.m.position.x - P.pos.x, s.m.position.z - P.pos.z);
}

// ------------------------------------------------------------------ HUD
const hud = { hp: $('hp-fill'), ghost: $('hp-ghost'), coins: $('coins'), armour: $('armour'), boss: $('boss-fill'), cd: $('sling-cd') };
let lastHud = '';
function updateHud() {
  if (G.combo && now() - G.comboT > 1.8) { G.combo = 0; $('combo').classList.remove('on'); }
  const st = STATS(); const hpP = Math.max(0, P.hp / st.maxHp * 100).toFixed(1);
  const bp = G.fin ? (G.fin.prog * 100).toFixed(1) : G.boss ? (G.boss.hp / G.boss.maxHp * 100).toFixed(1) : 0;
  const cd = LEVEL === 2 ? (100 - G.spirit).toFixed(0) : (P.slingCd / st.slingCd * 100 || 0).toFixed(0);
  const pushOn = !!(G.fin && !G.fin.collapsing && TEMPLE && Math.hypot(P.pos.x - TEMPLE.spot.x, P.pos.z - TEMPLE.spot.z) < 3.2);
  const key = hpP + '|' + G.coins + '|' + G.armour + '|' + bp + '|' + cd + '|' + pushOn; if (key === lastHud) return; lastHud = key;
  hud.hp.style.width = hpP + '%'; hud.ghost.style.width = hpP + '%'; hud.coins.textContent = G.coins; hud.armour.textContent = G.armour; hud.boss.style.width = bp + '%'; hud.cd.style.height = cd + '%';
  if (LEVEL === 2) { $('sp-fill').style.width = G.spirit.toFixed(0) + '%'; $('b-sling').classList.toggle('ready', G.spirit >= 100); $('sp-wrap').classList.toggle('ready', G.spirit >= 100); }
  $('b-push').classList.toggle('on', pushOn);
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let frames = 0, fpsAcc = 0, fpsT = 0, lowFor = 0;
const ADAPT = !Q.has('noadapt');
function frame() {
  requestAnimationFrame(frame);
  let rdt = Math.min(clock.getDelta(), 0.05);
  frames++; fpsAcc += rdt; fpsT += rdt;
  if (fpsT >= 2) { const fps = frames / fpsAcc; G.fps = Math.round(fps); G.fpsLog.push(G.fps); if (G.fpsLog.length > 120) G.fpsLog.shift(); frames = 0; fpsAcc = 0; fpsT = 0;
    if (ADAPT && G.phase === 'play') { if (fps < 42) lowFor++; else lowFor = 0; if (lowFor >= 2) { lowFor = 0; if (bloomPass && bloomPass.enabled) { bloomPass.enabled = false; LOG('adapt', { bloom: false }); } else if (DPR > 1) { DPR = Math.max(1, DPR - 0.25); renderer.setPixelRatio(DPR); onResize(); LOG('adapt', { dpr: DPR }); } else if (sun.castShadow) { sun.castShadow = false; LOG('adapt', { shadows: false }); } else if (POST) { POST = false; document.body.classList.remove('post'); LOG('adapt', { post: false }); } } } }
  if (G.paused || document.hidden) return;
  if (G.hitstop > 0) { G.hitstop -= rdt; rdt *= 0.05; }
  if (G.slowT > 0) { G.slowT -= rdt; if (G.slowT <= 0) G.slow = 1; }
  const dt = rdt * G.slow;
  skyMat.uniforms.uTime.value += rdt;
  const _t0 = performance.now();
  if (BOT) bot(dt);
  readKeys();
  if (P) {
    updatePlayer(dt);
    for (const e of G.enemies) if (!e.gone) updateEnemy(e, dt);
    for (const a of ALLIES) updateAlly(a, dt); if (LEVEL === 6) updateL6(dt); if (G.captives.length) updateCaptives(dt); if (MELCH && MELCH.obj.visible) MELCH.update(dt); if (DEB && DEB.obj.visible) DEB.update(dt); if (CH.list.length) updateChariots(dt);
    if (G.boss) updateBoss(G.boss, dt);
    if (MOSES) MOSES.update(dt);
    for (const a of CINE.actors) a.update(dt); if (G.storyTick) G.storyTick(dt); if (ESC) updateEscape(dt);
    updateAngel(dt); updateStones(dt); updateArrows(dt); updateSpoils(dt); updateFX(dt); updatePuffs(dt); updateWorld(dt); updateFinale(dt);
    // sun + shadow follow player
    sun.position.copy(P.pos).addScaledVector(SUN_DIR, 40); sun.target.position.copy(P.pos);
    // dust follows the camera area
    dust.position.set(Math.round(P.pos.x / 25) * 25, P.pos.y, Math.round(P.pos.z / 25) * 25); dust.rotation.y += dt * 0.01;
    updateCamera(rdt); updateDmg(rdt); if (G.phase === 'play') updateHud();
    if (toastT > 0) { toastT -= rdt; if (toastT <= 0) $('toast').classList.remove('on'); }
  }
  const _t1 = performance.now();
  renderer.info.reset();
  if (POST && composer) { const gu = gradePass.uniforms; gu.uExp.value = renderer.toneMappingExposure; gu.uTime.value = (gu.uTime.value + 0.013) % 7; gu.uFlash.value = G.flashV || 0; composer.render(); } else renderer.render(scene, camera);
  if (G.flashV > 0) G.flashV = Math.max(0, G.flashV - rdt * 4);
  if (G.wantCalls) G.calls = renderer.info.render.calls;
  const _t2 = performance.now();
  G.cpuU = (G.cpuU || 0) * 0.95 + (_t1 - _t0) * 0.05; G.cpuR = (G.cpuR || 0) * 0.95 + (_t2 - _t1) * 0.05;
}

// ------------------------------------------------------------------ boot
const TIPS = [
  ['“The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.”', '1 Samuel 17:37'],
  ['“Up; for this is the day in which the LORD hath delivered Sisera into thine hand: is not the LORD gone out before thee?”', 'Judges 4:14'],
  ['“He teacheth my hands to war, so that a bow of steel is broken by mine arms.”', 'Psalm 18:34'],
  ['“And he brought back all the goods, and also brought again his brother Lot, and his goods, and the women also, and the people.”', 'Genesis 14:16'],
  ['“Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts…”', '1 Samuel 17:45'],
  ['“Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee…”', 'Deuteronomy 31:6'],
  ['“Saul hath slain his thousands, and David his ten thousands.”', '1 Samuel 18:7'],
];
{ const t = TIPS[(Math.random() * TIPS.length) | 0]; $('ltip').innerHTML = `${t[0]}<span>${t[1]} (KJV)</span>`; }
async function boot() {
  buildDust(); buildFX(); buildSparks(); buildStones(); buildArrows(); buildSpoils(); buildPuffs(); setupInput();
  buildWorld(WORLD_OF(LEVEL));
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/hero2.glb', (e) => { if (e.total) $('lfill').style.width = (e.loaded / e.total * 100).toFixed(0) + '%'; });
  BASE = gltf.scene; gltf.animations.forEach(c => CLIPS[c.name] = c);
  BASE.updateMatrixWorld(true);
  BASE.traverse(o => {
    if (o.isSkinnedMesh && o.name === 'SuperHero_Male') {
      // bind-pose world positions for the costume paint (the mesh positions are quantised, so they are rebuilt here once)
      BODY_MAT = o.material; const pa = o.geometry.attributes.position, out = new Float32Array(pa.count * 3), v = new THREE.Vector3();
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); out.set([v.x, v.y, v.z], i * 3); }
      o.geometry.setAttribute('aBind', new THREE.BufferAttribute(out, 3));
    }
    if (o.name === 'HAIR_Long' && o.isMesh) {
      // drop the front strands that fall across the face (they read as giant eyelashes); keep the long hair behind the ears
      const g = o.geometry, pa = g.attributes.position, v = new THREE.Vector3(), front = new Uint8Array(pa.count);
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); front[i] = v.z > 0.035 && v.y < 1.79 ? 1 : 0; }
      const idx = g.index.array, keep = [];
      for (let i = 0; i < idx.length; i += 3) if (!front[idx[i]] && !front[idx[i + 1]] && !front[idx[i + 2]]) keep.push(idx[i], idx[i + 1], idx[i + 2]);
      g.setIndex(keep);
    }
  });
  MOSES = new Actor('moses', 1.0); MOSES.pos.set(-5, 0, 19.5); ground(MOSES); MOSES.yaw = Math.PI * 0.92; MOSES.play('Idle_Loop');
  makeHero();
  ANGEL = new Actor('angel', 1.05); ANGEL.obj.visible = false; ANGEL.root.traverse(o => { if (o.isMesh) o.castShadow = false; });
  // warm the shader programs so the first fight doesn't hitch
  const tmp = [new Actor('phil'), new Actor('captain'), new Actor('goliath', 2.25), new Actor('archer'), new Actor('shield'), new Actor(LEVEL === 2 ? 'david' : 'samson'), new Actor('servant'), new Actor('phil', 1, 'e_phil'), new Actor('captive', 1, 'lot')].concat(LEVEL === 4 ? [new Actor('benaiah', 1), new Actor('goliath', 1.75, 'egypt'), new Actor('phil', 1, 'm_phil'), new Actor('captain', 1.2, 'lionman')] : LEVEL === 5 ? [new Actor('barak', 1), new Actor('phil', 1, 'k_phil'), new Actor('captain', 1, 'k_captain'), new Actor('servant', 1, 'isr_ally'), new Actor('moses', 1, 'deborah')] : LEVEL === 6 ? [new Actor('barak', 1.04, 'davidking'), new Actor('barak', 1, 'adino'), new Actor('servant', 1, 'eleazar'), new Actor('servant', 1, 'shammah'), new Actor('servant', 1, 'adino')] : []); tmp.forEach((a, i) => a.pos.set(i * 3, -50, 0));
  renderer.compile(scene, camera); renderer.render(scene, camera); tmp.forEach(a => a.remove());
  $('ltext').textContent = 'Ready';
  show('loading', false); show(LQO || BOT ? 'title' : 'menu'); G.phase = 'title';
  setLevelUI(); renderTitle(); renderMenu();
  requestAnimationFrame(frame);
  if (BOT) setTimeout(() => $('btn-start').click(), 600);
}
function startLevel() {
  show('title', false); show('win', false); $('hud').classList.remove('hidden'); if (isTouch || BOT) $('touch').classList.remove('hidden');
  SAVE.level = LEVEL; writeSave(); G.cine = null;
  resetRun(true); MOSES.play('Idle_Loop'); MOSES.obj.visible = true; LOG('level_start', { level: LEVEL });
  if (LEVEL === 2 && Q.get('dev') === 'temple') { resetRun(false); finale(true); } else if (LEVEL === 3 && Q.get('dev') === 'king') { G.t0 = now(); kingFight(); } else if (LEVEL === 3 && Q.get('dev') === 'end') { G.t0 = now(); endingL3(); } else if (LEVEL === 3) flow3(); else if (LEVEL === 4 && Q.get('dev') === 'pit') { G.t0 = now(); pitFight(); } else if (LEVEL === 4 && Q.get('dev') === 'egypt') { G.t0 = now(); egyptFight(); } else if (LEVEL === 4) flow4(); else if (LEVEL === 5 && Q.get('dev') === 'chariots') { G.t0 = now(); chariotSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'river') { G.t0 = now(); riverSeq(); } else if (LEVEL === 5 && Q.get('dev') === 'pursue') { G.t0 = now(); pursueSisera(); } else if (LEVEL === 5) flow5(); else if (LEVEL === 6 && Q.get('dev') === 'barley') { G.t0 = now(); barleySeq(); } else if (LEVEL === 6 && Q.get('dev') === 'lentil') { G.t0 = now(); lentilSeq(); } else if (LEVEL === 6 && Q.get('dev') === 'well') { G.t0 = now(); wellSeq(); } else if (LEVEL === 6) flow6(); else if (LEVEL === 2) flow2(); else if (Q.get('dev') === 'escape') { G.t0 = now(); runEscape(false); } else if (Q.get('dev') === 'jub') { G.t0 = now(); afterGoliath(); } else flow();
}
$('btn-start').onclick = async () => {
  audioInit();
  if (isTouch && !BOT) { try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation.lock('landscape'); } catch (e) { } }
  startLevel();
};
$('btn-again').onclick = () => { buildWorld(WORLD_OF(LEVEL)); startLevel(); };
$('btn-next').onclick = () => { const nx = NEXT_RUN(LEVEL); if (nx) { switchLevel(nx); startLevel(); } else goTitle(); };
$('btn-retry').onclick = () => { const esc = LEVEL === 1 && G.stage === 'escape'; show('lose', false); resetRun(false); if (esc) { runEscape(true); return; } G.phase = 'play'; if ((G.resumeWave ?? 0) < curWaves().length) runWaves(G.resumeWave ?? 0); else if (LEVEL === 4) { if (G.resumeWave >= 4) egyptFight(); else pitFight(); } else if (LEVEL === 5) { if (G.resumeWave >= 4) pursueSisera(); else if (G.resumeWave >= 3) riverSeq(); else chariotSeq(); } else if (LEVEL === 6) { if (G.resumeWave >= 4) wellSeq(); else if (G.resumeWave >= 3) lentilSeq(); else barleySeq(); } else if (LEVEL === 2) finale(true); else if (LEVEL === 3) { if (G.resumeWave >= 4) chaseToHobah(); else kingFight(); } else bossFight(); };
$('btn-pause').onclick = () => togglePause();
$('btn-resume').onclick = () => togglePause(false);
$('btn-restart').onclick = () => { location.reload(); };
$('btn-menu').onclick = () => { location.href = location.pathname + (BOT ? '?bot' : ''); };
$('btn-mute').onclick = () => { AU.on = !AU.on; $('btn-mute').classList.toggle('off', !AU.on); if (AU.wind) AU.wind.g.gain.value = AU.on ? 0.05 : 0; musicMute(AU.on); try { localStorage.setItem('elah-mute', AU.on ? '0' : '1'); } catch (e) { } };
$('btn-mute').classList.toggle('off', !AU.on);
document.addEventListener('visibilitychange', () => { if (document.hidden && G.phase === 'play') togglePause(true); });
// ---- level select (title screen)
const ICONS = {
  sword: '<svg viewBox="0 0 64 64"><path d="M46 8 L54 10 L52 18 L22 48 L16 42Z" fill="#e8e4dc"/><path d="M12 38 L26 52 M14 50 L8 56" stroke="#d6a650" stroke-width="5" stroke-linecap="round"/></svg><span>SWORD</span>',
  bow: '<svg viewBox="0 0 64 64"><path d="M18 8 Q50 32 18 56" stroke="#c49a5a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 8 L18 56" stroke="#efe2c4" stroke-width="1.5"/><path d="M10 32 L54 32" stroke="#efe2c4" stroke-width="3"/><path d="M54 32 L46 27 L46 37Z" fill="#efe2c4"/></svg><span>BOW</span><i id="sling-cd"></i>',
  staff: '<svg viewBox="0 0 64 64"><path d="M14 52 L50 12" stroke="#f3e2c0" stroke-width="6" stroke-linecap="round"/><path d="M44 10 q8 -2 10 6" stroke="#f3e2c0" stroke-width="4" fill="none" stroke-linecap="round"/></svg><span>STAFF</span>',
  jaw: '<svg viewBox="0 0 64 64"><path d="M10 40 Q30 50 54 34 L56 28 L50 30 L46 26 L42 30 L38 26 L34 31 L30 27 L26 32 Q16 30 14 18 L8 20 Q8 34 10 40Z" fill="#efe2c4"/></svg><span>JAWBONE</span>',
  sling: '<svg viewBox="0 0 64 64"><circle cx="32" cy="30" r="11" fill="#d9d2c4"/><path d="M10 46 Q32 64 54 46" stroke="#c49a5a" stroke-width="4" fill="none"/><path d="M10 46 L18 20 M54 46 L46 20" stroke="#c49a5a" stroke-width="3"/></svg><span>SLING</span><i id="sling-cd"></i>',
  spirit: '<svg viewBox="0 0 64 64"><path d="M32 6 C40 20 50 26 46 42 C44 52 36 58 32 58 C24 58 16 50 18 40 C20 30 28 28 26 16 C32 22 34 28 32 34 C38 30 38 18 32 6Z" fill="#ffcf6a"/><path d="M32 30 C36 38 40 42 38 48 C36 54 28 54 27 48 C26 42 31 40 32 30Z" fill="#fff4cf"/></svg><span>SPIRIT</span><i id="sling-cd"></i>',
};
function setLevelUI() {
  UPG = LEVEL === 6 ? UPG6 : LEVEL === 5 ? UPG5 : LEVEL === 3 ? UPG3 : LEVEL === 2 ? UPG2 : UPG1; stoneLook();
  $('who-name').textContent = LEVEL === 6 ? 'DAVID' : LEVEL === 5 ? 'BARAK' : LEVEL === 4 ? 'BENAIAH' : LEVEL === 3 ? 'ABRAM' : LEVEL === 2 ? 'SAMSON' : 'DAVID';
  const ARMS = LEVEL === 3 || LEVEL >= 5; $('b-attack').innerHTML = ARMS ? ICONS.sword : LEVEL === 2 ? ICONS.jaw : ICONS.staff; $('b-sling').innerHTML = ARMS ? ICONS.bow : LEVEL === 2 ? ICONS.spirit : ICONS.sling; hud.cd = $('sling-cd');
  $('b-attack').setAttribute('aria-label', ARMS ? 'Sword attack' : LEVEL === 2 ? 'Jawbone attack' : 'Staff attack'); $('b-sling').setAttribute('aria-label', ARMS ? 'Bow' : LEVEL === 2 ? 'Spirit power' : 'Sling');
  $('sp-wrap').classList.toggle('hidden', LEVEL !== 2); $('bname').textContent = LEVEL === 6 ? 'THE HOST' : LEVEL === 5 ? 'SISERA' : LEVEL === 4 ? 'THE LION' : LEVEL === 3 ? 'CHEDORLAOMER' : 'GOLIATH OF GATH'; $('boss-wrap').classList.remove('house');
  document.body.dataset.level = LEVEL; lastHud = '';
}
function renderTitle() {
  $('tsub').textContent = (ORD(LEVEL) && ORD(LEVEL).sub) || '';
  document.querySelectorAll('.lvc:not(.soon)').forEach(b => { const l = +b.dataset.l; b.classList.toggle('sel', l === LEVEL); b.classList.toggle('locked', !isOpen(l)); b.classList.toggle('done', !!SAVE.done[l]); });
  $('tcontrols').innerHTML = LEVEL === 6
    ? (isTouch ? 'Left thumb: move · Right: <b>SWORD</b>, <b>BOW</b>, <b>DODGE</b> · Your three mighty men fight beside you' : 'WASD move · Click / J sword · Right-click / K bow · Space dodge · Your three mighty men fight beside you')
    : LEVEL === 5
    ? (isTouch ? 'Left thumb: move · Right: <b>SWORD</b>, <b>BOW</b>, <b>DODGE</b> · Step out of a chariot’s red lane' : 'WASD move · Click / J sword · Right-click / K bow · Space dodge · Step out of a chariot’s red lane')
    : LEVEL === 4
    ? (isTouch ? 'Left thumb: move · Right: <b>STAFF</b>, <b>SLING</b>, <b>DODGE</b> · Dodge the pounce, then strike' : 'WASD move · Click / J staff · Right-click / K sling · Space dodge · Q/E camera')
    : LEVEL === 3
    ? (isTouch ? 'Left thumb: move · Right: <b>SWORD</b>, <b>BOW</b>, <b>DODGE</b> · Stand by a captive to free him' : 'WASD move · Click / J sword · Right-click / K bow · Space dodge · Stand by a captive to free him')
    : LEVEL === 2
    ? (isTouch ? 'Left thumb: move · Right: <b>JAWBONE</b>, <b>SPIRIT</b>, <b>DODGE</b> · <b>PUSH</b> at the pillars' : 'WASD move · Click / J jawbone · Right-click / K Spirit · Space dodge · Hold R to push the pillars')
    : (isTouch ? 'Left thumb: move · Right: <b>STAFF</b>, <b>SLING</b>, <b>DODGE</b> · In the escape: <b>SPRINT</b>, <b>HIDE</b>, <b>ROLL</b>' : 'WASD move · Click / J staff · Right-click / K sling · Space dodge · Escape: Shift sprint, C hide · Q/E camera');
}
function makeHero() {
  if (P) P.remove();
  clearAllies(); clearCaptives(); if (DEB) DEB.obj.visible = false;
  P = LEVEL === 6 ? new Actor('barak', 1.04, 'davidking') : LEVEL === 5 ? new Actor('barak', 1.0) : LEVEL === 4 ? new Actor('benaiah', 1.0) : LEVEL === 3 ? new Actor('abram', 0.98) : LEVEL === 2 ? new Actor('samson', 1.0) : new Actor('david', 0.94); P.hp = 100; P.pos.set(0, 0, LEVEL === 3 ? 11 : LEVEL === 2 ? 6 : 10); ground(P); P.yaw = Math.PI; P.play('Idle_Loop');
  if (LEVEL === 3 || LEVEL === 6) MOSES.pos.set(-4.5, 0, 15.5); else if (LEVEL === 2) { MOSES.pos.set(-4.5, 0, 14.5); } else MOSES.pos.set(-5, 0, 19.5); ground(MOSES);
}
function switchLevel(l) {
  if (l === LEVEL && WORLD === WORLD_OF(l)) return;
  LEVEL = l; SAVE.level = l; writeSave(); buildWorld(WORLD_OF(l)); makeHero(); setLevelUI(); renderTitle(); LOG('switch_level', { l });
}
// level cards are built from LEVEL_ORDER (see the top of this file)
(function buildLevelCards() {
  const box = $('tsel'); box.innerHTML = '';
  for (const o of LEVEL_ORDER) {
    const b = document.createElement('button'); b.className = 'lvc' + (o.soon ? ' soon' : '');
    if (o.soon) { b.innerHTML = `<div class="art soonart"></div><b>COMING SOON</b><span>${o.name}</span><i>${o.place}</i>`; b.onclick = async () => { audioInit(); show('title', false); await card({ who: 'COMING SOON', text: `<b>${o.name}</b> · ${o.place}<br>This part of the story is being built next.`, btn: 'BACK' }); show('title'); }; }
    else {
      const prev = PREV(o.run); b.dataset.l = o.run;
      b.innerHTML = `<div class="art" style="background-image:url(assets/art/l${o.run}.jpg)"></div><b>LEVEL ${NUM(o.run)}</b><span>${o.name}</span><i>${o.place}</i>${prev ? `<em>🔒 Finish Level ${NUM(prev.run)}</em>` : ''}`;
      b.onclick = async () => {
        const l = o.run; audioInit();
        if (!isOpen(l)) {
          show('title', false);
          const ok = await card({ who: `LEVEL ${NUM(l)} · LOCKED`, text: `Level ${NUM(l)} unlocks when you finish <b>${prev.name}</b> (Level ${NUM(prev.run)}). You can still try it now as a preview.`, btn: 'PLAY PREVIEW', btn2: 'BACK' });
          show('title'); if (!ok) return;
        }
        switchLevel(l);
      };
    }
    box.appendChild(b);
  }
})();
// ---- main menu, settings, loading tip
function renderMenu() {
  const o = ORD(LEVEL); $('mcont').innerHTML = o ? `Continue · <b>Level ${NUM(LEVEL)}</b> · ${o.name}` : '';
}
$('btn-play').onclick = () => { audioInit(); show('menu', false); $('btn-start').click(); };
$('btn-levels').onclick = () => { audioInit(); show('menu', false); show('title'); renderTitle(); };
$('btn-back').onclick = () => { show('title', false); renderMenu(); show('menu'); };
let setFrom = 'menu';
const Q_NAME = { low: 'Low', med: 'Medium', high: 'High' };
function renderSettings() {
  document.querySelectorAll('#set-q button').forEach(b => b.classList.toggle('on', b.dataset.q === SETTINGS.q));
  const eff = SETTINGS.q === 'auto' ? SETTINGS.auto : SETTINGS.q, changed = eff !== QUALITY && !['low', 'med', 'high'].includes(QQ);
  $('set-qnote').innerHTML = (SETTINGS.q === 'auto' ? `Auto picked <b>${Q_NAME[SETTINGS.auto]}</b> for this device. ` : '') + `Now running: <b>${Q_NAME[QUALITY]}</b>` + (QUALITY === 'low' ? ' · smoothest on phones' : QUALITY === 'high' ? ' · bloom, soft shadows, sharpest' : ' · colour grade and shadows');
  $('set-apply').style.display = changed ? '' : 'none';
  $('set-music').value = Math.round(SETTINGS.music * 100); $('set-sfx').value = Math.round(SETTINGS.sfx * 100);
  $('set-vib').textContent = SETTINGS.vib ? 'ON' : 'OFF'; $('set-vib').classList.toggle('on', SETTINGS.vib);
}
function openSettings(from) { setFrom = from; show(from, false); renderSettings(); show('settings'); }
$('btn-settings').onclick = () => { audioInit(); openSettings('menu'); };
$('btn-psettings').onclick = () => openSettings('paused');
$('set-done').onclick = () => { show('settings', false); show(setFrom); };
document.querySelectorAll('#set-q button').forEach(b => b.onclick = () => { SETTINGS.q = b.dataset.q; saveSettings(); renderSettings(); });
$('set-apply').onclick = () => { location.reload(); };
$('set-music').oninput = (e) => { SETTINGS.music = e.target.value / 100; saveSettings(); if (AU.musicOut) AU.musicOut.gain.value = SETTINGS.music; };
$('set-sfx').oninput = (e) => { SETTINGS.sfx = e.target.value / 100; saveSettings(); if (AU.master) AU.master.gain.value = 0.6 * SETTINGS.sfx; };
$('set-sfx').onchange = () => SFX.hit();
$('set-vib').onclick = () => { SETTINGS.vib = !SETTINGS.vib; saveSettings(); renderSettings(); vibrate(40); };
$('btn-reset').onclick = () => { if (!confirm('Reset all saved progress?')) return; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.href = location.pathname; };

// QA hook
window.__elah = { G, camera, scene, get calls() { G.wantCalls = true; return G.calls || null; }, get quality() { return QUALITY; }, bindStats() { let a = null; BASE.traverse(o => { if (o.isSkinnedMesh && o.name === 'SuperHero_Male') a = o.geometry.attributes.aBind; }); const rows = {}; for (let i = 0; i < a.count; i++) { const y = a.getY(i), z = a.getZ(i), x = a.getX(i); if (y < 1.45 || Math.abs(x) > 0.12) continue; const k = y.toFixed(2); const r = rows[k] || (rows[k] = { zmax: -9, zmin: 9, xmax: 0, n: 0 }); r.zmax = Math.max(r.zmax, z); r.zmin = Math.min(r.zmin, z); r.xmax = Math.max(r.xmax, Math.abs(x)); r.n++; } return rows; }, faceshot(kind, look, sc) {
    // QA: one character, close on the face, in this world's light
    if (window._fs) window._fs.remove(); const a = new Actor(kind, sc || 1, look); window._fs = a; a.pos.set(P.pos.x + 30, 0, P.pos.z); ground(a); a.yaw = 0; a.play('Idle_Loop'); a.update(0.01);
    const h = a.headPos(new THREE.Vector3()); G.phase = 'cine'; const d = (window._fsd || 0.5) * (sc || 1); G.cine = { pos: new THREE.Vector3(h.x + d * 0.3, h.y + 0.0, h.z + d), look: h.clone().add(new THREE.Vector3(0, -0.07 * (sc || 1), 0)), snap: true }; return h.toArray(); }, get audio() { return { ctx: AU.ctx && AU.ctx.state, track: TRACK.cur, playing: !!(TRACK.el && !TRACK.el.paused), t: TRACK.el ? +TRACK.el.currentTime.toFixed(1) : 0, failed: Object.keys(TRACK.failed), smp: Object.keys(SMP.buf) }; }, get tris() { return renderer.info.render.triangles; }, get chariots() { return CH.list.map(c => c.state + ':' + Math.round(c.d || 0) + '/' + Math.round(c.stuckAt < 1e8 ? c.stuckAt : -1)); }, get moses() { return MOSES && MOSES.pos.toArray(); }, get player() { return P && { hp: P.hp, state: P.state, pos: P.pos.toArray().map(v => +v.toFixed(2)) }; }, get boss() { return G.boss && { hp: G.boss.hp, state: G.boss.state, dist: +G.boss.pos.distanceTo(P.pos).toFixed(1) }; }, hurt(n) { damagePlayer(n, P.pos.clone().add(new THREE.Vector3(0, 0, 1))); }, get angel() { return !!G.angel; }, get dpr() { return DPR; }, renderer, get level() { return LEVEL; }, get fin() { return G.fin && { prog: +G.fin.prog.toFixed(3), collapsing: G.fin.collapsing }; }, get spirit() { return G.spirit; }, get world() { return WORLD; }, get allies() { return ALLIES.map(a => ({ hp: Math.round(a.hp), down: a.down, st: a.state })); }, get captives() { return (G.captives || []).map(c => ({ n: c.name, freed: c.freed, prog: +c.prog.toFixed(2) })); }, get stage() { return G.stage; }, get esc() { return ESC && { stamina: Math.round(ESC.stamina), hidden: ESC.hidden, hiding: ESC.hiding, near: +ESC.near.toFixed(1), hunters: ESC.hunters.length, chasing: ESC.hunters.filter(h => h.state === 'chase' || h.state === 'grab').length, caught: ESC.caught, toCave: WILD ? +Math.hypot(WILD.cave.x - P.pos.x, WILD.cave.z - P.pos.z).toFixed(1) : null, won: ESC.won }; }, get seq() { return G.seq; }, get l6() { return LEVEL === 6 ? { hold: +L6.hold.toFixed(1), field: Math.round(L6.field), run: L6.run, drawn: +L6.drawn.toFixed(1), hero: P.look, horde: G.horde } : null; }, dbgHide() { const r = WILD.rocks[3]; P.pos.set(r.x + r.s + 0.9, 0, r.z); ground(P); BOTI.x = BOTI.y = 0; ESC.hiding = true; return [r.x, r.z]; }, dbgH() { return ESC && { esc: this.esc, p: P.pos.toArray().map(v => +v.toFixed(1)), pst: P.state, hp: Math.round(P.hp), hs: ESC.hunters.map(h => [h.state, +h.pos.distanceTo(P.pos).toFixed(2), +h.cd.toFixed(1)]).sort((a, b) => a[1] - b[1]).slice(0, 4), log: G.log.slice(-4).map(l => l.type) }; }, devFin(p) { if (G.fin) G.fin.prog = p; }, lineup(kinds, close) { show('title', false); kinds = kinds || ['david', 'phil', 'archer', 'captain', 'shield', 'samson', 'moses']; const base = P.pos.clone(); const out = kinds.map((k, i) => { const a = new Actor(k, k === 'goliath' ? 2.25 : 1); a.pos.set(base.x + (i - (kinds.length - 1) / 2) * 0.9, 0, base.z - 3); ground(a); a.yaw = 0; a.play('Idle_Loop'); a.update(0.6); a.obj.updateMatrixWorld(true); return a; }); const c = out[0].pos; G.cine = close ? { pos: new THREE.Vector3(c.x + 0.25, c.y + close, c.z + 0.75), look: new THREE.Vector3(c.x, c.y + close - 0.05, c.z), snap: true } : { pos: new THREE.Vector3(base.x, base.y + 1.5, base.z + 1.2), look: new THREE.Vector3(base.x, base.y + 1.1, base.z - 3), snap: true }; P.obj.visible = false; MOSES.obj.visible = false; return kinds.length; }, get tdbg() { const T = TEMPLE; return T && T.collapse && { t: +T.collapse.t.toFixed(2), f: T.falling.slice(0, 6).map(f => +f.m.position.y.toFixed(2)), c0: T.crowdBase[0][4].p.y.toFixed(2), slow: G.slow, hs: G.hitstop }; }, save: () => SAVE, musicRenderTest, get music() { return { step: MUSIC.step, mode: MUSIC.mode, inten: +MUSIC.inten.toFixed(2), ctx: AU.ctx && AU.ctx.state }; } };
boot().catch((e) => { console.error(e); $('ltext').textContent = 'Could not load: ' + e.message; });
