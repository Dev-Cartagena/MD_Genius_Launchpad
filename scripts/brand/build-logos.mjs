// Generates the MD Genius Launchpad logo system as SVG (text converted to paths).
//
// Run from an empty scratch folder (the font tools are not app dependencies):
//   npm i opentype.js @fontsource/space-grotesk
//   node /path/to/repo/scripts/brand/build-logos.mjs ./out
// PNG/ICO sizes in client/public were rendered from these SVGs with headless Chrome.
// Construction follows the MDGeniusAI submark: rounded modular blocks on a grid,
// unit:gap ratio ~7:3, corner radius ~0.25 unit, one free "node" square.
import opentype from "opentype.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const FONT_DIR = "node_modules/@fontsource/space-grotesk/files";
const font = (w) => {
  const buf = fs.readFileSync(path.join(FONT_DIR, `space-grotesk-latin-${w}-normal.woff`));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const SG500 = font(500);
const SG400 = font(400);

// Brand colors (MDGeniusAI Brand Guideline, Color System)
const NAVY = "#082B42";
const STEEL = "#3A607D";
const MIST = "#97B7C1";
const SMOKE = "#F3F3F3";
const WHITE = "#FFFFFF";

// ---- Symbol geometry (108 x 108 units) ---------------------------------
const U = 28, G = 12, R = 7, RC = 7; // unit, gap, corner radius, concave radius
const S = U + G; // grid step 40
const SIZE = 2 * S + U; // 108

function roundedRect(x, y, w, h, r = R) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

// "L": stem (column 0, all rows) joined to a foot (row 2, columns 0-1),
// with a concave inner corner, like the joints in the MDGeniusAI symbol.
const footRight = S + U; // 68
const footTop = 2 * S; // 80
const L_PATH =
  `M${R} 0H${U - R}A${R} ${R} 0 0 1 ${U} ${R}` +
  `V${footTop - RC}A${RC} ${RC} 0 0 0 ${U + RC} ${footTop}` +
  `H${footRight - R}A${R} ${R} 0 0 1 ${footRight} ${footTop + R}` +
  `V${SIZE - R}A${R} ${R} 0 0 1 ${footRight - R} ${SIZE}` +
  `H${R}A${R} ${R} 0 0 1 0 ${SIZE - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
// Node: the free central square (column 1, row 1) — the echo of the
// MDGeniusAI central square.
const NODE = roundedRect(S, S, U, U);
// Launch block: top-right (column 2, row 0), on the diagonal from the node:
// the trajectory that gives Launchpad its meaning.
const LAUNCH = roundedRect(2 * S, 0, U, U);
const SYMBOL_PATHS = [L_PATH, NODE, LAUNCH];

// Gradient runs from the top-right (light) to bottom-left (dark), as in the
// MDGeniusAI symbol.
function gradientDef(id, from, to) {
  return `<linearGradient id="${id}" x1="${SIZE}" y1="0" x2="0" y2="${SIZE}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
}

const VARIANTS = {
  // On light backgrounds (default)
  color: { from: STEEL, to: NAVY, text: NAVY, sub: NAVY },
  // On navy / dark backgrounds
  reversed: { from: WHITE, to: MIST, text: WHITE, sub: SMOKE },
  // Single-color
  navy: { solid: NAVY, text: NAVY, sub: NAVY },
  white: { solid: WHITE, text: WHITE, sub: WHITE },
};

function symbolGroup(v, id, transform = "") {
  const fill = v.solid ?? `url(#${id})`;
  const defs = v.solid ? "" : `<defs>${gradientDef(id, v.from, v.to)}</defs>`;
  return `${defs}<g${transform ? ` transform="${transform}"` : ""} fill="${fill}">${SYMBOL_PATHS.map((d) => `<path d="${d}"/>`).join("")}</g>`;
}

