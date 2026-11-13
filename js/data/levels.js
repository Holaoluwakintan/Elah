// =====================================================================================================
// ELAH: Story & Level Data Module
// Decoupled level configurations, cinematic shots, scripture cards (KJV), and balance parameters.
// =====================================================================================================

export const LEVEL_ORDER = [
  // Arc 1 — The Shepherd’s Rise
  { key: 'david', run: 1, arc: 'ARC 1 · THE SHEPHERD’S RISE', arcShort: 'ARC 1 · SHEPHERD', name: 'David', place: 'From Elah to Adullam', sub: 'FROM ELAH TO ADULLAM' },

  // Arc 2 — The Valiant and the Mighty
  { key: 'benaiah', run: 4, arc: 'ARC 2 · THE VALIANT & THE MIGHTY', arcShort: 'ARC 2 · VALIANT', name: 'Benaiah', place: 'Moab · The pit · The Egyptian', sub: 'BENAIAH, A VALIANT MAN' },
  { key: 'mighty', run: 6, arc: 'ARC 2 · THE VALIANT & THE MIGHTY', arcShort: 'ARC 2 · MIGHTY', name: 'David’s mighty men', place: 'Pasdammim · The well of Bethlehem', sub: 'DAVID AND HIS MIGHTY MEN' },

  // Arc 3 — Night and Fire (The Judges Cycle)
  { key: 'gideon', run: 8, arc: 'ARC 3 · NIGHT AND FIRE (JUDGES)', arcShort: 'ARC 3 · JUDGES', name: 'Gideon', place: 'Moreh · The Night Raid', sub: 'THE SWORD OF THE LORD AND OF GIDEON' },
  { key: 'deborah', run: 5, arc: 'ARC 3 · NIGHT AND FIRE (JUDGES)', arcShort: 'ARC 3 · JUDGES', name: 'Deborah and Barak', place: 'Mount Tabor · The river Kishon', sub: 'DEBORAH AND BARAK' },
  { key: 'samson', run: 2, arc: 'ARC 3 · NIGHT AND FIRE (JUDGES)', arcShort: 'ARC 3 · JUDGES', name: 'Samson', place: 'Lehi · The house of Dagon', sub: 'THE STRENGTH OF SAMSON' },

  // Arc 4 — The Walls and the Promise
  { key: 'joshua', run: 7, arc: 'ARC 4 · THE WALLS & THE PROMISE', arcShort: 'ARC 4 · PROMISE', name: 'Joshua', place: 'Jericho · The Wall of Stone', sub: 'THE WALL FALLS DOWN FLAT' },
  { key: 'abram', run: 3, arc: 'ARC 4 · THE COVENANT ANCHOR', arcShort: 'ARC 4 · ANCHOR', name: 'Abram rescues Lot', place: 'Dan · The night attack', sub: 'ABRAM RESCUES LOT' },

  // Arc 5 — Confrontations of Fire
  { key: 'elijah', run: 10, arc: 'ARC 5 · CONFRONTATIONS OF FIRE', arcShort: 'ARC 5 · PROPHETS', name: 'Elijah', place: 'Mount Carmel · Fire from Heaven', sub: 'THE LORD, HE IS THE GOD' },

  // Arc 6 — Exile and the Pit
  { key: 'daniel', run: 9, arc: 'ARC 6 · EXILE AND THE PIT', arcShort: 'ARC 6 · EXILE', name: 'Daniel', place: 'Babylon · The Lions\' Den', sub: 'THE GOD WHO SHUTS THE LIONS\' MOUTHS' },

  // Arc 7 — The Siege & The Angel
  { key: 'hezekiah', run: 11, arc: 'ARC 7 · THE SIEGE & THE ANGEL', arcShort: 'ARC 7 · SIEGE', name: 'Hezekiah', place: 'Jerusalem · The Assyrian Siege', sub: 'THE ANGEL OF THE LORD' },

  // Arc 8 — The Symbolic and the Surreal
  { key: 'jonah', run: 12, arc: 'ARC 8 · THE DEEP & THE SURREAL', arcShort: 'ARC 8 · SURREAL', name: 'Jonah', place: 'Belly of the Great Fish · Intestine', sub: 'OUT OF THE BELLY OF HELL' },
];

