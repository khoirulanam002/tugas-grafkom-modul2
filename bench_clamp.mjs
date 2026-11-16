/* Lab 2 poin 4 (perbaikan pitfall 13.5): clamp bounding box -- segitiga kecil di framebuffer besar.
 *   node bench_clamp.mjs                                                                  */
import { Framebuffer, triangle } from "./raster.mjs";

const W = 2000, H = 2000, REP = 5;
const fb = new Framebuffer(W, H);
const A = [100, 100], B = [120, 105], C = [105, 125];          // segitiga kecil ~20 px
const ms = (clamp) => {
  const t0 = performance.now();
  for (let i = 0; i < REP; i++) triangle(fb, A, B, C, [255, 255, 255], { clamp });
  return (performance.now() - t0) / REP;
};
ms(true); ms(false);                                            // pemanasan
const tClamp = ms(true), tFull = ms(false);
console.log(`framebuffer ${W}x${H}, segitiga kecil (rata-rata ${REP} kali)`);
console.log(`tanpa clamp (loop seluruh fb) : ${tFull.toFixed(2)} ms`);
console.log(`dengan clamp bounding box     : ${tClamp.toFixed(3)} ms`);
console.log(`percepatan                    : ${(tFull / tClamp).toFixed(0)}x`);