// opentype.js's toPathData can emit NaN when rounding; format commands directly.
function commandsToD(cmds) {
  const f = (n) => {
    if (!Number.isFinite(n)) throw new Error("non-finite coordinate in glyph path");
    return String(Math.round(n * 100) / 100);
  };
  return cmds
    .map((c) => {
      switch (c.type) {
        case "M": return `M${f(c.x)} ${f(c.y)}`;
        case "L": return `L${f(c.x)} ${f(c.y)}`;
        case "Q": return `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
        case "C": return `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
        case "Z": return "Z";
        default: throw new Error("unknown path command " + c.type);
      }
    })
    .join("");
}

// Text as outlined paths, so logos render identically without the font.
function textPath(fontObj, text, x, baseline, size, letterSpacingEm = 0) {
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    const glyph = fontObj.charToGlyph(ch);
    parts.push(commandsToD(glyph.getPath(cursor, baseline, size).commands));
    cursor += (glyph.advanceWidth / fontObj.unitsPerEm) * size + letterSpacingEm * size;
  }
  return { d: parts.join(""), width: cursor - x - letterSpacingEm * size };
}

function capHeight(fontObj, size) {
  const h = fontObj.charToGlyph("H").getBoundingBox();
  return ((h.y2 - h.y1) / fontObj.unitsPerEm) * size;
}

function svg(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(w)} ${round(h)}" width="${round(w)}" height="${round(h)}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}
const round = (n) => Math.round(n * 100) / 100;

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
}

// ---- Symbol ---------------------------------------------------------------
for (const [key, v] of Object.entries(VARIANTS)) {
  write(`launchpad-symbol-${key}.svg`, svg(SIZE, SIZE, symbolGroup(v, `lp-sym-${key}`), "MD Genius Launchpad"));
}

// ---- Horizontal logo: symbol + LAUNCHPAD + two-line descriptor ------------
// Matches the sub-brand lockups (PICS, AURA, NOVA, PREP AI).
function horizontal(v, key, withDescriptor) {
  const symH = SIZE; // 108
  const nameSize = 92; // cap height ~ symbol height * 0.62
  const ch = capHeight(SG500, nameSize);
  const nameX = SIZE + 30;
  const baseline = SIZE / 2 + ch / 2;
  const name = textPath(SG500, "LAUNCHPAD", nameX, baseline, nameSize, 0.01);
  let width = nameX + name.width;
  let body = symbolGroup(v, `lp-h-${key}${withDescriptor ? "-d" : ""}`) + `<path fill="${v.text}" d="${name.d}"/>`;
  if (withDescriptor) {
    const subSize = 30;
    const subX = width + 40;
    const l1 = textPath(SG400, "AI Startup", subX, SIZE / 2 - 6, subSize);
    const l2 = textPath(SG400, "Accelerator Program", subX, SIZE / 2 + 32, subSize);
    body += `<path fill="${v.sub}" d="${l1.d}${l2.d}"/>`;
    width = subX + Math.max(l1.width, l2.width);
  }
  return svg(width + 2, symH, body, "MD Genius Launchpad");
}
for (const [key, v] of Object.entries(VARIANTS)) {
  write(`launchpad-logo-${key}.svg`, horizontal(v, key, true));
  write(`launchpad-logo-compact-${key}.svg`, horizontal(v, key, false));
}

// ---- Vertical logo: symbol above LAUNCHPAD --------------------------------
function vertical(v, key) {
  const nameSize = 56;
  const name0 = textPath(SG500, "LAUNCHPAD", 0, 0, nameSize, 0.01);
  const width = Math.max(name0.width, SIZE);
  const symX = (width - SIZE) / 2;
  const ch = capHeight(SG500, nameSize);
  const nameTop = SIZE + 28;
  const name = textPath(SG500, "LAUNCHPAD", (width - name0.width) / 2, nameTop + ch, nameSize, 0.01);
  const subSize = 22;
  const sub0 = textPath(SG400, "AI Startup Accelerator Program", 0, 0, subSize);
  const subBase = nameTop + ch + 40;
  const sub = textPath(SG400, "AI Startup Accelerator Program", (width - sub0.width) / 2, subBase, subSize);
  const w = Math.max(width, sub0.width);
  const shift = (w - width) / 2;
  const body =
    `<g transform="translate(${round(shift)} 0)">` +
    symbolGroup(v, `lp-v-${key}`, `translate(${round(symX)} 0)`) +
    `<path fill="${v.text}" d="${name.d}"/><path fill="${v.sub}" d="${sub.d}"/></g>`;
  return svg(w, subBase + 8, body, "MD Genius Launchpad");
}
for (const [key, v] of Object.entries(VARIANTS)) {
  write(`launchpad-logo-vertical-${key}.svg`, vertical(v, key));
}