export const STORY_L1 = {
  sequences: ['The Philistine armies', 'Goliath', 'Jubilation', 'Escape to Adullam'],
  intro: [
    { shot: 'defy', sec: 1.4, head: 'Goliath defies Israel', text: '“I defy the armies of Israel this day…”', ref: '1 Samuel 17:10' },
    { shot: 'prize', sec: 1.4, head: 'The king’s prize', text: '“…the king will enrich him with great riches, and will give him his daughter…”', ref: '1 Samuel 17:25' },
    { shot: 'vision', sec: 2.0, look: 'vision', head: 'If the Philistine wins…', text: '“…then shall ye be our servants, and serve us.”', ref: '1 Samuel 17:9' },
    { shot: 'resolve', sec: 1.2, head: 'Not for the prize. For Israel.', text: '“…for the battle is the LORD’S…”', ref: '1 Samuel 17:47' },
  ],
  counsel: {
    who: 'MOSES · YOUR ADVISOR',
    text: 'Not for the king’s riches, David, but for Israel. First the armies of the Philistines, then their champion. Remember what you told Saul:',
    verse: '“The LORD that delivered me out of the paw of the lion, and out of the paw of the bear, he will deliver me out of the hand of this Philistine.”',
    ref: '1 SAMUEL 17:37 (KJV)',
    tips: '<b>Staff</b> for close fighting. <b>Sling</b> from afar. <b>Dodge</b> their blows. Gather the <b>spoils</b> of the fallen to grow stronger.',
    btn: 'I AM READY'
  },
  jubilation: [
    { shot: 'praise', sec: 4.6, head: 'Israel rejoices', text: '“Saul hath slain his thousands, and David his ten thousands.”', ref: '1 Samuel 18:7' },
    { shot: 'jealous', sec: 3.0, look: 'dark', head: 'But Saul…', text: '“And Saul was very wroth… And Saul eyed David from that day and forward.”', ref: '1 Samuel 18:8–9' },
  ],
  escapeCard: {
    who: 'SEQUENCE 4 OF 4 · ESCAPE TO ADULLAM',
    text: 'Saul now seeks your life, and his soldiers are many. <b>Do not fight back.</b> Run for the cave of Adullam.',
    verse: '“…and David fled, and escaped that night.”',
    ref: '1 SAMUEL 19:10 (KJV)',
    btn: 'RUN'
  },
  escapeTips: {
    touch: '<b>SPRINT</b> (hold) while stamina lasts · <b>ROLL</b> through their hands · <b>HIDE</b> beside a rock and they lose you · Getting caught costs health',
    keys: '<b>Shift / J</b> (hold) sprint · <b>Space</b> roll · <b>K / C</b> hide beside a rock · Getting caught costs health'
  },
  escape: {
    runSpeed: 6.0, sprintSpeed: 8.7, stamina: 100, sprintDrain: 24, staminaRegen: 15, hunterSpeed: [5.0, 5.7],
    catchDmg: 14, grabRange: 2.1, lungeSpeed: 7.6, sight: 19, hiddenSee: 3.2, hideNear: 1.8, maxActive: 14,
    groups: [
      { at: 99, n: 6, from: 'behind' }, { at: -10, n: 3, from: 'ahead' }, { at: -32, n: 4, from: 'ahead' }, { at: -48, n: 3, from: 'behind' },
      { at: -68, n: 4, from: 'ahead' }, { at: -92, n: 4, from: 'ahead' }, { at: -108, n: 3, from: 'behind' }, { at: -122, n: 4, from: 'ahead' },
    ],
  },
  cave: {
    who: 'THE CAVE OF ADULLAM',
    verse: '“David therefore departed thence, and escaped to the cave Adullam: and when his brethren and all his father’s house heard it, they went down thither to him. And every one that was in distress, and every one that was in debt, and every one that was discontented, gathered themselves unto him; and he became a captain over them: and there were with him about four hundred men.”',
    ref: '1 SAMUEL 22:1–2 (KJV)',
    btn: 'CONTINUE'
  },
};

export const STORY_L2 = {
  sequences: ['Bound at Lehi', 'A thousand men with the jawbone', 'The house of Dagon'],
  waveSeq: [1, 2, 2],
  intro: [
    { shot: 'oppress', sec: 2.1, look: 'dark', head: 'Forty years under the Philistines', text: '“…and the LORD delivered them into the hand of the Philistines forty years.”', ref: 'Judges 13:1' },
    { shot: 'resolve', sec: 1.6, head: 'Samson will not stand by', text: '“…he shall begin to deliver Israel out of the hand of the Philistines.”', ref: 'Judges 13:5' },
    { shot: 'spirit', sec: 2.1, head: 'The Spirit of the LORD', text: '“…and the Spirit of the LORD came mightily upon him…”', ref: 'Judges 15:14' },
  ],
  hard: { hp: 1.32, dmg: 1.22, speed: 0.28, attackers: 1, finaleSpawn: 7.6 },
};

