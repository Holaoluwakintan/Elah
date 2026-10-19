# ELAH: Rise of the Shepherd

A 3D Bible combat game that runs in the browser, on phones and on desktop. You play heroes of the Old Testament through six story levels, each with its own cinematic intro, scripture cards (King James Version) and battles.

**Play it live:** https://elah-warrior.vercel.app

It's plain HTML, CSS and JavaScript (ES modules) with [three.js](https://threejs.org) r160 vendored into the repo. There's no build step, no `npm install` and no `node_modules`.

## Levels

Levels are listed in the order they appear on the title screen and unlock:

1. **David: From Elah to Adullam** (1 Samuel 17–22). First the Philistine armies, then Goliath, then the jubilation, then the escape from Saul's soldiers to the cave of Adullam.
2. **Abram rescues Lot** (Genesis 14). A night raid on the camp of the four kings at Dan, freeing the captives, Chedorlaomer, and the chase to Hobah.
3. **Benaiah, a valiant man** (2 Samuel 23:20–21). Moab, the lion in the pit on a snowy day, and the Egyptian.
4. **Deborah and Barak** (Judges 4–5). Mount Tabor, the river Kishon, the chariots of iron, and Jael's tent.
5. **The strength of Samson** (Judges 15–16). Lehi and the jawbone, then the house of Dagon.
6. **David's mighty men** (2 Samuel 23:8–17; 1 Chronicles 11). Pasdammim and the well of Bethlehem.

Progress (which levels are unlocked, spoils and upgrades) is saved in the browser's `localStorage`.

To change the level order, names or story text, edit the block at the top of `js/game.js` (`LEVEL_ORDER`, `STORY_L1`, `STORY_L3` and so on).

## Controls

