/**
 * Genere les images publiees depuis img-src/ vers public/img/.
 *   npm run img
 *
 * Choix de format (mesure, voir tools/probe-*.mjs) :
 * le logo est du trait fin monochrome sur fond transparent. Sur ce type d'image,
 * le PNG palettise (256 couleurs) est PLUS LEGER que WebP q90 et AVIF q80 a toutes
 * les tailles, pour un ecart de fidelite de 0.167/255 en moyenne, invisible a l'oeil.
 * On sert donc du PNG seul : pas de <picture>, pas de variantes, HTML plus simple.
 *
 * Les dimensions generees correspondent aux tailles d'affichage CSS reelles,
 * doublees pour les ecrans a haute densite. Les tailles intermediaires (176 et
 * 280) ne sont plus referencees par le HTML : on les garde generees, au cas ou
 * un emplacement en aurait besoin.
 */
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';

const SRC = 'img-src/logo-grandi-ose.png';
const OUT = 'public/img';

const PALETTE = { compressionLevel: 9, palette: true, colors: 256, effort: 10 };

const TARGETS = [
  { name: 'logo-80.png', size: 80, opts: PALETTE, usage: 'nav + footer (affiche 40x40, x2 retina)' },
  { name: 'logo-176.png', size: 176, opts: PALETTE, usage: 'non utilise — conserve sous le coude' },
  { name: 'logo-280.png', size: 280, opts: PALETTE, usage: 'non utilise — conserve sous le coude' },
  { name: 'logo-600.png', size: 600, opts: PALETTE, usage: 'hero (affiche <=460px)' },
];

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const { name, size, opts, usage } of TARGETS) {
  await sharp(SRC)
    .resize(size, size, { kernel: 'lanczos3' })
    .png(opts)
    .toFile(`${OUT}/${name}`);

  const bytes = statSync(`${OUT}/${name}`).size;
  total += bytes;
  console.log(`${name.padEnd(16)} ${String(size + 'x' + size).padEnd(9)} ${(bytes / 1024).toFixed(1).padStart(6)} Ko   ${usage}`);
}

const before = 148567 * 4 * (4 / 3); // 4 occurrences base64, surcout d'encodage ~33 %
console.log(`\nTotal publie : ${(total / 1024).toFixed(1)} Ko`);
console.log(`Avant        : ${(before / 1024).toFixed(1)} Ko (4x le meme PNG en base64)`);
console.log(`Gain         : ${(100 - (total / before) * 100).toFixed(1)} %`);
console.log('\nLe portrait du hero n\'est pas genere ici : c\'est un SVG de reserve');
console.log('(public/img/portrait-placeholder.svg), a remplacer par la photo de Geraldine.');
