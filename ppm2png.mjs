/* ppm2png.mjs -- ubah .ppm jadi .png (diperbesar, nearest-neighbor) agar bisa dilihat di VS Code.
 *   node ppm2png.mjs                      -> semua .ppm di out/ dan ref/
 *   node ppm2png.mjs out/x.ppm --scale 30                                                 */
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";
import { Framebuffer } from "./raster.mjs";

const T = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export function encodePNG(fb, s = 1) {
  const W = fb.w * s, H = fb.h * s, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (Math.floor(y / s) * fb.w + Math.floor(x / s)) * 3, o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = fb.data[i]; raw[o + 1] = fb.data[i + 1]; raw[o + 2] = fb.data[i + 2];
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
if (process.argv[1] && process.argv[1].endsWith("ppm2png.mjs")) {
  const a = process.argv.slice(2), si = a.indexOf("--scale"), us = si >= 0 ? +a[si + 1] : null;
  let files = a.filter((x, i) => x.endsWith(".ppm") && i !== si + 1);
  if (!files.length) for (const d of ["out", "ref"]) if (existsSync(d)) files.push(...readdirSync(d).filter((f) => f.endsWith(".ppm")).map((f) => join(d, f)));
  for (const f of files) {
    const fb = Framebuffer.readPPM(f), s = us || Math.max(1, Math.floor(480 / Math.max(fb.w, fb.h)));
    writeFileSync(f.replace(/\.ppm$/i, ".png"), encodePNG(fb, s));
    console.log(`${f} (${fb.w}x${fb.h}) -> ${f.replace(/\.ppm$/i, ".png")} (${s}x)`);
  }
}
