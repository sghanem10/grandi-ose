/**
 * Captures du site actuel, pour relecture visuelle.
 *   node tools/preview.mjs [largeur...]      (defaut : 1440 et 390)
 *
 * Une capture par section, a chaque largeur demandee.
 * Sortie : .captures/vue-{largeur}-{section}.png
 *
 * Deux pieges evites, tous deux rencontres en chemin :
 *
 *   - Le site declare html{scroll-behavior:smooth}. En headless, l'animation
 *     de defilement n'est jamais jouee et la capture reste figee en haut de
 *     page. On la neutralise, et on demande un saut instantane.
 *
 *   - La position des sections est resolue A L'EXECUTION, dans la meme passe
 *     que la capture. Une premiere version mesurait les positions dans une
 *     passe separee : comme le hero fait min-height:100vh, la moindre
 *     difference de hauteur de fenetre entre les deux passes decalait tout et
 *     les captures tombaient dans le vide.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8124;
const OUT = '.captures';
const HEADER = 70; // l'en-tete est fixe : on remonte pour ne pas masquer le haut

const SECTIONS = ['haut', 'metier', 'apropos', 'pourquoi', 'pourqui', 'temoignages', 'offre', 'contact'];

// /!\ Chrome sous Windows impose une largeur de fenetre minimale d'environ
// 500px. En dessous, l'image est rognee a droite et donne l'illusion d'un
// debordement du site. 500px reste bien en dessous du point de rupture (860px).
const MIN_WIDTH = 500;

const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const VIEWPORTS = (WIDTHS.length ? WIDTHS : [1440, 500])
  .map((w) => Math.max(w, MIN_WIDTH))
  .map((w) => ({ w, h: w < 600 ? 844 : 900 }));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const injectFor = (id) => `<style>html{scroll-behavior:auto !important}</style>
<script>addEventListener('load',()=>{
  const el=${id === 'haut' ? 'null' : `document.getElementById(${JSON.stringify(id)})`};
  const y=el?Math.max(0,el.getBoundingClientRect().top+scrollY-${HEADER}):0;
  scrollTo({top:y,behavior:'instant'});
});<\/script>`;

let inject = '';
const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = normalize(join('public', url));
  if (existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    const body = extname(file) === '.html'
      ? readFileSync(file, 'utf8').replace('</body>', `${inject}</body>`)
      : readFileSync(file);
    return res.end(body);
  }
  res.writeHead(404).end('not found');
});

mkdirSync(OUT, { recursive: true });

server.listen(PORT, async () => {
  for (const { w, h } of VIEWPORTS) {
    for (const id of SECTIONS) {
      inject = injectFor(id);
      const out = `${OUT}/vue-${w}-${id}.png`;
      const profile = join(tmpdir(), `cr-${Math.random().toString(36).slice(2)}`);
      try {
        // execFile ASYNCHRONE : la version sync bloquerait la boucle
        // d'evenements et le serveur ne repondrait jamais a Chrome.
        await execFileAsync(CHROME, [
          '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
          '--force-device-scale-factor=1', `--user-data-dir=${profile}`,
          `--screenshot=${resolve(out)}`, `--window-size=${w},${h}`,
          '--virtual-time-budget=8000', `http://127.0.0.1:${PORT}/`,
        ], { stdio: 'pipe', timeout: 90000 });
      } finally {
        rmSync(profile, { recursive: true, force: true });
      }
      console.log(out);
    }
  }
  server.close();
});