export const STORY_L3 = {
  sequences: ['Night raid at Dan', 'Free Lot', 'The divided attack', 'Chedorlaomer', 'The chase to Hobah'],
  waveSeq: [1, 2, 3],
  intro: [
    { shot: 'taken', sec: 2.0, head: 'The kings of the east take Lot', text: '“And they took Lot, Abram’s brother’s son, who dwelt in Sodom, and his goods, and departed.”', ref: 'Genesis 14:12' },
    { shot: 'escaped', sec: 1.6, head: 'One that had escaped', text: '“And there came one that had escaped, and told Abram the Hebrew…”', ref: 'Genesis 14:13' },
    { shot: 'armed', sec: 2.0, head: 'Abram arms his servants', text: '“…he armed his trained servants, born in his own house, three hundred and eighteen…”', ref: 'Genesis 14:14' },
  ],
  counsel: {
    who: 'MOSES · YOUR ADVISOR',
    text: 'Lot and the people are bound in the camp of the four kings at Dan. Divide your servants and strike by night.',
    tips: '<b>Sword</b> up close. <b>Bow</b> from afar. <b>Dodge</b> their blows. <b>Stand by the captives</b> to cut them free. Your <b>servants</b> fight beside you. Gather the <b>spoils</b> for upgrades.',
    btn: 'ATTACK BY NIGHT'
  },
  hard: { hp: 1.42, dmg: 1.32, speed: 0.35, attackers: 1, kingHp: 1.2 },
};

export const STORY_L4 = {
  sequences: ['Two lionlike men of Moab', 'The lion in the pit', 'The Egyptian'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'moab', sec: 1.9, head: 'Two lionlike men of Moab', text: '“…he slew two lionlike men of Moab…”', ref: '2 Samuel 23:20' },
    { shot: 'pit', sec: 1.9, head: 'A lion in a pit, in time of snow', text: '“…he went down also and slew a lion in the midst of a pit in time of snow:”', ref: '2 Samuel 23:20' },
    { shot: 'egypt', sec: 2.0, head: 'An Egyptian, five cubits high', text: '“And he slew an Egyptian, a man of great stature, five cubits high; and in the Egyptian’s hand was a spear like a weaver’s beam…”', ref: '1 Chronicles 11:23' },
  ],
  counsel: {
    who: 'MOSES · YOUR ADVISOR',
    text: 'Benaiah son of Jehoiada, the raiders of Moab are on the border, and two lionlike men lead them. Go out and meet them.',
    tips: '<b>Staff</b> up close. <b>Sling</b> from afar. <b>Dodge</b> their blows. Gather the <b>spoils</b> for upgrades.',
    btn: 'GO OUT TO MOAB'
  },
  hard: { hp: 1.5, dmg: 1.38, speed: 0.4, attackers: 1 },
  lionman: { hp: 420, dmg: 26, speed: 3.2, scale: 1.22 },
  lion: {
    hp: 900, scale: 1.05, leap: 3.1, ring: 2.3, win: 0.6, open: 1.25,
    card: {
      who: 'THE LION IN THE PIT',
      text: 'Snow is falling. A lion has come down into the pit, and Benaiah goes down after it.',
      verse: '“…he went down also and slew a lion in the midst of a pit in time of snow:”',
      ref: '2 SAMUEL 23:20 (KJV)',
      tips: '<b>Moses:</b> Watch the ring when it crouches, then <b>dodge</b> the pounce. When it lands or strikes the wall it is open: <b>strike hard</b>.',
      btn: 'GO DOWN'
    }
  },
  egypt: {
    hp: 1150, scale: 1.75, disarmAt: 0.5, win: 0.8, open: 1.35,
    card: {
      who: 'THE EGYPTIAN · FIVE CUBITS HIGH',
      verse: '“And he slew an Egyptian, a goodly man: and the Egyptian had a spear in his hand; but he went down to him with a staff, and plucked the spear out of the Egyptian’s hand, and slew him with his own spear.”',
      ref: '2 SAMUEL 23:21 (KJV)',
      tips: '<b>Moses:</b> His spear is like a weaver’s beam. <b>Dodge</b> the sweep and the charge, strike when he stumbles, and wear him down: then <b>pluck the spear</b> from his hand.',
      btn: 'GO DOWN TO HIM'
    }
  },
  end: {
    who: 'BENAIAH SON OF JEHOIADA',
    text: 'Over David’s guard.',
    verse: '“These things did Benaiah the son of Jehoiada, and had the name among three mighty men. He was more honourable than the thirty, but he attained not to the first three. And David set him over his guard.”',
    ref: '2 SAMUEL 23:22–23 (KJV)',
    btn: 'CONTINUE'
  },
};

