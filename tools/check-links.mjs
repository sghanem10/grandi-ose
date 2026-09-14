/**
 * Verification du maillage interne, apres l'eclatement en plusieurs pages.
 *   node tools/check-links.mjs
 *
 * Sans generateur de site, les liens et les blocs partages (en-tete, pied de
 * page) sont recopies a la main dans chaque fichier. C'est le point faible de
 * l'approche : une faute de frappe ne se voit pas. Ce script la trouve.
 *
 * Controles :
 *   1. tout href interne pointe vers un fichier existant ;
 *   2. toute ancre #xxx correspond a un id present dans la page visee ;
 *   3. toute ressource (css, js, img, police) existe ;
 *   4. chaque page a exactement un <h1> ;
 *   5. la hierarchie des titres ne saute pas de niveau ;
 *   6. chaque page porte un <title> et une <meta description> uniques ;
 *   7. l'en-tete et le pied de page sont identiques partout, au marqueur
 *      aria-current pres ;
 *   8. aucune page n'est orpheline (chacune est citee par une autre) ;
 *   9. les <span class="todo"> restants sont listes, pour ne rien oublier.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public';
const pages = readdirSync(DIR).filter((f) => f.endsWith('.html')).sort();

let failures = 0;
const fail = (msg) => { failures++; console.log(`   /!\\ ${msg}`); };

const docs = new Map();
for (const p of pages) docs.set(p, readFileSync(join(DIR, p), 'utf8'));

const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');

// --- 1 a 3 : liens et ressources ---------------------------------------------
console.log('=== 1. Liens internes et ressources ===');
const referenced = new Set();
let linkCount = 0;

for (const [page, rawHtml] of docs) {
  const html = stripComments(rawHtml);
  const refs = [
    ...[...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]),
  ];

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    linkCount++;

    const [path, hash] = ref.split('#');
    const target = path === '' ? page : path;

    if (!existsSync(join(DIR, target))) {
      fail(`${page} -> « ${ref} » : fichier introuvable`);
      continue;
    }
    if (target.endsWith('.html')) referenced.add(target);

    if (hash) {
      const targetHtml = docs.get(target) ?? readFileSync(join(DIR, target), 'utf8');
      if (!idsOf(targetHtml).has(hash)) fail(`${page} -> « ${ref} » : ancre #${hash} absente de ${target}`);
    }
  }
}
if (!failures) console.log(`   OK : ${linkCount} liens et ressources, tous resolus.`);

// --- 4 et 5 : hierarchie des titres ------------------------------------------
console.log('\n=== 2. Titres ===');
for (const [page, rawHtml] of docs) {
  const html = stripComments(rawHtml);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1 = levels.filter((l) => l === 1).length;

  if (h1 !== 1) fail(`${page} : ${h1} balise(s) <h1>, il en faut exactement une`);

  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      fail(`${page} : saut de h${levels[i - 1]} a h${levels[i]}`);
      break;
    }
  }
}
if (!failures) console.log(`   OK : un <h1> par page, aucune hierarchie cassee.`);

// --- 6 : title et description ------------------------------------------------
console.log('\n=== 3. <title> et meta description ===');
const titles = new Map();
const descs = new Map();
for (const [page, html] of docs) {
  const t = html.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim();
  const d = html.match(/<meta name="description" content="([^"]*)"/)?.[1].trim();

  if (!t) fail(`${page} : <title> manquant`);
  else {
    if (titles.has(t)) fail(`${page} : <title> identique a ${titles.get(t)}`);
    titles.set(t, page);
    if (t.length > 65) console.log(`   ~ ${page} : titre de ${t.length} caracteres (au-dela de ~60, Google tronque)`);
  }

  if (!d) fail(`${page} : meta description manquante`);
  else {
    if (descs.has(d)) fail(`${page} : description identique a ${descs.get(d)}`);
    descs.set(d, page);
    if (d.length > 165) console.log(`   ~ ${page} : description de ${d.length} caracteres (au-dela de ~160, tronquee)`);
  }
}
console.log(`   ${titles.size} titres et ${descs.size} descriptions, tous distincts.`);

// --- 7 : blocs partages identiques -------------------------------------------
console.log('\n=== 4. En-tete et pied de page partages ===');
const block = (html, tag) => {
  const m = html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`));
  if (!m) return null;
  return m[0]
    // Marqueur de page courante : difference attendue.
    .replace(/ aria-current="page"/g, '')
    // Cible du bouton d'appel a l'action : sur la page Contact il pointe vers
    // l'ancre du formulaire plutot que de recharger la page pour rien.
    .replace(/(class="nav-cta" href=)"[^"]*"/g, '$1"*"')
    .replace(/href="[^"]*"( class="nav-cta")/g, 'href="*"$1');
};
for (const tag of ['header', 'footer']) {
  const ref = block(docs.get('index.html'), tag);
  const diff = [...docs].filter(([p]) => p !== 'index.html').filter(([, h]) => block(h, tag) !== ref).map(([p]) => p);
  if (diff.length) fail(`<${tag}> different de celui d'index.html dans : ${diff.join(', ')}`);
  else console.log(`   OK : <${tag}> identique sur les ${pages.length} pages.`);
}

// --- 8 : pages orphelines ----------------------------------------------------
console.log('\n=== 5. Pages orphelines ===');
const orphans = pages.filter((p) => p !== 'index.html' && !referenced.has(p));
if (orphans.length) fail(`jamais liee(s) depuis une autre page : ${orphans.join(', ')}`);
else console.log(`   OK : les ${pages.length} pages sont atteignables par un lien.`);

// --- 9 : informations manquantes ---------------------------------------------
console.log('\n=== 6. Informations restant a fournir ===');
let todos = 0;
for (const [page, rawHtml] of docs) {
  // Commentaires retires d'abord : ils citent eux-memes <span class="todo">,
  // ce qui faisait deborder la capture jusqu'au </span> suivant.
  const found = [...stripComments(rawHtml).matchAll(/<span class="todo">([\s\S]*?)<\/span>/g)]
    .map((m) => m[1].trim());
  if (found.length) {
    console.log(`   ${page} (${found.length})`);
    found.forEach((f) => console.log(`     - ${f}`));
    todos += found.length;
  }
}
console.log(`   ${todos} information(s) a completer avant publication.`);
console.log('   (signalees en jaune sur le site, impossible de les manquer)');

// --- Verdict -----------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(failures === 0
  ? `VERDICT : ${pages.length} pages, maillage coherent, aucune erreur.`
  : `VERDICT : ${failures} probleme(s) a corriger.`);
console.log('='.repeat(60));
process.exit(failures === 0 ? 0 : 1);
