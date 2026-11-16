/* Lab 2/3 -- pengecekan TAMBAHAN (tests.mjs milik Pak Amirul dibiarkan utuh).
 *   node tests_lab.mjs   (dijalankan juga oleh `npm test`) */
import { Framebuffer, lineBresenham, lineDDA, edge, triangle, coverage } from "./raster.mjs";
import { loadPlan, makeWorldToScreen, renderPlan, triangulate, CATEGORY_RGB } from "./plan.mjs";
import { pixelStats } from "./metrics.mjs";
import { asterisk } from "./asterisk.mjs";
import { existsSync } from "node:fs";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("OK   " + name); pass++; }
  catch (e) { console.log("FAIL " + name + "\n     " + e.message); fail++; }
}
const assert = (c, m) => { if (!c) throw new Error(m || "assertion failed"); };
const W = 800, H = 600;
const plan = loadPlan("myplan.json");
const segCount = plan.polylines.reduce((s, p) => s + p.points.length - 1 + (p.closed ? 1 : 0), 0);

// ------------------------------------------------------------------ Lab 1/3: denah sendiri
check("myplan.json -- skema Pak Amirul, kategori valid, 9 polyline / 48 segmen", () => {
  assert(plan.scale_px_per_m > 0 && Array.isArray(plan.origin_m) && plan.silhouette, "kunci skema hilang");
  assert(plan.polylines.length === 9, `polyline ${plan.polylines.length}`);
  for (const p of plan.polylines) assert(CATEGORY_RGB[p.category], `kategori tak dikenal: ${p.category}`);
  assert(new Set(plan.polylines.map((p) => p.category)).size === 5, "kelima kategori harus terpakai");
  assert(segCount === 48, `segmen ${segCount}`);
});

check("myplan.json -- semua titik jatuh di dalam kanvas 800x600 (margin >= 5 px)", () => {
  const w2s = makeWorldToScreen(plan, H);
  for (const p of plan.polylines) for (const pt of p.points) {
    const [x, y] = w2s(pt);
    assert(x >= 5 && x <= W - 6 && y >= 5 && y <= H - 6, `${p.id} ${pt} -> (${x},${y}) di luar kanvas`);
  }
});

check("myplan.json -- worldToScreen titik yang diketahui: (35.39, 255.97) m -> (100, 18) px", () => {
  const [x, y] = makeWorldToScreen(plan, H)([35.39, 255.97]);
  assert(x === 100 && y === 18, `(${x},${y})`);
});

check("triangulate -- siluet denah: n-2 segitiga, jumlah luas = luas poligon", () => {
  const p = plan.silhouette.points.map(makeWorldToScreen(plan, H));
  const ar = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  const t = triangulate(p);
  let poly = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; poly += a[0] * b[1] - b[0] * a[1]; }
  const sum = t.reduce((s, [a, b, c]) => s + ar(a, b, c), 0);
  assert(t.length === p.length - 2, `${t.length} segitiga`);
  assert(Math.abs(sum - Math.abs(poly) / 2) < 1e-6, `luas ${sum} vs ${Math.abs(poly) / 2}`);
});

check("siluet denah -- 0 pixel ganda dan 0 celah (bias REVISI); bias -1 lama meninggalkan celah", () => {
  const p = plan.silhouette.points.map(makeWorldToScreen(plan, H));
  const tris = triangulate(p).map(([A, B, C]) => ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) < 0 ? [A, C, B] : [A, B, C]));
  const fixed = coverage(W, H, tris, {}), legacy = coverage(W, H, tris, { legacyBias: true });
  assert(fixed.twice === 0 && fixed.gaps === 0, `fixed twice=${fixed.twice} gaps=${fixed.gaps}`);
  assert(legacy.gaps > 0, `bias lama seharusnya menunjukkan celah (gaps=${legacy.gaps})`);
});

// ------------------------------------------------------------------ Lab 2
check("REVISI bias -- persegi panjang 7x4 dipecah di diagonal: 0 celah (bias lama: 1 celah di (4,2))", () => {
  const T1 = [[0, 0], [7, 0], [7, 4]], T2 = [[0, 0], [7, 4], [0, 4]];
  const f = coverage(14, 14, [T1, T2], {}), l = coverage(14, 14, [T1, T2], { legacyBias: true });
  assert(f.once === 28 && f.twice === 0 && f.gaps === 0, `fixed ${JSON.stringify({ o: f.once, t: f.twice, g: f.gaps })}`);
  assert(l.gaps === 1 && l.counts[2 * 14 + 4] === 0, "bias lama harus melewatkan pixel (4,2)");
  assert(edge(7, 4, 0, 0, 4.5, 2.5) === 0.5, "E di pixel (4,2) harus 0.5 (bukan bilangan bulat)");
});

