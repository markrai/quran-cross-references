import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RGB = readonly [number, number, number];

const DARK: RGB = [13, 27, 32];
const AQUA: RGB = [106, 205, 186];
const GOLD: RGB = [233, 185, 113];
const PALE: RGB = [235, 240, 229];

const glyphs: Record<string, readonly string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '6': ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
};

interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly bytes: Buffer;
  dot(x: number, y: number, radius: number, color: RGB): void;
  line(x1: number, y1: number, x2: number, y2: number, radius: number, color: RGB): void;
  text(value: string, x: number, y: number, scale: number, color: RGB): void;
}

function canvas(width: number, height: number): Canvas {
  const bytes = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const glow = Math.round(10 * (1 - x / width) * (1 - y / height));
      bytes[offset] = DARK[0];
      bytes[offset + 1] = DARK[1] + glow;
      bytes[offset + 2] = DARK[2] + glow;
      bytes[offset + 3] = 255;
    }
  }
  function paint(x: number, y: number, color: RGB): void {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = (y * width + x) * 4;
    bytes[offset] = color[0];
    bytes[offset + 1] = color[1];
    bytes[offset + 2] = color[2];
  }
  function dot(x: number, y: number, radius: number, color: RGB): void {
    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(width - 1, Math.ceil(x + radius));
    const top = Math.max(0, Math.floor(y - radius));
    const bottom = Math.min(height - 1, Math.ceil(y + radius));
    for (let py = top; py <= bottom; py += 1) {
      for (let px = left; px <= right; px += 1) {
        if ((px - x) ** 2 + (py - y) ** 2 <= radius ** 2) paint(px, py, color);
      }
    }
  }
  function line(x1: number, y1: number, x2: number, y2: number, radius: number, color: RGB): void {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / Math.max(steps, 1);
      dot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, color);
    }
  }
  function text(value: string, x: number, y: number, scale: number, color: RGB): void {
    for (let i = 0; i < value.length; i += 1) {
      const glyph = glyphs[value[i] ?? ''];
      if (!glyph) continue;
      for (let row = 0; row < glyph.length; row += 1) {
        const line = glyph[row] ?? '';
        for (let col = 0; col < line.length; col += 1) {
          if (line[col] !== '1') continue;
          for (let dy = 0; dy < scale; dy += 1) {
            for (let dx = 0; dx < scale; dx += 1) {
              paint(x + i * 6 * scale + col * scale + dx, y + row * scale + dy, color);
            }
          }
        }
      }
    }
  }
  return { width, height, bytes, dot, line, text };
}

function emblem(image: Canvas, x: number, y: number, radius: number): void {
  for (let step = 0; step <= 360; step += 1) {
    const angle = (step * Math.PI) / 180;
    image.dot(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, radius * 0.045, AQUA);
  }
  image.line(
    x + radius * 0.25,
    y + radius * 0.3,
    x + radius * 0.9,
    y + radius * 0.93,
    radius * 0.065,
    GOLD,
  );
  const arc = (rise: number, span: number, color: RGB): void => {
    let previous: [number, number] | null = null;
    for (let step = 0; step <= 70; step += 1) {
      const t = step / 70;
      const px = x + (t - 0.5) * span;
      const py = y + rise * (4 * (t - 0.5) ** 2 - 1);
      if (previous) image.line(previous[0], previous[1], px, py, radius * 0.022, color);
      previous = [px, py];
    }
  };
  arc(-radius * 0.38, radius * 2.75, GOLD);
  image.dot(x - radius * 1.38, y, radius * 0.09, GOLD);
  image.dot(x + radius * 1.38, y, radius * 0.09, GOLD);
}

function checksum(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, payload: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(checksum(Buffer.concat([name, payload])));
  return Buffer.concat([header, name, payload, footer]);
}

function png(image: Canvas): Buffer {
  const stride = image.width * 4;
  const rows = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    image.bytes.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = resolve('public/quran-only');
mkdirSync(resolve(root, 'icons'), { recursive: true });
for (const size of [192, 512]) {
  const image = canvas(size, size);
  emblem(image, size / 2, size / 2, size * 0.23);
  writeFileSync(resolve(root, `icons/icon-${String(size)}.png`), png(image));
}
const maskable = canvas(512, 512);
emblem(maskable, 256, 256, 110);
writeFileSync(resolve(root, 'icons/icon-maskable-512.png'), png(maskable));

const preview = canvas(1200, 630);
emblem(preview, 208, 310, 105);
preview.text('QURAN', 410, 202, 13, PALE);
preview.text('CROSS REFERENCES', 414, 330, 6, AQUA);
preview.text('114 SURAHS  6236 AYAHS', 416, 426, 4, GOLD);
writeFileSync(resolve(root, 'social-preview.png'), png(preview));

const manifest = {
  id: './',
  name: 'Quran Cross-References',
  short_name: 'Quran Links',
  description:
    'Explore Quranic passage relationships with Arabic, Pickthall English, arcs and threads.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#0d1b20',
  theme_color: '#0d1b20',
  lang: 'en',
  dir: 'ltr',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: 'icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
writeFileSync(resolve(root, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Quran PWA icons (192, 512, maskable), preview (1200×630), and manifest generated.');
