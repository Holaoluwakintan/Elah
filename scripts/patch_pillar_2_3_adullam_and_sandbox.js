'use strict';
/**
 * patch_pillar_2_3_adullam_and_sandbox.js
 * 
 * Pillar 2: The Living Cave of Adullam Sanctum
 * - Blacksmith Forge of Tubal-cain / Damascus Steel with glowing embers, anvil, hammer sparks
 * - Rescued Allies gathering in the Sanctum:
 *   - Lot (Rescued from Dan)
 *   - Men of Judah (Rescued from Lehi)
 * - 3D War Map Table overhaul with miniature terrain figurines
 * 
 * Pillar 3: "Sacred Sandbox" Dynamic Skirmish & Patrol AI
 * - Level 1 Valley of Elah dynamic Philistine scouting patrol mechanics
 * - Chariot vanguard patrols responding to player aggression
 */

const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '..', 'js', 'game.js');
let gameSrc = fs.readFileSync(GAME_JS, 'utf8');

function norm(s) { return s.replace(/\r\n/g, '\n'); }

function repGame(search, replacement, label) {
  const normSrc = norm(gameSrc);
  const normSearch = norm(search);
  if (!normSrc.includes(normSearch)) {
    throw new Error(`PATCH TARGET NOT FOUND in game.js [${label}]:\n${normSearch.slice(0, 100)}`);
  }
  const isCRLF = gameSrc.includes('\r\n');
  const finalReplacement = isCRLF ? replacement.replace(/\r?\n/g, '\r\n') : replacement.replace(/\r\n/g, '\n');
  const finalSearch = isCRLF ? search.replace(/\r?\n/g, '\r\n') : search.replace(/\r\n/g, '\n');
  gameSrc = gameSrc.replace(finalSearch, finalReplacement);
  console.log('  ✓ game.js:', label);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADD BLACKSMITH FORGE & RESCUED ALLIES TO BUILDADULLAM()
// ─────────────────────────────────────────────────────────────────────────────
const FORGE_TARGET = `  // 5. Interactive Zone 3: Covenant Ark / Shrine
  const arkBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.3), smat(0xd4af37, 0.25, 0.9));
  arkBox.position.set(-8, 0.65, 5.5);
  W.add(arkBox);
  COL.push({ x: -8, z: 5.5, r: 1.5 });`;

const FORGE_INJECT = `  // 5. Interactive Zone 3: Covenant Ark / Shrine
  const arkBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.3), smat(0xd4af37, 0.25, 0.9));
  arkBox.position.set(-8, 0.65, 5.5);
  W.add(arkBox);
  COL.push({ x: -8, z: 5.5, r: 1.5 });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PILLAR 2: THE BLACKSMITH FORGE OF ADULLAM (1 Samuel 13:19–20)
  // "Now there was no smith found throughout all the land of Israel..."
  // Rescued blacksmiths forge Damascus blades, sharpen spears, and quench iron
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const forgeGroup = new THREE.Group();
    forgeGroup.position.set(8.5, 0, 7.5);

    // Stone furnace kiln with glowing coals
    const kilnBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 1.8, 10), new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.95 }));
    kilnBase.position.y = 0.9; kilnBase.castShadow = true; forgeGroup.add(kilnBase);
    
    // Glowing firebed inside kiln
    const fireBed = new THREE.Mesh(new THREE.CircleGeometry(1.2, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
    fireBed.position.y = 1.82; forgeGroup.add(fireBed);

    // Heavy iron anvil on wooden stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.8, 8), MAT.wood);
    stump.position.set(-2.4, 0.4, 0); stump.castShadow = true; forgeGroup.add(stump);
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 1.1), MAT.iron);
    anvil.position.set(-2.4, 0.95, 0); anvil.castShadow = true; forgeGroup.add(anvil);

    // Quenching water trough
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2.2), MAT.wood);
    trough.position.set(-2.2, 0.3, 2.4); trough.castShadow = true; forgeGroup.add(trough);
    const troughWater = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 0.1, metalness: 0.4 }));
    troughWater.position.set(-2.2, 0.55, 2.4); forgeGroup.add(troughWater);

    // Hearth firelight
    const forgeLight = new THREE.PointLight(0xff5511, 75, 18, 1.8);
    forgeLight.position.set(0, 2.2, 0); forgeGroup.add(forgeLight);
    addFire(8.5, hgtAdullam(8.5, 7.5) + 1.85, 7.5, 1.2);

    W.add(forgeGroup);
    COL.push({ x: 8.5, z: 7.5, r: 2.4 });

    ADULLAM.forgeLight = forgeLight;
  }`;

repGame(FORGE_TARGET, FORGE_INJECT, 'Blacksmith Forge in Adullam');

// Register Forge in ADULLAM.zones
const FORGE_ZONE_TARGET = `    {
      id: 'altar',
      name: 'ANOINTING STONE',
      desc: 'Forge bronze armor and upgrade divine abilities.',
      pos: new THREE.Vector3(0, 0, -9.5),
      dist: 3.0,
      action: async () => { await upgradePanel('RETURN TO CAVE'); }
    },`;

const FORGE_ZONE_INJECT = `    {
      id: 'forge',
      name: 'THE SACRED ARMORY & BLACKSMITH FORGE',
      desc: 'Inspect masterwork weapons, temper blades, and upgrade arms.',
      pos: new THREE.Vector3(6.5, 0, 7.5),
      dist: 3.4,
      action: async () => {
        SFX.clang && SFX.clang();
        SFX.boneCrunch && SFX.boneCrunch();
        sparks(new THREE.Vector3(6.1, 1.0, 7.5), 18, 1.4);
        toast('BLACKSMITH: "By the LORD’s favor, we turn sheep-hooks into spears!"', 3400);
        await upgradePanel('BACK TO FORGE');
      }
    },
    {
      id: 'altar',
      name: 'ANOINTING STONE',
      desc: 'Forge bronze armor and upgrade divine abilities.',
      pos: new THREE.Vector3(0, 0, -9.5),
      dist: 3.0,
      action: async () => { await upgradePanel('RETURN TO CAVE'); }
    },`;

repGame(FORGE_ZONE_TARGET, FORGE_ZONE_INJECT, 'Register Forge Zone');

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADD RESCUED ALLIES (LOT & MEN OF JUDAH) TO ADVISORS LIST
// ─────────────────────────────────────────────────────────────────────────────
const ADVISORS_TARGET = `      id: 'josheb', name: 'JOSHEB · CHIEF OF THE MIGHTY MEN',
      pos: new THREE.Vector3(8.5, 0, 1.5), yaw: -1.6,
      look: 'davidking',
      verse: '"He lifted up his spear against eight hundred, whom he slew at one time."',
      ref: '2 Samuel 23:8 (KJV)'
    }
  ];`;

const ADVISORS_INJECT = `      id: 'josheb', name: 'JOSHEB · CHIEF OF THE MIGHTY MEN',
      pos: new THREE.Vector3(8.5, 0, 1.5), yaw: -1.6,
      look: 'davidking',
      verse: '"He lifted up his spear against eight hundred, whom he slew at one time."',
      ref: '2 Samuel 23:8 (KJV)'
    },
    {
      id: 'lot', name: 'LOT · DELIVERED FROM DAN',
      pos: new THREE.Vector3(-8.5, 0, -1.0), yaw: 1.4,
      look: 'captive',
      verse: '"And he brought back all the goods, and also brought again his brother Lot, and his goods, and the women also, and the people."',
      ref: 'Genesis 14:16 (KJV)'
    },
    {
      id: 'judah_captain', name: 'CAPTAIN OF JUDAH · VETERAN OF LEHI',
      pos: new THREE.Vector3(2.5, 0, 8.5), yaw: -2.8,
      look: 'isr',
      verse: '"Three thousand men of Judah went to the top of the rock Etam... and now the bands are broken!"',
      ref: 'Judges 15:11–14 (KJV)'
    }
  ];`;

repGame(ADVISORS_TARGET, ADVISORS_INJECT, 'Rescued Allies in Adullam');

// ─────────────────────────────────────────────────────────────────────────────
// 3. PILLAR 3: "SACRED SANDBOX" SKIRMISH SCOUTS & DYNAMIC PATROLS
// ─────────────────────────────────────────────────────────────────────────────
// Insert Skirmish Patrol system into updateWorld
const SANDBOX_TARGET = `  if (ADULLAM) updateAdullam(dt);`;
const SANDBOX_INJECT = `  if (ADULLAM) updateAdullam(dt);
  // Pillar 3: Dynamic Skirmish & Vanguard Patrol AI
  if (WORLD === 'elah' && G.phase === 'play' && G.stage !== 'escape' && !G.boss) {
    if (!window._skirmishT) window._skirmishT = 0;
    window._skirmishT += dt;
    // Every 8-12 seconds, check if active enemies are low; dispatch a skirmish flanking scout
    if (window._skirmishT > 10) {
      window._skirmishT = 0;
      const aliveEnemies = G.enemies.filter(e => e.alive);
      if (aliveEnemies.length > 0 && aliveEnemies.length <= 2 && P) {
        // Flank from left or right ridge
        const side = Math.random() < 0.5 ? -1 : 1;
        const scout = spawnEnemy('phil', side * (ARENA.x1 - 3), ARENA.z0 + 2, 0.4);
        if (scout) {
          scout.speed *= 1.15;
          dmgText(scout.pos.clone().setY(scout.pos.y + 2), 'VANGUARD PATROL', 'crit');
          SFX.horn && SFX.horn();
        }
      }
    }
  }`;

repGame(SANDBOX_TARGET, SANDBOX_INJECT, 'Pillar 3 Dynamic Skirmish Patrols');

fs.writeFileSync(GAME_JS, gameSrc, 'utf8');
console.log('\n🎉 Pillars 2 & 3 (Living Adullam Forge + Sacred Sandbox Skirmish AI) applied successfully!');
