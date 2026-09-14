/**
 * Extrait les images encodees en base64 du fichier HTML original vers img-src/.
 * A n'executer qu'une fois : les sources extraites sont ensuite versionnees.
 *   node tools/extract-images.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC = 'grandi-ose-2.html';
const OUT = 'img-src';

const html = readFileSync(SRC, 'utf8');
const matches = [...html.matchAll(/data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)/g)];

mkdirSync(OUT, { recursive: true });

const seen = new Map();
matches.forEach((m, i) => {
  const [, ext, b64] = m;
  const buf = Buffer.from(b64, 'base64');
  const hash = createHash('md5').update(buf).digest('hex');

  if (seen.has(hash)) {
    console.log(`#${i + 1}  doublon de ${seen.get(hash)} (${buf.length} octets economises)`);
    return;
  }

  const name = `logo-grandi-ose.${ext}`;
  seen.set(hash, name);
  writeFileSync(`${OUT}/${name}`, buf);
  console.log(`#${i + 1}  -> ${OUT}/${name}  (${buf.length} octets, md5 ${hash})`);
});

console.log(`\n${matches.length} occurrences, ${seen.size} image(s) unique(s).`);
