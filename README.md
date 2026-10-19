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