check("REVISI bias -- contoh modul 6x6 tidak berubah: once=36/twice=0/gaps=0; >=0: twice=6; >0: gaps=6", () => {
  const T1 = [[2, 2], [8, 2], [8, 8]], T2 = [[2, 2], [8, 8], [2, 8]];
  const a = coverage(12, 12, [T1, T2], {}), b = coverage(12, 12, [T1, T2], { legacyBias: true });
  assert(a.once === 36 && a.twice === 0 && a.gaps === 0 && b.once === 36 && b.gaps === 0, "6x6 berubah!");
  assert(coverage(12, 12, [T1, T2], { topLeft: false }).twice === 6, "twice != 6");
  assert(coverage(12, 12, [T1, T2], { topLeft: false, strictGreater: true }).gaps === 6, "gaps != 6");
});

check("lines -- 8 refleksi satu segmen = himpunan pixel persis sama (bukan hanya panjang)", () => {
  const base = lineBresenham(0, 0, 7, 4).map((p) => p.join(","));
  let n = 0;
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sw of [false, true]) {
    const f = ([x, y]) => { let a = x * sx, b = y * sy; if (sw) [a, b] = [b, a]; return [20 + a, 20 + b]; };
    const [ex, ey] = f([7, 4]);
    const got = lineBresenham(20, 20, ex, ey).map((p) => p.join(","));
    const want = base.map((s) => f(s.split(",").map(Number)).join(","));
    assert(JSON.stringify(got) === JSON.stringify(want), `oktan ${sx},${sy},${sw}`);
    n++;
  }
  assert(n === 8);
});

check("lines -- DDA dan Bresenham sama pada garis tanpa imbang (2,1)->(9,5), arah dibalik himpunan sama", () => {
  assert(JSON.stringify(lineDDA(2, 1, 9, 5)) === JSON.stringify(lineBresenham(2, 1, 9, 5)));
  const a = lineBresenham(9, 5, 2, 1).map((p) => p.join(",")).sort().join(" ");
  const b = lineBresenham(2, 1, 9, 5).map((p) => p.join(",")).sort().join(" ");
  assert(a === b, "arah dibalik berbeda");
});

check("asterisk 24 jari-jari -- panjang 45 +-1, tersambung, menyimpang <= 0,5 px dari garis ideal", () => {
  for (const s of asterisk(50, 50, 45)) {
    const [ex, ey] = s.end, L = Math.hypot(ex - 50, ey - 50);
    assert(Math.abs(L - 45) <= 1, `${s.deg} deg panjang ${L.toFixed(2)}`);
    s.pixels.forEach(([x, y], i) => {
      const d = Math.abs((ex - 50) * (y - 50) - (ey - 50) * (x - 50)) / L;
      assert(d <= 0.5 + 1e-9, `${s.deg} deg pixel ${x},${y} menyimpang ${d.toFixed(2)}`);
      if (i) assert(Math.abs(x - s.pixels[i - 1][0]) <= 1 && Math.abs(y - s.pixels[i - 1][1]) <= 1, `${s.deg} deg putus`);
    });
  }
});

check("REVISI autoFlip -- segitiga ber-winding terbalik: tanpa flip 0 pixel, dengan flip identik dengan normal", () => {
  const A = [1, 1], B = [6, 2], C = [3, 7];
  const n = new Framebuffer(10, 10), r = new Framebuffer(10, 10), f = new Framebuffer(10, 10);
  triangle(n, A, B, C, [255, 255, 255]);
  triangle(r, A, C, B, [255, 255, 255]);
  triangle(f, A, C, B, [255, 255, 255], { autoFlip: true });
  const cnt = (fb) => { let k = 0; for (let i = 0; i < fb.data.length; i += 3) if (fb.data[i]) k++; return k; };
  assert(cnt(r) === 0, `tanpa flip ${cnt(r)} pixel`);
  const st = pixelStats(n, f);
  assert(st.identical === st.total, "autoFlip tidak identik dengan normal");
});

check("REVISI clamp -- bounding box clamp tidak mengubah hasil (200 segitiga acak, termasuk di luar kanvas)", () => {
  for (let i = 0; i < 200; i++) {
    const r = () => [Math.random() * 40 - 5, Math.random() * 40 - 5];
    const P = r(), Q = r(), R = r();
    const a = new Framebuffer(30, 30), b = new Framebuffer(30, 30);
    triangle(a, P, Q, R, [255, 255, 255], { autoFlip: true, clamp: true });
    triangle(b, P, Q, R, [255, 255, 255], { autoFlip: true, clamp: false });
    const st = pixelStats(a, b);
    assert(st.identical === st.total, `segitiga ${i} beda`);
  }
});

// ------------------------------------------------------------------ Lab 3 (hanya bila plan_three.ppm ada)
if (existsSync("plan_three.ppm")) {
  check("plan_three.ppm vs raster from-scratch -- >= 98% identik, interior identik (hanya tepi beda)", () => {
    const mine = new Framebuffer(W, H, [18, 18, 22]);
    renderPlan(mine, plan, { fillSilhouette: true });
    const three = Framebuffer.readPPM("plan_three.ppm");
    assert(three.w === W && three.h === H, `ukuran ${three.w}x${three.h}`);
    const st = pixelStats(mine, three);
    assert(st.identical / st.total >= 0.98, `identik ${(100 * st.identical / st.total).toFixed(2)}%`);
  });
}

console.log(`\n${fail === 0 ? "LAB CHECKS PASSED" : fail + " LAB CHECK(S) FAILED"}  (${pass} ok, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
