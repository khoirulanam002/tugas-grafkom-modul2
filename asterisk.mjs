/* Lab 2 poin 5 -- uji kesadaran-oktan: asterisk 24 jari-jari (garis tiap 15 derajat).
 *   node asterisk.mjs            -> tabel + out/asterisk.ppm                             */
import { Framebuffer, lineBresenham } from "./raster.mjs";
import { mkdirSync } from "node:fs";

export function asterisk(cx = 50, cy = 50, R = 45, spokes = 24) {
  const out = [];
  for (let k = 0; k < spokes; k++) {
    const a = ((k * 360) / spokes) * Math.PI / 180;
    const end = [Math.round(cx + R * Math.cos(a)), Math.round(cy - R * Math.sin(a))];
    out.push({ deg: (k * 360) / spokes, end, pixels: lineBresenham(cx, cy, end[0], end[1]) });
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("asterisk.mjs")) {
  const fb = new Framebuffer(101, 101);
  const sp = asterisk();
  for (const s of sp) for (const [x, y] of s.pixels) fb.set(x, y, [255, 255, 255]);
  mkdirSync("out", { recursive: true });
  fb.writePPM("out/asterisk.ppm");
  console.log("deg  ujung     pixel  panjang-euclid (target 45 +-1)");
  for (const s of sp)
    console.log(`${String(s.deg).padStart(3)}  (${s.end[0]},${s.end[1]})`.padEnd(15) +
      `${String(s.pixels.length).padStart(5)}   ${Math.hypot(s.end[0] - 50, s.end[1] - 50).toFixed(2)}`);
  console.log("wrote out/asterisk.ppm");
}
