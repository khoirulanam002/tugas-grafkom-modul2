/* Module 2 -- load a floor plan (metres, y-up) and render it as 2D primitives.
 * The single worldToScreen() has the y-flip and origin baked in -- unit-tested
 * in tests.mjs on a known point. */
import { readFileSync } from "node:fs";
import { Framebuffer, polyline, triangle } from "./raster.mjs";

export const CATEGORY_RGB = {
  // viridis 5-step ramp (luminance varies -> CVD- and grayscale-safe, Module 1)
  wall:   [68, 1, 84],
  cella:  [59, 82, 139],
  stair:  [33, 145, 140],
  shrine: [94, 201, 98],
  axis:   [253, 231, 37],
};

export function loadPlan(path = "pusaka_plan.json") {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** metres (y-up) -> screen pixels (y-down), given the plan's scale + origin
 * and the framebuffer height. Deterministic; the ONLY place the flip lives. */
export function makeWorldToScreen(plan, H) {
  const s = plan.scale_px_per_m;
  const [ox, oy] = plan.origin_m;
  return ([xm, ym]) => [
    Math.round((xm + ox) * s),
    Math.round(H - 1 - (ym + oy) * s),
  ];
}

/** REVISI: triangulasi ear-clipping untuk poligon sederhana (konveks maupun cekung).
 * Menggantikan fan dari p[0] yang hanya benar untuk bentuk konveks. Mengembalikan [[A,B,C],...]
 * dengan total > 0 pada konvensi y-down milik raster.mjs. */
export function triangulate(p) {
  const n = p.length;
  if (n < 3) return [];
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  let area2 = 0;
  for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; area2 += a[0] * b[1] - b[0] * a[1]; }
  const idx = [...Array(n).keys()];
  if (area2 < 0) idx.reverse();                       // paksa orientasi positif (y-down: total > 0)
  const inTri = (q, a, b, c) => cross(a, b, q) >= 0 && cross(b, c, q) >= 0 && cross(c, a, q) >= 0;
  const out = [];
  for (let guard = 0; idx.length > 3 && guard < 10000; guard++) {
    let clipped = false;
    for (let i = 0; i < idx.length && !clipped; i++) {
      const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
      if (cross(p[a], p[b], p[c]) <= 0) continue;     // sudut cekung / lurus: bukan "ear"
      if (idx.some((k) => k !== a && k !== b && k !== c && inTri(p[k], p[a], p[b], p[c]))) continue;
      out.push([p[a], p[b], p[c]]); idx.splice(i, 1); clipped = true;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push([p[idx[0]], p[idx[1]], p[idx[2]]]);
  return out;
}

export function renderPlan(fb, plan, { fillSilhouette = false } = {}) {
  const w2s = makeWorldToScreen(plan, fb.h);
  if (fillSilhouette && plan.silhouette) {
    const p = plan.silhouette.points.map(w2s);
    // REVISI: ear-clipping (bukan fan) supaya siluet cekung (denah sendiri) terisi benar
    for (const [A, B, C] of triangulate(p)) {
      let b = B, c = C;
      const tot = (b[0] - A[0]) * (c[1] - A[1]) - (b[1] - A[1]) * (c[0] - A[0]);
      if (tot < 0) [b, c] = [c, b];                   // total > 0 sesuai konvensi
      triangle(fb, A, b, c, [230, 236, 245]);
    }
  }
  let segs = 0;
  for (const pl of plan.polylines) {
    const pts = pl.points.map(w2s);
    const rgb = CATEGORY_RGB[pl.category] || [255, 255, 255];
    polyline(fb, pts, rgb, !!pl.closed);
    segs += pl.points.length - 1 + (pl.closed ? 1 : 0);
  }
  return segs;
}

export function newFramebufferForPlan(plan, w, h) {
  const fb = new Framebuffer(w, h, [18, 18, 22]);
  return fb;
}
