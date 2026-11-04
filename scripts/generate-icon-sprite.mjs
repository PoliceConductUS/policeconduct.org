// Emits public/icons.svg — a single cached SVG sprite built from the shared
// icon registry (src/lib/icons.ts). Components reference its symbols via
// <use href="/icons.svg#<id>"> so glyph markup is stored once instead of being
// duplicated into every statically rendered page.
//
// Runs in the build pipeline (see package.json `build`) so the committed
// sprite can never drift from the registry. Safe to run standalone after
// editing icons: `node scripts/generate-icon-sprite.mjs`.

import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const { icons } = await import(
  new URL("../src/lib/icons.ts", import.meta.url).href
);

const symbols = Object.entries(icons)
  .map(
    ([id, { viewBox, inner }]) =>
      `<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`,
  )
  .join("");

// aria-hidden + role=none: this file is only ever pulled in by <use>; if a
// human opens /icons.svg directly it is a blank, inert canvas.
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" role="none">${symbols}</svg>\n`;

const outputPath = path.join(repoRoot, "public", "icons.svg");
await writeFile(outputPath, sprite, "utf8");

console.log(
  `Wrote ${outputPath} (${Object.keys(icons).length} symbols, ${sprite.length} bytes).`,
);
