/**
 * Comparaison visuelle avant / apres, via Chrome headless + diff pixel.
 *   node tools/shoot.mjs
 *
 * ATTENTION — cet outil compare le site a grandi-ose-2.html, l'original. Depuis
 * la phase 6 (modifications de contenu demandees), le site en diverge
 * volontairement : l'outil signalera donc de gros ecarts, et c'est normal. Il
 * reste ici comme trace de la validation de la phase 1.
 *
 * /!\ METHODE CORRIGEE. La premiere version parcourait la page par les ancres,
 * a hauteur de fenetre realiste. Verification faite, Chrome en headless
 * historique NE TIENT PAS COMPTE du defilement pour --screenshot : les captures
 * hors du haut de page etaient vides des deux cotes, et leur « 0 % d'ecart » ne
 * prouvait rien. On capture desormais la page ENTIERE en une image, en
 * agrandissant la fenetre a la hauteur du document. Seule adaptation
 * necessaire : neutraliser le min-height:100vh du hero, qui suivrait sinon la
 * fenetre agrandie.
 *
 * Sortie : .captures/{avant,apres}-{largeur}.png
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8123;
const OUT = '.captures';

// Hauteur de fenetre = hauteur du document, pour tout capturer d'un coup.
// La largeur minimale de 500px est imposee par Chrome sous Windows : en
// dessous, l'image est rognee a droite et simule un debordement inexistant.
const VIEWPORTS = [
  { w: 1440, h: 6400, label: 'desktop' },
  { w: 860, h: 7600, label: 'tablette' },
  { w: 500, h: 8200, label: 'mobile' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/**
 * Le site declare scroll-behavior:smooth. En headless, la navigation vers une
 * ancre declenche donc une animation dont l'etat au moment de la capture depend
 * du temps de chargement : les deux versions ne se figent pas au meme offset et
 * la comparaison devient ininterpretable.
 * On neutralise l'animation, a l'identique des DEUX cotes : le saut d'ancre
 * devient instantane et deterministe. C'est une modification du harnais de test,
 * jamais des fichiers du site.
 */
// Le hero passe en hauteur naturelle : sans cela il occuperait toute la
// fenetre agrandie et repousserait le reste de la page hors du cadre.
const HARNESS = '<style>html{scroll-behavior:auto !important}.hero{min-height:0 !important}</style>';
const inject = (html) => html.replace('</head>', `${HARNESS}</head>`);

const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/avant') {
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    return res.end(inject(readFileSync('grandi-ose-2.html', 'utf8')));
  }
  if (url === '/apres' || url === '/apres/') url = '/apres/index.html';
  if (url.startsWith('/apres/')) {
    const file = normalize(join('public', url.slice('/apres/'.length)));
    if (existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      const body = extname(file) === '.html'
        ? inject(readFileSync(file, 'utf8'))
        : readFileSync(file);
      return res.end(body);
    }
  }
  res.writeHead(404).end('not found');
});

// /!\ execFile ASYNCHRONE, et surtout pas execFileSync : la version synchrone
// bloque la boucle d'evenements de Node, donc le serveur HTTP ci-dessus ne peut
// plus repondre a Chrome. Resultat : interblocage jusqu'au timeout.
async function shoot(url, out, w, h) {
  // Profil jetable obligatoire : sans --user-data-dir, Chrome tente de reutiliser
  // le profil de l'utilisateur et reste bloque si une instance est deja ouverte.
  const profile = join(tmpdir(), `cr-${Math.random().toString(36).slice(2)}`);
  try {
    await execFileAsync(CHROME, [
      '--headless',                 // /!\ pas --headless=new : il ne rend jamais la main ici
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`,
      // Chemin ABSOLU : Chrome ignore silencieusement un --screenshot relatif.
      `--screenshot=${resolve(out)}`,
      `--window-size=${w},${h}`,
      '--virtual-time-budget=8000', // laisse le temps aux polices et images
      url,
    ], { stdio: 'pipe', timeout: 90000 });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

mkdirSync(OUT, { recursive: true });
rmSync(`${OUT}/_test.png`, { force: true });

server.listen(PORT, async () => {
  const results = [];

  for (const { w, h, label } of VIEWPORTS) {
    const before = `${OUT}/avant-${w}.png`;
    const after = `${OUT}/apres-${w}.png`;

    // /!\ Le slash final de /apres/ est indispensable : sans lui, les URL
    // relatives du document (css/main.css, img/...) se resolvent a la racine
    // du serveur et la page s'affiche sans aucun style.
    await shoot(`http://127.0.0.1:${PORT}/avant`, before, w, h);
    await shoot(`http://127.0.0.1:${PORT}/apres/`, after, w, h);

    // Diff pixel : les deux captures doivent etre identiques.
    const [a, b] = await Promise.all([
      sharp(before).raw().toBuffer({ resolveWithObject: true }),
      sharp(after).raw().toBuffer({ resolveWithObject: true }),
    ]);

    let differing = 0, maxDelta = 0;
    if (a.data.length !== b.data.length) {
      differing = -1;
    } else {
      const px = a.info.width * a.info.height;
      const ch = a.info.channels;
      for (let p = 0; p < px; p++) {
        let d = 0;
        for (let c = 0; c < ch; c++) d = Math.max(d, Math.abs(a.data[p * ch + c] - b.data[p * ch + c]));
        if (d > 2) differing++;          // > 2/255 : au-dela du bruit d'anticrenelage
        if (d > maxDelta) maxDelta = d;
      }
      results.push({ label, w, slug: 'page entiere', px, differing, pct: (differing / px) * 100, maxDelta });
    }
  }

  server.close();

  console.log('largeur   pixels differents    ecart max   (page entiere)');
  console.log('-'.repeat(60));
  let worst = 0;
  for (const r of results) {
    console.log(
      `${String(r.w).padEnd(9)} ${String(r.differing).padStart(9)} (${r.pct.toFixed(3).padStart(7)} %)  ${String(r.maxDelta).padStart(6)}`
    );
    worst = Math.max(worst, r.pct);
  }
  console.log('-'.repeat(60));
  console.log(worst === 0
    ? 'Identique au pixel pres sur toute la page, aux trois largeurs.'
    : `Ecart maximal : ${worst.toFixed(3)} % des pixels.`);
  console.log('\nRappel : depuis la phase 6, le site diverge VOLONTAIREMENT de');
  console.log('l\'original. Des ecarts importants sont donc attendus ici.');
});