export const STORY_L5 = {
  sequences: ['Down from mount Tabor', 'The chariots of iron', 'The river Kishon', 'Pursue Sisera'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'chariots', sec: 2.0, head: 'Nine hundred chariots of iron', text: '“…for he had nine hundred chariots of iron; and twenty years he mightily oppressed the children of Israel.”', ref: 'Judges 4:3' },
    { shot: 'palm', sec: 2.0, head: 'Deborah sends Barak', text: '“Up; for this is the day in which the LORD hath delivered Sisera into thine hand: is not the LORD gone out before thee?”', ref: 'Judges 4:14' },
    { shot: 'tabor', sec: 1.8, head: 'Down from mount Tabor', text: '“So Barak went down from mount Tabor, and ten thousand men after him.”', ref: 'Judges 4:14' },
  ],
  counsel: {
    who: 'DEBORAH · PROPHETESS, JUDGE OF ISRAEL',
    text: 'Barak, meet his foot soldiers on the plain. Do not stand before his chariots: step out of their path. The LORD will fight for you.',
    verse: '“And I will draw unto thee to the river Kishon Sisera, the captain of Jabin’s army, with his chariots and his multitude; and I will deliver him into thine hand.”',
    ref: 'JUDGES 4:7 (KJV)',
    tips: '<b>Sword</b> up close. <b>Bow</b> from afar. <b>Dodge</b> out of a chariot’s red lane. Your <b>men</b> fight beside you.',
    btn: 'DOWN FROM TABOR'
  },
  hard: { hp: 1.5, dmg: 1.4, speed: 0.42, attackers: 1 },
  chariots: { count: 3, passes: 5, gap: 1.5, warn: 1.35, speed: 14, mudSpeed: 8, dmg: 30, stuck: 4, tip: '<b>Chariots of iron!</b> Iron turns the sword. Watch for the <b>red lane</b> and get out of it, or <b>dodge</b>.' },
  tent: { x: -17, z: -13 },
  rearguard: [['phil', -10, -10], ['phil', 6, -12], ['captain', -4, -15], ['archer', 12, -16], ['shield', -14, -6], ['phil', 16, -6]],
  jael: {
    who: 'JAEL · THE WIFE OF HEBER',
    verse: '“Then Jael Heber’s wife took a nail of the tent, and took an hammer in her hand, and went softly unto him, and smote the nail into his temples, and fastened it into the ground: for he was fast asleep and weary. So he died.”',
    ref: 'JUDGES 4:21 (KJV)',
    btn: 'CONTINUE'
  },
  end: {
    who: 'JAEL COMES OUT TO MEET BARAK',
    verse: '“And, behold, as Barak pursued Sisera, Jael came out to meet him, and said unto him, Come, and I will shew thee the man whom thou seekest. And when he came into her tent, behold, Sisera lay dead, and the nail was in his temples.”',
    ref: 'JUDGES 4:22 (KJV)',
    btn: 'CONTINUE'
  },
};

