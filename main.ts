// news-image-20261126 — "The World in One Day"
// Draws a newspaper front page summing up Thursday 26 November 2026:
// six verified stories of the day, each with a drawn pictogram and a short
// headline, under a masthead that names the date. Pure Node stdlib:
// the PNG is encoded by hand (zlib deflate + CRC32), the lettering is a
// 5x7 bitmap font drawn pixel by pixel, and every shape is drawn from code.
// Deterministic: two runs write byte-identical files.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- font ----
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, most significant bit left.
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ";": [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  "%": [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "+": [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  $: [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
};

// -------------------------------------------------------------- canvas ----
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [20, 38, 74]; // navy
const RED: RGB = [178, 34, 34];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [90, 96, 110];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
        this.set(xx, yy, c);
      }
    }
  }
  // outline rectangle, thickness t
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 3): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++) {
        this.set(
          Math.round(cx + (r - k) * Math.cos(rad)),
          Math.round(cy + (r - k) * Math.sin(rad)),
          c,
        );
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor((rx * Math.sqrt(ry * ry - y * y)) / ry);
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, c);
    }
  }
  // filled triangle
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.set(x, y, c);
      }
    }
  }
  text(str: string, x: number, y: number, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if ((g[r] >> (4 - col)) & 1) {
            this.fillRect(cx + col * scale, y + r * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }
  textWidth(str: string, scale: number): number {
    return str.length * 6 * scale - scale;
  }
  centerText(str: string, cx: number, y: number, scale: number, c: RGB): void {
    this.text(str, cx - Math.floor(this.textWidth(str, scale) / 2), y, scale, c);
  }
}

// ------------------------------------------------------------ PNG out -----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (cv.w * 3 + 1)] = 0; // filter none
    raw.set(cv.px.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), y * (cv.w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------- pictograms ---
// Each draws inside a box centred on (cx, top) about 200 wide, 108 tall.
function drawRocket(cv: Canvas, cx: number, top: number): void {
  const body: RGB = [228, 232, 238];
  const dark: RGB = [60, 70, 90];
  // flame
  cv.tri(cx - 12, top + 92, cx + 12, top + 92, cx, top + 108, [255, 140, 0]);
  cv.tri(cx - 7, top + 92, cx + 7, top + 92, cx, top + 104, [255, 210, 60]);
  // fins
  cv.tri(cx - 18, top + 58, cx - 18, top + 92, cx - 2, top + 92, RED);
  cv.tri(cx + 18, top + 58, cx + 18, top + 92, cx + 2, top + 92, RED);
  // body
  cv.fillRect(cx - 14, top + 18, 28, 76, body);
  cv.rect(cx - 14, top + 18, 28, 76, dark, 2);
  // nose
  cv.tri(cx - 14, top + 18, cx + 14, top + 18, cx, top - 2, RED);
  // window
  cv.disc(cx, top + 44, 8, [120, 190, 230]);
  cv.ring(cx, top + 44, 8, dark, 2);
  // stars
  cv.disc(cx - 66, top + 16, 3, [255, 210, 60]);
  cv.disc(cx + 62, top + 30, 3, [255, 210, 60]);
  cv.disc(cx - 58, top + 70, 2, [255, 210, 60]);
  cv.disc(cx + 66, top + 78, 2, [255, 210, 60]);
}
function drawMercury(cv: Canvas, cx: number, top: number): void {
  const planet: RGB = [196, 122, 58];
  const dark: RGB = [140, 82, 34];
  cv.disc(cx - 18, top + 54, 40, planet);
  cv.ring(cx - 18, top + 54, 40, dark, 2);
  cv.disc(cx - 34, top + 40, 7, dark);
  cv.disc(cx - 6, top + 66, 9, dark);
  cv.disc(cx - 26, top + 74, 5, dark);
  cv.disc(cx + 2, top + 34, 5, dark);
  // probe at upper right
  const px = cx + 46;
  const py = top + 22;
  cv.fillRect(px - 10, py - 6, 20, 12, [200, 205, 215]);
  cv.rect(px - 10, py - 6, 20, 12, [60, 70, 90], 2);
  cv.fillRect(px - 26, py - 3, 14, 6, [40, 90, 180]);
  cv.fillRect(px + 14, py - 3, 14, 6, [40, 90, 180]);
  cv.line(px + 8, py - 6, px + 16, py - 16, [60, 70, 90], 2);
  cv.disc(px + 16, py - 16, 2, RED);
  cv.disc(cx + 70, top + 88, 3, [255, 210, 60]);
  cv.disc(cx - 72, top + 90, 2, [255, 210, 60]);
}
function drawDove(cv: Canvas, cx: number, top: number): void {
  const dove: RGB = [240, 244, 250];
  const line: RGB = [70, 90, 120];
  // olive branch below the bird
  cv.line(cx - 70, top + 98, cx - 8, top + 84, [60, 130, 70], 3);
  cv.ellipse(cx - 58, top + 88, 10, 4, [60, 130, 70]);
  cv.ellipse(cx - 40, top + 84, 10, 4, [60, 130, 70]);
  cv.ellipse(cx - 50, top + 96, 10, 4, [60, 130, 70]);
  // tail fanning from the body's left tip
  cv.line(cx - 38, top + 60, cx - 68, top + 52, line, 4);
  cv.line(cx - 38, top + 64, cx - 70, top + 68, line, 4);
  // body with outline
  cv.ellipse(cx - 2, top + 60, 38, 22, line);
  cv.ellipse(cx - 2, top + 60, 36, 20, dove);
  // head with outline + beak
  cv.disc(cx + 30, top + 36, 13, line);
  cv.disc(cx + 30, top + 36, 11, dove);
  cv.tri(cx + 40, top + 34, cx + 54, top + 38, cx + 40, top + 42, [230, 150, 40]);
  cv.disc(cx + 34, top + 32, 2, INK);
  // wing
  cv.ellipse(cx - 6, top + 52, 22, 10, [210, 222, 236]);
  cv.line(cx - 24, top + 46, cx + 12, top + 50, line, 2);
}
function drawChart(cv: Canvas, cx: number, top: number): void {
  const green: RGB = [40, 150, 80];
  const dark: RGB = [60, 70, 90];
  // axes
  cv.line(cx - 78, top + 96, cx - 78, top + 8, dark, 3);
  cv.line(cx - 78, top + 96, cx + 78, top + 96, dark, 3);
  // rising bars
  const bars = [26, 40, 58, 78];
  for (let i = 0; i < 4; i++) {
    const bx = cx - 56 + i * 34;
    const bh = bars[i];
    cv.fillRect(bx, top + 96 - bh, 22, bh, green);
  }
  // arrow over the bars
  cv.line(cx - 66, top + 62, cx + 66, top + 6, RED, 4);
  cv.tri(cx + 66, top + 6, cx + 48, top + 4, cx + 64, top + 22, RED);
}
function drawShirt(cv: Canvas, cx: number, top: number): void {
  const shirt: RGB = [200, 60, 60];
  const dark: RGB = [120, 30, 30];
  // body
  cv.fillRect(cx - 34, top + 18, 68, 66, shirt);
  cv.rect(cx - 34, top + 18, 68, 66, dark, 2);
  // sleeves
  cv.tri(cx - 34, top + 18, cx - 58, top + 40, cx - 34, top + 52, shirt);
  cv.tri(cx + 34, top + 18, cx + 58, top + 40, cx + 34, top + 52, shirt);
  // collar
  cv.tri(cx - 12, top + 18, cx + 12, top + 18, cx, top + 34, [250, 250, 250]);
  // big 36% tag, centred on the shirt body
  cv.text("36%", cx - 17, top + 46, 2, WHITE);
  // thread spool
  cv.fillRect(cx - 74, top + 78, 16, 18, [240, 220, 180]);
  cv.rect(cx - 74, top + 78, 16, 18, dark, 2);
  cv.line(cx - 66, top + 78, cx - 66, top + 70, [240, 220, 180], 2);
}
function drawPlaneSea(cv: Canvas, cx: number, top: number): void {
  const sea: RGB = [40, 110, 190];
  const dark: RGB = [60, 70, 90];
  // plane (side view, nose right)
  const py = top + 28;
  // tail fin (left, above fuselage)
  cv.tri(cx - 44, py - 4, cx - 30, py - 24, cx - 26, py - 4, dark);
  // fuselage + nose
  cv.ellipse(cx, py, 44, 9, [220, 226, 234]);
  cv.tri(cx + 40, py - 6, cx + 62, py, cx + 40, py + 6, [220, 226, 234]);
  // wing hanging below the fuselage
  cv.tri(cx - 10, py + 6, cx + 6, py + 6, cx - 2, py + 22, dark);
  // windows
  cv.disc(cx + 30, py - 2, 3, [120, 190, 230]);
  cv.disc(cx + 18, py - 2, 3, [120, 190, 230]);
  // search light beam down to the sea
  cv.line(cx - 6, py + 10, cx - 34, top + 68, [255, 200, 60], 3);
  // waves
  for (let r = 0; r < 3; r++) {
    const wy = top + 72 + r * 12;
    for (let x = cx - 80; x <= cx + 80; x += 2) {
      const yy = wy + Math.round(3 * Math.sin((x / 18) + r * 2));
      cv.set(x, yy, sea);
      cv.set(x, yy + 1, sea);
    }
  }
  // life ring
  cv.ring(cx + 56, top + 88, 10, [255, 110, 40], 5);
}

// ------------------------------------------------------------ layout -----
interface Panel {
  kicker: string;
  accent: RGB;
  icon: (cv: Canvas, cx: number, top: number) => void;
  lines: string[];
  sub: string;
}
const PANELS: Panel[] = [
  {
    kicker: "SPACE - ASIA",
    accent: [40, 90, 180],
    icon: drawRocket,
    lines: ["PAKISTAN'S FIRST", "ASTRONAUT REACHES", "TIANGONG STATION"],
    sub: "SHENZHOU-24 DOCKS AT TIANGONG",
  },
  {
    kicker: "SPACE - EUROPE-JAPAN",
    accent: [120, 70, 160],
    icon: drawMercury,
    lines: ["BEPI COLOMBO", "REACHES MERCURY", "AFTER 8 YEARS"],
    sub: "JAXA-ESA PROBE ENDS 8-YEAR TRIP",
  },
  {
    kicker: "LATIN AMERICA",
    accent: [40, 130, 90],
    icon: drawDove,
    lines: ["COLOMBIA MARKS", "10 YEARS OF PEACE"],
    sub: "2016 ACCORD: A DECADE ON",
  },
  {
    kicker: "ECONOMY - USA",
    accent: [180, 120, 20],
    icon: drawChart,
    lines: ["US CONSUMER", "CONFIDENCE NEAR", "2-YEAR HIGH"],
    sub: "STRONGEST IN ALMOST 2 YEARS",
  },
  {
    kicker: "LABOUR - ASIA",
    accent: [180, 60, 60],
    icon: drawShirt,
    lines: ["BANGLADESH GARMENT", "WORKERS WIN 36%", "PAY RISE"],
    sub: "MINIMUM WAGE UP BY OVER A THIRD",
  },
  {
    kicker: "USA - SEARCH",
    accent: [30, 110, 150],
    icon: drawPlaneSea,
    lines: ["SMALL PLANE DOWN", "IN GULF: 6 ABOARD,", "SEARCH UNDER WAY"],
    sub: "CREWS SEARCH THE GULF OF MEXICO",
  },
];

function drawPage(): Canvas {
  const W = 1024;
  const H = 1024;
  const cv = new Canvas(W, H, PAPER);

  // ---- masthead ----
  cv.fillRect(0, 0, W, 118, INK);
  cv.fillRect(0, 118, W, 6, RED);
  cv.centerText("THE WORLD IN ONE DAY", W / 2, 18, 4, WHITE);
  cv.centerText("THURSDAY 26 NOVEMBER 2026", W / 2, 74, 3, [255, 210, 60]);
  cv.centerText("SIX STORIES FROM AROUND THE WORLD", W / 2, 132, 1, GREY);

  // ---- panels: 2 columns x 3 rows ----
  const pw = 488;
  const ph = 262;
  const gap = 16;
  const x0 = 16;
  const y0 = 158;
  for (let i = 0; i < PANELS.length; i++) {
    const p = PANELS[i];
    const px = x0 + (i % 2) * (pw + gap);
    const py = y0 + Math.floor(i / 2) * (ph + gap);
    cv.fillRect(px, py, pw, ph, WHITE);
    cv.rect(px, py, pw, ph, INK, 2);
    // kicker band
    cv.fillRect(px + 2, py + 2, pw - 4, 30, p.accent);
    cv.text(p.kicker, px + 14, py + 10, 1, WHITE);
    // pictogram
    p.icon(cv, px + pw / 2, py + 44);
    // headline lines
    let hy = py + 164;
    for (const line of p.lines) {
      cv.centerText(line, px + pw / 2, hy, 2, INK);
      hy += 21;
    }
    // sub label
    cv.centerText(p.sub, px + pw / 2, py + ph - 22, 1, GREY);
  }

  // ---- footer ----
  cv.fillRect(0, H - 44, W, 44, INK);
  cv.centerText("26 NOVEMBER 2026 - THE WORLD IN ONE IMAGE", W / 2, H - 32, 2, WHITE);
  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const cv = drawPage();
  const png = encodePNG(cv);
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
