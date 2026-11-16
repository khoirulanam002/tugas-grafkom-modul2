/* REVISI -- salin berkas yang dibutuhkan halaman ke web/ (jalankan setelah `npm install`):
 *   node sync_web.mjs
 * GitHub Pages hanya melayani isi web/, jadi three (lokal) dan denah ikut disalin. */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
mkdirSync("web/vendor", { recursive: true });
for (const [src, dst] of [
  ["node_modules/three/build/three.module.js", "web/vendor/three.module.js"],
  ["node_modules/three/build/three.core.js", "web/vendor/three.core.js"],
  ["myplan.json", "web/myplan.json"],
]) {
  if (!existsSync(src)) { console.log(`LEWATI ${src} (belum ada; jalankan npm install)`); continue; }
  copyFileSync(src, dst); console.log(`${src} -> ${dst}`);
}
