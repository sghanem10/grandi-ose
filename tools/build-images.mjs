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
 * Les dimensions generees correspondent aux tailles d'affichage CSS reelles.
 * Le logo hero est genere en 600x600, soit exactement la source servie par le
 * fichier original : rendu garanti identique.
 */
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';

const SRC = 'img-src/logo-grandi-ose.png';
const OUT = 'public/img';

/**
 * FIDELITE DU LOGO HERO — seul arbitrage discutable de la phase 1.
 *
 * C'est la seule image assez grande a l'ecran (361px) pour que la
 * quantification en 256 couleurs se mesure. Compare par capture d'ecran reelle
 * (node tools/shoot.mjs), sur 1 296 000 pixels :
 *
 *   'leger'  palette 256 couleurs   39,8 Ko   4 376 pixels differents (0,34 %)
 *   'exact'  PNG 24 bits           135,2 Ko     589 pixels differents (0,04 %)
 *
 * Les 589 pixels residuels du mode 'exact' sont du bruit d'anticrenelage
 * incompressible : c'est le plancher de la mesure, pas un ecart de l'image.
 *
 * 'leger' est retenu : +95 Ko, soit la moitie du poids de la page, pour un
 * ecart concentre sur l'anticrenelage de traits d'un cinquieme de pixel, non
 * perceptible a 100 %. La regle R3 autorise explicitement d'alleger les images.
 * De plus ce logo n'est qu'un PLACEHOLDER : il sera remplace en phase 6 par la
 * vraie illustration.
 *
 * Basculer sur 'exact' si un rendu strictement conforme au bit pres est exige.
 * Les deux autres tailles (40px et 88px) sont identiques au pixel pres dans les
 * deux modes : elles restent en palette quoi qu'il arrive.
 */
const HERO_FIDELITY = 'leger'; // 'leger' | 'exact'

const PALETTE = { compressionLevel: 9, palette: true, colors: 256, effort: 10 };
const TRUECOLOR = { compressionLevel: 9 };

const TARGETS = [
  { name: 'logo-80.png', size: 80, opts: PALETTE, usage: 'nav + footer (affiche 40x40, x2 retina)' },
  { name: 'logo-176.png', size: 176, opts: PALETTE, usage: 'portrait a propos (affiche 88x88, x2 retina)' },
  {
    name: 'logo-600.png',
    size: 600,
    opts: HERO_FIDELITY === 'exact' ? TRUECOLOR : PALETTE,
    usage: `hero (affiche <=380px ; taille servie par l'original) [${HERO_FIDELITY}]`,
  },
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