export const STORY_L6 = {
  sequences: ['Adino and the eight hundred', 'Eleazar at Pasdammim', 'Shammah in the field of lentiles', 'The well of Bethlehem'],
  waveSeq: [1, 1],
  intro: [
    { shot: 'mighty', sec: 2.0, head: 'David and his mighty men', text: '“These be the names of the mighty men whom David had…”', ref: '2 Samuel 23:8' },
    { shot: 'host', sec: 1.9, head: 'The valley of Rephaim', text: '“…and the troop of the Philistines pitched in the valley of Rephaim.”', ref: '2 Samuel 23:13' },
    { shot: 'garrison', sec: 1.9, head: 'A garrison in Bethlehem', text: '“And David was then in an hold, and the garrison of the Philistines was then in Bethlehem.”', ref: '2 Samuel 23:14' },
  ],
  counsel: {
    who: 'COUNSEL · DAVID AND HIS MIGHTY MEN',
    text: 'David, you are a man of war now, and your three mighty men fight beside you: Adino, Eleazar and Shammah. When one falls, he rises again.',
    verse: '“He teacheth my hands to war, so that a bow of steel is broken by mine arms.”',
    ref: 'PSALM 18:34 (KJV)',
    tips: '<b>Sword</b> up close, <b>bow</b> at range, <b>dodge</b> their blows. Each mighty man has his own battle: stay with him.',
    btn: 'TO BATTLE'
  },
  men: [{ look: 'adino', name: 'ADINO', dmg: 1.35 }, { look: 'eleazar', name: 'ELEAZAR', dmg: 1.25 }, { look: 'shammah', name: 'SHAMMAH', dmg: 1.25 }],
  hard: { hp: 1.45, dmg: 1.3, speed: 0.4, attackers: 1 },
  horde: { total: 800, hp: 0.5, verse: '“…the same was Adino the Eznite: he lift up his spear against eight hundred, whom he slew at one time.”', ref: '2 SAMUEL 23:8' },
  barley: {
    x: -11, z: -5, r: 6.5, secs: 38, every: 2.4, max: 7,
    start: '“…when they defied the Philistines that were there gathered together to battle, and the men of Israel were gone away:”', startRef: '2 SAMUEL 23:9',
    end: '“He arose, and smote the Philistines until his hand was weary, and his hand clave unto the sword: and the LORD wrought a great victory that day…”', endRef: '2 SAMUEL 23:10'
  },
  lentiles: {
    x: 11, z: -5, r: 6, trample: 3.2,
    groups: [[['phil', 26, -16], ['phil', 28, -10], ['captain', 27, -20]], [['phil', -6, -22], ['phil', 4, -23], ['shield', 0, -24], ['archer', 10, -22]], [['phil', 27, 6], ['phil', 26, 12], ['captain', 26, -2], ['phil', 18, -22], ['shield', 24, -18]]],
    gap: 9,
    start: '“And the Philistines were gathered together into a troop, where was a piece of ground full of lentiles: and the people fled from the Philistines.”', startRef: '2 SAMUEL 23:11',
    end: '“But he stood in the midst of the ground, and defended it, and slew the Philistines: and the LORD wrought a great victory.”', endRef: '2 SAMUEL 23:12'
  },
  well: {
    x: 0, z: -20.5, hold: { x: 0, z: 13 }, draw: 1.6,
    lines: [['phil', -5, -2], ['phil', 4, -3], ['shield', 0, -6], ['phil', 9, -10], ['captain', 0, -12], ['archer', -14, -15], ['archer', 14, -15], ['shield', -4, -16], ['shield', 5, -16], ['phil', -2, -19]],
    pursuers: [['phil', -20, -18], ['phil', 20, -18], ['captain', 0, -24], ['phil', -24, -4], ['phil', 24, -2]],
    longed: {
      who: 'DAVID IN THE HOLD',
      verse: '“And David longed, and said, Oh that one would give me drink of the water of the well of Bethlehem, which is by the gate!”',
      ref: '2 SAMUEL 23:15',
      tips: 'You are now <b>the three</b>: Adino leads, Eleazar and Shammah fight beside him. <b>Break through</b> the host to the well by the gate, draw water, and bring it back to David.',
      btn: 'BREAK THROUGH'
    },
    drawn: '“And the three mighty men brake through the host of the Philistines, and drew water out of the well of Bethlehem, that was by the gate…”', drawnRef: '2 SAMUEL 23:16',
    poured: {
      who: 'DAVID POURS IT OUT UNTO THE LORD',
      verse: '“…and took it, and brought it to David: nevertheless he would not drink thereof, but poured it out unto the LORD.”',
      ref: '2 SAMUEL 23:16 (KJV)',
      btn: 'CONTINUE'
    },
    blood: {
      who: 'DAVID',
      verse: '“And he said, Be it far from me, O LORD, that I should do this: is not this the blood of the men that went in jeopardy of their lives? therefore he would not drink it. These things did these three mighty men.”',
      ref: '2 SAMUEL 23:17 (KJV)',
      btn: 'AMEN'
    }
  },
};

export const STORY_L7 = {
  sequences: ['The Ark and the Seven Priests', 'The Seven Circuits', 'The Shofar Blast', 'The Wall Falls Flat', 'Breach the Citadel'],
  waveSeq: [1, 2, 2],
  intro: [
    { shot: 'host', sec: 2.2, head: 'Captain of the LORD’s host', text: '“…as captain of the host of the LORD am I now come. And Joshua fell on his face to the earth, and did worship…”', ref: 'Joshua 5:14' },
    { shot: 'shutup', sec: 2.0, look: 'dark', head: 'Jericho straitly shut up', text: '“Now Jericho was straitly shut up because of the children of Israel: none went out, and none came in.”', ref: 'Joshua 6:1' },
    { shot: 'compass', sec: 2.2, head: 'The seven trumpets of rams’ horns', text: '“And seven priests shall bear before the ark seven trumpets of rams’ horns… and when ye hear the sound of the trumpet, all the people shall shout with a great shout…”', ref: 'Joshua 6:4–5' },
  ],
  counsel: {
    who: 'JOSHUA · CAPTAIN OF ISRAEL',
    text: 'Stand with the priests and the Ark of the Covenant. Guard the circuit around the great walls of Jericho. When the seventh circuit is accomplished and the ram’s horn sounds, shout: the walls shall fall down flat!',
    verse: '“Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.”',
    ref: 'JOSHUA 1:9 (KJV)',
    tips: '<b>Sword</b> up close. <b>Bow</b> at range. <b>Dodge</b> the sortie thrusts. Guard the <b>Ark</b> and when the <b>long trumpet blasts</b>, strike at the breached citadel!',
    btn: 'MARCH ON JERICHO'
  },
  hard: { hp: 1.55, dmg: 1.45, speed: 0.42, attackers: 2 },
  march: {
    circuitsNeeded: 7,
    circuitRadius: 18,
    canterSpeed: 3.2,
    sortieWaves: [
      [['phil', -12, -18], ['shield', -15, -16], ['archer', -18, -22]],
      [['phil', 16, -16], ['captain', 18, -12], ['shield', 14, -20]],
      [['captain', 0, -25], ['shield', -5, -24], ['archer', 8, -26], ['phil', -10, -22]]
    ]
  },
  wall: {
    x: 0, z: -32, width: 44, height: 14, depth: 5,
    collapseDuration: 3.2,
    dustColor: 0xd9b382,
    debrisPuffs: 36
  },
  shofar: {
    soundDuration: 3.5,
    flashIntensity: 1.8,
    quakeShake: 2.4
  },
  citadel: {
    garrison: [
      ['captain', -6, -38], ['captain', 6, -38], ['shield', -12, -42],
      ['shield', 12, -42], ['archer', -16, -45], ['archer', 16, -45],
      ['phil', -4, -44], ['phil', 4, -44]
    ],
    king: { hp: 1450, dmg: 34, speed: 3.3, scale: 1.6, name: 'KING OF JERICHO' }
  },
  end: {
    who: 'THE WALL FELL DOWN FLAT',
    verse: '“So the people shouted when the priests blew with the trumpets: and it came to pass, when the people heard the sound of the trumpet, and the people shouted with a great shout, that the wall fell down flat, so that the people went up into the city, every man straight before him, and they took the city.”',
    ref: 'JOSHUA 6:20 (KJV)',
    btn: 'AMEN'
  }
};


