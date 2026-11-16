/* Lab 2 poin 3 -- cek sample-centre (Contoh E1): rectangle 2x2 di (1,1) pada framebuffer 6x6.
 *   node sample_centre.mjs                                                              */
import { Framebuffer } from "./raster.mjs";

const W = 6, H = 6, WHITE = [255, 255, 255];
const show = (fb) => {
  for (let y = 0; y < fb.h; y++)
    console.log([...Array(fb.w).keys()].map((x) => (fb.get(x, y)[0] ? "#" : ".")).join(" "));
};
const count = (fb) => { let n = 0; for (let i = 0; i < fb.data.length; i += 3) if (fb.data[i]) n++; return n; };

// (a) aturan pusat: pixel menyala jika x0 <= x+0.5 < x1 (half-open)
const a = new Framebuffer(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  if (1 <= x + 0.5 && x + 0.5 < 3 && 1 <= y + 0.5 && y + 0.5 < 3) a.set(x, y, WHITE);
console.log(`(a) aturan pusat (x+0.5, y+0.5), half-open : ${count(a)} pixel (2x2)`); show(a);

// (b) SALAH: uji sudut pixel (x, y) dengan interval TERTUTUP x0 <= x <= x1
const b = new Framebuffer(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  if (1 <= x && x <= 3 && 1 <= y && y <= 3) b.set(x, y, WHITE);
console.log(`\n(b) uji sudut (x, y), x0<=x<=x1            : ${count(b)} pixel (3x3)`); show(b);

console.log("\nPenjelasan: sampel di sudut pixel = titik sampel bergeser setengah pixel ke KIRI-ATAS,");
console.log("jadi isi gambar tampak bergeser setengah pixel ke kanan-bawah; dengan interval tertutup");
console.log("satu baris + satu kolom ekstra menyala di sisi kanan/bawah (3x3, bukan 2x2).");
