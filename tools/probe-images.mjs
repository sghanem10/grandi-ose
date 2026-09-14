/**
 * Comparatif de compression, pour choisir formats et qualites en connaissance de cause.
 * Aucune ecriture dans public/ : uniquement des mesures.
 *   node tools/probe-images.mjs
 */
import sharp from 'sharp';

const SRC = 'img-src/logo-grandi-ose.png';
const SIZES = [80, 176, 760];
const ko = (n) => (n / 1024).toFixed(1).padStart(6) + ' Ko';

for (const size of SIZES) {
  const base = sharp(SRC).resize(size, size, { kernel: 'lanczos3' });
  const rows = [];

  rows.push(['png   (optimise)', (await base.clone().png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer()).length]);
  rows.push(['webp  lossless  ', (await base.clone().webp({ lossless: true, effort: 6 }).toBuffer()).length]);
  for (const q of [80, 90, 95]) {
    rows.push([`webp  q${q}       `, (await base.clone().webp({ quality: q, effort: 6, alphaQuality: 100 }).toBuffer()).length]);
  }
  rows.push(['avif  lossless  ', (await base.clone().avif({ lossless: true, effort: 6 }).toBuffer()).length]);
  for (const q of [70, 80, 90]) {
    rows.push([`avif  q${q}       `, (await base.clone().avif({ quality: q, effort: 6 }).toBuffer()).length]);
  }

  console.log(`\n=== ${size}x${size} ===`);
  for (const [label, bytes] of rows) console.log(`  ${label}  ${ko(bytes)}`);
}

console.log(`\nReference : base64 inline actuel = ${ko(148567 * 4 * 1.333)} pour les 4 occurrences.`);