export const STORY_L8 = {
  sequences: ['The Three Companies', 'The Infiltration of Moreh', 'The Pitchers Shatter', 'Panic in the Midianite Host', 'The Chase to Beth-shittah'],
  waveSeq: [1, 2, 2],
  intro: [
    { shot: 'multitude', sec: 2.2, head: 'The Midianites as Grasshoppers', text: '“And the Midianites and the Amalekites and all the children of the east lay along in the valley like grasshoppers for multitude; and their camels were without number...”', ref: 'Judges 7:12' },
    { shot: 'three_hundred', sec: 2.0, head: 'The Three Hundred', text: '“And the LORD said unto Gideon, By the three hundred men that lapped will I save you, and deliver the Midianites into thine hand...”', ref: 'Judges 7:7' },
    { shot: 'pitchers', sec: 2.2, head: 'Pitchers, Lamps, and Trumpets', text: '“And he divided the three hundred men into three companies, and he put a trumpet in every man’s hand, with empty pitchers, and lamps within the pitchers.”', ref: 'Judges 7:16' },
  ],
  counsel: {
    who: 'THE ANGEL OF THE LORD · TO GIDEON',
    text: 'The LORD is with thee, thou mighty man of valour. Divide the three hundred into three companies around the camp. Move silently through the shadows. When you reach the camp outskirts, break the earthen pitchers, hold high the torches, and sound the trumpets with a great shout!',
    verse: '“The sword of the LORD, and of Gideon.”',
    ref: 'JUDGES 7:20 (KJV)',
    tips: 'Move through the dark perimeter. Avoid patrol sight cones. When in position, <b>shatter your pitcher</b> to blaze the torches: the panic-stricken host will turn their swords against one another!',
    btn: 'DOWN TO THE HOST'
  },
  hard: { hp: 1.55, dmg: 1.45, speed: 0.42, attackers: 2 },
  stealth: {
    sightCone: 0.8,
    spotRadius: 10,
    crouchDodgeBonus: 0.5
  },
  raid: {
    torchLightRadius: 22,
    pitcherBreakFlash: 1.9,
    confuseDuration: 6.5,
    friendlyFire: true
  },
  kings: {
    zebah: { hp: 980, dmg: 28, scale: 1.25, name: 'ZEBAH · KING OF MIDIAN' },
    zalmunna: { hp: 980, dmg: 28, scale: 1.25, name: 'ZALMUNNA · KING OF MIDIAN' }
  },
  end: {
    who: 'THE SWORD OF THE LORD AND OF GIDEON',
    verse: '“And the three hundred blew the trumpets, and the LORD set every man’s sword against his fellow, even throughout all the host: and the host fled to Beth-shittah in Zererath, and to the border of Abel-meholah, unto Tabbath.”',
    ref: 'JUDGES 7:22 (KJV)',
    btn: 'AMEN'
  }
};


