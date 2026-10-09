/* Makes the small copies of the website photos (run by hand, not part of the deploy).
 *
 *   One time:   cd <any scratch folder> && npm init -y && npm i sharp
 *   Each time:  node "F:/Portfolio/Nile Bites/tools/make-images.js"   (needs sharp installed next to where you run it,
 *               or set NODE_PATH to that folder's node_modules)
 *
 * It reads the originals and writes WebP copies next to them:
 *   assets/img/menu-real/<name>.(webp|jpg)  ->  assets/img/menu-real/w/<name>-<width>.webp   (120, 240, 480, 800 px wide)
 *   assets/img/brand/logo-header.png        ->  assets/img/brand/w/logo-header-<width>.webp  (320, 480, 640)
 *   assets/img/brand/mark.png               ->  assets/img/brand/w/mark-<width>.webp         (96, 192)
 *   assets/img/catering-hero.jpg            ->  assets/img/w/catering-hero-<width>.webp      (480, 800, 1200)
 * main.js (imgAttrs) builds the srcset from these names. Change a dish photo? Run this again.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..", "assets", "img");

async function make(src, outDir, name, widths, opts) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const w of widths) {
    const out = path.join(outDir, name + "-" + w + ".webp");
    await sharp(src).resize({ width: w, withoutEnlargement: true }).webp(opts).toFile(out);
    console.log(path.relative(root, out), Math.round(fs.statSync(out).size / 1024) + " KB");
  }
}

(async () => {
  const dir = path.join(root, "menu-real");
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(webp|jpg)$/i.test(f)) continue;
    await make(path.join(dir, f), path.join(dir, "w"), f.replace(/\.(webp|jpg)$/i, ""), [120, 240, 480, 800], { quality: 74, effort: 5 });
  }
  const brand = path.join(root, "brand");
  await make(path.join(brand, "logo-header.png"), path.join(brand, "w"), "logo-header", [320, 480, 640], { quality: 88, effort: 5, alphaQuality: 92 });
  await make(path.join(root, "catering-hero.jpg"), path.join(root, "w"), "catering-hero", [480, 800, 1200], { quality: 74, effort: 5 });
  await make(path.join(brand, "mark.png"), path.join(brand, "w"), "mark", [96, 192], { quality: 88, effort: 5, alphaQuality: 92 });
})();
