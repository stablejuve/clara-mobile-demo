// Placeholders de icono y splash (Task 2): petrol de Relayer con un anillo papel. PNG escrito a mano (zlib de Node, sin deps).
// Uso: node scripts/make-placeholder-assets.mjs   (desde la raíz del repo)
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** `pixel(x, y)` → [r, g, b, a]. `alpha=false` escribe RGB (Apple exige el icono sin canal alfa). */
function png(size, alpha, pixel) {
  const bpp = alpha ? 4 : 3;
  const stride = size * bpp + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * stride + 1 + x * bpp;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
      if (alpha) raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PETROL = [0x00, 0x59, 0x4f];
const PAPER = [0xfb, 0xfb, 0xfa];
const ring = (size, x, y) => {
  const o0 = size * 0.28, o1 = size * 0.72, i0 = size * 0.41, i1 = size * 0.59;
  return x >= o0 && x < o1 && y >= o0 && y < o1 && !(x >= i0 && x < i1 && y >= i0 && y < i1);
};
writeFileSync("assets/icon.png", png(1024, false, (x, y) => (ring(1024, x, y) ? [...PAPER, 255] : [...PETROL, 255])));
writeFileSync("assets/splash-mark.png", png(512, true, (x, y) => (ring(512, x, y) ? [...PETROL, 255] : [0, 0, 0, 0])));
console.log("ok: assets/icon.png (1024, RGB) · assets/splash-mark.png (512, RGBA)");