**Phone / touch:** the joystick on the left moves you. Drag on the right side of the screen to turn the camera. The on-screen buttons are Attack, Sling (or bow, or SPIRIT when the meter is full), Dodge/Roll, and PUSH (hold it between the pillars in Samson's level). Tap to skip a cinematic.

**Keyboard and mouse:**

| Action | Keys |
|---|---|
| Move | W A S D or the arrow keys |
| Turn camera | Q / E, or drag with the mouse |
| Attack | J, Enter, or left-click |
| Sling / bow / SPIRIT | K, F, C, or right-click |
| Dodge / roll | Space, L, or Left Shift |
| Push (Samson) | hold R |
| Sprint (escape sequence) | hold Shift or J |
| Hide (escape sequence) | K or C |
| Pause | P or Esc |
| Skip cinematic | Space, Enter or Esc |

## Run it locally

It needs any static file server, because ES modules don't load from `file://`.

```bash
python3 -m http.server 8791
# then open http://localhost:8791
```

`npx serve .` works too.

These URL flags are useful while testing:

- `?q=low`: lower quality (pixel ratio 1, no shadows, no bloom), for weak phones
- `?nobloom`, `?nomusic`, `?noadapt`
- `?l=N` or `?l=david|abram|benaiah|deborah|samson|mighty`: open a level directly
- `?bot`: autoplay, used for automated testing

## Deploy to Vercel

The repo root is the website, so there's nothing to build.

1. On vercel.com: **Add New → Project → Import** this repo.
2. Set Framework Preset to **Other**. Leave the Build Command empty and set the Output Directory to `.` (the root).
3. Deploy.

Or use the CLI from the repo folder: `npx vercel --prod`.

`vercel.json` only adds cache headers for `assets/` and `vendor/`.

## Project layout

```
index.html            page, HUD and touch controls
style.css             all styling
js/game.js            the whole game: levels, story, characters, AI, music, effects
assets/hero2.glb      character bodies and animations (Quaternius, CC0)
vendor/               three.js r160 and the addons it uses (MIT)
credits.html          in-game credits page
manifest.webmanifest  PWA manifest
icon.svg, og.jpg      icon and share image
```

## Credits

See [CREDITS.md](CREDITS.md). Every third-party asset is CC0 or MIT. Everything else (costumes, weapons, worlds, sound and music) is made in code for this game.


## Premium pass v1 (2026-10-19, "ELAH WARRIOR")
- Graphics quality: SETTINGS in localStorage 'elah-settings' {q: auto|low|med|high, music, sfx, vib, auto}. detectQuality() guesses from the GPU name, memory and cores (swiftshader/Mali-G52/Adreno 5xx → low; most phones → med; Adreno 7xx/Mali-G7xx/Apple with ≥6 GB → high; desktops → high). ?q=low|med|high overrides. QP table: low = DPR 1, no shadow map, no post (CSS vignette); med = DPR 1.25, 1024 PCF shadows, grade pass; high = DPR 1.75, 2048 PCFSoft, bloom + grade, 4x MSAA target. The fps watch (ADAPT) drops bloom → DPR → shadows → post. ?nopost, ?nobloom.
- GradeShader (one ShaderPass, replaces OutputPass): ACES + sRGB, split-tone (GRADE per world), contrast, saturation, vignette, grain, flash (G.flashV). setGrade(name) runs from setEnv.
- Sky: FBM cumulus in skyMat (uTime, uCloud per world; 5 octaves on med/high, 3 on low).
- Characters: RIM uniform (rim light from the world's sun, moonlight at night) in paintMat (paint-v4) and hairMat (hair-rim). Contact-shadow blob under every Actor (blobGeo/blobMat).
- FX: buildSparks/sparks/updateSparks (one Points draw); flashAt() of size ≥0.6 throws sparks; ≥1.4 a screen flash. Combo counter (comboHit, #combo). vibrate() on hurt and heavy hit-stop (settings toggle).
- Audio: recorded CC0 score streamed per level (audio/music_menu.mp3, music_l1..l6.mp3 by run number) through TRACK/trackTick (cross-fade, louder in fights, synth score is the fallback, ?nosong disables). Kenney CC0 samples audio/sfx_*.mp3 via smp(kind) layered in SFX.hit/clang/coin/thud. AU.master = sound volume, AU.musicOut = music volume. See CREDITS.md.
- UI: loading screen with a KJV tip (TIPS), main menu #menu (logo, PLAY = continue, LEVELS, SETTINGS, credits, reset), level select #title with art cards (assets/art/l<run>.jpg, rendered from the game), settings #settings (graphics, music, sound, vibration; quality change = restart), pause has SETTINGS and MAIN MENU. ?l=N or ?bot skips the menu.
- Fixes: pit walls (rockWallGeo, smooth rock with strata and snow ledges, also in the pit intro), Egyptian intro camera, credits.html (6 levels, music and sound credits).
- QA tools (kept outside this repo): capture.js <base> <out> phone|desktop [levels] (EXTRA='&q=med', NOMENU=1), win.js <base> <displayLevel> <limitSec>, audiotest.js <base>, clip.js <base> <outdir>, artgen.js, smoke.js.
- Rollback: site-backup-pre-premium/ (local copy) and deployment dpl_5nNxjg5Xf2d54s2f8EHNUMnSp5AE (prod before this pass).


## Premium pass v2 (2026-10-19, phase 2)
- Faces (no new files): setupFaceRig/faceMat/faceSetup/faceUpdate in js/game.js. Per-vertex deltas run before skinning on the Quaternius head (aBind + aJaw attributes, uB2L): FACES table gives each look its own jaw, brow, cheek and nose shape; BUILD makes young David and the women slighter. Expressions (uExpr = jaw, brow, wide, smile; uLid = upper, lower lid painted in the fragment shader): blink timer, anger in attack states/clips, pain on hit/flash, eyes shut when dead, jaw flap on Idle_Talking_Loop. Dev: actor._fx = [jaw, brow, wide, smile, lidU, lidL] overrides.
- Headgear per army: armyOf(look) + headgear() (vertex-coloured, HG_MAT). Philistine feathered crown, Moabite pointed bronze helmet, Canaanite iron helmet with neck guard, Israelite leather helmet with cheek pieces, Elamite felt cap with fillet, Goliath plumed bronze helmet. scaleMat bronze scale armour (armourKit(look)). Egyptian striped nemes and banded collar (stripeTex).
- Finisher: finisher(target, boss) on boss kill and on the last enemy of a wave (not L6): 0.75–1.0 s slow motion (G.slow), orbiting camera (finisherCam), white flash, shake, vibrate. Tap, Esc, Space or Enter skips. No blood.
- Narrator: Settings › Narrator (SETTINGS.narr). Plays audio/narration/<id>.mp3 for each story card when the id is listed in audio/narration/manifest.json (files: []). No voices ship and no AI voices. Script with ids: audio/narration/narrator_script.txt; __elah.narrScript() prints the same list in the browser.
- Draw calls: mergeGear(actor) merges rigid gear on bones into skinned meshes per material bucket (?nomerge disables); all fires are two batched billboard meshes (updateFires). Medium, mid-fight: L2 ~325 -> ~258 before the fire batch, L6 ~290-360 -> ~250-290.
- Rollback: site-backup-pre-phase2/ (local) and deployment dpl_4i7QBBfvETWS4WwnVZrzRM1oaRFY.