// ---- App icon / favicon: reversed symbol on a navy gradient tile ----------
// Mirrors the guideline's submark-on-navy presentation (p.18).
function appIcon(size, padRatio, radiusRatio, name) {
  const pad = size * padRatio;
  const scale = (size - 2 * pad) / SIZE;
  const rr = size * radiusRatio;
  const body =
    `<defs><linearGradient id="lp-tile" x1="${size}" y1="0" x2="0" y2="${size}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${STEEL}"/><stop offset="1" stop-color="${NAVY}"/></linearGradient>${gradientDef("lp-tile-sym", WHITE, MIST)}</defs>` +
    `<rect width="${size}" height="${size}" rx="${rr}" fill="url(#lp-tile)"/>` +
    `<g transform="translate(${round(pad)} ${round(pad)}) scale(${round(scale * 1000) / 1000})" fill="url(#lp-tile-sym)">${SYMBOL_PATHS.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  write(name, svg(size, size, body, "MD Genius Launchpad"));
}
appIcon(512, 0.2, 0.22, "launchpad-app-icon.svg"); // rounded tile
appIcon(512, 0.28, 0, "launchpad-app-icon-maskable.svg"); // full-bleed, safe zone
appIcon(512, 0.2, 0, "launchpad-app-icon-square.svg"); // full-bleed for iOS (it rounds corners itself)
appIcon(64, 0.16, 0.22, "favicon.svg"); // tighter padding for 16-32px legibility

// ---- Open Graph image (1200x630) -----------------------------------------
{
  const W = 1200, H = 630;
  const logo = horizontalBodyForOg();
  const body =
    `<defs><linearGradient id="og-bg" x1="${W}" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4E6F86"/><stop offset="0.55" stop-color="${STEEL}"/><stop offset="1" stop-color="${NAVY}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#og-bg)"/>` +
    // alignment-node hairlines (brand "Shape & Texture")
    `<g stroke="${MIST}" stroke-opacity="0.35" stroke-width="1"><line x1="0" y1="140" x2="${W}" y2="140"/><line x1="860" y1="0" x2="860" y2="${H}"/></g>` +
    `<path fill="${MIST}" fill-opacity="0.8" d="M860 128 C861.5 136 864 138.5 872 140 C864 141.5 861.5 144 860 152 C858.5 144 856 141.5 848 140 C856 138.5 858.5 136 860 128Z"/>` +
    logo;
  write("og-image.svg", svg(W, H, body, "MD Genius Launchpad"));
}
function horizontalBodyForOg() {
  const v = VARIANTS.reversed;
  const scale = 1.25;
  const x = 90, y = 250;
  const nameSize = 92;
  const ch = capHeight(SG500, nameSize);
  const name = textPath(SG500, "LAUNCHPAD", SIZE + 30, SIZE / 2 + ch / 2, nameSize, 0.01);
  const tag = textPath(SG400, "The 8-week AI startup accelerator by MDGeniusAI", 0, SIZE + 90, 34);
  return (
    `<g transform="translate(${x} ${y}) scale(${scale})">` +
    symbolGroup(v, "lp-og") +
    `<path fill="${v.text}" d="${name.d}"/></g>` +
    `<path transform="translate(${x} ${y})" fill="${SMOKE}" fill-opacity="0.9" d="${tag.d}"/>`
  );
}

console.log("wrote", fs.readdirSync(OUT).length, "files to", OUT);
