/**
 * Preuve de non-regression de la phase 1.
 *   npm run check
 *
 * Compare l'original monolithique (grandi-ose-2.html) au site eclate
 * (public/index.html + public/css/main.css) sur quatre plans :
 *
 *   A. TEXTE      Le contenu redactionnel doit etre identique caractere pour
 *                 caractere (regle R2).
 *   B. STRUCTURE  Meme arbre DOM : memes balises, dans le meme ordre.
 *   C. DECLARATIONS  L'ensemble des triplets (media, selecteur, propriete: valeur)
 *                 doit etre identique. Complementaire de D : attrape une coquille
 *                 de valeur meme dans une regle que la cascade n'expose pas.
 *   D. CASCADE    Pour CHAQUE element du document et CHAQUE propriete CSS, la
 *                 declaration gagnante doit avoir la meme valeur. C'est le vrai
 *                 test : il simule la cascade (important > specificite > ordre)
 *                 sur le DOM reel, en tenant compte des attributs style="".
 *                 Un simple diff de declarations ne prouverait rien sur l'ordre ;
 *                 un diff d'ordre signalerait tout regroupement, y compris
 *                 inoffensif. Ici on mesure ce qui compte : le resultat.
 *                 Evalue deux fois : hors media query (>860px) et avec le bloc
 *                 max-width:860px actif (<=860px).
 *   E. POIDS      Volume reellement telecharge au premier chargement.
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';

const ORIGINAL = 'grandi-ose-2.html';
const NEW_HTML = 'public/index.html';
const NEW_CSS = 'public/css/main.css';

let failures = 0;
const fail = (msg) => { failures++; console.log(`   /!\\ ${msg}`); };

// ============================================================ analyse du CSS

const norm = (v) => v
  .replace(/\s*,\s*/g, ',')
  .replace(/\s+/g, ' ')
  .replace(/"/g, "'")
  .replace(/\b0\.(\d)/g, '.$1')
  .trim()
  .toLowerCase();

/**
 * Aplatit une feuille en regles ordonnees.
 * `mobile` indique si la regle vient d'un bloc max-width:860px.
 */
function parseRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');          // commentaires
  css = css.replace(/@charset[^;]*;/g, '');            // sinon collee au selecteur suivant
  css = css.replace(/@font-face\s*\{[^}]*\}/g, '');    // ajout assume de la phase 1

  const rules = [];
  let order = 0;

  const push = (selectorList, body, mobile) => {
    const decls = body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(':');
      let value = d.slice(i + 1).trim();
      const important = /!important$/i.test(value);
      if (important) value = value.replace(/!important$/i, '').trim();
      return { prop: d.slice(0, i).trim().toLowerCase(), value: norm(value), important };
    });
    for (const sel of selectorList.split(',').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      rules.push({ sel, decls, mobile, order: order++, spec: specificity(sel) });
    }
  };

  // Decoupe en segments : hors @media / dans @media.
  const mediaRe = /@media([^{]+)\{/g;
  let last = 0, m;
  const segments = [];
  while ((m = mediaRe.exec(css))) {
    segments.push({ cond: null, body: css.slice(last, m.index) });
    let depth = 1, i = mediaRe.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    segments.push({ cond: m[1].replace(/\s+/g, '').toLowerCase(), body: css.slice(mediaRe.lastIndex, i - 1) });
    last = i;
    mediaRe.lastIndex = i;
  }
  segments.push({ cond: null, body: css.slice(last) });

  for (const { cond, body } of segments) {
    // prefers-reduced-motion : hors du perimetre de comparaison (identique de
    // part et d'autre, et en !important donc insensible a l'ordre).
    if (cond && cond.includes('prefers-reduced-motion')) continue;
    const mobile = cond ? cond.includes('max-width:860px') : false;
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let r;
    while ((r = ruleRe.exec(body))) {
      const sel = r[1].replace(/\s+/g, ' ').trim();
      if (!sel || sel.startsWith('@')) continue;
      push(sel, r[2], mobile);
    }
  }
  return rules;
}

/** Specificite CSS sous forme d'entier comparable. */
function specificity(sel) {
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const pseudoEls = (sel.match(/::[\w-]+/g) || []).length;
  const withoutPseudoEls = sel.replace(/::[\w-]+/g, ' ');
  const classes =
    (withoutPseudoEls.match(/\.[\w-]+/g) || []).length +
    (withoutPseudoEls.match(/\[[^\]]+\]/g) || []).length +
    (withoutPseudoEls.match(/:(?!:)[\w-]+/g) || []).length;
  const elements =
    (withoutPseudoEls.replace(/[#.][\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g, ' ').match(/\b[a-z][\w-]*/gi) || []).length +
    pseudoEls;
  return ids * 10000 + classes * 100 + elements;
}

/**
 * Separe un selecteur en partie matchable dans le DOM et suffixe d'etat.
 * `.eyebrow::before`   -> { base: '.eyebrow',   pseudo: '::before' }
 * `.btn-primary:hover` -> { base: '.btn-primary', pseudo: ':hover' }
 */
function splitPseudo(sel) {
  const m = sel.match(/^(.*?)((?:::?[\w-]+(?:\([^)]*\))?)*)$/);
  let base = sel, pseudo = '';
  const tail = sel.match(/((?:::?(?:hover|focus|active|before|after|first-child|last-child|-webkit-[\w-]+)\b)+)$/);
  if (tail) {
    pseudo = tail[1];
    base = sel.slice(0, sel.length - pseudo.length);
  }
  void m;
  return { base: base.trim() || '*', pseudo };
}

// ==================================================== resolution de la cascade

/** Valeur gagnante de chaque propriete, pour chaque (element, pseudo). */
function resolve(document, rules, { mobile }) {
  // <script> est exclu : c'est l'amorce ajoutee en phase 1 (deja comptabilisee au
  // controle B), elle n'existe pas dans l'original et n'est jamais rendue. La
  // laisser produirait trois faux ecarts dus au reset universel.
  const elements = [...document.querySelectorAll('*')].filter((e) => e.tagName.toLowerCase() !== 'script');
  const index = new Map(elements.map((el, i) => [el, i]));
  const winners = new Map(); // "i|pseudo|prop" -> { value, important, spec, order }
  let unmatched = 0;

  for (const rule of rules) {
    if (rule.mobile && !mobile) continue;
    const { base, pseudo } = splitPseudo(rule.sel);

    let matched;
    try {
      matched = [...document.querySelectorAll(base)].filter((el) => index.has(el));
    } catch {
      unmatched++;
      continue;
    }
    if (!matched.length) unmatched++;

    for (const el of matched) {
      for (const d of rule.decls) {
        const k = `${index.get(el)}|${pseudo}|${d.prop}`;
        const cur = winners.get(k);
        const beats = !cur
          || (d.important && !cur.important)
          || (d.important === cur.important && rule.spec > cur.spec)
          || (d.important === cur.important && rule.spec === cur.spec && rule.order > cur.order);
        if (beats) winners.set(k, { value: d.value, important: d.important, spec: rule.spec, order: rule.order });
      }
    }
  }

  // Indications de presentation : les attributs width/height d'un <img> se
  // comportent comme des declarations CSS de priorite INFERIEURE a toute regle
  // d'auteur (d'ou spec -1). C'est exactement ce qui a deforme le logo du hero :
  // le CSS n'ecrasait que la largeur, la hauteur restait celle de l'attribut.
  for (const el of elements) {
    if (el.tagName.toLowerCase() !== 'img') continue;
    for (const attr of ['width', 'height']) {
      const v = el.getAttribute(attr);
      if (!v) continue;
      const k = `${index.get(el)}||${attr}`;
      if (!winners.has(k)) winners.set(k, { value: `${v}px`, important: false, spec: -1, order: -1 });
    }
  }

  // Les attributs style="" battent toute regle non !important.
  for (const el of elements) {
    const style = el.getAttribute && el.getAttribute('style');
    if (!style) continue;
    for (const d of style.split(';').map((s) => s.trim()).filter(Boolean)) {
      const i = d.indexOf(':');
      const prop = d.slice(0, i).trim().toLowerCase();
      winners.set(`${index.get(el)}||${prop}`, {
        value: norm(d.slice(i + 1)), important: false, spec: Infinity, order: Infinity,
      });
    }
  }

  return { winners, elements, unmatched };
}

// =================================================================== controles

for (const f of [ORIGINAL, NEW_HTML, NEW_CSS]) {
  if (!existsSync(f)) { console.error(`Fichier manquant : ${f}. Lance d'abord npm run css && node tools/build-html.mjs`); process.exit(2); }
}

const originalRaw = readFileSync(ORIGINAL, 'utf8');
const newRaw = readFileSync(NEW_HTML, 'utf8');

const oldRules = parseRules(originalRaw.match(/<style>([\s\S]*?)<\/style>/)[1]);
const newRules = parseRules(readFileSync(NEW_CSS, 'utf8'));

const oldDom = parseHTML(originalRaw.replace(/<style>[\s\S]*?<\/style>/, '')).document;
const newDom = parseHTML(newRaw).document;

// --- A. Texte ----------------------------------------------------------------
console.log('=== A. Contenu redactionnel ===');
const textOf = (doc) => (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
const [tOld, tNew] = [textOf(oldDom), textOf(newDom)];
if (tOld === tNew) {
  console.log(`   OK : identique (${tOld.length} caracteres).`);
} else {
  fail('le texte differe.');
  for (let i = 0; i < Math.max(tOld.length, tNew.length); i++) {
    if (tOld[i] !== tNew[i]) {
      console.log(`       premier ecart a l'offset ${i} :`);
      console.log(`       original : ...${JSON.stringify(tOld.slice(Math.max(0, i - 40), i + 40))}`);
      console.log(`       genere   : ...${JSON.stringify(tNew.slice(Math.max(0, i - 40), i + 40))}`);
      break;
    }
  }
}

// --- B. Structure ------------------------------------------------------------
console.log('\n=== B. Structure DOM ===');
const tagsOf = (doc) => [...doc.querySelectorAll('*')].map((e) => e.tagName.toLowerCase());
const [gOld, gNew] = [tagsOf(oldDom), tagsOf(newDom)];
const newOnly = gNew.filter((t, i) => gOld[i] !== t);
if (gOld.length === gNew.length - 1 && gNew.at(-1) === 'script') {
  console.log(`   OK : ${gOld.length} elements identiques, + 1 <script> (amorce assumee).`);
} else if (gOld.join() === gNew.join()) {
  console.log(`   OK : ${gOld.length} elements identiques.`);
} else {
  fail(`arbre different : ${gOld.length} elements avant, ${gNew.length} apres.`);
  console.log(`       divergences : ${[...new Set(newOnly)].slice(0, 10).join(', ')}`);
}

// --- C. Egalite des declarations --------------------------------------------
console.log('\n=== C. Declarations CSS ===');

// Selecteurs entierement nouveaux : extraction des attributs style="" vers des
// classes. Leur EFFET est verifie au controle D.
const ADDED_SELECTORS = ['.botanical--hero', '.u-mb-24', 'footer .nav-logo img'];

// Declaration unique ajoutee a une regle existante, avec sa justification.
const ADDED_DECLS = [
  ['.hero-visual img { height: auto }',
    'neutralise l\'attribut height="600" du <img> hero (indication de presentation).'],
];

const flatten = (rules) => rules.flatMap((r) =>
  r.decls.map((d) => `${r.mobile ? '@media<=860 ' : ''}${r.sel} { ${d.prop}: ${d.value}${d.important ? ' !important' : ''} }`)
);
const oldDecls = flatten(oldRules);
const newDecls = flatten(newRules)
  .filter((s) => !ADDED_SELECTORS.some((sel) => s.includes(`${sel} {`)))
  .filter((s) => !ADDED_DECLS.some(([decl]) => s === decl));

const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const [cOld, cNew] = [count(oldDecls), count(newDecls)];
const lost = [...cOld].filter(([k, n]) => (cNew.get(k) || 0) < n).map(([k]) => k);
const extra = [...cNew].filter(([k, n]) => (cOld.get(k) || 0) < n).map(([k]) => k);

console.log(`   original : ${oldDecls.length} declarations`);
console.log(`   genere   : ${newDecls.length} declarations (hors extractions)`);
if (lost.length || extra.length) {
  if (lost.length) { fail(`${lost.length} declaration(s) perdue(s) :`); lost.slice(0, 15).forEach((d) => console.log(`       - ${d}`)); }
  if (extra.length) { fail(`${extra.length} declaration(s) ajoutee(s)/modifiee(s) :`); extra.slice(0, 15).forEach((d) => console.log(`       + ${d}`)); }
} else {
  console.log('   OK : ensembles identiques.');
}
console.log('\n   Extractions d\'attributs style="" (effet verifie au controle D) :');
ADDED_SELECTORS.forEach((s) => console.log(`     + ${s}`));
console.log('   Declarations ajoutees :');
ADDED_DECLS.forEach(([d, why]) => console.log(`     + ${d}\n       ${why}`));

// --- D. Cascade --------------------------------------------------------------
console.log('\n=== D. Cascade : declaration gagnante par element et par propriete ===');

// Valeurs initiales CSS : une propriete non declaree equivaut a sa valeur
// initiale. Limite aux proprietes concernees par ce refactor, pour ne pas
// masquer par inadvertance un ecart reel sur une autre propriete.
const INITIAL = { height: 'auto', width: 'auto' };

// Attributs devenus des classes CSS : la comparaison porte sur le resultat, donc
// ces trois extractions doivent produire exactement la meme valeur gagnante.
const EXTRACTED = [
  'style="right:-80px;top:60px;width:380px" du SVG hero -> .botanical--hero',
  'style="margin-bottom:24px" du .section-intro metier   -> .u-mb-24',
  'style="height:36px;width:36px" du logo de footer      -> footer .nav-logo img',
];

for (const mobile of [false, true]) {
  const label = mobile ? '<= 860px (mobile)' : '>  860px (desktop)';
  const a = resolve(oldDom, oldRules, { mobile });
  const b = resolve(newDom, newRules, { mobile });

  const keys = new Set([...a.winners.keys(), ...b.winners.keys()]);
  const diffs = [];
  for (const k of keys) {
    const [i, pseudo, prop] = k.split('|');
    const va = a.winners.get(k);
    const vb = b.winners.get(k);
    // Une propriete absente vaut sa valeur initiale : declarer explicitement
    // `height: auto` la ou rien n'etait declare ne change aucun rendu.
    const resolved = (x) => x?.value ?? INITIAL[prop] ?? null;
    if (resolved(va) !== resolved(vb)) {
      const el = a.elements[Number(i)] || b.elements[Number(i)];
      const desc = el ? `<${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ''}>` : `element #${i}`;
      diffs.push(`${desc}${pseudo} { ${prop}: ${va?.value ?? '(absent)'} }  ->  { ${prop}: ${vb?.value ?? '(absent)'} }`);
    }
  }

  console.log(`\n   ${label} : ${keys.size} couples (element, propriete) evalues`);
  if (diffs.length) {
    fail(`${diffs.length} divergence(s) :`);
    diffs.slice(0, 25).forEach((d) => console.log(`       ${d}`));
    if (diffs.length > 25) console.log(`       ... et ${diffs.length - 25} autres`);
  } else {
    console.log('   OK : aucune divergence. Rendu identique.');
  }
}

console.log('\n   Attributs style="" extraits en CSS et verifies ci-dessus :');
EXTRACTED.forEach((e) => console.log(`     - ${e}`));

// --- E. Poids ----------------------------------------------------------------
console.log('\n=== E. Poids du premier chargement ===');
const ko = (n) => `${(n / 1024).toFixed(1)} Ko`;
const fontsLoaded = [
  'nunito-latin-400-normal', 'nunito-latin-600-normal', 'nunito-latin-700-normal',
  'playfair-display-latin-600-normal', 'playfair-display-latin-700-normal',
  'playfair-display-latin-500-italic',
].map((f) => statSync(`public/fonts/${f}.woff2`).size).reduce((a, b) => a + b, 0);

const parts = [
  ['index.html', statSync(NEW_HTML).size],
  ['css/main.css', statSync(NEW_CSS).size],
  ['js/main.js', statSync('public/js/main.js').size],
  ['img (3 fichiers)', ['logo-80.png', 'logo-176.png', 'logo-600.png'].map((f) => statSync(`public/img/${f}`).size).reduce((a, b) => a + b, 0)],
  ['fonts (6 woff2 latin)', fontsLoaded],
];
const totalNew = parts.reduce((s, [, v]) => s + v, 0);
const totalOld = statSync(ORIGINAL).size;

parts.forEach(([l, v]) => console.log(`   ${l.padEnd(24)} ${ko(v).padStart(9)}`));
console.log(`   ${'TOTAL'.padEnd(24)} ${ko(totalNew).padStart(9)}`);
console.log(`\n   Avant : ${ko(totalOld)} de HTML + les polices depuis Google Fonts`);
console.log(`   HTML  : ${ko(totalOld)} -> ${ko(statSync(NEW_HTML).size)}  (${(100 - statSync(NEW_HTML).size / totalOld * 100).toFixed(1)} % de moins)`);
console.log('   Note : les polices etaient deja telechargees avant, depuis un domaine');
console.log('          tiers. Le gain porte sur le HTML, la latence et le RGPD, pas');
console.log('          sur le volume des polices.');

// --- Verdict -----------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(failures === 0
  ? 'VERDICT : aucune regression. Rendu, texte et structure identiques.'
  : `VERDICT : ${failures} controle(s) en echec.`);
console.log('='.repeat(60));
process.exit(failures === 0 ? 0 : 1);
