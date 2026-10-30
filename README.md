# Brick world

A scroll-driven personal site: one persistent LEGO diorama per chapter. Scrolling plays each
chapter's story, then the island breaks away and the next one falls into place brick by brick.

Preview: `python3 -m http.server 8767` in the repo root, then open http://localhost:8767/.
`cast.html` shows all five characters side by side (`?pose=walk&t=1`, `?view=tq`, `?view=closeup`).

## Editing text
All copy lives in `index.html`. Each `<section class="chapter">` is one chapter:

- `data-scene` picks the diorama (`js/scenes/<name>.js`).
- `data-side` puts the text `left`, `right` or `center` (the diorama moves to the other side).
- Research, Projects and Away from the desk use one `.step` per item; add a step to add one.
- Experience: one `<li class="job">` per role. Logos are in `assets/logos/` and are turned white
  with CSS.
- Gallery: the pavilion walls are listed at the top of `js/scenes/museum.js` (`WALLS`, `TITLES`).
  Mosaics are 32×48 grids in `assets/mosaics.json`, made from poster art by
  `local/brickworld-src/tools/mosaic.mjs` (only the small grids ship, not the posters).
  Photos: full image in `assets/photos/`, a ~560px copy in `assets/photos/thumbs/`. The wall shows
  them as mosaics too (add the photo to `mosaic.mjs` and rerun it, then to `WALLS` in `museum.js`);
  `.prints` in `index.html` links the originals, which open full size.
- Countries: edit `data-visited` on the `.worldmap` canvas (ISO alpha-3 codes, home first) and add a
  matching `<button data-country>` to `.regions`. The tile grid is `assets/worldmap.json`
  (Natural Earth, 120×52), built by `local/brickworld-src/tools/worldmap.mjs`.

## Editing scenes
Each file in `js/scenes/` builds one diorama with the brick kit (`js/bricks.js`). Positions are in
studs, heights in plates (a brick is 3 plates).

- `k.brick / plate / tile / slope / round / cone / bar` add single pieces.
- `k.fill` and `k.layer` brick a whole area with real brick sizes and staggered joints.
- `k.prop(object, { order })` adds anything else (characters, printed tiles); `order` 0–1 is when it lands.
- `cams` are camera keys over the chapter (t = 0 → 1); `light` sets the mood.
- Characters move with `Actor` keys (`js/actor.js`): `{ t, at: [x, z], face, pose, via, slide }`.
  Walking between two positions plays a walk cycle locked to distance, so feet don't skate.

## Look
`js/stage.js` adds soft shadows, ambient occlusion, bloom, a tilt-shift band and depth haze on
desktop. `?lite` turns post-processing off; phones and reduced-motion get the plain render.
`kit.overlaps()` in the console lists bricks that share volume (those z-fight and flicker).

## Characters
- LEGO figures (`js/minifig.js`) share one articulated base in `assets/minifig.glb`
  (built in Blender from `local/brickworld-src/minifig-parts.blend`). Prints for Luffy and the classic
  figure are drawn in `js/prints.js`.
- Steve and Gordon (`js/blocky.js`) are built straight from 64×64 skins in `assets/skins/`.

## Credits
- Minifigure parts: "LEGO Minifigure (Animated)" by BentheCreator, CC BY 4.0 (Sketchfab).
- Batman cowl, cape and prints: "Lego Batman Minifigure" by Neut2000, CC BY 4.0 (Sketchfab).
- Gordon Freeman skin: SkinsMC #257261. Steve: the default Minecraft skin.
- Luffy's hair, hat and prints, all scenes and animation: original to this site.
