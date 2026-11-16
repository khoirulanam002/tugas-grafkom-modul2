/* TEMUAN Lab 2/3 -- bias top-left "-1" pada listing modul hanya benar bila E selalu bilangan bulat.
 * Dengan sample-centre, E bisa 0.5; bias -1 lalu membuang pixel yang SEBENARNYA di dalam segitiga
 * -> celah di shared edge. Perbaikan (raster.mjs REVISI a): bias = satu satuan terkecil.
 *   node bias_bug_demo.mjs                                                                */
import { coverage } from "./raster.mjs";
import { loadPlan, makeWorldToScreen, triangulate } from "./plan.mjs";

const fmt = (c) => `once=${c.once} twice=${c.twice} gaps=${c.gaps}`;

console.log("== persegi panjang W x H dipecah di diagonal (kedua segitiga total > 0) ==");
console.log("bentuk    bias -1 (listing modul)      bias satu-satuan (REVISI)");
for (const [w, h] of [[6, 6], [7, 4], [5, 8], [9, 2]]) {
  const T1 = [[0, 0], [w, 0], [w, h]], T2 = [[0, 0], [w, h], [0, h]];
  const legacy = coverage(14, 14, [T1, T2], { legacyBias: true });
  const fixed = coverage(14, 14, [T1, T2], {});
  console.log(`${(w + "x" + h).padEnd(9)} ${fmt(legacy).padEnd(28)} ${fmt(fixed)}`);
}

// penyebab konkret pada 7x4: pixel (4,2)
const E = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
console.log("\nPenyebab (7x4, pixel (4,2), pusat (4.5,2.5)), segitiga T1=(0,0),(7,0),(7,4):");
console.log(`  edge C->A = (7,4)->(0,0): E = ${E(7, 4, 0, 0, 4.5, 2.5)}  -> > 0 (pixel DI DALAM T1, E bukan bilangan bulat)`);
console.log("  edge C->A bukan top/left -> bias -1: E + (-1) = -0.5 < 0 -> DITOLAK; T2 juga menolak -> CELAH.");

console.log("\n== siluet denah sendiri (myplan.json), ear-clipping ==");
const plan = loadPlan("myplan.json");
const p = plan.silhouette.points.map(makeWorldToScreen(plan, 600));
const tris = triangulate(p).map(([A, B, C]) => {
  const t = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
  return t < 0 ? [A, C, B] : [A, B, C];
});
console.log(`bias -1 (listing modul)   : ${fmt(coverage(800, 600, tris, { legacyBias: true }))}`);
console.log(`bias satu-satuan (REVISI) : ${fmt(coverage(800, 600, tris, {}))}`);
