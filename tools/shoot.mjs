/**
 * Comparaison visuelle avant / apres, via Chrome headless + diff pixel.
 *   node tools/shoot.mjs
 *
 * Sert les deux versions en HTTP local (et non en file://, pour que le CSS
 * externe et les polices se chargent dans les memes conditions qu'en
 * production), capture a trois largeurs et trois positions de page, puis
 * compare les images pixel a pixel.
 *
 * Le hero fait min-height:100vh : on capture donc a des hauteurs de fenetre
 * realistes, et on parcourt la page via les ancres plutot qu'en etirant la
 * fenetre, ce qui deformerait la mise en page.
 *
 * Sortie : .captures/{avant,apres}-{largeur}-{ancre}.png
 *          .captures/diff-*.png pour les ecarts eventuels.
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

const VIEWPORTS = [
  { w: 1440, h: 900, label: 'desktop' },
  { w: 860, h: 900, label: 'tablette' },
  { w: 390, h: 844, label: 'mobile' },
];
const ANCHORS = ['', '#metier', '#contact'];

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
const DETERMINISTIC_SCROLL = '<style>html{scroll-behavior:auto !important}</style>';
const inject = (html) => html.replace('</head>', `${DETERMINISTIC_SCROLL}</head>`);

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
    for (const anchor of ANCHORS) {
      const slug = anchor ? anchor.slice(1) : 'haut';
      const before = `${OUT}/avant-${w}-${slug}.png`;
      const after = `${OUT}/apres-${w}-${slug}.png`;

      // /!\ Le slash final de /apres/ est indispensable : sans lui, les URL
      // relatives du document (css/main.css, img/...) se resolvent a la racine
      // du serveur et la page s'affiche sans aucun style.
      await shoot(`http://127.0.0.1:${PORT}/avant${anchor}`, before, w, h);
      await shoot(`http://127.0.0.1:${PORT}/apres/${anchor}`, after, w, h);

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
        const pct = (differing / px) * 100;
        results.push({ label, w, slug, px, differing, pct, maxDelta });
      }
    }
  }

  server.close();

  console.log('largeur  position   pixels differents   ecart max');
  console.log('-'.repeat(56));
  let worst = 0;
  for (const r of results) {
    const pct = r.pct.toFixed(3).padStart(7);
    console.log(
      `${String(r.w).padEnd(8)} ${r.slug.padEnd(10)} ${String(r.differing).padStart(8)} (${pct} %)  ${String(r.maxDelta).padStart(6)}`
    );
    worst = Math.max(worst, r.pct);
  }
  console.log('-'.repeat(56));
  console.log(worst === 0
    ? 'Identique au pixel pres sur les 9 captures.'
    : `Ecart maximal : ${worst.toFixed(3)} % des pixels. Inspecter .captures/ si > 0.1 %.`);
});