export const STORY_L9 = {
  name: 'Daniel',
  place: 'Babylon · The Lions\' Den',
  sequences: ['The King\'s Decree', 'Cast into the Den', 'The Angel of the LORD'],
  waveSeq: [1, 1, 2],
  intro: [
    { shot: 'decree', sec: 2.5, head: 'The King’s Decree', text: '“All the presidents of the kingdom…have consulted together to establish a royal statute…that whosoever shall ask a petition of any God or man for thirty days, save of thee, O king, he shall be cast into the den of lions.”', ref: 'Daniel 6:7' },
    { shot: 'pray', sec: 2.5, head: 'Daniel Prays', text: '“Now when Daniel knew that the writing was signed, he went into his house; and his windows being open in his chamber toward Jerusalem, he kneeled upon his knees three times a day, and prayed, and gave thanks before his God, as he did aforetime.”', ref: 'Daniel 6:10' },
    { shot: 'den', sec: 2.5, look: 'dark', head: 'Cast into the Den', text: '“Then the king commanded, and they brought Daniel, and cast him into the den of lions. Now the king spake and said unto Daniel, Thy God whom thou servest continually, he will deliver thee.”', ref: 'Daniel 6:16' },
  ],
  counsel: {
    who: 'DANIEL · PROPHET OF GOD',
    text: 'I am cast into this pit for making petition to the living God. I bear neither sword nor spear — the battle is not mine. Keep your footing, dodge their leaps, and call upon the name of the LORD in prayer until He sends His angel to shut their mouths.',
    verse: '“My God hath sent his angel, and hath shut the lions’ mouths, that they have not hurt me…”',
    ref: 'DANIEL 6:22 (KJV)',
    tips: 'Daniel carries no weapons. <b>Dodge</b> the lions’ charges. Successful dodges fill your <b>Spirit</b>. When Spirit is ready, activate it to kneel in <b>Prayer</b> — a divine light will repel all beasts and heal you. <b>Survive</b> until dawn!',
    btn: 'ENTER THE PIT'
  },
  end: {
    who: 'DELIVERED AT DAWN',
    text: '“My God hath sent his angel, and hath shut the lions’ mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt.”',
    verse: '“My God hath sent his angel, and hath shut the lions’ mouths…”',
    ref: 'DANIEL 6:22 (KJV)',
    btn: 'AMEN'
  },
};
export const STORY_L10 = {
  name: 'Elijah',
  place: 'Mount Carmel · Fire from Heaven',
  sequences: ['The Contest on Carmel', 'The Altar & The Trench', 'The Fire of Heaven', 'The Chariot of Ahab'],
  waveSeq: [1, 1, 2, 3],
  intro: [
    { shot: 'challenge', sec: 2.5, head: 'The Contest on Carmel', text: '“How long halt ye between two opinions? if the LORD be God, follow him: but if Baal, then follow him.”', ref: '1 Kings 18:21' },
    { shot: 'cry_baal', sec: 2.5, look: 'dark', head: 'The Cry of the False Prophets', text: '“And they cried aloud, and cut themselves after their manner with knives and lancets, till the blood gushed out upon them… but there was neither voice, nor any to answer…”', ref: '1 Kings 18:28–29' },
    { shot: 'twelve_stones', sec: 2.5, head: 'The Altar of Twelve Stones', text: '“And Elijah took twelve stones, according to the number of the tribes of the sons of Jacob… and with the stones he built an altar in the name of the LORD…”', ref: '1 Kings 18:31–32' },
  ],
  counsel: {
    who: 'ELIJAH THE TISHBITE',
    text: 'Four hundred and fifty prophets of Baal have cried aloud since dawn, leaping on their cold stones, but no voice answered. Come near unto me: we will rebuild the altar of the LORD with twelve stones of Israel, dig the deep trench, and drench the wood with four barrels of water. When you call upon His holy name, the God that answereth by fire—He is God!',
    verse: '“Hear me, O LORD, hear me, that this people may know that thou art the LORD God, and that thou hast turned their heart back again.”',
    ref: '1 KINGS 18:37 (KJV)',
    tips: 'Defend the sacred altar against Baal’s militant zealots. Drench the wood from the water barrels. When ready, unleash the <b>Fire of Heaven</b> Spirit ability to consume the offering! Then run with supernatural speed before Ahab’s royal chariot in the gathering storm.',
    btn: 'CONFRONT BAAL'
  },
  end: {
    who: 'THE LORD, HE IS THE GOD',
    text: '“Then the fire of the LORD fell, and consumed the burnt sacrifice, and the wood, and the stones, and the dust, and licked up the water that was in the trench. And when all the people saw it, they fell on their faces: and they said, The LORD, he is the God; the LORD, he is the God.”',
    verse: '“The LORD, he is the God; the LORD, he is the God.”',
    ref: '1 KINGS 18:39 (KJV)',
    btn: 'AMEN'
  },
};

