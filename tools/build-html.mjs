/**
 * Genere public/index.html a partir de grandi-ose-2.html.
 *   node tools/build-html.mjs
 *
 * POURQUOI GENERER PLUTOT QUE RECOPIER A LA MAIN
 * Le contenu redactionnel est l'actif le plus precieux du site et la regle R2
 * interdit de le modifier. En derivant le HTML de l'original par substitutions
 * ciblees, on garantit qu'aucun caractere de texte ne derive : tout ce qui n'est
 * pas explicitement remplace ci-dessous est recopie a l'octet.
 *
 * A n'executer qu'UNE FOIS. Ensuite, public/index.html devient le fichier de
 * travail edite a la main, et ce script n'a plus d'utilite (il reste comme trace
 * de la transformation exacte appliquee).
 *
 * SUBSTITUTIONS APPLIQUEES (et rien d'autre) :
 *   1. <style> inline           -> <link rel="stylesheet" href="css/main.css">
 *   2. CDN Google Fonts         -> preload des woff2 auto-heberges
 *   3. 4x <img src="data:...">  -> fichiers PNG optimises + width/height
 *   4. style="" du SVG hero     -> class="botanical botanical--hero"
 *   5. style="" du .section-intro metier -> class="section-intro u-mb-24"
 *   6. style="" du <img> footer -> regle footer .nav-logo img
 *   7. ajout de <script type="module" src="js/main.js"> (amorce vide)
 *
 * Le <title> et la <meta description> sont repris tels quels : l'enrichissement
 * SEO du <head> est la phase 2, pas la phase 1.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'grandi-ose-2.html';
const OUT = 'public/index.html';

let html = readFileSync(SRC, 'utf8');

const applied = [];
/** Remplacement unique et verifie : echoue bruyamment si le motif est introuvable. */
function sub(label, pattern, replacement) {
  const before = html;
  html = html.replace(pattern, replacement);
  if (html === before) throw new Error(`Motif introuvable, transformation impossible : ${label}`);
  applied.push(label);
}

// --- 1 + 2. <head> : feuille externe et polices locales ----------------------
const oldHead = html.slice(html.indexOf('<link rel="preconnect"'), html.indexOf('</style>') + '</style>'.length);

sub(
  'head : CDN Google Fonts + <style> inline -> css/main.css + polices locales',
  oldHead,
  `<link rel="stylesheet" href="css/main.css">

<!-- Polices auto-hebergees : les deux fontes du hero sont prechargees pour
     eviter un rendu de texte differe. Voir tools/build-fonts.mjs. -->
<link rel="preload" href="fonts/nunito-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/playfair-display-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>`
);

// --- 3. Images : base64 -> fichiers -----------------------------------------
// Les 4 occurrences sont le MEME PNG 600x600 (md5 identiques). On sert desormais
// trois fichiers dimensionnes pour leur usage reel, dont un reutilise deux fois.
// Ordre d'apparition dans le document : nav, hero, portrait, footer.
const IMAGES = [
  { label: 'nav', file: 'img/logo-80.png', w: 80, h: 80 },
  { label: 'hero', file: 'img/logo-600.png', w: 600, h: 600 },
  { label: 'portrait', file: 'img/logo-176.png', w: 176, h: 176 },
  { label: 'footer', file: 'img/logo-80.png', w: 80, h: 80 },
];

let imgIndex = 0;
html = html.replace(/<img([^>]*?)src="data:image\/png;base64,[A-Za-z0-9+/=]+"([^>]*?)>/g, (_m, pre, post) => {
  const { label, file, w, h } = IMAGES[imgIndex++];
  // L'attribut style du logo de footer part en CSS (footer .nav-logo img).
  post = post.replace(/\s*style="[^"]*"/, '');
  applied.push(`image ${label} : base64 -> ${file}`);
  // width/height explicites : reservent le ratio avant chargement et suppriment
  // le decalage de mise en page. Le rendu final est inchange, le CSS restant
  // prioritaire sur ces attributs partout ou il fixe une taille.
  return `<img${pre}src="${file}" width="${w}" height="${h}"${post}>`;
});
if (imgIndex !== 4) throw new Error(`4 images attendues, ${imgIndex} traitees`);

// --- 4. SVG botanique du hero ----------------------------------------------
sub(
  'svg hero : style inline -> .botanical--hero',
  '<svg class="botanical" style="right:-80px;top:60px;width:380px;"',
  '<svg class="botanical botanical--hero"'
);

// --- 5. .section-intro de la section metier ---------------------------------
sub(
  'section-intro metier : style inline -> .u-mb-24',
  '<p class="section-intro" style="margin-bottom:24px;">',
  '<p class="section-intro u-mb-24">'
);

// --- 7. Amorce JavaScript ---------------------------------------------------
// Volontairement vide en phase 1 : ajouter un comportement serait une
// modification fonctionnelle. Les modules arrivent en phases 4 et 6.
sub(
  'script : amorce js/main.js',
  '</body>',
  '<script type="module" src="js/main.js"></script>\n\n</body>'
);

writeFileSync(OUT, html, 'utf8');

console.log(`${OUT} genere.\n`);
applied.forEach((a) => console.log(`  - ${a}`));
console.log(`\nTaille : ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} Ko`);
console.log(`Avant  : ${(readFileSync(SRC).length / 1024).toFixed(1)} Ko`);
