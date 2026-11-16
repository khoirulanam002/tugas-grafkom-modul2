# Module 2 -- Rendering Pipeline & 2D Primitives (reference repo)

Course: *Grafika Komputer / Computer Graphics* (`25MP7716G030`), S1 Informatika
semester 5. Companion to `../../Module2_EN.tex`.

**Rule:** the from-scratch rasteriser (`raster.mjs`) is **plain JavaScript,
run with Node** -- no framework, no `<canvas>`. The framebuffer is a
`Uint8ClampedArray`; the same functions drive a browser `<canvas>` via
`ctx.putImageData`. The **library** side (`web/`) is Three.js, and is the
GitHub Pages deliverable.

**Convention** (stated once in `raster.mjs`, never mixed): `y` is DOWN; a
pixel `(x,y)` is a point sample at `(x+0.5, y+0.5)`; triangle vertices are
passed so the total `edge(A,B,C) > 0`; "inside" = all three edge functions
`>= 0`, and the top-left rule decides the exactly-on-edge case.

## Quick start

```bash
cd code/Module2
node tests.mjs                 # -> ALL CHECKS PASSED (10 ok)
node draw_square.mjs --mode fill      # the Fully Worked Example
node triangle_gap_bug.mjs            # diagnose-and-fix: shared-edge cracks/doubles
node draw_plan.mjs --w 800 --h 600 --fill    # the Pusaka3D plan, from scratch
node bench.mjs                       # forward vs backward timing
npx serve .        # then open http://localhost:3000/web/  (the Three.js viewer)
```

`npm install` is only needed for the web viewer's dev server (`three` is
loaded from a CDN in `web/index.html`; `serve` is optional).

## Unit table

| File | Job | Reproduces |
|---|---|---|
| `raster.mjs` | Framebuffer, `lineDDA`, `lineBresenham` (8 octants), `edge`, `triangle` (+ top-left rule), `barycentric`, `coverage`, PPM r/w | E1-E5, watertightness |
| `metrics.mjs` | `psnr`, global `ssim`, `pixelStats` | Step 4, Case Study diff |
| `plan.mjs` | load `pusaka_plan.json`; the single `worldToScreen` (y-flip); `renderPlan` | Case Study |
| `pusaka_plan.json` | committed Prambanan-style floor plan (metres, y-up) | Case Study input (fallback) |
| `draw_plan.mjs` | render the plan headless -> `out/plan_scratch.ppm` | Case Study step 2 |
| `draw_square.mjs` | Fully Worked Example: 6x6 square, outline / fill / coverage | Steps 1-4 |
| `triangle_gap_bug.mjs` | diagnose-and-fix: shared-edge cracks/doubles, coverage image, proof | Lab 2 |
| `bench.mjs` | forward (rasterise) vs backward (per-pixel) at zoom 1x / 10x | Lab 3 decision |
| `compare.mjs` | diff two rasters (PPM; PNG if `pngjs` installed): identical %, PSNR, SSIM, max\|diff\|, diff image | Step 4, Case Study |
| `tests.mjs` | every from-scratch check; `npm test` entry point | MASTER 11.2 |
| `web/index.html`, `web/viewer.mjs`, `web/cvd.css` | Three.js plan viewer + accessible legend + SVG deuteranopia/protanopia toggles + PPM export | Lab 3 deliverable |

## What `node tests.mjs` asserts

- **E2 / E3** -- `lineDDA` and `lineBresenham` on `(2,1)->(9,5)` both give
  `[(2,1),(3,2),(4,2),(5,3),(6,3),(7,4),(8,4),(9,5)]`; all 8 octants give the
  right length.
- **E4** -- `edge(A,B,C)=28` for `A(1,1) B(6,2) C(3,7)`; edge values at
  `(3,3)` are `(8,12,8)` (inside); `(5,5)` and `(1,4)` are outside.
- **E5** -- `barycentric` sums to 1; interpolating `10/20/40` at
  `(0.5,0.25,0.25)` gives `20`.
- **top-left rule** -- the 6x6 square split on `y=x`: `once=36, twice=0,
  gaps=0` with the rule; `twice=6` without it; `gaps=6` with `">0"`.
- **E1** -- the sample-centre rule lights exactly `(1,1),(2,1),(1,2),(2,2)`
  for a 2x2 rectangle at `(1,1)`.
- **plan** -- `worldToScreen` flips `y` exactly once and is invertible.
- **reference raster** -- `draw_square` fill is byte-identical to
  `ref/square_fill_ref.ppm` (regenerated on first run; commit it).

## Notes on fixes applied while verifying

- `triangle()`: the coverage helper passes a plain `{w,h}` object as the
  "framebuffer"; guarded the draw call with `typeof fb.set === "function"` so
  `coverage()` can run the same rasteriser without a real framebuffer.

## Verified

