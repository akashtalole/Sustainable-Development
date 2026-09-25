#!/usr/bin/env node
// MapLibre GL JS ships its tile-processing worker as a separate .mjs file
// that it loads at runtime via a plain string URL, not a static import —
// so Vite can't see and bundle it automatically. Copy it (and the
// "maplibre-gl-shared.mjs" chunk it statically imports as a sibling module)
// into public/ so both are served as normal static assets in dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "node_modules/maplibre-gl/dist");
const destDir = join(root, "public/vendor");
mkdirSync(destDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const src = join(srcDir, file);
  const dest = join(destDir, file);
  copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}
