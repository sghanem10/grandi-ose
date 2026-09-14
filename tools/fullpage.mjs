/**
 * Capture de la page ENTIERE, en une image.
 *   node tools/fullpage.mjs [largeur] [hauteurMax] [fichier.html]
 *
 * Chrome en mode headless historique ne capture que la fenetre, et ignore le
 * defilement : on agrandit donc la fenetre a la taille du document. Seul
 * obstacle, le hero est en min-height:100vh et suivrait cette hauteur — on le
 * neutralise le temps de la capture. Le reste de la page est rendu normalement.
 *
 * Sortie : .captures/page-{largeur}.png
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8126;
const OUT = '.captures';

// /!\ Chrome sous Windows impose une largeur de fenetre minimale d'environ
// 500px : demander --window-size=390 donne un innerWidth de 500, et l'image
// produite fait bien 390 de large — le cote droit est donc ROGNE, ce qui
// ressemble a tort a un debordement du site. On borne pour eviter le piege.
// 500px reste tres en dessous du point de rupture (860px) : la mise en page
// mobile est bien celle qui s'affiche.
const MIN_WIDTH = 500;

const asked = Number(process.argv[2]) || 1440;
const WIDTH = Math.max(asked, MIN_WIDTH);
const MAXH = Number(process.argv[3]) || 6400;
const PAGE = process.argv[4] || 'index.html';

if (WIDTH !== asked) {
  console.log(`Largeur ${asked}px portee a ${WIDTH}px (minimum impose par Chrome).`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

// Le hero passe en hauteur naturelle : sans cela il occuperait toute la
// fenetre agrandie et repousserait le reste hors du cadre.
const INJECT = '<style>html{scroll-behavior:auto !important}.hero{min-height:0 !important}</style>';

const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = `/${PAGE}`;
  const file = normalize(join('public', url));
  if (existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    const body = extname(file) === '.html'
      ? readFileSync(file, 'utf8').replace('</head>', `${INJECT}</head>`)
      : readFileSync(file);
    return res.end(body);
  }
  res.writeHead(404).end('not found');
});

mkdirSync(OUT, { recursive: true });

server.listen(PORT, async () => {
  const out = `${OUT}/page-${PAGE.replace(/\.html$/, '')}-${WIDTH}.png`;
  const profile = join(tmpdir(), `cr-${Math.random().toString(36).slice(2)}`);
  try {
    await execFileAsync(CHROME, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--user-data-dir=${profile}`,
      `--screenshot=${resolve(out)}`, `--window-size=${WIDTH},${MAXH}`,
      '--virtual-time-budget=9000', `http://127.0.0.1:${PORT}/`,
    ], { stdio: 'pipe', timeout: 120000 });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  server.close();
  console.log(`${out}  ${(statSync(out).size / 1024).toFixed(0)} Ko  (${WIDTH}x${MAXH})`);
});
