/**
 * Copie les woff2 necessaires depuis @fontsource vers public/fonts/
 * et genere scss/base/_fonts.scss.
 *   npm run fonts
 *
 * Les unicode-range ne sont PAS ecrits a la main : ils sont extraits des CSS
 * @fontsource, qui reprennent ceux de Google Fonts. On reproduit ainsi a
 * l'identique le decoupage par sous-ensemble, donc le meme comportement de
 * chargement conditionnel qu'aujourd'hui.
 *
 * FACES : uniquement celles que le CSS du site demande reellement.
 *   Playfair Display  600 normal  -> h1,h2,h3, .nav-logo
 *   Playfair Display  700 normal  -> .apropos-text h4 (gras par defaut du navigateur)
 *   Playfair Display  500 italic  -> SEULE fonte italique fournie par l'URL Google
 *                                    d'origine (ital,wght@1,500). Le navigateur la
 *                                    selectionne aujourd'hui pour tous les italiques,
 *                                    qu'ils soient demandes en 400 (.tagline-strip,
 *                                    .pull, .apropos-quote, .step .num, footer .tag)
 *                                    ou en 600 (.hero h1 em). On la reprend telle
 *                                    quelle : ajouter un italique 400 ou 600 changerait
 *                                    le rendu.
 *   Nunito            400 normal  -> body
 *   Nunito            600 normal  -> .nav-links
 *   Nunito            700 normal  -> boutons, labels, .eyebrow, .section-tag...
 *
 * Playfair 500 normal et Nunito 300/500 sont declares dans l'URL Google mais
 * aucune regle ne les demande : les retirer ne peut rien changer au rendu.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const OUT_FONTS = 'public/fonts';
const OUT_SCSS = 'scss/base/_fonts.scss';
const SUBSETS = ['latin', 'latin-ext'];

const FACES = [
  { pkg: '@fontsource/nunito', family: 'Nunito', weight: 400, style: 'normal', slug: 'nunito', preload: true },
  { pkg: '@fontsource/nunito', family: 'Nunito', weight: 600, style: 'normal', slug: 'nunito' },
  { pkg: '@fontsource/nunito', family: 'Nunito', weight: 700, style: 'normal', slug: 'nunito' },
  { pkg: '@fontsource/playfair-display', family: 'Playfair Display', weight: 600, style: 'normal', slug: 'playfair-display', preload: true },
  { pkg: '@fontsource/playfair-display', family: 'Playfair Display', weight: 700, style: 'normal', slug: 'playfair-display' },
  { pkg: '@fontsource/playfair-display', family: 'Playfair Display', weight: 500, style: 'italic', slug: 'playfair-display' },
];

/** Extrait les unicode-range par sous-ensemble depuis le CSS agrege de @fontsource. */
function unicodeRanges({ pkg, slug, weight, style }) {
  const file = `node_modules/${pkg}/${weight}${style === 'italic' ? '-italic' : ''}.css`;
  const css = readFileSync(file, 'utf8');
  const ranges = {};
  for (const subset of SUBSETS) {
    // Ancrage sur le slug ET le sous-ensemble exact : sans ca, un motif glouton
    // confond "nunito-latin-ext-400-normal" avec le sous-ensemble "ext".
    const re = new RegExp(
      `/\\*\\s*${slug}-${subset}-${weight}-${style}\\s*\\*/[\\s\\S]*?unicode-range:\\s*([^;]+);`
    );
    const m = css.match(re);
    if (m) ranges[subset] = m[1].trim();
  }
  return ranges;
}

mkdirSync(OUT_FONTS, { recursive: true });

let scss = `// GENERE PAR tools/build-fonts.mjs - ne pas editer a la main.
// Polices auto-hebergees : aucune requete vers fonts.googleapis.com / fonts.gstatic.com.
// Motif : supprime deux connexions tierces bloquantes avant le premier rendu du texte,
// et supprime le transfert de l'adresse IP du visiteur hors UE (cf. ROADMAP 1.4).

`;

let totalBytes = 0;
const preloads = [];

for (const face of FACES) {
  const ranges = unicodeRanges(face);

  for (const subset of SUBSETS) {
    const filename = `${face.slug}-${subset}-${face.weight}-${face.style}.woff2`;
    const src = `node_modules/${face.pkg}/files/${filename}`;
    copyFileSync(src, `${OUT_FONTS}/${filename}`);
    totalBytes += readFileSync(src).length;

    if (!ranges[subset]) throw new Error(`unicode-range introuvable pour ${filename}`);

    scss += `@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: url('../fonts/${filename}') format('woff2');
  unicode-range: ${ranges[subset]};
}

`;
    if (face.preload && subset === 'latin') preloads.push(filename);
  }
  console.log(`${face.family} ${face.weight} ${face.style}`.padEnd(34) + SUBSETS.join(' + '));
}

writeFileSync(OUT_SCSS, scss);

console.log(`\n${FACES.length * SUBSETS.length} fichiers woff2 -> ${OUT_FONTS}/ (${(totalBytes / 1024).toFixed(0)} Ko sur disque)`);
console.log(`${OUT_SCSS} genere.`);
console.log(`\nNote : le navigateur ne telecharge un fichier que si la page utilise un`);
console.log(`caractere de son unicode-range. Verifie sur le texte actuel : tous les`);
console.log(`caracteres employes tiennent dans le sous-ensemble "latin" (le "oe" de`);
console.log(`"soeur" est en U+0153, inclus dans U+0152-0153 ; le tiret cadratin et`);
console.log(`les points de suspension sont dans U+2000-206F). Seules les 6 fontes`);
console.log(`latin sont donc telechargees. Les latin-ext sont livrees en filet de`);
console.log(`securite pour de futures modifications de texte, sans cout aujourd'hui.`);
console.log(`\nA precharger dans le <head> :`);
preloads.forEach((f) => console.log(`  <link rel="preload" href="fonts/${f}" as="font" type="font/woff2" crossorigin>`));