| Item | Status | Date | Toolchain |
|---|---|---|---|
| `Module2_EN.tex` compiles | **yes** -- Tectonic 0.17.0, no overfull hbox > ~10 pt | 2026-09-04 | Windows 11 |
| `node tests.mjs` | **ALL CHECKS PASSED (10 ok)** | 2026-09-04 | Node v22.19.0 |
| `draw_square` / `triangle_gap_bug` / `draw_plan` / `bench` / `compare` | **run green** -- transcripts in `Module2_EN.tex` are the actual output | 2026-09-04 | Node v22.19.0 |
| `web/` Three.js viewer | **authored, not browser-verified on this host** (no display); loads `three@0.160.0` from jsdelivr, draws the plan + legend, exports PPM for `compare.mjs` | 2026-09-04 | -- |

Before the module fully meets the MASTER Definition of Done, open `web/` in a
browser (`npx serve .` -> `/web/`), confirm the plan and 5-category legend
render, toggle the deuteranopia/protanopia filters (all five stay distinct),
click **Export PPM**, and run
`node compare.mjs out/plan_scratch.ppm plan_three.ppm` -- expect a
high-but-finite PSNR (edge anti-aliasing only). Record the browser + version.


---

# Catatan pengerjaan -- Abdullah Khoirul Anam (Lab 1-3)

Subjek: **Masjid Istiqlal, Jakarta**. Denah `myplan.json` ditelusuri manual dari citra satelit Google Maps
(diakses 25 Oktober 2026; skala 0,632 m/pixel dari garis ukur 283,47 m; Imagery (c) Google). 9 polyline, 48 segmen,
5 kategori. Akurasi kira-kira beberapa meter; `pintu_masuk_perkiraan` belum diverifikasi.

## Toolchain
- OS: Windows 10 Pro 22H2 (Build 19045.6466) | Node.js v22.20.0 | npm 10.9.3 | Git 2.53.0.windows.1
- Browser: Google Chrome 155.0.8059.85 (64-bit) | Three.js 0.186.1 (dikunci di package.json, disalin ke web/vendor)
- Tanggal: 25 Oktober 2026

## Alur kerja
| Perintah | Fungsi |
|---|---|
| `npm install` lalu `npm run sync` | pasang three + serve, salin three & myplan.json ke `web/` |
| `npm test` | `tests.mjs` (dosen, 10 ok) + `tests_lab.mjs` (tambahan) |
| `npm run plan` | render denah from-scratch -> `out/plan_scratch.ppm` |
| `npm run serve` | halaman WebGL di http://localhost:3000 (klik "Export PPM" -> simpan `plan_three.ppm` di folder ini) |
| `node compare.mjs out/plan_scratch.ppm plan_three.ppm --diff out/plan_diff.ppm --scale 6` | % identik, PSNR, SSIM |
| `npm run bench` | forward vs backward pada myplan.json |
| `npm run bug` / `npm run bias` | diagnosis shared-edge / temuan bias top-left |
| `node sample_centre.mjs`, `node asterisk.mjs`, `node bench_clamp.mjs` | Lab 2 poin 3, 5, dan perbaikan clamp |
| `npm run png` | ubah semua `.ppm` jadi `.png` agar bisa dilihat |

## Revisi terhadap repo awal (semua bertanda `REVISI` di kode)
1. **raster.mjs -- bias top-left.** Bias `-1` pada listing hanya benar bila E bilangan bulat. Dengan sample-centre E bisa
   0,5 (persegi panjang 7x4 dipecah diagonal: pixel (4,2) di dalam T1 dengan E=0,5 ditolak bias -1 -> celah). Bias dibaca
   sebagai satu satuan terkecil (`BIAS_UNIT`): edge non-top/left menuntut E>0, top/left cukup E>=0. Contoh modul tidak
   berubah (36/0/0, 30/6/0, 30/0/6; `ref/` identik). Pada siluet denah ini: 3 pixel celah -> 0. `legacyBias:true` = perilaku lama.
2. **raster.mjs -- opsi `clamp` dan `autoFlip`** pada `triangle()` (pitfall 13.5 dan 13.4), default tidak mengubah perilaku.
3. **plan.mjs -- triangulasi ear-clipping** menggantikan fan dari p[0] (fan hanya benar untuk bentuk konveks).
4. **web/viewer.mjs -- `side: THREE.DoubleSide`.** Kamera ortografik y-ke-bawah memantulkan winding sehingga siluet
   dibuang sebagai muka belakang (viewer asli + denah bawaan: PSNR 3,8 dB). Setelah perbaikan isian tampil.
5. **web/viewer.mjs -- garis digeser +0,5 px** (pusat pixel). PSNR vs raster from-scratch naik 28,0 -> 33,0 dB.
6. **web/index.html + viewer.mjs** memakai three lokal (`web/vendor`) dan `./myplan.json` (GitHub Pages hanya melayani `web/`).
7. **bench.mjs** menerima `--plan`.

## Hasil (diukur)
- `tests.mjs` 10 ok; `tests_lab.mjs` seluruhnya ok.
- From-scratch vs Three.js (`compare.mjs`): 98,95% identik, **PSNR 33,0 dB, SSIM 0,998**; seluruh pixel yang beda ada di tepi, 0 di interior.

## Verified
(isi setelah clone bersih di laptop sendiri: tanggal, OS, versi Node, `npm test` hijau, URL GitHub Pages)