export const STORY_L12 = {
  name: 'Jonah',
  place: 'Belly of the Great Fish · Intestinal Tract',
  sequences: ['The Belly of the Fish', 'Descent through the Intestine', 'The Lower Sanctuary', 'Salvation of the LORD'],
  waveSeq: [1, 1, 2, 3],
  intro: [
    { shot: 'swallowed', sec: 2.5, head: 'In the Belly of the Great Fish', text: '“Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.”', ref: 'Jonah 1:17' },
    { shot: 'depths', sec: 2.5, look: 'dark', head: 'The Weeds Wrapped About My Head', text: '“The waters compassed me about, even to the soul: the depth closed me round about, the weeds were wrapped about my head. I went down to the bottoms of the mountains…”', ref: 'Jonah 2:5–6' },
    { shot: 'fishes_stalk', sec: 2.5, head: 'The Swarms of the Gullet Stalk', text: '“Out of the belly of hell cried I, and thou heardest my voice…”', ref: 'Jonah 2:2' },
  ],
  counsel: {
    who: 'JONAH · PROPHET IN THE DEEP',
    text: 'I fled from the presence of the LORD, and the tempest cast me into the deep. Now I am swallowed alive inside this great leviathan! The gullet swarms with ravenous, flesh-eating fishes that want to tear me apart. We must fight our way down the long intestinal tract until we reach the bottom sanctuary where the predators cannot follow!',
    verse: '“I cried by reason of mine affliction unto the LORD, and he heard me; out of the belly of hell cried I, and thou heardest my voice.”',
    ref: 'JONAH 2:2 (KJV)',
    tips: 'Strike the swarming carnivores with your bone blade. Keep advancing south down the intestinal corridor. Activate the <b>Cry from the Deep</b> Spirit power to unleash a holy shockwave that repels and dissolves swarms. Reach the peaceful lower chamber to be delivered!',
    btn: 'ENTER THE GULLET'
  },
  end: {
    who: 'SALVATION IS OF THE LORD',
    text: '“I will sacrifice unto thee with the voice of thanksgiving; I will pay that that I have vowed. Salvation is of the LORD. And the LORD spake unto the fish, and it vomited out Jonah upon the dry land.”',
    verse: '“Salvation is of the LORD.”',
    ref: 'JONAH 2:9–10 (KJV)',
    btn: 'AMEN'
  },
};

export const STORY_L11 = {
  name: 'Hezekiah',
  place: 'Jerusalem · The Walls & The Upper Pool',
  sequences: ['The Assyrian Host Arrives', 'Defend the Upper Pool', 'The Letter Spread in the Temple', 'The 185,000 Slain'],
  waveSeq: [1, 1, 2, 3],
  intro: [
    { shot: 'siege_host', sec: 2.5, head: 'The Assyrian Host Surrounds Jerusalem', text: '“Now in the fourteenth year of king Hezekiah did Sennacherib king of Assyria come up against all the fenced cities of Judah… and sent a great host against Jerusalem.”', ref: '2 Kings 18:13, 17' },
    { shot: 'rabshakeh_defy', sec: 2.5, look: 'dark', head: 'Rabshakeh at the Conduit', text: '“Hear the word of the great king, the king of Assyria… Neither let Hezekiah make you trust in the LORD, saying, The LORD will surely deliver us, and this city shall not be delivered into the hand of the king of Assyria.”', ref: '2 Kings 18:28–30' },
    { shot: 'letter_spread', sec: 2.5, head: 'Hezekiah Spreads the Letter', text: '“And Hezekiah went up into the house of the LORD, and spread it before the LORD… and Isaiah said, Thus saith the LORD, I will defend this city to save it, for mine own sake, and for my servant David’s sake.”', ref: '2 Kings 19:14, 34' },
  ],
  counsel: {
    who: 'KING HEZEKIAH & ISAIAH',
    text: 'Sennacherib’s siege army encamps before our walls, and Rabshakeh blasphemes the living God from the fuller’s field! Stand with the royal guard of Judah. Defend the aqueduct and the gate against their battering rams and archers. The prophet Isaiah has delivered the word: God will defend Jerusalem for His own sake. Hold the wall until the Angel of the LORD descends!',
    verse: '“I will defend this city, to save it, for mine own sake, and for my servant David’s sake.”',
    ref: '2 KINGS 19:34 (KJV)',
    tips: 'Command your royal guard to hold the gate. Use <b>Sword</b> and <b>Bow</b> to repel the armored Assyrian vanguard. When surrounded, unleash the <b>Zeal of the LORD</b> Spirit ability to call down angelic wrath. Stand fast until deliverance comes at midnight!',
    btn: 'DEFEND JERUSALEM'
  },
  end: {
    who: 'THE ANGEL OF THE LORD',
    text: '“And it came to pass that night, that the angel of the LORD went out, and smote in the camp of the Assyrians an hundred fourscore and five thousand: and when they arose early in the morning, behold, they were all dead corpses.”',
    verse: '“And the angel of the LORD smote in the camp of the Assyrians an hundred fourscore and five thousand.”',
    ref: '2 KINGS 19:35 (KJV)',
    btn: 'AMEN'
  },
};

export const STORY = {
  1: STORY_L1,
  2: STORY_L2,
  3: STORY_L3,
  4: STORY_L4,
  5: STORY_L5,
  6: STORY_L6,
  7: STORY_L7,
  8: STORY_L8,
  9: STORY_L9,
  10: STORY_L10,
  11: STORY_L11,
  12: STORY_L12,
};
